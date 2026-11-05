const express = require('express');
const articleRouter=require('./routes/articles');
const app = express();

// Set EJS as the template engine
app.set('view engine', 'ejs');

app.use('/articles', articleRouter);
// Home route
app.get("/", (req, res) => {
    const articles = [{
        title: "Test Article1",
        createdAt: new Date(),
        description: "Test article 1 description."
    }, {
        title: "Test Article2",
        createdAt: new Date(),
        description: "Test article 2 description."
    }]
    res.render("index.ejs",{articles: articles});
});

// Start server
app.listen(3000, () => {
    console.log("Server running on port 3000");
});