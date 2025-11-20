// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // Add these fields to your User model
name: String,
dob: Date,
gender: { type: String, enum: ['male', 'female', 'other'] },
  countryCode: { type: String, required: true },
  mobile: { type: String, unique: true, required: true, index: true },
  role: { 
    type: String, 
    enum: ['user', 'partner'], 
    required: true 
  },
  refreshToken: String,

  // Partner-specific fields
  partnerType: { 
    type: String, 
    enum: [null, 'individual', 'organization_owner', 'under_organization'],
    default: null 
  },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
  driverId: { type: String, unique: true, sparse: true }, // e.g. PTR-1001

  // Verification Status
  isVerified: { 
    type: String, 
    enum: ['not_started', 'pending', 'rejected', 'verified'], 
    default: 'not_started' 
  },
  rejectedReason: { type: String, default: null },

  // Documents
  documents: {
    profilePhoto: String,
    aadhaarFront: String,
    aadhaarBack: String,
    panCard: String,
    drivingLicenseFront: String,
    drivingLicenseBack: String,
    vehicleRC: String,
    vehicleInsurance: String,
    policeVerification: String,
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);