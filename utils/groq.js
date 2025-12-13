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
                    content: `You are a helper extracting debt/credit details from text.
Return a JSON object: { "name": string, "amount": number, "intent": "DEBIT"|"CREDIT" }
- "name": The full name of the person (Capitalized).
- "amount": The numeric amount.
- "intent": Determines the transaction type from the USER's perspective:
  
  CREDIT = Someone owes the user money (debt added):
  - "Ramesh 500" → CREDIT (Ramesh owes user ₹500)
  - "Given to Ramesh 500" → CREDIT (User gave Ramesh ₹500, so Ramesh owes user)
  - "Lent Suresh 1000" → CREDIT (User lent money, Suresh owes user)
  
  DEBIT = Payment received/made that reduces debt:
  - "Paid Ramesh 200" → DEBIT (User paid Ramesh, reduces what Ramesh owes user)
  - "Received 200 from Ramesh" → DEBIT (Ramesh paid user, reduces what Ramesh owes user)
  - "Ramesh paid 300" → DEBIT (Ramesh paid user, reduces his debt)
  - "Got 500 from Suresh" → DEBIT (Suresh paid user)

If not clear, return null.`
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
