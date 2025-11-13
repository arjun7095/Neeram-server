require('dotenv').config();
const express = require('express');
const { sendOTP, verifyOTP } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const { verifyToken } = require('../utils/jwt');
// const rateLimit = require('express-rate-limit');
// const MongoStore = require('rate-limit-mongo');

const router = express.Router();
// // Rate Limit Store (MongoDB)
// const limiter = rateLimit({
//   store: new MongoStore({
//     uri: process.env.DOCUMENTDB_URI,
//     collectionName: 'rateLimits',
//     expireTimeMs: 2 * 60 * 1000, // 2 min TTL
//   }),
//   windowMs: 2 * 60 * 1000,
//   max: 3,
//   standardHeaders: false,
//   legacyHeaders: false,

//   keyGenerator: (req) => {
//     const { countryCode, mobile, role } = req.body;
//     return `${countryCode}-${mobile}-${role}`;
//   },

//   // ---- WORKING HANDLER: Use store.get() ----
//   handler: async (req, res) => {
//     const key = `${req.body.countryCode}-${req.body.mobile}-${req.body.role}`;
//     const store = req.rateLimit?.store; // ← MongoStore instance

//     if (!store || typeof store.get !== 'function') {
//       return res.status(500).json({
//         error: 'Rate limiting misconfigured.',
//         otpStatus: false,
//       });
//     }

//     try {
//       const result = await store.get(key);

//       if (!result) {
//         // Should not happen, but safe fallback
//         return res.status(429).json({
//           error: 'Rate limit exceeded. Try again later.',
//           otpStatus: false,
//         });
//       }

//       const { totalHits, resetTime } = result;
//       const now = Date.now();
//       const retryAfterSec = Math.max(0, Math.ceil((resetTime - now) / 1000));

//       return res.status(429).json({
//         error: `Too many OTP requests. Please try again after ${retryAfterSec} second${retryAfterSec !== 1 ? 's' : ''}.`,
//         retryAfter: retryAfterSec,
//         attemptsUsed: totalHits,
//         maxAttempts: 3,
//         otpStatus: false,
//       });
//     } catch (err) {
//       console.error('Rate limit store error:', err);
//       return res.status(500).json({
//         error: 'Failed to check rate limit.',
//         otpStatus: false,
//       });
//     }
//   },

//   skip: (req) => {
//     const { countryCode, mobile, role } = req.body;
//     return !countryCode || !mobile || !role ||
//            !/^\d{10}$/.test(mobile) ||
//            !['user', 'driver'].includes(role);
//   },
// });

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);

router.get('/me', protect, async (req, res) => {
  const user = await User.findOne({ phone: req.user.phone });
  res.json({ user });
});

//Refresh Token Endpoint (Optional)
router.post('/refresh-token', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.status(401).json({ error: 'No refresh token.' });

  const payload = verifyToken(refreshToken);
  if (!payload) return res.status(401).json({ error: 'Invalid refresh token.' });

  const user = await User.findById(payload.userId);
  if (!user || user.refreshToken !== refreshToken) {
    return res.status(401).json({ error: 'Token revoked.' });
  }

  const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens({
    userId: user._id,
    mobile: user.mobile,
    countryCode: user.countryCode,
    role: user.role,
  });

  user.refreshToken = newRefreshToken;
  await user.save();

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ accessToken: newAccessToken });
});

module.exports = router;