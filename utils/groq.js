const Groq = require("groq-sdk");
const fs = require("fs");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function transcribeAudio(filePath) {
    try {
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: "distil-whisper-large-v3-en",
            response_format: "json",
            language: "en",
            temperature: 0.0,
        });
        return transcription.text;
    } catch (error) {
        console.error("Groq Transcription Error:", error);
        return null;
    }
}

module.exports = { transcribeAudio };
