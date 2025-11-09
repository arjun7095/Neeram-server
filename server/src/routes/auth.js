const express = require('express');
const { sendOTP, verifyOTP } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');

const router = express.Router();

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);

router.get('/me', protect, async (req, res) => {
  const user = await User.findOne({ phone: req.user.phone });
  res.json({ user });
});

module.exports = router;