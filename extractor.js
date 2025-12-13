const chrono = require("chrono-node");
const nlp = require("compromise");
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();

// 1️⃣ Extract Name — using Person tag, fallback to Noun
function extractName(text) {
    if (!text || typeof text !== 'string') return null;
    const doc = nlp(text);

    // First try to find a Person (capitalized names usually)
    let subjects = doc.people().out('array');

    if (subjects.length === 0) {
        // Fallback to Nouns but exclude common non-name nouns if possible
        // For now, just take the first Noun that isn't a date/number
        subjects = doc.match('#Noun').not('#Date').not('#Value').out('array');
    }

    // Filter out "rupees", "rs", "history", "login" if they strictly match
    const invalidNames = ['rupees', 'rs', 'history', 'login', 'clear', 'paid', 'verify', 'summary', 'help', 'delete'];
    const filtered = subjects.filter(s => !invalidNames.includes(s.toLowerCase()));

    return filtered.length > 0 ? filtered[0] : null;
}

// 2️⃣ Extract Amount — number BEFORE/AFTER rs / rupees / ₹, or just a standalone number if context implies
function extractAmount(text) {
    if (!text || typeof text !== 'string') return null;
    // 1. Explicit currency: "500rs", "rs 500", "₹500"
    const explicitRegex = /(?:rs\.?|rupees|₹)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:rs\.?|rupees|₹)/i;
    const match = text.match(explicitRegex);

    if (match) {
        return parseFloat(match[1] || match[2]);
    }

    // 2. Implicit if keywords like "pay", "owe", "gave" exist? 
    // Risky, but if we found a number and it's the only number...
    // Let's stick to explicit for now to avoid catching "2 days".
    // Or check if there is a number that is NOT part of a phone / date.

    return null;
}

// 3️⃣ Extract Phone — strict 10 digits (Indian pattern), allows +91 or 91
function extractPhone(text) {
    if (!text) return null;
    // Matches:
    // 1. Optional +91 or 91
    // 2. 6-9 followed by 9 digits
    const match = text.match(/(?:\+?91|91)?\s?([6-9][0-9]{9})\b/);
    return match ? match[1] : null; // match[1] captures the 10 digits
}

// 4️⃣ Extract Due Date — chrono
function extractDueDate(text) {
    if (!text) return null;
    return chrono.parseDate(text) || null;
}

// 5️⃣ Combined Extractor
function extractAll(text) {
    if (!text) return { name: null, amount: null, phone: null, dueDate: null, intent: null };
    return {
        name: extractName(text),
        amount: extractAmount(text),
        phone: extractPhone(text),
        dueDate: extractDueDate(text),
        intent: extractIntent(text)
    };
}

function containsHistory(sentence) {
    if (!sentence || typeof sentence !== 'string') return false;

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
    if (!text) return 'CREDIT';
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
