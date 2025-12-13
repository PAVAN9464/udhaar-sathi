// Fun Emojis for different contexts

const emojis = {
    DEBT_ADDED: ['💸', '📉', '📝', '😬', '👀', '💳', '🧂'],
    PAYMENT: ['🤑', '💰', '🚀', '🎉', '🥂', '🍾', '😎'],
    CLEARED: ['🕊️', '✨', '🧼', '✅', '🎊', '🧘'],
    ROAST: ['🔥', '🌶️', '🥵', '🍗', '🚒'],
    ERROR: ['⚠️', '❌', '🥴', '😵', '🐛'],
    DEFAULT: ['🤖', '👋', '👾']
};

function getRandomEmoji(type) {
    const list = emojis[type] || emojis.DEFAULT;
    return list[Math.floor(Math.random() * list.length)];
}

module.exports = { getRandomEmoji };
