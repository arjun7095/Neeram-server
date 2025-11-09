const { initiateAuth, respondToAuthChallenge } = require('../config/cognito');
const { sendEmail } = require('../config/ses');
const User = require('../models/User');

const sendOTP = async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone required' });

  try {
    // const data = await initiateAuth(phone, process.env.COGNITO_CLIENT_ID);
    // res.json({ message: 'OTP sent', session: data.Session });
    res.json({ message: 'OTP sent' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const verifyOTP = async (req, res) => {
//   const { phone, code, session } = req.body;
  const { phone, code} = req.body;
//   if (!phone || !code || !session) return res.status(400).json({ error: 'Missing fields' });

  try {
    // const result = await respondToAuthChallenge(phone, code, session, process.env.COGNITO_CLIENT_ID);
    // const sub = result.ChallengeParameters.sub;
    // const email = result.ChallengeParameters.email || `${phone.replace('+', '')}@yourapp.com`;

    // const user = await User.findOneAndUpdate(
    //   { phone },
    //   { phone, cognitoSub: sub, email },
    //   { upsert: true, new: true }
    // );

    // Optional: Send Welcome Email
    // try {
    //   await sendEmail(
    //     email,
    //     'Welcome!',
    //     `<h1>Hi!</h1><p>Login successful with ${phone}</p>`,
    //     `Login successful with ${phone}`
    //   );
    // } catch (emailErr) {
    //   console.warn('Email failed (non-critical):', emailErr.message);
    // }

    if (code==1234) return res.json({
      message: 'Login successful',
    //   token: result.AuthenticationResult.IdToken,
    //   user: { id: user._id, phone: user.phone, email: user.email },
    });
  } catch (err) {
    res.status(400).json({ error: 'Invalid OTP' });
  }
};

module.exports = { sendOTP, verifyOTP };