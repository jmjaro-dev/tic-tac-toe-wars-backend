const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');
require('dotenv').config();
// User Model
const User = require('../models/User');

// @route   GET api/auth
// @desc    Get Logged in user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // Gets the user that matches the id and returns info of the user w/o the password
    const user = await User.findByIdAndUpdate(req.user.id, { $set: { isOnline: true } }, { new: true }).select('-password');
    // return user object as the response
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/auth/logout
// @desc    PUT Set isOnline to false when user Logs out
// @access  Private
router.put('/logout', auth, async (req, res) => {
  try {
    // Gets the user that matches the id and sets isOnline value to false
    const { id } = req.body;

    await User.findByIdAndUpdate(id, { $set: { isOnline: false } }, { new: true });

    res.json({ msg: "User is now offline."});
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST  api/auth
// @desc    Auth user & get token
// @access  Public
router.post('/', [
  check('username', 'Username is required').exists(),
  check('password', 'Password is required').exists()
], async (req, res) => {
  const errors = validationResult(req);
  
  if(!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  try {
    let user = await User.findOne({ username });

    // Check if user exists
    if(!user) {
      return res.status(400).json({ msg: 'User doesn\'t exists' });
    }

    // If user exists then compare password
    const isMatch = await bcrypt.compare(password, user.password);

    // If passwords doesn't match then return status 400
    if(!isMatch) {
      return res.status(400).json({ msg: 'Incorrect password' });
    }

    // User Payload
    const payload = { 
      user: {
        id: user.id
      }
    }
    
    // Generate JWT Token
    jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: 360000
    }, (err, token) => {
      if(err) throw err;
      res.json({ token });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;