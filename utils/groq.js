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

module.exports = { transcribeAudio, generateRoast };
