const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');
require('dotenv').config();

const User = require('../models/User');
const Score = require('../models/Score');

// @route   GET api/scores
// @desc    Get all scores
// @access  Private
router.get('/', async (req,res) => {
  try {
    // Gets all scores and sort by latest scores
    const wins = await Score.find().sort({ wins: 'desc' }).select('-_id userId username wins').limit(10);
    res.json(wins);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/scores/:id
// @desc    Get of user by user id
// @access  Private
router.get('/:id', auth, async (req,res) => {
  try {
    // Check if user exists
    let user = await User.findById(req.params.id).select("username wins");

    if(!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const wins = user.wins;

    res.json(wins);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/scores/update/score/:userId
// @desc    Add Score to Leader Board / Update Score
// @access  Private
router.post('/update/score/:userId', [ auth, [
  check('username', 'Username is required').not().isEmpty(),
  check('wins', 'Wins is required').not().isEmpty()
  ] ], async (req,res) => {
  const errors = validationResult(req);

  // If there are errors in validation
  if(!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, wins } = req.body;
  
  // Check if user exists in User database
  let user = await User.findById(req.params.userId).select('username wins');
  
  if(!user) {
    return res.status(404).json({ msg: 'User not found' });
  }
  
  // Check if username matches the passed username
  let userMatch = user.username === username;
  
  if(!userMatch) {
    return res.status(400).json({ msg: 'Username did not match.' });
  } else {
    // Check if user is already in the Leader Board 
    let userFromBoard = await Score.find({ userId: req.params.userId }).select('userId');
    let isInBoard = userFromBoard.length > 0;

    // If already in the Leader board ? update score : add score to leader board
    if(isInBoard) {
      // Update User Score
      try {
        const updatedScore = user.wins + 1;
        // Create score object 
        const winsField = { wins: updatedScore };
        
        // Update User Score in scores database
        await Score.findOneAndUpdate({ userId: req.params.userId }, { $set: winsField }, { new: true })
  
        // Update User Score in user database
        await User.findByIdAndUpdate(req.params.userId, { $set: winsField }, { new: true })
  
        res.json({ msg: 'success'});
      } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
      }
    } else {
      // Add User score to Leader Board
      try {
        // Create score object 
        const playerScore = new Score({
          userId: req.params.userId,
          username,
          wins: user.wins+1
        });
        
        // Save score to Score database
        await playerScore.save();
  
        // Update User Score in user database
        const winsField = { wins };
        await User.findByIdAndUpdate(req.params.userId, { $set: winsField }, { new: true })
    
        res.json({ msg: 'success'});
      } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
      } 
    }
  }
});

module.exports = router;