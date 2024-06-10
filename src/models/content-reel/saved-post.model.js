const mongoose = require('mongoose');
const SavedPostSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  }
});

SavedPostSchema.set('timestamps', true);

const SavedPost = mongoose.model('SavedPost', SavedPostSchema);

module.exports = SavedPost;