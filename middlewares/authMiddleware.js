// Add this after other middleware but before routes
const jwt = require('jsonwebtoken');
const User = require('../models/user')
const Tasker = require('../models/tasker')

const protectUser = async (req, res, next) => {
  let token;
  
  // Get token from headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(400).json({status: "error",  message: 'Not authorized - no token' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, "secret123");
    
    // Get user from database
    const user = await User.findById(decoded.id);
    if (!user) return res.status(400).json({status: "error",  message: 'User not found' });
    
    // Attach user to request object
    req.user = user;
    next();
  } catch (err) {
    res.status(400).json({status: "error", message: ' Invalid token' });
  }
};

const protectTasker = async (req, res, next) => {
  let token;
  
  // Get token from headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(400).json({status: "error",  message: 'Not authorized - no token' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, "secret123");
    
    // Get user from database
    const user = await Tasker.findById(decoded.id);
    if (!user) return res.status(400).json({status: "error",  message: 'User not found' });
    
    // Attach user to request object
    req.user = user;
    next();
  } catch (err) {
    res.status(400).json({status: "error", message: ' Invalid token' });
  }
};

module.exports = {
    protectUser,
    protectTasker
};