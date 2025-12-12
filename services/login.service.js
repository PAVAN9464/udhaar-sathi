const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { sendTextMessage } = require('../utils/telegramApi');

const otpStore = new Map();
const sessionStore = new Map(); // chatId => { loggedIn, expiresAt }

function generateOTP() {
  return crypto.randomInt(1000, 9999).toString(); // 4 digit OTP
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { 
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS 
  },
});

const handleLoginStart = async (chatId, email) => {
    const otp = generateOTP();

    // Store OTP with 1 min expiry
    otpStore.set(chatId, {
      otp,
      email,
      expires: Date.now() + 1 * 60 * 1000
    });

    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP for Login',
      text: `Your OTP is ${otp}. It expires in 1 minutes.`,
    });

    await sendTextMessage(chatId,  `✅ OTP sent to ${email}. Please enter it as: verify <otp>`)
    return;
};

const handleVerifyOtp = (chatId, userOtp) => {
    const record = otpStore.get(chatId);

    // No OTP requested earlier
    if (!record) {
        return `⚠️ No OTP request found. Please send: login <email>`;
    }

    // Expired OTP
    if (Date.now() > record.expires) {
        otpStore.delete(chatId);
        return `⌛ OTP expired. Please request a new one by sending: login <email>`;
    }

    // Incorrect OTP
    if (record.otp !== userOtp) {
        return `❌ Incorrect OTP. Please try again.`;
    }

    // Correct OTP → clear record
    otpStore.delete(chatId);
    
    sessionStore.set(chatId, {
        loggedIn: true,
        expiresAt: Date.now() + 1 * 60 * 1000 // 1 mins
    });


    return `🎉 OTP verified successfully! You are now logged in for 1 minute.`;
};

const isUserLoggedIn = (chatId) => {
  const session = sessionStore.get(chatId);
  if (!session) return false;

  // Expired session
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
