const { extractAll, containsHistory } = require("../extractor");
const { handleLoginStart, handleVerifyOtp, isUserLoggedIn } = require("../services/login.service");
const { saveEntry, getHistory, deleteEntriesByName, updateDebtBalance, clearDebtTracker } = require("../services/udhaar.service");
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
    // CLEAR / SETTLE
    if (/^(clear|paid)\s+(.+)/i.test(text)) {
        if (!isUserLoggedIn(chatId)) {
            await sendTextMessage(chatId, "🔒 Please login first to manage debts. Send: login");
            return;
        }

        const match = text.match(/^(?:clear|paid)\s+(.+)/i);
        const content = match[1].trim();

        // Check if there is an amount: "paid ramesh 500" or just "clear ramesh"
        // Try to extract amount from the right side
        const amountMatch = content.match(/(\d+(?:\.\d+)?)\s*$/); // Number at end?

        if (amountMatch) {
            // It's a payment: "paid ramesh 500"
            const amountPaid = parseFloat(amountMatch[1]);
            let namePart = content.replace(amountMatch[0], '').trim();

            // Extract Name logic might be needed if "ramesh" is mixed with other words,
            // but here we just took "paid <content>". 
            // If content was "ramesh 500", namePart is "ramesh".
            const nameToUpdate = namePart;

            if (!nameToUpdate) {
                await sendTextMessage(chatId, "❌ Could not parse name.");
                return;
            }

            // 1. Log to history (Debit)
            await saveEntry({ chatId, name: nameToUpdate, amount: -amountPaid, phone: 'N/A', dueDate: null });

            // 2. Update Ledger (Subtract)
            const newBalance = await updateDebtBalance(chatId, nameToUpdate, -amountPaid);

            await sendTextMessage(chatId, `📉 *Payment Recorded!*\n\nPaid ₹${amountPaid} for *${nameToUpdate}*.\nNew Balance: ₹${newBalance}`);
            return;
        } else {
            // It's a full clear: "clear ramesh"
            const nameToClear = content;

            // 1. Log to history (Status update?)
            // User said: "History just logs... here we add/subtract".
            // We can log a "0" amount or a clear marker. Let's log it as a meta entry or just skip?
            // Let's log '0' with name "CLEARED: Name"? Or just delete from ledger.
            // "History table just logs the prompt." -> So maybe we should just save the text entry?
            // Let's stick to consistent logging.
            await saveEntry({ chatId, name: `CLEARED: ${nameToClear}`, amount: 0, phone: null, dueDate: null });

            // 2. Clear from Ledger
            // const count = await deleteEntriesByName(chatId, nameToClear); // OLD
            const success = await clearDebtTracker(chatId, nameToClear);

            if (success) {
                await sendTextMessage(chatId, `✅ Cleared debt balance for *${nameToClear}*.`);
            } else {
                await sendTextMessage(chatId, `⚠️ Could not clear for "${nameToClear}".`);
            }
            return;
        }
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

    if (!name || !amount) {
        // Fallback if extraction failed?
        // extractAll returns nulls?
        // If no name/amount, maybe don't save?
        // Existing code didn't check. Assuming extraction works or we log empty.
    }

    // 1. Log to History
    await saveEntry({ chatId, name, amount, phone, dueDate })

    // 2. Update Ledger
    const netBalance = await updateDebtBalance(chatId, name, amount, dueDate);

    await sendTextMessage(chatId, `✅ *Debt Added Successfully!*

👤 *Name:* ${name}
💰 *Amount:* ₹${amount}
📊 *Net Balance:* ₹${netBalance}
📞 *Phone:* ${phone || 'N/A'}
📅 *Due Date:* ${dueDate ? new Date(dueDate).toDateString() : 'N/A'}`)
};

module.exports = {
    sendMessage
}
