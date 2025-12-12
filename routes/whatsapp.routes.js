const express = require('express');
const router = express.Router();
const {sendMessage} = require('../controllers/whatsapp.controllers');

router.post('/message', sendMessage);
router.get('/message', (req, res) => {
    const VERIFY_TOKEN = 'udhaar123'; // same as the token you used in Meta

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK VERIFIED');
            return res.status(200).send(challenge); // <--- important!
        } else {
            return res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
});

module.exports = router;