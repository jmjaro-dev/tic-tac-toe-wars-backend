const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
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
    const scores = await Score.find().sort({ _id: 'desc' });
    res.json(scores);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/scores
// @desc    Get Score by id
// @access  Private
router.get('/:id', auth, async (req,res) => {
  try {
    // Gets score by id
    const score = await Score.findById(req.params.id);
    res.json(score);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/scores
// @desc    Add Score
// @access  Private
router.post('/', [ auth, [
  check('userId', 'User ID is required').not().isEmpty(),
  check('username', 'Username is required').not().isEmpty(),
  check('score', 'Score is required').not().isEmpty()
  ] ], async (req,res) => {
  const errors = validationResult(req);

  // If there are errors in validation
  if(!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, username, score } = req.body;
    
  try {
    // Create score object 
    score = new Score({
      userId,
      username,
      score
    });

    const data = await score.save();

    res.json(data);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;