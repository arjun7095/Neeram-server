// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  countryCode: String,
  mobile: { type: String, unique: true },
  role: { type: String, enum: ['user', 'driver'] },
  refreshToken: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);