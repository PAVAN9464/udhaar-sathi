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

async function getFileLink(fileId) {
  try {
    const response = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
    const data = await response.json();
    if (data.ok) {
      return `https://api.telegram.org/file/bot${TOKEN}/${data.result.file_path}`;
    }
    return null;
  } catch (error) {
    console.error("Error getting file link:", error);
    return null;
  }
}

async function downloadFile(url, destPath) {
  const fs = require('fs');
  const { pipeline } = require('stream/promises');

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`unexpected response ${response.statusText}`);

    await pipeline(response.body, fs.createWriteStream(destPath));
    return true;
  } catch (error) {
    console.error("Error downloading file:", error);
    return false;
  }
}

async function sendPhoto(chatId, photoUrl, caption = "") {
  try {
    const response = await fetch(`${TELEGRAM_API}/sendPhoto`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption: caption
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error sending photo:", errorData);
    }
  } catch (err) {
    console.error("Fetch photo error:", err);
  }
}

module.exports = { sendTextMessage, getFileLink, downloadFile, sendPhoto };