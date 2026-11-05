const crypto = require('crypto');
const Session = require('../models/Session');

const COOKIE_NAME = 'myblog_session';
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function getCookieToken(req) {
    const cookieHeader = req.headers.cookie || '';
    const cookie = cookieHeader.split(';').map(value => value.trim())
        .find(value => value.startsWith(`${COOKIE_NAME}=`));
    const token = cookie ? cookie.slice(COOKIE_NAME.length + 1) : '';
    return /^[a-f0-9]{64}$/.test(token) ? token : null;
}

function setSessionCookie(res, token) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader('Set-Cookie',
        `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_LIFETIME_MS / 1000}${secure}`);
}

function clearSessionCookie(res) {
    res.setHeader('Set-Cookie',
        `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

async function createSession(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    const session = await Session.create({
        tokenHash: hashToken(token),
        user: userId || null,
        csrfToken: crypto.randomBytes(32).toString('hex'),
        expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS)
    });
    return { token, session };
}

async function loadSession(req, res, next) {
    try {
        const token = getCookieToken(req);
        let session = token
            ? await Session.findOne({
                tokenHash: hashToken(token),
                expiresAt: { $gt: new Date() }
            }).populate('user')
            : null;

        if (!session) {
            const created = await createSession(null);
            session = created.session;
            setSessionCookie(res, created.token);
        } else if (session.expiresAt.getTime() - Date.now() < SESSION_LIFETIME_MS / 2) {
            session.expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
            await session.save();
            setSessionCookie(res, token);
        }

        req.sessionRecord = session;
        req.currentUser = session.user || null;
        res.locals.currentUser = req.currentUser;
        res.locals.csrfToken = session.csrfToken;
        res.locals.notice = typeof req.query.notice === 'string' ? req.query.notice : '';
        next();
    } catch (error) {
        next(error);
    }
}

async function regenerateSession(req, res, userId) {
    await Session.deleteOne({ _id: req.sessionRecord._id });
    const created = await createSession(userId);
    req.sessionRecord = created.session;
    setSessionCookie(res, created.token);
}

function requireAuthentication(req, res, next) {
    if (!req.currentUser) {
        return res.redirect('/login?notice=Please%20sign%20in%20to%20continue.');
    }
    next();
}

function verifyCsrfToken(req, res, next) {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        return next();
    }

    const submitted = req.body && req.body._csrf;
    const expected = req.sessionRecord && req.sessionRecord.csrfToken;
    if (typeof submitted !== 'string' || typeof expected !== 'string') {
        return res.status(403).send('Invalid or missing form token. Please reload the page and try again.');
    }

    const submittedBuffer = Buffer.from(submitted);
    const expectedBuffer = Buffer.from(expected);
    if (submittedBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(submittedBuffer, expectedBuffer)) {
        return res.status(403).send('Invalid or expired form token. Please reload the page and try again.');
    }
    next();
}

module.exports = {
    clearSessionCookie,
    loadSession,
    regenerateSession,
    requireAuthentication,
    verifyCsrfToken
};
