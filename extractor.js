const chrono = require("chrono-node");
const nlp = require("compromise");
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();

// 1️⃣ Extract Name — using SUBJECT of the sentence (no plugins)
function extractName(text) {
    const doc = nlp(text);

    const subjects = doc.match('#Noun').out('array')

    return subjects[0];
}

// 2️⃣ Extract Amount — number BEFORE rs / rupees / ₹
function extractAmount(text) {
    const regex = /\b([0-9]+(?:\.[0-9]+)?)\s*(?=rs\.?|rupees|₹)/i;
    const match = text.match(regex);
    return match ? parseFloat(match[1]) : null;
}

// 3️⃣ Extract Phone — strict 10 digits (Indian pattern)
function extractPhone(text) {
    const match = text.match(/\b[6-9][0-9]{9}\b/);
    return match ? match[0] : null;
}

// 4️⃣ Extract Due Date — chrono
function extractDueDate(text) {
    return chrono.parseDate(text) || null;
}

// 5️⃣ Combined Extractor
function extractAll(text) {
    return {
        name: extractName(text),
        amount: extractAmount(text),
        phone: extractPhone(text),
        dueDate: extractDueDate(text),
        intent: extractIntent(text)
    };
}

function containsHistory(sentence) {
    if (!sentence) return false;

    const words = tokenizer.tokenize(sentence.toLowerCase());
    const target = 'history';

    // Check each word using Levenshtein distance
    for (let word of words) {
        const distance = natural.LevenshteinDistance(word, target);
        // Allow small typos: distance <= 2
        if (distance <= 2) {
            return true;
        }
    }
    return false;
}

// TEST
const text = "Ramesh 9876543210 has to pay 300rs in 3 days";
console.log("Name:", extractName(text));
console.log("Amount:", extractAmount(text));
console.log("Phone:", extractPhone(text));
console.log("Due Date:", extractDueDate(text));

// 6️⃣ Extract Intent — Credit (Add Debt) vs Debit (Payment)
function extractIntent(text) {
    const lowerText = text.toLowerCase();
    const debitKeywords = ['paid', 'received', 'settled', 'got back', 'returned', 'gave'];

    // Simple keyword match
    for (const word of debitKeywords) {
        if (lowerText.includes(word)) {
            return 'DEBIT'; // Negative amount (Payment)
        }
    }
    return 'CREDIT'; // Positive amount (Debt)
}

module.exports = {
    extractName,
    extractAmount,
    extractPhone,
    extractDueDate,
    extractAll,
    containsHistory,
    extractIntent
};
