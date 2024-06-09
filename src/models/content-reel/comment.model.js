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
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    index: true
  },
  hasText: {
    type: Boolean,
    required: true,
    default: false,
  },
  textContent: {
    type: String,
  },
  media: {
    url: {
      type: String
    },
    type: {
      type: String,
    }
  },
  mediaUrl: {
    type: String,
  },
  hasMedia: {
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