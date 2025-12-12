const { extractAll, containsHistory } = require("../extractor");
const { handleLoginStart, handleVerifyOtp, isUserLoggedIn } = require("../services/login.service");
const { saveEntry, getHistory, deleteEntriesByName } = require("../services/udhaar.service");
const { sendTextMessage } = require("../utils/telegramApi");

const sendMessage = async (req, res) => {
    const update = req.body

    res.sendStatus(200)

    if (!update.message) return

    const chatId = update.message.chat.id
    const text = update.message.text

    // LOGIN
    if (/^login\s*$/i.test(text)) {
        // Check if already logged in
        if (isUserLoggedIn(chatId)) {
            await sendTextMessage(chatId, "✔️ You are already logged in.");
            return;
        }

        // Trigger OTP flow
        await handleLoginStart(chatId);
        return;
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

    // CLEAR / SETTLE
    if (/^(clear|paid)\s+(.+)/i.test(text)) {
        if (!isUserLoggedIn(chatId)) {
            await sendTextMessage(chatId, "🔒 Please login first to clear debts. Send: login");
            return;
        }

        const match = text.match(/^(?:clear|paid)\s+(.+)/i);
        const nameToClear = match[1].trim();

        const count = await deleteEntriesByName(chatId, nameToClear);

        if (count > 0) {
            await sendTextMessage(chatId, `✅ Successfully cleared ${count} entries for "${nameToClear}".`);
        } else {
            await sendTextMessage(chatId, `⚠️ No entries found for "${nameToClear}" to clear.`);
        }
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

    const { name, dueDate, amount, phone } = extractAll(text);

    await saveEntry({ chatId, name, amount, phone, dueDate })

    await sendTextMessage(chatId, `✅ *Debt Added Successfully!*

👤 *Name:* ${name}
💰 *Amount:* ₹${amount}
📞 *Phone:* ${phone || 'N/A'}
📅 *Due Date:* ${dueDate ? new Date(dueDate).toDateString() : 'N/A'}`)
};

module.exports = {
    sendMessage
}
