const { extractAll, containsHistory } = require("../extractor");
const { handleLoginStart, handleVerifyOtp, isUserLoggedIn } = require("../services/login.service");
const { saveEntry, getHistory, deleteEntriesByName, updateDebtBalance, clearDebtTracker, getAllDebts, deleteEntryById } = require("../services/udhaar.service");

const { sendTextMessage } = require("../utils/telegramApi");
const { translateToEnglish } = require("../utils/translate");

const sendMessage = async (req, res) => {
    try {
        const update = req.body;
        
        // Always return 200 OK to Telegram to prevent retries
        res.sendStatus(200);

        if (!update || !update.message || !update.message.chat || !update.message.text) {
             return;
        }

        const chatId = update.message.chat.id;
        let text = update.message.text;

        // Translate incoming text to English for better NLP
        if (text && typeof text === 'string') {
            try {
                text = await translateToEnglish(text);
                // console.log("Translated text:", text);
            } catch (transError) {
                console.error("Translation failed:", transError);
                // Continue with original text if translation fails
            }
        }

        // HELP
        if (/^\/help$/i.test(text) || /^help$/i.test(text)) {
            const helpMsg = `🤖 *Udhaar Sathi Commands:*\n\n` +
                `📝 *Add Debt:* "Ramesh 500rs for lunch"\n` +
                `💸 *Add Payment:* "Paid Ramesh 200"\n` +
                `🧹 *Clear Debt:* "Clear Ramesh"\n` +
                `📜 *History:* "Show history" or "History"\n` +
                `📊 *Summary:* "/summary" - View all net balances\n` +
                `🔒 *Login:* "login" - Start secure session`;
            await sendTextMessage(chatId, helpMsg);
            return;
        }

        // SUMMARY (Ledger)
        if (/^\/summary$/i.test(text) || /^summary$/i.test(text)) {
            // Check login
            if (!isUserLoggedIn(chatId)) {
                await sendTextMessage(chatId, "🔒 Please login first. Send: login");
                return;
            }

            const debts = await getAllDebts(chatId);
            if (!debts || debts.length === 0) {
                await sendTextMessage(chatId, "📊 *Ledger is empty.* No pending debts.");
                return;
            }

            let msg = "📊 *Current Ledger (Net Balances):*\n\n";
            debts.forEach(d => {
                const val = parseFloat(d.amount);
                if (!isNaN(val) && val !== 0) {
                    msg += `👤 *${d.name}:* ₹${val.toFixed(2)}\n`;
                }
            });
            
            await sendTextMessage(chatId, msg);
            return;
        }

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
            const otpStr = match ? match[1].trim() : "";

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
                await sendTextMessage(chatId, "🔒 Please login first to manage debts. Send: login");
                return;
            }

            const match = text.match(/^(?:clear|paid)\s+(.+)/i);
            const content = match ? match[1].trim() : "";

            if (!content) return;

            // Check if there is an amount: "paid ramesh 500" or just "clear ramesh"
            // Try to extract amount from the right side
            const amountMatch = content.match(/(\d+(?:\.\d+)?)\s*$/); // Number at end?

            if (amountMatch) {
                // It's a payment: "paid ramesh 500"
                const amountPaid = parseFloat(amountMatch[1]);
                let namePart = content.replace(amountMatch[0], '').trim();

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

                // 1. Log to history
                await saveEntry({ chatId, name: `CLEARED: ${nameToClear}`, amount: 0, phone: null, dueDate: null });

                // 2. Clear from Ledger
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
                    if (!entry) return;
                    
                    const timestamp = entry.created_at
                        ? new Date(entry.created_at).toLocaleString()
                        : "Unknown time";

                    // Format Due Date
                    let dueDisplay = "No Due Date";
                    try {
                        if (entry.due_date) {
                             dueDisplay = new Date(entry.due_date).toLocaleDateString("en-IN", { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
                        }
                    } catch (e) {
                        dueDisplay = "Invalid Date";
                    }

                    message += `${index + 1}. *${entry.name || 'Unknown'}*\n`;
                    message += `   💰 Amount: ₹${entry.amount || 0}\n`;
                    message += `   📞 Phone: ${entry.phone || 'N/A'}\n`;
                    message += `   ⏰ Due: ${dueDisplay}\n`;
                    message += `   🕒 Added: ${timestamp}\n\n`;
                });

                message += "====================";

                return message;
            }
            const message = formatHistoryForTelegram()
            await sendTextMessage(chatId, message)
            return

        }

        const { name, dueDate, amount, phone, intent } = extractAll(text);

        if (!name || amount === null) {
            // Only send this if it doesn't match other commands and looks like a transaction attempt
            await sendTextMessage(chatId, "⚠️ Could not understand the transaction details.\nPlease specify a Name and Amount.\nExample: 'Ramesh 500rs' or 'Paid Ramesh 500'");
            return;
        }

        // Determine final amount based on intent
        const finalAmount = (intent === 'DEBIT') ? -Math.abs(amount) : Math.abs(amount);
        const isPayment = (intent === 'DEBIT');

        // 1. Log to History
        await saveEntry({ chatId, name, amount: finalAmount, phone, dueDate })

        // 2. Update Ledger
        const netBalance = await updateDebtBalance(chatId, name, finalAmount, dueDate);

        if (isPayment) {
            await sendTextMessage(chatId, `📉 *Payment Recorded!*\n\nPaid ₹${Math.abs(amount)} for *${name}*.\nNet Balance: ₹${netBalance}`);
        } else {
            const formattedDate = dueDate ? new Date(dueDate).toDateString() : 'N/A';
            await sendTextMessage(chatId, `✅ *Debt Added Successfully!*
    
    👤 *Name:* ${name}
    💰 *Amount:* ₹${amount}
    📊 *Net Balance:* ₹${netBalance}
    📞 *Phone:* ${phone || 'N/A'}
    📅 *Due Date:* ${formattedDate}`)
        }
    } catch (err) {
        console.error("Critical Error in sendMessage:", err);
        // Optionally send a friendly error message to user if we have chatId
        // Not attempting here to avoid loop if sendTextMessage fails
    }
};

module.exports = {
    sendMessage
}
