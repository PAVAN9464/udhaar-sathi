const express = require("express");

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    message: "Server is healthy!"
  });
});

module.exports = app;