const { extractAll, containsHistory } = require("../extractor");
const { handleLoginStart, handleVerifyOtp, isUserLoggedIn } = require("../services/login.service");
const { saveEntry, getHistory, deleteEntriesByName, updateDebtBalance, clearDebtTracker, getAllDebts, deleteEntryById, deleteAllHistory } = require("../services/udhaar.service");
const { upsertUser } = require("../services/user.service");
const { sendTextMessage, getFileLink, downloadFile, sendPhoto, answerCallbackQuery } = require("../utils/telegramApi");
const { translateToEnglish } = require("../utils/translate");
const { transcribeAudio, generateRoast, analyzeDebtImage } = require("../utils/groq");
const { getRandomEmoji } = require("../utils/emojis");
const fs = require("fs");
const path = require("path");

const sendMessage = async (req, res) => {
    try {
        const update = req.body;

        // Always return 200 OK to Telegram to prevent retries
        res.sendStatus(200);

        if (update.callback_query) {
            const callback = update.callback_query;
            const chatId = callback.message.chat.id;
            const data = callback.data;
            const callbackId = callback.id;

            // Acknowledge the callback immediately
            await answerCallbackQuery(callbackId);

            // Handle actions
            if (data === 'get_stats') {
                // Trigger /chart logic (call functionality or just suggest)
                await sendTextMessage(chatId, "📊 *Stats Requested* — generating chart...", null);
                // Instructions
                await sendTextMessage(chatId, "Use /chart to see your full visual stats!");
            }
            else if (data === 'get_roast') {
                await sendTextMessage(chatId, "🔥 Prepare to be roasted! (Type /roast to confirm)");
            }
            else if (data === 'fun_flip') {
                const result = Math.random() < 0.5 ? '🪙 *Heads*' : '🦅 *Tails*';
                // Optionally edit the message, but sending new one is simpler
                await sendTextMessage(chatId, result);
            }
            else if (data === 'help_view') {
                const helpText = `
🛠 *Udhaar Sathi Help*

*Basics:*
• \`Ramesh 500rs\` → Add debt
• \`Paid Ramesh 200\` → Record payment
• \`Clear Ramesh\` → Clear debt
• \`Delete Ramesh\` → Remove last history

*Fun & Visuals:*
• \`/menu\` → Open Main Menu
• \`/chart\` → View Debt Pie Chart
• \`/roast\` → Get focused financial abuse (AI)
• \`Voice Note\` → Speak to add debts!

*Settings:*
• Share Contact → To get notifications.
`;
                await sendTextMessage(chatId, helpText);
            }

            return;
        }

        return;
    }

        // 2. Handle Photos (Handwritten Notes)
        if (update.message.photo) {
        const photos = update.message.photo;
        // formatted as array of sizes, take the last one (highest res)
        const fileId = photos[photos.length - 1].file_id;
        console.log("Received photo with ID:", fileId);

        await sendTextMessage(chatId, "📸 *Analyzing image...*");

        const fileUrl = await getFileLink(fileId);
        if (!fileUrl) {
            await sendTextMessage(chatId, "❌ Failed to retrieve image.");
            return;
        }

        const result = await analyzeDebtImage(fileUrl);
        // Expected format: { "debts": [ { "name": "Ramesh", "amount": 300 } ] } or a raw array
        let items = [];
        if (result && Array.isArray(result)) items = result;
        else if (result && result.debts && Array.isArray(result.debts)) items = result.debts;

        if (items.length === 0) {
            await sendTextMessage(chatId, "🤷‍♂️ specific debts found in image.");
            return;
        }

        let summary = "📝 *Extracted Debts:*";
        for (const item of items) {
            const pName = item.name ? item.name.toUpperCase() : 'UNKNOWN';
            const pAmount = parseFloat(item.amount);
            if (pName && !isNaN(pAmount)) {
                await saveEntry({ chatId, name: pName, amount: pAmount, phone: null, dueDate: null });
                const newBal = await updateDebtBalance(chatId, pName, pAmount, null, null, firstName);
                summary += `\n• ${pName}: ₹${pAmount} (Bal: ₹${newBal})`;
            }
        }

        await sendTextMessage(chatId, summary);
        return;
    }

    if (!update || !update.message || !update.message.chat) {
        return;
    }

    console.log("received update:", JSON.stringify(update, null, 2));

    const chatId = update.message.chat.id;


    // Extract phone if available (e.g. from contact share or user metadata if accessible)
    // Note: update.message.contact only exists if user shared contact explicitly
    // But the prompt says "phone if it exists", so we check for contact object.
    const phone = update.message.contact ? update.message.contact.phone_number : null;
    console.log("DEBUG: Controller extracted phone:", phone, "Type:", typeof phone);
    const firstName = update.message.from ? update.message.from.first_name : 'Shopkeeper';

    // Persist User
    await upsertUser(chatId, phone, firstName);
    let text = update.message.text;
    let voice = update.message.voice || update.message.audio;

    // VOICE PROCESSING
    if (voice) {
        console.log("🎤 Voice message detected! File ID:", voice.file_id);
        try {
            const fileId = voice.file_id;
            const fileUrl = await getFileLink(fileId);
            console.log("🔗 File Link:", fileUrl);

            if (fileUrl) {
                const tempFilePath = path.join(__dirname, `../temp_audio_${fileId}.ogg`);
                console.log("📂 Downloading to:", tempFilePath);

                await sendTextMessage(chatId, "🎤 Processing voice note...");

                // Download
                const downloaded = await downloadFile(fileUrl, tempFilePath);
                console.log("📥 Download status:", downloaded);

                if (downloaded) {
                    // Transcribe
                    console.log("🧠 Sending to Groq...");
                    text = await transcribeAudio(tempFilePath);
                    console.log("📝 Transcription result:", text);

                    // Clean up
                    fs.unlink(tempFilePath, (err) => { if (err) console.error("Temp file delete error", err); });

                    if (text) {
                        await sendTextMessage(chatId, `🗣️ *Heard:* "${text}"`);
                        // Fall out of if(voice) block and let normal text processing handle 'text'
                    } else {
                        await sendTextMessage(chatId, "⚠️ Could not transcribe audio. Please try again.");
                        return;
                    }
                } else {
                    console.error("❌ Failed to download file from Telegram.");
                    await sendTextMessage(chatId, "⚠️ Failed to download voice message.");
                    return;
                }
            } else {
                console.error("❌ Could not get File URL from Telegram.");
            }
        } catch (err) {
            console.error("Voice processing error:", err);
            await sendTextMessage(chatId, "⚠️ Error processing voice.");
            return;
        }
    }

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
            `�️ *Reset:* "Reset Bot" - Delete ALL data\n` +
            `�🔒 *Login:* "login" - Start secure session`;
        await sendTextMessage(chatId, helpMsg);
        return;
    }

    // RESET / CLEAR ALL
    if (/^reset bot$/i.test(text) || /^clear all history$/i.test(text)) {
        if (!isUserLoggedIn(chatId)) {
            await sendTextMessage(chatId, "🔒 Please login first to reset data. Send: login");
            return;
        }

        // Optional: Ask for confirmation? For now, direct action as it's a specific command.
        const success = await deleteAllHistory(chatId);
        if (success) {
            await sendTextMessage(chatId, "🗑️ *All wiped!* Your history and ledger have been reset.");
        } else {
            await sendTextMessage(chatId, "⚠️ Error resetting data. Please try again.");
        }
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

    // ROAST
    if (/^\/roast$/i.test(text)) {
        const debts = await getAllDebts(chatId);

        if (!debts || debts.length === 0) {
            await sendTextMessage(chatId, "🤷‍♂️ You have no debts to roast. You are boringly responsible.");
            return;
        }

        // Prepare context
        let context = "";
        let totalOwed = 0;
        let totalOwing = 0;

        debts.forEach(d => {
            const val = parseFloat(d.amount);
            if (val > 0) {
                context += `User owes ${d.name} ₹${val}.\n`;
                totalOwed += val;
            } else if (val < 0) {
                context += `${d.name} owes User ₹${Math.abs(val)}.\n`;
                totalOwing += Math.abs(val);
            }
        });

        if (totalOwed === 0 && totalOwing === 0) {
            context = "User has everything settled.";
        } else {
            context += `Total User Owes: ₹${totalOwed}. Total Owed to User: ₹${totalOwing}.`;
        }

        await sendTextMessage(chatId, "🔥 *Cooking up a roast...*");
        const roast = await generateRoast(context);
        await sendTextMessage(chatId, `🌶️ *Roasted:* ${roast}`);
        return;
    }

    // CHART
    if (/^\/chart$/i.test(text) || /^\/stats$/i.test(text)) {
        const debts = await getAllDebts(chatId);
        if (!debts || debts.length === 0) {
            await sendTextMessage(chatId, "📊 No data to visualize.");
            return;
        }

        // Aggregate data: Only show people who OWE YOU (Positive amounts)
        // or maybe split into Owed vs Owing
        const labels = [];
        const data = [];

        debts.forEach(d => {
            const val = parseFloat(d.amount);
            if (val > 0) { // Only showing receivables for the pie chart
                labels.push(d.name);
                data.push(val);
            }
        });

        if (data.length === 0) {
            await sendTextMessage(chatId, "📊 Everyone is paid up! Nothing to chart.");
            return;
        }

        const chartConfig = {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: ['#ff6384', '#36a2eb', '#cc65fe', '#ffce56', '#4bc0c0']
                }]
            },
            options: {
                title: { display: true, text: 'Who Owes Me Money?' }
            }
        };

        const url = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&width=500&height=300`;
        await sendPhoto(chatId, url, "📊 *Your Debt Distribution*");
        return;
    }

    // MENU / START / HELP
    if (/^\/menu$/i.test(text) || /^\/start$/i.test(text) || /^\/help$/i.test(text)) {
        const menuText = `
👋 *Welcome to Udhaar Sathi!*
_Your witty financial companion._

Choose an option below:
`;
        const keyboard = {
            inline_keyboard: [
                [
                    { text: "📊 Visual Stats", callback_data: "get_stats" },
                    { text: "🔥 Roast Me", callback_data: "get_roast" }
                ],
                [
                    { text: "🪙 Coin Flip", callback_data: "fun_flip" },
                    { text: "❓ Help", callback_data: "help_view" }
                ]
            ]
        };

        await sendTextMessage(chatId, menuText, keyboard);
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
            const newBalance = await updateDebtBalance(chatId, nameToUpdate, -amountPaid, null, null, firstName);

            await sendTextMessage(chatId, `📉 *Payment Recorded!*\n\nPaid ₹${amountPaid} for *${nameToUpdate}*.\nNew Balance: ₹${newBalance}`);
            return;
        } else {
            // It's a full clear: "clear ramesh"
            const nameToClear = content;

            // 1. Log to history
            await saveEntry({ chatId, name: `CLEARED: ${nameToClear}`, amount: 0, phone: null, dueDate: null });

            // 2. Clear from Ledger
            const success = await clearDebtTracker(chatId, nameToClear, firstName);

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

    const { name, dueDate, amount, phone: extractedPhone, intent } = extractAll(text);

    if (!name || amount === null) {
        // Only send this if it doesn't match other commands and looks like a transaction attempt
        await sendTextMessage(chatId, "⚠️ Could not understand the transaction details.\nPlease specify a Name and Amount.\nExample: 'Ramesh 500rs' or 'Paid Ramesh 500'");
        return;
    }

    // Determine final amount based on intent
    const finalAmount = (intent === 'DEBIT') ? -Math.abs(amount) : Math.abs(amount);
    const isPayment = (intent === 'DEBIT');

    // 1. Log to History
    await saveEntry({ chatId, name, amount: finalAmount, phone: extractedPhone, dueDate })

    // 2. Update Ledger
    // extractAll returns phone if found in text, else null.
    // We pass 'phone' (extracted from text) so it can be stored in debt_track.
    const netBalance = await updateDebtBalance(chatId, name, finalAmount, dueDate, extractedPhone, firstName);

    if (isPayment) {
        const emo = getRandomEmoji('PAYMENT');
        await sendTextMessage(chatId, `${emo} *Payment Recorded!*\n\nPaid ₹${Math.abs(amount)} for *${name}*.\nNet Balance: ₹${netBalance}`);
    } else {
        const emo = getRandomEmoji('DEBT_ADDED');
        const formattedDate = dueDate ? new Date(dueDate).toDateString() : 'N/A';
        await sendTextMessage(chatId, `${emo} *Debt Added Successfully!*
    
    👤 *Name:* ${name}
    💰 *Amount:* ₹${amount}
    📊 *Net Balance:* ₹${netBalance}
    📞 *Phone:* ${extractedPhone || 'N/A'}
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
