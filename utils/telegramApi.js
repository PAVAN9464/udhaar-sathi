const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

async function sendTextMessage(chatId, text) {
  try {
    // If text is short, send directly
    if (text.length <= 4000) {
      await sendMessageChunk(chatId, text);
      return;
    }

    // Split text into 4000-char chunks
    const chunkSize = 4000;
    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.substring(i, i + chunkSize);
      await sendMessageChunk(chatId, chunk);
    }

  } catch (err) {
    console.error("Fetch error:", err);
  }
}

async function sendMessageChunk(chatId, text) {
  const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Error sending message:", errorData);
  }
}

module.exports = { sendTextMessage };