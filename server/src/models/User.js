const mongoose = require('mongoose');

// const userSchema = new mongoose.Schema({
//   phone: { type: String, required: true, unique: true },
//   cognitoSub: String,
//   email: String,
//   createdAt: { type: Date, default: Date.now },
// });
const userSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  code: Number,
  createdAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model('User', userSchema);