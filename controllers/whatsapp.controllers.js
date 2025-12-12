const { sendTextMessage } = require("../utils/metaApi");

const sendMessage = async (req, res) => {
    res.sendStatus(200)
    try {
        const entry = req.body.entry?.[0];
        const change = entry?.changes?.[0];
        const messageData = change?.value?.messages?.[0];

        if (!messageData) {
        return res.sendStatus(200); // no messages, just acknowledge
        }

        const from = messageData.from; // sender number
        const text = messageData.text?.body; // message text
        const name = change.value.contacts?.[0]?.profile?.name; // sender name
        const mes = `Hi ${name}. ${text} Is this the message you sent?`

        console.log({ from, name, text });
        sendTextMessage(from, mes)

        res.sendStatus(200); // acknowledge receipt
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
};

module.exports = {
    sendMessage
}
