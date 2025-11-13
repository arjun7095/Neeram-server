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

  // Validation: Check for required fields
  if (!countryCode || !mobile || !role) {
    return res.status(400).json({
      error: 'Missing required fields: countryCode, mobile, and role are required.',
      otpStatus: false,
    });
  }

  // Validation: Mobile must be exactly 10 digits
  if (!/^\d{10}$/.test(mobile)) {
    return res.status(400).json({
      error: 'Mobile number must be exactly 10 digits.',
      otpStatus: false,
    });
  }

  // Validation: Country code should be a string starting with '+' followed by digits (basic check)
  if (!/^\+\d{1,3}$/.test(countryCode)) {
    return res.status(400).json({
      error: 'Invalid countryCode format. It should be like +1, +91, etc.',
      otpStatus: false,
    });
  }

  // Validation: Role must be one of 'user' or 'driver'
  if (!['user', 'driver'].includes(role)) {
    return res.status(400).json({
      error: 'Invalid role. Must be one of: user, driver.',
      otpStatus: false,
    });
  }

  try {
    // Check for existing OTP that hasn't expired
    const existingOTP = await OTP.findOne({ countryCode, mobile, role });

    if (existingOTP) {
      // If exists, return the existing OTP with message
      return res.status(200).json({
        countryCode,
        mobile,
        role,
        otp: existingOTP.otp,
        message: 'OTP already sent',
        otpStatus: true,
      });
    }

    // Generate new 6-digit OTP
    const otp = generateOTP();

    // Store new OTP in MongoDB
    const newOTP = new OTP({ countryCode, mobile, role, otp });
    await newOTP.save();

    // In a real application, send OTP via SMS/email here (e.g., using Twilio or Nodemailer).
    // For this example, we're simulating by storing and returning it.

    // Success response for new OTP
    return res.status(200).json({
      countryCode,
      mobile,
      role,
      otp,
      message:"OTP Sent",
      otpStatus: true,
    });
  } catch (error) {
    console.error('Error processing OTP:', error);
    return res.status(500).json({
      error: 'Internal server error while processing OTP.',
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

  // === 1. Validate Required Fields ===
  if (!countryCode || !mobile || !role || !otp) {
    return res.status(400).json({
      error: 'All fields are required: countryCode, mobile, role, otp',
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

  // === 3. OTP: exactly 6 digits ===
  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({
      error: 'OTP must be exactly 6 digits.',
      otpStatus: false,
    });
  }

  // === 4. Country code format ===
  if (!/^\+\d{1,3}$/.test(countryCode)) {
    return res.status(400).json({
      error: 'Invalid countryCode format (e.g., +91)',
      otpStatus: false,
    });
  }

  // === 5. Role validation ===
  if (!['user', 'driver'].includes(role)) {
    return res.status(400).json({
      error: 'Invalid role. Must be "user" or "driver".',
      otpStatus: false,
    });
  }

  try {
    // === 6. Find OTP in DB ===
    const storedOTP = await OTP.findOne({ countryCode, mobile, role });

    if (!storedOTP) {
      return res.status(404).json({
        error: 'OTP not found or already expired.',
        otpStatus: false,
      });
    }

    // === 7. Compare OTP (string comparison) ===
    if (storedOTP.otp !== otp) {
      return res.status(401).json({
        error: 'Invalid OTP.',
        otpStatus: false,
      });
    }

    // === Delete OTP (one-time use) ===
    await OTP.deleteOne({ _id: storedOTP._id });

    // === Find or Create User ===
    let user = await User.findOne({ mobile });
    if (!user) {
      user = await User.create({ countryCode, mobile, role });
    } else {
      // Update role/country if changed
      user.countryCode = countryCode;
      user.role = role;
      await user.save();
    }

    // === Generate JWT Tokens ===
    const payload = {
      userId: user._id,
      mobile: user.mobile,
      countryCode: user.countryCode,
      role: user.role,
    };

    const { accessToken, refreshToken } = generateTokens(payload);

    // === Store Refresh Token ===
    user.refreshToken = refreshToken;
    await user.save();

    // === Set HttpOnly Cookie (Secure in production) ===
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // === SUCCESS: Return Access Token + User Info ===
    return res.status(200).json({
      message: 'Login successful!',
      accessToken,
      user: {
        userId: user._id,
        mobile: user.mobile,
        countryCode: user.countryCode,
        role: user.role,
      },
      otpStatus: true,
    });

  } catch (error) {
    console.error('OTP verify + login error:', error);
    return res.status(500).json({ error: 'Server error.', otpStatus: false });
  }
};

module.exports = { sendOTP, verifyOTP };