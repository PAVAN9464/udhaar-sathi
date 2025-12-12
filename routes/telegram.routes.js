const express = require('express');
const router = express.Router();
const {sendMessage} = require('../controllers/telegram.controllers');

router.post('/message', sendMessage);

module.exports = router;