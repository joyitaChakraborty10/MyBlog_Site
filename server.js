const express = require('express');

const app = express();

// Home route
app.get("/", (req, res) => {
    res.send("Welcome to My Blog Website! Hello!!");
});

// Start the server
app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});