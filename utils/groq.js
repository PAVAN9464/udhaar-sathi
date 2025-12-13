const Groq = require("groq-sdk");
const fs = require("fs");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function transcribeAudio(filePath) {
    if (!process.env.GROQ_API_KEY) {
        console.error("GROQ_API_KEY is missing in environment variables!");
        return null;
    }

    try {
        console.log(`Sending audio to Groq: ${filePath} (${fs.statSync(filePath).size} bytes)`);

        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: "whisper-large-v3-turbo",
            response_format: "json",
            language: "en",
            temperature: 0.0,
        });

        console.log("Groq Response:", transcription);
        return transcription.text;
    } catch (error) {
        console.error("Groq Transcription Error (Details):", error?.message || error);
        return null;
    }
}

async function generateRoast(ledgerContext) {
    if (!process.env.GROQ_API_KEY) return "I can't roast you because I don't have a brain (API Key missing).";

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a witty, sarcastic financial advisor. You are given a summary of debts. Roast the user based on their lending/borrowing habits. Be funny but not mean-spirited. Keep it short (under 50 words)."
                },
                {
                    role: "user",
                    content: `Here is my ledger status:\n${ledgerContext}\n\nRoast me.`
                }
            ],
            model: "llama-3.3-70b-versatile",
        });

        return completion.choices[0]?.message?.content || "I'm speechless.";
    } catch (error) {
        console.error("Groq Roast Error:", error?.message || error);
        return "I tried to come up with a joke but failed. Just like your financial planning.";
    }
}

async function analyzeDebtImage(imageUrl) {
    if (!process.env.GROQ_API_KEY) return null;

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Extract a JSON list of debts from this image. Format: [{ \"name\": \"John\", \"amount\": 100 }]. Ignore crossed-out text. Combine multiple amounts for same person into separate entries." },
                        { type: "image_url", image_url: { url: imageUrl } }
                    ]
                }
            ],
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            response_format: { type: "json_object" }
        });

        const jsonStr = completion.choices[0]?.message?.content;
        return jsonStr ? JSON.parse(jsonStr) : null;
    } catch (error) {
        console.error("Groq Vision Error:", error?.message || error);
        return null;
    }
}

async function extractTransactionDetails(text) {
    if (!process.env.GROQ_API_KEY) return null;

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `Extract debt transaction details from text. Return JSON: { "name": string, "amount": number, "intent": "DEBIT"|"CREDIT" }

Rules:
- "name": Person's full name (Capitalized)
- "amount": Numeric value
- "intent": Based on who is giving/receiving money:

CREDIT (someone owes user money):
- "Ramesh 500" = User gave Ramesh 500 → CREDIT
- "Lent Suresh 1000" = User lent money → CREDIT
- "Given to Ramesh 500" = User gave money → CREDIT

DEBIT (payment that reduces debt):
- "Ramesh paid 300" = Ramesh gave user 300 → DEBIT
- "Received 200 from Ramesh" = User received from Ramesh → DEBIT  
- "Ramesh returned 500" = Ramesh gave back money → DEBIT
- "Got 400 from Suresh" = User got money from Suresh → DEBIT

Key: If PERSON'S NAME is doing the paying/giving → DEBIT
     If USER is doing the paying/giving → CREDIT

Return null if unclear.`
                },
                {
                    role: "user",
                    content: text
                }
            ],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            temperature: 0.0
        });

        const jsonStr = completion.choices[0]?.message?.content;
        return jsonStr ? JSON.parse(jsonStr) : null;
    } catch (error) {
        console.error("Groq Extraction Error:", error?.message || error);
        return null;
    }
}

module.exports = { transcribeAudio, generateRoast, analyzeDebtImage, extractTransactionDetails };
