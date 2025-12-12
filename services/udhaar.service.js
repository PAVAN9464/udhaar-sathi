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

module.exports = { saveEntry, getHistory };
