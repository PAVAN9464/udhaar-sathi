const { extractAll, containsHistory } = require("../extractor");
const { handleLoginStart, handleVerifyOtp, isUserLoggedIn } = require("../services/login.service");
const { saveEntry, getHistory } = require("../services/udhaar.service");
const { sendTextMessage } = require("../utils/telegramApi");

const sendMessage = async (req, res) => {
    const update = req.body

    res.sendStatus(200)

    if(!update.message) return

    const chatId = update.message.chat.id
    const text = update.message.text

    if (/^login (.+)/.test(text)) {
        console.log(text)
        if (/^login\s*$/i.test(text)) {
            // User typed just 'login' with optional spaces
            await sendTextMessage(chatId, "❌ Please provide your email.\nExample: login your@email.com");
            return;
        }
        // ✅ Check if the user is already logged in
        if (isUserLoggedIn(chatId)) {
            await sendTextMessage(chatId, "✔️ You are already logged in. No need to login again.");
            return;
        }
        const match = text.match(/^login (.+)/)
        await handleLoginStart(chatId, match[1])
        return
    }

    if (/^verify\s+(.+)/i.test(text)) {
        const match = text.match(/^verify\s+(.+)/i);
        const otpStr = match[1].trim();

        // Check if OTP is numeric and 4 digits
        if (!/^\d{4}$/.test(otpStr)) {
            await sendTextMessage(chatId, "❌ Invalid OTP format. Please enter a 4-digit OTP.\nExample: verify 1234");
            return;
        }

        const reply = handleVerifyOtp(chatId, otpStr);
        await sendTextMessage(chatId, reply);
        return;
    }
    
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
