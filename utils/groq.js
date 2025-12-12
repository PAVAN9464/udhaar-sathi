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

module.exports = { transcribeAudio };
