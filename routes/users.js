const express = require('express');
const User = require('../models/User');
const Article = require('../models/Article');
const { requireAuthentication } = require('../middleware/session');

const router = express.Router();

router.get('/profile/edit', requireAuthentication, (req, res) => {
    res.render('users/edit', { error: '', values: req.currentUser });
});

router.post('/profile/edit', requireAuthentication, async (req, res) => {
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
    const bio = typeof req.body.bio === 'string' ? req.body.bio.trim() : '';
    const values = { username, bio };

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
        return res.status(400).render('users/edit', {
            error: 'Username must be 3–30 characters using letters, numbers, or underscores.',
            values
        });
    }
    if (bio.length > 500) {
        return res.status(400).render('users/edit', {
            error: 'Your bio must be 500 characters or fewer.',
            values
        });
    }

    const existing = await User.findOne({ username, _id: { $ne: req.currentUser._id } });
    if (existing) {
        return res.status(409).render('users/edit', {
            error: 'That username is already in use.',
            values
        });
    }

    req.currentUser.username = username;
    req.currentUser.bio = bio;
    await req.currentUser.save();
    res.redirect(`/users/${encodeURIComponent(username)}?notice=Profile%20updated.`);
});

router.get('/:username', async (req, res) => {
    const user = await User.findOne({
        username: req.params.username
    });

    if (!user) return res.status(404).render('not-found');
    const articles = await Article.find({ author: user._id })
        .sort({ createdAt: -1 })
        .populate('author', 'username');

    res.render('users/show', { profile: user, articles });
});

module.exports = router;
