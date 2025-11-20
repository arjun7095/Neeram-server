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
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Route controller for sending OTP
const sendOTP = async (req, res) => {
  const { countryCode, mobile, role } = req.body;

  if (!countryCode || !mobile || !role) {
    return res.status(400).json({ error: "All fields required", otpStatus: false });
  }
  if (!/^\d{10}$/.test(mobile)) {
    return res.status(400).json({ error: "Mobile must be 10 digits", otpStatus: false });
  }
  if (!/^\+\d{1,3}$/.test(countryCode)) {
    return res.status(400).json({ error: "Invalid country code", otpStatus: false });
  }
  if (!['user', 'partner'].includes(role)) {
    return res.status(400).json({ error: "Role must be 'user' or 'partner'", otpStatus: false });
  }

  try {
    // Prevent dual registration
    const existingUser = await User.findOne({ mobile });
    if (existingUser && existingUser.role !== role) {
      return res.status(409).json({
        error: `Already registered as ${existingUser.role}`,
        message: "Use a different number",
        otpStatus: false
      });
    }

    // Reuse recent OTP
    const recent = await OTP.findOne({ mobile, role, expiresAt: { $gt: new Date() } });
    if (recent) {
      return res.json({
        countryCode, mobile, role,
        otp: recent.otp, // Remove in production
        message: "OTP already sent",
        otpStatus: true
      });
    }

    const otp = generateOTP();
    await OTP.create({ countryCode, mobile, role, otp });

    // TODO: AWS SNS
    // const sns = new AWS.SNS();
    // await sns.publish({ Message: `Your OTP: ${otp}`, PhoneNumber: `${countryCode}${mobile}` }).promise();

    console.log(`OTP → ${mobile} (${role}): ${otp}`);

    return res.json({
      countryCode, mobile, role,
      otp, // Remove in production
      message: "OTP sent successfully",
      otpStatus: true
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error", otpStatus: false });
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

  if (!countryCode || !mobile || !role || !otp) {
    return res.status(400).json({ error: "All fields required", otpStatus: false });
  }

  try {
    const stored = await OTP.findOne({ countryCode, mobile, role });
    if (!stored || stored.expiresAt < new Date() || stored.otp !== otp) {
      return res.status(401).json({ error: "Invalid or expired OTP", otpStatus: false });
    }

    await OTP.deleteOne({ _id: stored._id });

    let user = await User.findOne({ mobile });

    if (!user) {
      user = await User.create({
        countryCode,
        mobile,
        role,
        isVerified: role === 'user' ? 'verified' : 'not_started',
      });
    }

    const payload = { userId: user._id, mobile, role: user.role };
    const { accessToken, refreshToken } = generateTokens(payload);

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // Decide next screen
    let nextAction = "";
    if (role === 'user') {
      nextAction = "UserDashboard";
    } else {
      if (user.isVerified === 'verified' && user.partnerType) {
        nextAction = "PartnerDashboard";
      } else if (user.partnerType) {
        nextAction = "PartnerOnboarding";
      } else {
        nextAction = "SelectPartnerType";
      }
    }

    return res.json({
      otpStatus: true,
      message: "Login successful!",
      accessToken,
      user: {
        userId: user._id,
        mobile: user.mobile,
        countryCode: user.countryCode,
        role: user.role
      },
      verification: {
        backgroundVerificationStatus: user.isVerified,
        rejectedReason: user.rejectedReason
      },
      partnerInfo: {
        isFirstTime: !user.partnerType,
        partnerType: user.partnerType,
        organization: user.organization,
        driverId: user.driverId
      },
      nextAction
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error", otpStatus: false });
  }
};

module.exports = { sendOTP, verifyOTP };