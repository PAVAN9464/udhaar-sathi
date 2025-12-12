const { sendTextMessage } = require("../utils/telegramApi");

const sendMessage = async (req, res) => {
    const update = req.body

    res.sendStatus(200)

    if(!update.message) return

    const chatId = update.message.chat.id
    const text = update.message.text

    await sendTextMessage(chatId, `${text} Was this the message you sent?`)
};

module.exports = {
    sendMessage
}
