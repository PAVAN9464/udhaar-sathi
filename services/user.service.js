const supabase = require("../config/supabase");

async function upsertUser(chatId, phone, name) {
    if (!chatId) return null;

    try {
        // Check if user exists
        const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('chatId', String(chatId))
            .maybeSingle();

        if (fetchError) {
            console.error('Error fetching user:', fetchError);
            return null;
        }

        const updates = {};
        if (phone) updates.phone = phone;
        if (name) updates.name = name;

        if (existingUser) {
            // Update if necessary
            // Only update if values are different or new
            let needsUpdate = false;
            if (phone && existingUser.phone !== phone) needsUpdate = true;
            if (name && existingUser.name !== name) needsUpdate = true;

            if (needsUpdate) {
                const { error: updateError } = await supabase
                    .from('users')
                    .update(updates)
                    .eq('id', existingUser.id);

                if (updateError) {
                    console.error('Error updating user:', updateError);
                } else {
                    console.log(`Updated user ${chatId}`);
                }
            }
            return existingUser;
        } else {
            // Insert new user
            const { data: newUser, error: insertError } = await supabase
                .from('users')
                .insert([
                    {
                        chatId: String(chatId),
                        phone: phone || null,
                        name: name || null
                    }
                ])
                .select()
                .single();

            if (insertError) {
                console.error('Error inserting new user:', insertError);
                return null;
            }
            console.log(`Created new user ${chatId}`);
            return newUser;
        }

    } catch (err) {
        console.error('Unexpected error in upsertUser:', err);
        return null;
    }
}

module.exports = { upsertUser };
