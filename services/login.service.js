const crypto = require('crypto');
const { sendTextMessage } = require('../utils/telegramApi');

const otpStore = new Map();
const sessionStore = new Map(); // chatId => { loggedIn, expiresAt }

function generateOTP() {
  return crypto.randomInt(1000, 9999).toString(); // 4-digit OTP
}

const handleLoginStart = async (chatId) => {
    const otp = generateOTP();

    // Store OTP with 1-min expiry
    otpStore.set(chatId, {
      otp,
      expires: Date.now() + 1 * 60 * 1000 // 1 mins
    });

    // Send OTP directly to Telegram
    await sendTextMessage(chatId, `✅ Your OTP is: ${otp}\nIt expires in 1 minutes. Please send: verify <otp>`);

    return;
};

const handleVerifyOtp = (chatId, userOtp) => {
    const record = otpStore.get(chatId);

    if (!record) {
        return `⚠️ No OTP requested. Please send: login`;
    }

    if (Date.now() > record.expires) {
        otpStore.delete(chatId);
        return `⌛ OTP expired. Please request a new one by sending: login`;
    }

    if (record.otp !== userOtp) {
        return `❌ Incorrect OTP. Please try again.`;
    }

    // OTP correct → create session
    otpStore.delete(chatId);
    sessionStore.set(chatId, {
        loggedIn: true,
        expiresAt: Date.now() + 1 * 60 * 1000 // 1 mins session
    });

    return `🎉 OTP verified! You are now logged in for 1 minutes.`;
};

const isUserLoggedIn = (chatId) => {
  const session = sessionStore.get(chatId);
  if (!session) return false;

  if (Date.now() > session.expiresAt) {
    sessionStore.delete(chatId);
    return false;
  }

  return session.loggedIn === true;
};

module.exports = {
  handleLoginStart,
  handleVerifyOtp,
  isUserLoggedIn
};
