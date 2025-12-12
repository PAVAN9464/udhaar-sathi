const chrono = require("chrono-node");
const nlp = require("compromise");

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
    };
}

// TEST
const text = "Ramesh 9876543210 has to pay 300rs in 3 days";
console.log("Name:", extractName(text));
console.log("Amount:", extractAmount(text));
console.log("Phone:", extractPhone(text));
console.log("Due Date:", extractDueDate(text));

module.exports = {
    extractName,
    extractAmount,
    extractPhone,
    extractDueDate,
    extractAll
};
