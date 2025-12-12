const express = require("express");
const telegramRoutes = require('./routes/telegram.routes');
const app = express();

app.use(express.json());

app.use('/telegram', telegramRoutes)

app.get("/health", (req, res) => {
  res.status(200).json({
    message: "Server is healthy!"
  });
});

module.exports = app;