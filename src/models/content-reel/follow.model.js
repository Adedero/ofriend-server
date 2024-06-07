const mongoose = require('mongoose');

const FollowSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true
  },
  follower: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true
  }
});

FollowSchema.set('timestamps', true);

const Follow = mongoose.model('Follow', FollowSchema);

module.exports = Follow;
