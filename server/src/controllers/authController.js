const { initiateAuth, respondToAuthChallenge } = require('../config/cognito');
const { sendEmail } = require('../config/ses');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { generateTokens } = require('../utils/jwt');


// const sendOTP = async (req, res) => {
//   const { phone } = req.body;
//   if (!phone) return res.status(400).json({ error: 'Phone required' });

//   try {
//     // const data = await initiateAuth(phone, process.env.COGNITO_CLIENT_ID);
//     // res.json({ message: 'OTP sent', session: data.Session });
//     res.json({ message: 'OTP sent' });
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// };
// Helper function to generate a 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // Ensures 6 digits
}

// Route controller for sending OTP
const sendOTP = async (req, res) => {
  const { countryCode, mobile, role } = req.body;

  // === 1. Basic Required Field Validation ===
  if (!countryCode || !mobile || !role) {
    return res.status(400).json({
      error: 'Missing required fields: countryCode, mobile, and role are required.',
      otpStatus: false,
    });
  }

  // === 2. Mobile: exactly 10 digits ===
  if (!/^\d{10}$/.test(mobile)) {
    return res.status(400).json({
      error: 'Mobile number must be exactly 10 digits.',
      otpStatus: false,
    });
  }

  // === 3. Country code format ===
  if (!/^\+\d{1,3}$/.test(countryCode)) {
    return res.status(400).json({
      error: 'Invalid countryCode format (e.g., +91)',
      otpStatus: false,
    });
  }

  // === 4. Role validation ===
  if (!['user', 'driver'].includes(role)) {
    return res.status(400).json({
      error: 'Invalid role. Must be "user" or "driver".',
      otpStatus: false,
    });
  }

  try {
    // === 5. CRITICAL: Check if mobile is already registered with a DIFFERENT role ===
    const existingUser = await User.findOne({ mobile });

    if (existingUser && existingUser.role !== role) {
      return res.status(409).json({
        error: `This mobile number is already registered as a ${existingUser.role}.`,
        message: `You cannot register as a ${role} with this number. Please use a different mobile number.`,
        conflict: {
          registeredAs: existingUser.role,
          attemptingAs: role,
          mobile: mobile,
        },
        otpStatus: false,
      });
    }

    // === 6. Check for recent unexpired OTP (same role is allowed) ===
    const existingOTP = await OTP.findOne({
      countryCode,
      mobile,
      role,
      expiresAt: { $gt: new Date() } // Only if not expired
    });

    if (existingOTP) {
      return res.status(200).json({
        countryCode,
        mobile,
        role,
        otp: existingOTP.otp, // For testing only — remove in production!
        message: 'OTP already sent recently',
        otpStatus: true,
      });
    }

    // === 7. Generate & Save New OTP ===
    const otp = generateOTP();

    const newOTP = new OTP({
      countryCode,
      mobile,
      role,
      otp,
      expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes expiry
    });
    await newOTP.save();

    // TODO: In production, send via Twilio/SNS here
    // await sendSMS(`+${countryCode}${mobile}`, `Your OTP is ${otp}`);

    console.log(`OTP for ${role} (${mobile}): ${otp}`); // For dev testing

    return res.status(200).json({
      countryCode,
      mobile,
      role,
      otp, // Remove this line in production!
      message: 'OTP sent successfully',
      otpStatus: true,
    });

  } catch (error) {
    console.error('sendOTP error:', error);
    return res.status(500).json({
      error: 'Failed to send OTP. Please try again.',
      otpStatus: false,
    });
  }
};

// const verifyOTP = async (req, res) => {
// //   const { phone, code, session } = req.body;
//   const { phone, code} = req.body;
// //   if (!phone || !code || !session) return res.status(400).json({ error: 'Missing fields' });

//   try {
//     // const result = await respondToAuthChallenge(phone, code, session, process.env.COGNITO_CLIENT_ID);
//     // const sub = result.ChallengeParameters.sub;
//     // const email = result.ChallengeParameters.email || `${phone.replace('+', '')}@yourapp.com`;

//     // const user = await User.findOneAndUpdate(
//     //   { phone },
//     //   { phone, cognitoSub: sub, email },
//     //   { upsert: true, new: true }
//     // );

//     // Optional: Send Welcome Email
//     // try {
//     //   await sendEmail(
//     //     email,
//     //     'Welcome!',
//     //     `<h1>Hi!</h1><p>Login successful with ${phone}</p>`,
//     //     `Login successful with ${phone}`
//     //   );
//     // } catch (emailErr) {
//     //   console.warn('Email failed (non-critical):', emailErr.message);
//     // }

//     if (code==1234) return res.json({
//       message: 'Login successful',
//     //   token: result.AuthenticationResult.IdToken,
//     //   user: { id: user._id, phone: user.phone, email: user.email },
//     });
//   } catch (err) {
//     res.status(400).json({ error: 'Invalid OTP' });
//   }
// };

const verifyOTP = async (req, res) => {
  const { countryCode, mobile, role, otp } = req.body;

  // === 1. Basic Validations (same as before) ===
  if (!countryCode || !mobile || !role || !otp) {
    return res.status(400).json({
      error: 'All fields are required: countryCode, mobile, role, otp',
      otpStatus: false,
    });
  }

  if (!/^\d{10}$/.test(mobile)) {
    return res.status(400).json({ error: 'Mobile number must be exactly 10 digits.', otpStatus: false });
  }

  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({ error: 'OTP must be exactly 6 digits.', otpStatus: false });
  }

  if (!/^\+\d{1,3}$/.test(countryCode)) {
    return res.status(400).json({ error: 'Invalid countryCode format (e.g., +91)', otpStatus: false });
  }

  if (!['user', 'driver'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be "user" or "driver".', otpStatus: false });
  }

  try {
    // === Find OTP ===
    const storedOTP = await OTP.findOne({ countryCode, mobile, role });

    if (!storedOTP || storedOTP.expiresAt < new Date()) {
      return res.status(404).json({
        error: 'OTP not found or expired.',
        otpStatus: false,
      });
    }

    if (storedOTP.otp !== otp) {
      return res.status(401).json({
        error: 'Invalid OTP.',
        otpStatus: false,
      });
    }

    // === Delete OTP after use ===
    await OTP.deleteOne({ _id: storedOTP._id });

    // === CRITICAL: Check if mobile already registered with DIFFERENT role ===
    const existingUser = await User.findOne({ mobile });

    if (existingUser && existingUser.role !== role) {
      // Same number, but trying to login as different role → BLOCK
      return res.status(409).json({
        error: `This mobile number is already registered as a ${existingUser.role}.`,
        message: `You cannot use a different number to register as ${role}.`,
        conflict: {
          existingRole: existingUser.role,
          attemptedRole: role,
          mobile: mobile
        },
        otpStatus: false,
      });
    }

    // === Now safe: either new user OR same role ===
    let user = existingUser;

    if (!user) {
      // First time registration → allowed
      user = await User.create({
        countryCode,
        mobile,
        role,
        isVerified: role === 'user' ? 'verified' : 'not_started',
        verificationStage: role === 'user' ? 'verified' : 'not_started',
      });
    } else {
      // Existing user with SAME role → just update countryCode if changed
      user.countryCode = countryCode;
      await user.save();
    }

    // === Generate Tokens ===
    const payload = {
      userId: user._id,
      mobile: user.mobile,
      countryCode: user.countryCode,
      role: user.role,
    };

    const { accessToken, refreshToken } = generateTokens(payload);

    user.refreshToken = refreshToken;
    await user.save();

    // Set cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // === Verification Status ===
    const verificationResponse = {
      isVerified: user.isVerified === 'verified',
      verificationStatus: user.isVerified,
      currentStage: user.verificationStage,
      rejectedReason: user.rejectedReason || null,
    };

    if (role === 'user') {
      verificationResponse.isVerified = true;
      verificationResponse.verificationStatus = 'verified';
      verificationResponse.currentStage = 'verified';
    }

    return res.status(200).json({
      message: 'Login successful!',
      accessToken,
      user: {
        userId: user._id,
        mobile: user.mobile,
        countryCode: user.countryCode,
        role: user.role,
      },
      verification: verificationResponse,
      otpStatus: true,
    });

  } catch (error) {
    console.error('OTP verify error:', error);
    return res.status(500).json({ error: 'Server error.', otpStatus: false });
  }
};

module.exports = { sendOTP, verifyOTP };