const mongoose = require('mongoose');

const PostLikeSchema = new mongoose.Schema({
  liker: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Post',
    index: true
  }
});

PostLikeSchema.set('timestamps', true);

const PostLike = mongoose.model('PostLike', PostLikeSchema);

module.exports = PostLike;