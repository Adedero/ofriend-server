const mongoose = require('mongoose');

const CommentLikeSchema = new mongoose.Schema({
  liker: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true
  },
  comment: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Post',
    index: true
  }
});

CommentLikeSchema.set('timestamps', true);

const CommentLike = mongoose.model('CommentLike', CommentLikeSchema);

module.exports = CommentLike;