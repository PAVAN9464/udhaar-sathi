const { extractAll } = require("../extractor");
const { sendTextMessage } = require("../utils/telegramApi");

const sendMessage = async (req, res) => {
    const update = req.body

    res.sendStatus(200)

    if(!update.message) return

    const chatId = update.message.chat.id
    const text = update.message.text

    const {name, dueDate, amount, phone} = extractAll(text);

    await sendTextMessage(chatId, `
        name: ${name},
        due date: ${dueDate},
        amount: ${amount},
        phone: ${phone}    
    `)
};

module.exports = {
    sendMessage
}
