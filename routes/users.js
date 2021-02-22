const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');
require('dotenv').config();

const User = require('../models/User');
const Score = require('../models/Score');

// @route   GET api/users
// @desc    Get all users
// @access  Private
router.get('/', auth, async (req,res) => {
  try {
    // Gets all users and sort by date
    const users = await User.find().select('-password -createdAt -updatedAt').sort({ _id: '-1' });
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/users/:id
// @desc    Get a user
// @access  Private
router.get('/:id', auth, async (req,res) => {
  try {
    // Gets user by id
    const user = await User.findById(req.params.id).select('-password -createdAt -updatedAt');
    if(!user) {
      return res.status(400).json({ msg: 'User does not exists.' });
    } 
    
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/users
// @desc    Register a user
// @access  Public
router.post('/', [  
  check('username', 'Please enter username').not().isEmpty(),
  check('password', 'Password must be > 6 characters.').isLength({ min: 6 })
  ] , async (req,res) => {
  const errors = validationResult(req);

  // If there are errors in validation
  if(!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;
    
  try {
    // Finds a user that is using the 'username'
    let user = await User.findOne({ username }).select("username");

    // Checks if that user exists
    if(user) {
      return res.status(400).json({ msg: 'User already exists.' });
    }

    // If user doesn't exist
    user = new User({
      username,
      password
    });

    // Generate salt for password
    const salt = await bcrypt.genSalt(12);
    // Hash the password
    user.password = await bcrypt.hash(password, salt);
    // Save user to database
    await user.save();

    // User Payload for Token
    const payload = {
      user: {
        id: user.id
      }
    }

    // Generate JWT Token
    jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: 360000
    }, (err, token) => {
      // Throws error if there are errors
      if(err) throw err;
      // Sends back the token
      res.json({ token });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/users/update/username/:id
// @desc    Update user's username
// @access  Private
router.put('/update/username/:id', [ auth, [
  check('username', 'Please enter username').not().isEmpty()
  ] ], async (req,res) => {
  const errors = validationResult(req);

  // If there are errors in validation
  if(!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Destructure
  const { username } = req.body;

  const usernameField = { username };

  try {
    // Find user that matches the id
    let user = await User.findOne({ username });

    // If user does not exists
    if(user) {
      return res.status(404).json({ msg: 'Username is already taken by another user.' });
    } 
    else {
      // Update the username in Users database
      let updated_user = await User.findByIdAndUpdate(req.params.id, { $set: usernameField }, { new: true }).select('-password -score');
      // Update the username in Score database
      await Score.findOneAndUpdate({ userId: req.params.id }, { $set: usernameField }, { new: true }).select('-password -score');
      res.json(updated_user);
    } 
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/users/update/password/:id
// @desc    Update user's Password
// @access  Private
router.put('/update/password/:id', [ auth, [
  check('currentPassword', 'Password must be > 6 characters.').isLength({ min: 6 }),
  check('newPassword', 'Password must be > 6 characters.').isLength({ min: 6 })
  ] ], async (req,res) => {
  const errors = validationResult(req);

  // If there are errors in validation
  if(!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Destructure password
  const { currentPassword, newPassword } = req.body;

  // Find user that matches the id
  let user = await User.findById(req.params.id);

  try {
    // If user exists then compare user input password to current password in database
    let isMatch = await bcrypt.compare(currentPassword, user.password);

    // If passwords doesn't match then update password
    if(!isMatch) {
      return res.status(400).json({ msg: 'Current password is incorrect. Please try again.' });
    } else {
      // Generate salt for new password
      const salt = await bcrypt.genSalt(12);

      // Hash the new password
      const updatedPassword = await bcrypt.hash(newPassword, salt);

      const passwordField = { password: updatedPassword };
      
      // Update the password in Users database
      await User.findByIdAndUpdate(req.params.id, { $set: passwordField }, { new: true });
      res.json({ msg: 'success'});
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/users
// @desc    Delete a user
// @access  Private
router.delete('/:id', auth, async (req,res) => {
  // Find the user by id
  let user = await User.findById(req.params.id).select('username password');

  if(!user) {
    return res.status(404).json({ msg: 'User not found' });
  }

  // IF user exists then check if user owns the user account
  const userId = req.headers.userId;
  let userMatch = userId === req.params.userId;

  if(!userMatch) {
    return res.status(400).json({ msg: 'The account does not belong to you.' });
  } else {

    // If user exists then compare user input password to current password in database
    let isMatch = await bcrypt.compare(req.headers.password, user.password);
    
    if(!isMatch) {
      return res.status(400).json({ msg: 'Incorrect password'});
    } else {
      try {
        // Delete user in Users collections
        await User.findByIdAndDelete(req.params.id);
        // Delete user in Scores collections
        await Score.findOneAndDelete({ userId: req.params.id });

        res.json({ msg: 'User deleted' });
      } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
      }
    }
  }
});

module.exports = router;