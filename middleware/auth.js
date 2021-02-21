const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = function(req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if token exists
  if(!token) {
    return res.status(401).json({ msg: 'No token, Authorization Denied' });
  }

  try {
    // Verify token if valid
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Give user acces on protected routes
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Invalid token.' });
  }
}