const crypto = require('crypto');
const { promisify } = require('util');
const express = require('express');
const User = require('../models/User');
const {
    clearSessionCookie,
    regenerateSession,
    requireAuthentication
} = require('../middleware/session');

const router = express.Router();
const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = await scrypt(password, salt, 64);
    return `${salt}:${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const derivedKey = await scrypt(password, salt, 64);
    const storedKey = Buffer.from(key, 'hex');
    return storedKey.length === derivedKey.length &&
        crypto.timingSafeEqual(storedKey, derivedKey);
}

router.get('/register', (req, res) => {
    if (req.currentUser) return res.redirect('/');
    res.render('auth/register', { error: '', values: {} });
});

router.post('/register', async (req, res) => {
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
        return res.status(400).render('auth/register', {
            error: 'Username must be 3–30 characters using letters, numbers, or underscores.',
            values: { username, email }
        });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        return res.status(400).render('auth/register', {
            error: 'Enter a valid email address.',
            values: { username, email }
        });
    }
    if (password.length < 10 || password.length > 128) {
        return res.status(400).render('auth/register', {
            error: 'Use a password between 10 and 128 characters.',
            values: { username, email }
        });
    }
    if (await User.exists({ $or: [{ username }, { email }] })) {
        return res.status(409).render('auth/register', {
            error: 'That username or email is already in use.',
            values: { username, email }
        });
    }

    try {
        const user = await User.create({ username, email, passwordHash: await hashPassword(password) });
        await regenerateSession(req, res, user._id);
        res.redirect(`/users/${encodeURIComponent(user.username)}?notice=Welcome%20to%20the%20community!`);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).render('auth/register', {
                error: 'That username or email is already in use.',
                values: { username, email }
            });
        }
        throw error;
    }
});

router.get('/login', (req, res) => {
    if (req.currentUser) return res.redirect('/');
    res.render('auth/login', { error: '', email: '' });
});

router.post('/login', async (req, res) => {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const user = await User.findOne({ email }).select('+passwordHash');

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
        return res.status(401).render('auth/login', {
            error: 'Email or password is incorrect.',
            email
        });
    }

    await regenerateSession(req, res, user._id);
    res.redirect(`/users/${encodeURIComponent(user.username)}?notice=You%20are%20signed%20in.`);
});

router.post('/logout', requireAuthentication, async (req, res) => {
    await req.sessionRecord.deleteOne();
    clearSessionCookie(res);
    res.redirect('/?notice=You%20have%20signed%20out.');
});

module.exports = router;
