const supabase = require("../config/supabase");

async function saveEntry({ chatId, name, amount, phone, dueDate }) {
    const { error } = await supabase
        .from("history")
        .insert([
            {
                chatId,
                name,
                amount,
                phone,
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
}

async function updateDebtBalance(chatId, name, amountChange, dueDate = null) {
    // 1. Get current record
    const currentRecord = await getDebtBalance(chatId, name);

    let newAmount = amountChange;
    let finalDueDate = dueDate; // Default to new due date if provided

    // Conversions: Database 'amount' is TEXT, so we parse float
    if (currentRecord) {
        newAmount = (parseFloat(currentRecord.amount) || 0) + parseFloat(amountChange);
        if (!finalDueDate) finalDueDate = currentRecord.dueDate;
    }

    // Convert back to string if column is text, though drivers usually handle it.
    // Let's be explicit.
    const upsertData = {
        chatId: chatId,
        name: name,
        amount: String(newAmount), // Store as text per schema
        dueDate: finalDueDate
    };

    // Manual Upsert Logic because constraints/indexes might be tricky
    let error;
    let data;

    if (currentRecord && currentRecord.id) {
        // Update existing
        const res = await supabase
            .from('debt_track')
            .update({ amount: String(newAmount), dueDate: finalDueDate })
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
    }

    return newAmount;
}

async function clearDebtTracker(chatId, name) {
    const { error } = await supabase
        .from('debt_track')
        .delete()
        .eq('chatId', chatId)
        .ilike('name', name);

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

module.exports = { saveEntry, getHistory, deleteEntriesByName, updateDebtBalance, getDebtBalance, clearDebtTracker, getAllDebts, deleteEntryById };
