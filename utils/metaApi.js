const sendTextMessage = async (to, message) => {
  const url = `https://graph.facebook.com/v17.0/${process.env.PHONE_NUMBER_ID}/messages`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.META_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to,      // e.g., "919876543210"
        text: { body: message }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(JSON.stringify(data));
    }

    return data;
  } catch (error) {
    console.error("Error sending message:", error.message);
    throw error;
  }
};

module.exports = { sendTextMessage };
