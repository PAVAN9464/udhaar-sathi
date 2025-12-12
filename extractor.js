const chrono = require("chrono-node");
const nlp = require("compromise");


// 1️⃣ Extract Name → Using ONLY compromise, NO regex cleaning
function extractName(text) {
    const doc = nlp(text);

    // Prefer the grammatical subject
    const subject = doc.sentences().subjects().out('text');
    if (subject) return subject.trim();

    // Fallback → names found by NLP
    const people = doc.people().out('array');
    if (people.length > 0) return people[0];

    return null;
}


// 2️⃣ Extract Amount → MUST PRECEDE rs/rupees/₹
function extractAmount(text) {
    // Match patterns: "500rs", "500 rs", "500rupees", "500₹"
    const amountRegex = /\b([0-9]+(?:\.[0-9]+)?)\s*(rs\.?|rupees|₹)\b/i;

    const match = text.match(amountRegex);
    return match ? parseFloat(match[1]) : null;
}


// 3️⃣ Extract Phone Number → Strict 10 digits (no +91)
function extractPhone(text) {
    const phoneRegex = /\b[6-9][0-9]{9}\b/;
    const match = text.match(phoneRegex);

    return match ? match[0] : null;
}


// 4️⃣ Extract Due Date → Using chrono-node
function extractDueDate(text) {
    return chrono.parseDate(text) || null;
}


// 5️⃣ Master Extractor
function extractAll(text) {
    return {
        name: extractName(text),
        amount: extractAmount(text),
        dueDate: extractDueDate(text),
        phone: extractPhone(text)
    };
}


module.exports = {
    extractName,
    extractAmount,
    extractPhone,
    extractDueDate,
    extractAll
};
