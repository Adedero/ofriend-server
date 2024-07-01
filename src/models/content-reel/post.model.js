const mongoose = require('mongoose');
const PostSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true
  },
  isProduct: {
    type: Boolean,
    required: true,
    default: false,
    index: true,
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
    default: false,
    index: true
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
  mentions: [
    {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      name: {
        type: String
      }
    }
  ],
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
  },
  viewerFollowsAuthor: {
    type: Boolean,
    required: true,
    default: false
  }
});

PostSchema.set('timestamps', true);

PostSchema.pre('find', function (next) {
  this.sort({ updatedAt: -1 });
  next();
});

const Post = mongoose.model('Post', PostSchema);

module.exports = Post;