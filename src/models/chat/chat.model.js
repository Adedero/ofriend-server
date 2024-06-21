const mongoose = require('mongoose');
const ChatSchema = new mongoose.Schema({
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    }
  ],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  unreadChats: {
    type: Number,
    default: 0
  }
});

ChatSchema.set('timestamps', true);

ChatSchema.pre('find', function (next) {
  this.sort({ updatedAt: -1 });
  next();
});

const Chat = mongoose.model('Chat', ChatSchema);

module.exports = Chat;