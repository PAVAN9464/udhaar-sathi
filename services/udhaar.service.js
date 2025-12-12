const supabase = require("../config/supabase");

async function saveEntry({ chatId, name, amount, phone, dueDate }) {
    if (!chatId) return null; // Safe guard
    const { error } = await supabase
        .from("history")
        .insert([
            {
                chatId,
                name: name || 'Unknown',
                amount: amount || 0,
                phone: phone || null,
                due_date: dueDate, // JS Date object → timestamp in DB
            }
        ])

    if (error) {
        console.error("Error inserting into DB:", error);
        return null;
    }
}

async function getHistory(chatId) {
    if (!chatId) return [];

    try {
        const { data, error } = await supabase
            .from('history')
            .select('*')
            .eq('chatId', chatId)
            .order('created_at', { ascending: true }); // optional: order by creation time
        if (error) {
            console.error('Supabase fetch error:', error.message);
            return [];
        }
        return data; // returns array of history objects
    } catch (err) {
        console.error('Unexpected error:', err);
        return [];
    }
}

async function deleteEntriesByName(chatId, name) {
    if (!chatId || !name) return 0;

    // First find how many we are deleting (optional, for better UX)
    // or just delete directly. Let's delete directly and return count if possible.
    // Supabase delete returns data.

    const { data, error } = await supabase
        .from('history')
        .delete()
        .eq('chatId', chatId)
        .ilike('name', name) // case-insensitive match
        .select();

    if (error) {
        console.error("Error deleting from DB:", error);
        return 0;
    }

    return data ? data.length : 0;
    return data ? data.length : 0;
}

// Ledger Logic
async function getDebtBalance(chatId, name) {
    if (!chatId || !name) return null;

    try {
        const { data, error } = await supabase
            .from('debt_track')
            .select('*')
            .eq('chatId', chatId) // Quoted identifier in DB, usually maps to normal JS prop
            .ilike('name', name)
            .maybeSingle();

        if (error) {
            console.error("Error fetching balance:", error);
            return null; // Treat as 0 or null
        }
        return data;
    } catch (err) {
        console.error("Exception in getDebtBalance:", err);
        return null;
    }
}

// Notification Helper
const { sendTextMessage } = require("../utils/telegramApi");

async function notifyPayer(phone, shopkeeperName, amount, action, balance) {
    if (!phone) return;

    try {
        // 1. Find payer chatId by phone
        const { data: user, error } = await supabase
            .from('users')
            .select('chatId, name')
            .eq('phone', phone)
            .maybeSingle();

        if (error || !user || !user.chatId) {
            console.log(`Payer with phone ${phone} not found in users table.`);
            return;
        }

        // 2. Construct Message
        let msg = "";
        const amountVal = Math.abs(amount);

        if (action === 'ADD') {
            msg = `🔔 *New Debt Added*\n\n👤 *${shopkeeperName || 'Shopkeeper'}* added a debt of ₹${amountVal}.\n📊 Your Net Balance with them: ₹${balance}`;
        } else if (action === 'PAYMENT') {
            msg = `📉 *Payment Recorded*\n\n👤 *${shopkeeperName || 'Shopkeeper'}* recorded a payment of ₹${amountVal}.\n📊 Your Net Balance with them: ₹${balance}`;
        } else if (action === 'CLEAR') {
            msg = `✅ *Debt Cleared*\n\n👤 *${shopkeeperName || 'Shopkeeper'}* cleared your dues.`;
        }

        if (msg) {
            await sendTextMessage(user.chatId, msg);
            console.log(`Notification sent to payer ${user.name} (${user.chatId})`);
        }

    } catch (err) {
        console.error("Error sending notification to payer:", err);
    }
}

async function updateDebtBalance(chatId, name, amountChange, dueDate = null, phone = null, shopkeeperName = null) {
    if (!chatId || !name) return 0;

    // 1. Get current record
    const currentRecord = await getDebtBalance(chatId, name);

    let newAmount = amountChange;
    let finalDueDate = dueDate;
    let finalPhone = phone;

    // Conversions: Database 'amount' is TEXT, so we parse float
    if (currentRecord) {
        const currentVal = parseFloat(currentRecord.amount);
        newAmount = (isNaN(currentVal) ? 0 : currentVal) + parseFloat(amountChange);
        if (!finalDueDate) finalDueDate = currentRecord.dueDate;
        if (!finalPhone) finalPhone = currentRecord.phone; // Keep existing phone if not provided
    }

    // Convert back to string if column is text, though drivers usually handle it.
    // Let's be explicit.
    const upsertData = {
        chatId: chatId,
        name: name,
        amount: String(newAmount), // Store as text per schema
        dueDate: finalDueDate,
        phone: finalPhone
    };

    // Manual Upsert Logic because constraints/indexes might be tricky
    let error;
    let data;

    if (currentRecord && currentRecord.id) {
        // Update existing
        const res = await supabase
            .from('debt_track')
            .update({ amount: String(newAmount), dueDate: finalDueDate, phone: finalPhone })
            .eq('id', currentRecord.id)
            .select();
        error = res.error;
        data = res.data;
    } else {
        // Insert new
        const res = await supabase
            .from('debt_track')
            .insert(upsertData)
            .select();
        error = res.error;
        data = res.data;
    }

    if (error) {
        console.error("Error updating debt_track:", error);
    } else {
        // Notify Payer if we have a phone number (either new or existing)
        // Determine action type
        const action = amountChange > 0 ? 'ADD' : 'PAYMENT';
        if (finalPhone) {
            // We need shopkeeper name to be passed or fetched. 
            // For now, let's accept it as arg.
            await notifyPayer(finalPhone, shopkeeperName, amountChange, action, newAmount);
        }
    }

    return newAmount;
}

async function clearDebtTracker(chatId, name, shopkeeperName = null) {
    // Need to fetch phone before deleting to notify
    let phoneToNotify = null;
    const { data: record } = await supabase.from('debt_track').select('phone').eq('chatId', chatId).ilike('name', name).maybeSingle();
    if (record) phoneToNotify = record.phone;

    const { error } = await supabase
        .from('debt_track')
        .delete()
        .eq('chatId', chatId)
        .ilike('name', name);

    if (!error && phoneToNotify) {
        await notifyPayer(phoneToNotify, shopkeeperName, 0, 'CLEAR', 0);
    }

    return !error;
}


async function getAllDebts(chatId) {
    const { data, error } = await supabase
        .from('debt_track')
        .select('*')
        .eq('chatId', chatId)
        .order('name', { ascending: true }); // Alphabetical order

    if (error) {
        console.error("Error fetching all debts:", error);
        return [];
    }
    return data;
}

async function deleteEntryById(id) {
    const { error } = await supabase
        .from('history')
        .delete()
        .eq('id', id);

    return !error;
}

async function deleteAllHistory(chatId) {
    if (!chatId) return false;

    // Delete from history
    const { error: historyError } = await supabase
        .from('history')
        .delete()
        .eq('chatId', chatId);

    // Delete from ledger
    const { error: debtError } = await supabase
        .from('debt_track')
        .delete()
        .eq('chatId', chatId);

    if (historyError || debtError) {
        console.error("Error clearing history:", historyError, debtError);
        return false;
    }
    return true;
}

module.exports = { saveEntry, getHistory, deleteEntriesByName, updateDebtBalance, getDebtBalance, clearDebtTracker, getAllDebts, deleteEntryById, deleteAllHistory };
