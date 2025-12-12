const express = require("express");
const whatsappRoutes = require('./routes/whatsapp.routes');
const app = express();

app.use(express.json());

app.use('/whatsapp', whatsappRoutes)

app.get("/health", (req, res) => {
  res.status(200).json({
    message: "Server is healthy!"
  });
});

module.exports = app;