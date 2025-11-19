// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  countryCode: { type: String, required: true },
  mobile: { type: String, unique: true, required: true },
  role: { type: String, enum: ['user', 'driver'], required: true },
  refreshToken: String,

  // === KYC / Document Verification Fields (mainly for drivers) ===
  isVerified: { 
    type: String, 
    enum: ['not_started', 'pending', 'rejected', 'verified'], 
    default: 'not_started' 
  },

  verificationStage: { 
    type: String, 
    enum: [
      'not_started',
      'personal_info_submitted',
      'aadhaar_submitted',
      'pan_submitted',
      'driving_license_submitted',
      'vehicle_details_submitted',
      'background_check_pending',
      'rejected',
      'verified'
    ],
    default: 'not_started'
  },

  rejectedReason: { type: String, default: null },

  // Optional: Store document references
  documents: {
    aadhaarFront: String,
    aadhaarBack: String,
    panCard: String,
    drivingLicenseFront: String,
    drivingLicenseBack: String,
    vehicleRC: String,
    vehicleInsurance: String,
    profilePhoto: String,
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update updatedAt on save
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);