const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  author: {
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
  },
  isReply: {
    type: Boolean,
    required: true,
    default: false,
    index: true,
  },
  comment: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Comment',
    index: true
  },
  textContent: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
  },
  videoUrl: {
    type: String,
  },
  hasImage: {
    type: Boolean,
    required: true,
    default: false
  },
  hasVideo: {
    type: Boolean,
    required: true,
    default: false
  },
  likes: {
    type: Number,
    required: true,
    default: 0
  },
  replies: {
    type: Number,
    required: true,
    default: 0
  },
  isLikedByViewer: {
    type: Boolean,
    required: true,
    default: false
  },
  isEdited: {
    type: Boolean,
    required: true,
    default: false
  },
});

CommentSchema.set('timestamps', true);

const Comment = mongoose.model('Comment', CommentSchema);

module.exports = Comment;