const { extractAll, containsHistory } = require("../extractor");
const { saveEntry, getHistory } = require("../services/udhaar.service");
const { sendTextMessage } = require("../utils/telegramApi");

const sendMessage = async (req, res) => {
    const update = req.body

    res.sendStatus(200)

    if(!update.message) return

    const chatId = update.message.chat.id
    const text = update.message.text
    
    if (containsHistory(text)) {
        const historyArray = await getHistory(chatId) 
        function formatHistoryForTelegram() {
            if (!historyArray || historyArray.length === 0) {
                return "No history found for this chat.";
            }

            let message = "📜 *Chat History:*\n\n";

            historyArray.forEach((entry, index) => {
                const timestamp = entry.created_at
                    ? new Date(entry.created_at).toLocaleString()
                    : "Unknown time";

                message += `${index + 1}. *${entry.name}*\n`;
                message += `   💰 Amount: ₹${entry.amount}\n`;
                message += `   📞 Phone: ${entry.phone}\n`;
                message += `   ⏰ Due: ${entry.due_date}\n`;
                message += `   🕒 Added: ${timestamp}\n\n`;
            });

            message += "====================";

            return message;
        }
        const message = formatHistoryForTelegram()
        await sendTextMessage(chatId, message)
        return

    }

    const {name, dueDate, amount, phone} = extractAll(text);

    await saveEntry({chatId, name, amount, phone, dueDate})

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
