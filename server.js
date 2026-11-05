const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const Article = require('./models/Article');
const authRouter = require('./routes/auth');
const articleRouter = require('./routes/articles');
const userRouter = require('./routes/users');
const {
    loadSession,
    verifyCsrfToken
} = require('./middleware/session');
const { subscribeToArticleChanges } = require('./lib/articleEvents');

const app = express();
const port = Number(process.env.PORT) || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(loadSession);
app.use(verifyCsrfToken);

app.get('/', async (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';
    const filter = query
        ? { $or: [
            { title: { $regex: escapeRegex(query), $options: 'i' } },
            { description: { $regex: escapeRegex(query), $options: 'i' } },
            { content: { $regex: escapeRegex(query), $options: 'i' } }
        ] }
        : {};
    const articles = await Article.find(filter)
        .sort({ createdAt: -1 })
        .limit(30)
        .populate('author', 'username');
    res.render('articles/index', { articles, query });
});

app.get('/events', (req, res) => {
    res.status(200);
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive'
    });
    res.flushHeaders();
    res.write('retry: 5000\n\n');

    const unsubscribe = subscribeToArticleChanges(res);
    const heartbeat = setInterval(() => res.write(': keep-alive\n\n'), 25000);
    req.on('close', () => {
        clearInterval(heartbeat);
        unsubscribe();
    });
});

app.use('/', authRouter);
app.use('/articles', articleRouter);
app.use('/users', userRouter);

app.use((req, res) => {
    res.status(404).render('not-found');
});

app.use((error, req, res, next) => {
    console.error('Request failed:', error);
    if (res.headersSent) return next(error);
    res.status(500).render('error');
});

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function start() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error('MONGODB_URI is not set. Configure your MongoDB Atlas connection string before starting the app.');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');
    app.listen(port, () => {
        console.log(`My Blog is running at http://localhost:${port}`);
    });
}

start().catch(error => {
    console.error('Unable to start My Blog:', error);
    process.exitCode = 1;
});
