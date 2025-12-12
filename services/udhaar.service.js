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
}

module.exports = { saveEntry, getHistory, deleteEntriesByName };
