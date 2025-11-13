// middleware/auth.js
const { verifyToken } = require('../utils/jwt');

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token.' });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  req.user = payload;
  next();
};

module.exports = { protect };