const chrono = require("chrono-node");
const nlp = require("compromise");

// 1️⃣ Extract Name using compromise dependency parse
function extractName(text) {
    const doc = nlp(text);
    const parsed = doc.parse();

    try {
        const sentences = parsed.sentences();
        if (sentences.length > 0) {
            const subjects = sentences[0].subjects();
            if (subjects.length > 0) {
                return subjects[0].text().trim();
            }
        }
    } catch (err) {
        console.log("subject parse error:", err);
    }

    const people = doc.people().out("array");
    if (people.length > 0) return people[0];

    return null;
}

// 2️⃣ Extract Amount → number MUST precede rs/rupees/₹
function extractAmount(text) {
    const amountRegex = /\b([0-9]+(?:\.[0-9]+)?)\s*(rs\.?|rupees|₹)\b/i;
    const match = text.match(amountRegex);

    return match ? parseFloat(match[1]) : null;
}

// 3️⃣ Extract 10-digit Indian phone
function extractPhone(text) {
    const phoneRegex = /\b[6-9][0-9]{9}\b/;
    const match = text.match(phoneRegex);

    return match ? match[0] : null;
}

// 4️⃣ Extract due date using chrono-node
function extractDueDate(text) {
    return chrono.parseDate(text) || null;
}

// 5️⃣ Wrapper
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
