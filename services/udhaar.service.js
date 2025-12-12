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
        .eq('chatId', chatId)
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

    if (currentRecord) {
        newAmount = (parseFloat(currentRecord.amount) || 0) + parseFloat(amountChange);
        // Keep old due date if new one is not provided, or update it?
        // Let's update if provided.
        if (!finalDueDate) finalDueDate = currentRecord.dueDate;
    }

    // 2. Upsert (Insert or Update)
    // We can use upsert if we have a unique constraint on (chatId, name).
    // Assuming (chatId, name) is unique or we handle it by ID if we had one.
    // For now, let's just delete and insert, or use upsert if configured.
    // Safest logic without schema knowledge: Check calculated amount.

    // If new amount is 0, should we remove it? Maybe. 
    // Let's keep it unless explicitly cleared.

    const upsertData = {
        chatId,
        name, // strict name? or normalized?
        amount: newAmount,
        dueDate: finalDueDate
    };

    // If record exists, we need matches to update.
    // If we rely on name, we should be consistent.
    // Let's try upsert on 'id' if we had it, but we don't.
    // We will do a delete (if exists) and insert to be sure, or better:

    // Supabase upsert requires primary key or unique constraint.
    // Let's assume (chatId, name) is unique.

    const { data, error } = await supabase
        .from('debt_track')
        .upsert(upsertData, { onConflict: 'chatId, name' })
        .select();

    if (error) {
        // Fallback if unique constraint fails or doesn't exist:
        // Update if exists, Insert if not.
        console.warn("Upsert failed, trying manual update/insert", error.message);

        if (currentRecord) {
            await supabase.from('debt_track').update({ amount: newAmount, dueDate: finalDueDate }).eq('id', currentRecord.id);
        } else {
            await supabase.from('debt_track').insert(upsertData);
        }
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

module.exports = { saveEntry, getHistory, deleteEntriesByName, updateDebtBalance, getDebtBalance, clearDebtTracker };
