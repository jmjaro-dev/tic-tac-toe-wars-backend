const mongoose = require('mongoose');

const ScoreSchema = mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  wins: {
    type: Number,
    required: true
  }
},
{
  timestamps: true
});

module.exports = mongoose.model('score', ScoreSchema);