const express = require('express');
const mongoose = require('mongoose');
const Article = require('../models/Article');
const {
    requireAuthentication
} = require('../middleware/session');
const { publishArticleChange } = require('../lib/articleEvents');

const router = express.Router();

function getArticleValues(body) {
    return {
        title: typeof body.title === 'string' ? body.title.trim() : '',
        description: typeof body.description === 'string' ? body.description.trim() : '',
        content: typeof body.content === 'string' ? body.content.trim() : ''
    };
}

function validateArticle(values) {
    if (!values.title || values.title.length > 120) return 'Title is required and must be 120 characters or fewer.';
    if (!values.description || values.description.length > 500) return 'Description is required and must be 500 characters or fewer.';
    if (!values.content || values.content.length > 50000) return 'Article text is required and must be 50,000 characters or fewer.';
    return '';
}

function validId(id) {
    return mongoose.isValidObjectId(id);
}

router.get('/new', requireAuthentication, (req, res) => {
    res.render('articles/form', {
        title: 'Write a new article',
        formAction: '/articles',
        error: '',
        values: {}
    });
});

router.post('/', requireAuthentication, async (req, res) => {
    const values = getArticleValues(req.body);
    const error = validateArticle(values);
    if (error) {
        return res.status(400).render('articles/form', {
            title: 'Write a new article',
            formAction: '/articles',
            error,
            values
        });
    }

    const article = await Article.create({ ...values, author: req.currentUser._id });
    publishArticleChange(article._id.toString());
    res.redirect(`/articles/${article._id}?notice=Your%20article%20was%20published.`);
});

router.get('/:id/edit', requireAuthentication, async (req, res) => {
    if (!validId(req.params.id)) return res.status(404).render('not-found');
    const article = await Article.findOne({
        _id: req.params.id,
        author: req.currentUser._id
    });
    if (!article) return res.status(404).render('not-found');

    res.render('articles/form', {
        title: 'Edit article',
        formAction: `/articles/${article._id}/edit`,
        error: '',
        values: article
    });
});

router.post('/:id/edit', requireAuthentication, async (req, res) => {
    if (!validId(req.params.id)) return res.status(404).render('not-found');
    const values = getArticleValues(req.body);
    const error = validateArticle(values);
    const article = await Article.findOne({
        _id: req.params.id,
        author: req.currentUser._id
    });
    if (!article) return res.status(404).render('not-found');

    if (error) {
        return res.status(400).render('articles/form', {
            title: 'Edit article',
            formAction: `/articles/${article._id}/edit`,
            error,
            values: { ...values, _id: article._id }
        });
    }

    Object.assign(article, values, { updatedAt: new Date() });
    await article.save();
    publishArticleChange(article._id.toString());
    res.redirect(`/articles/${article._id}?notice=Your%20changes%20were%20saved.`);
});

router.post('/:id/delete', requireAuthentication, async (req, res) => {
    if (!validId(req.params.id)) return res.status(404).render('not-found');
    const article = await Article.findOneAndDelete({
        _id: req.params.id,
        author: req.currentUser._id
    });
    if (!article) return res.status(404).render('not-found');
    publishArticleChange(article._id.toString());
    res.redirect(`/users/${encodeURIComponent(req.currentUser.username)}?notice=Article%20deleted.`);
});

router.get('/:id', async (req, res) => {
    if (!validId(req.params.id)) return res.status(404).render('not-found');
    const article = await Article.findById(req.params.id).populate('author', 'username bio createdAt');
    if (!article) return res.status(404).render('not-found');
    res.render('articles/show', { article });
});

module.exports = router;
