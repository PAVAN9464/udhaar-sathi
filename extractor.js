const chrono = require("chrono-node");
const nlp = require("compromise");

function extractAmount(text) {
    const amountRegex = /(?:rs\.?|₹)?\s?(\d+(?:\.\d+)?)/i;
    const match = text.match(amountRegex);
    return match ? parseFloat(match[1]) : null;
}

function extractPhone(text) {
    const phoneRegex = /(?:\+91[-\s]?)?[6-9]\d{9}/g;
    const match = text.match(phoneRegex);
    return match ? match[0] : null;
}

function extractDueDate(text) {
    const parsed = chrono.parseDate(text);
    return parsed || null;
}

function extractName(text) {
    let cleanText = text
        .replace(/(?:rs\.?|₹)?\s?\d+(?:\.\d+)?/gi, "")
        .replace(/(?:\+91[-\s]?)?[6-9]\d{9}/g, "")
        .replace(/\b(on|by|in)\b.*/gi, "");

    const doc = nlp(cleanText);
    const persons = doc.people().out('array');

    if (persons.length > 0) return persons[0];

    const fallback = cleanText.match(/(?:to|from|by|give|pay)\s+([A-Za-z]+)/i);
    return fallback ? fallback[1] : null;
}

function extractAll(text) {
    return {
        name: extractName(text),
        amount: extractAmount(text),
        dueDate: extractDueDate(text),
        phone: extractPhone(text)
    };
}

module.exports = {
    extractAmount,
    extractPhone,
    extractDueDate,
    extractName,
    extractAll
};
