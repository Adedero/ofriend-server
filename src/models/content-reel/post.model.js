const mongoose = require('mongoose');
const PostSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true
  },
  textContent: {
    type: String,
  },
  media: [
    {
      url: {
        type: String
      },
      type: {
        type: String,
      } 
    }
  ],
  likes: {
    type: Number,
    required: true,
    default: 0
  },
  comments: {
    type: Number,
    required: true,
    default: 0,
  },
  reposts: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    required: true,
    enum: ['PUBLIC', 'PRIVATE', 'FOLLOWERS'],
    default: 'PUBLIC',
    index: true,
  },
  isVisibleToViewer: {
    type: Boolean,
    required: true,
    default: true
  },
  hasText: {
    type: Boolean,
    required: true,
    default: false
  },
  hasMedia: {
    type: Boolean,
    required: true,
    default: false
  },
  isEdited: {
    type: Boolean,
    required: true,
    default: false
  },
  isReposting: {
    type: Boolean,
    required: true,
    default: false
  },
  repostedPost: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
  },
  isLikedByViewer: {
    type: Boolean,
    required: true,
    default: false
  },
  isOpenForComments: {
    type: Boolean,
    required: true,
    default: true
  },
  isViewedByAuthor: {
    type: Boolean,
    required: true,
    default: false
  }
});

PostSchema.set('timestamps', true);

const Post = mongoose.model('Post', PostSchema);

module.exports = Post;