const mongoose = require('mongoose');

const UserSchema = mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  wins: {
    type: Number,
    default: 0
  },
  isOnline: {
    type: Boolean,
    default: false
  }
},
{
  timestamps: true
});

module.exports = mongoose.model('user', UserSchema);