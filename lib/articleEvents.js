const listeners = new Set();

function publishArticleChange(articleId) {
    const message = JSON.stringify({ articleId, timestamp: Date.now() });
    for (const response of listeners) {
        response.write(`event: articles\ndata: ${message}\n\n`);
    }
}

function subscribeToArticleChanges(response) {
    listeners.add(response);
    return () => listeners.delete(response);
}

module.exports = { publishArticleChange, subscribeToArticleChanges };
