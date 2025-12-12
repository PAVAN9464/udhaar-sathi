const translate = require('translate-google');

async function translateToEnglish(text) {
    try {
        const res = await translate(text, { to: 'en' });
        return res;
    } catch (err) {
        console.error("Translation error:", err);
        return text; // Return original if failed
    }
}

module.exports = { translateToEnglish };
