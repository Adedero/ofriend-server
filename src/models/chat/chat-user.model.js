const mongoose = require('mongoose');
const ChatUserSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true
  },
  online: {
    type: Boolean,
    required: true,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now,
    expires: 3600,
    required: true
  }
});

const ChatUser = mongoose.model('ChatUser', ChatUserSchema);

module.exports = ChatUser;
