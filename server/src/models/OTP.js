const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
countryCode: { type: String, required: true },
  mobile: { type: String, required: true },
  role: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: '1m' },
});
module.exports = mongoose.model('OTP', otpSchema);