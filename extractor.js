const chrono = require("chrono-node");
const nlp = require("compromise");
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();

// 1️⃣ Extract Name — using Person tag, fallback to Noun
// 1️⃣ Extract Name — using Person tag, fallback to Noun -> Uppercase
function extractName(text) {
    if (!text || typeof text !== 'string') return null;
    const doc = nlp(text);

    // First try to find a Person (capitalized names usually)
    // .text() gives the raw text of the match, preserving spaces for full names
    let subjects = doc.people().out('array');

    if (subjects.length === 0) {
        // Fallback: nouns that look like names (Title case words)
        // We look for consecutive TitleCase words to catch "Ramesh Nayak"
        const titleCase = text.match(/[A-Z][a-z]+(?:\s[A-Z][a-z]+)*/g);
        if (titleCase) {
            // Filter out common keywords
            const invalidNames = ['Rupees', 'Rs', 'History', 'Login', 'Clear', 'Paid', 'Verify', 'Summary', 'Help', 'Delete', 'Pay'];
            const filtered = titleCase.filter(s => !invalidNames.includes(s));
            if (filtered.length > 0) subjects = [filtered[0]];
        }
    }

    // Final fallback to just nouns if still nothing, but be careful
    if (subjects.length === 0) {
        subjects = doc.match('#Noun').not('#Date').not('#Value').out('array');
    }

    // Filter out blocklist
    const invalidNames = ['rupees', 'rs', 'history', 'login', 'clear', 'paid', 'verify', 'summary', 'help', 'delete', 'pay', 'amount'];
    const filtered = subjects.filter(s => !invalidNames.includes(s.toLowerCase()));

    // Return UPPERCASE
    return filtered.length > 0 ? filtered[0].toUpperCase() : null;
}

// 2️⃣ Extract Amount — number BEFORE/AFTER rs / rupees / ₹, or just a standalone number if context implies
// 2️⃣ Extract Amount — explicit currency OR implicit number (avoiding phones/dates)
function extractAmount(text) {
    if (!text || typeof text !== 'string') return null;

    // 1. Explicit currency: "500rs", "rs 500", "₹500"
    const explicitRegex = /(?:rs\.?|rupees|₹)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:rs\.?|rupees|₹)/i;
    const match = text.match(explicitRegex);

    if (match) {
        return parseFloat(match[1] || match[2]);
    }

    // 2. Implicit Number
    // Strategy: Find numbers that are NOT:
    // - Part of a phone number (10 digits starting with 6-9)
    // - Followed by date/time units (days, months, years, hrs, mins)

    const words = text.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
        const w = words[i];
        const val = parseFloat(w);
        if (!isNaN(val)) {
            // Check if it looks like a phone number (10 digits)
            if (/^[6-9]\d{9}$/.test(w)) continue; // It's a phone number

            // Check if next word is a time unit
            if (i + 1 < words.length) {
                const nextWord = words[i + 1].toLowerCase();
                if (['day', 'days', 'week', 'weeks', 'month', 'months', 'year', 'years', 'hr', 'min'].some(u => nextWord.startsWith(u))) {
                    continue; // It's a date/time
                }
            }

            // If we passed checks, this is likely the amount
            return val;
        }
    }

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
const text = "Ramesh Nayak 9876121235 has to pay 300 in 3 days";
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
