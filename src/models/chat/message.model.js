const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  hasText: {
    type: Boolean,
    required: true,
    default: false
  },
  textContent: {
    type: String,
  },
  hasFile: {
    type: Boolean,
    required: true,
    default: false
  },
  file: {
    type: {
      type: String,
    },
    url: {
      type: String
    },
    name: {
      type: String
    },
    extension: {
      type: String
    }
  },
  isEdited: {
    type: Boolean,
    required: true,
    default: false
  },
  isSent: {
    type: Boolean,
    default: true
  },
  readBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  isVisibleTo: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    }
  ],
  isReplying: {
    type: Boolean,
    default: false
  },
  quotedMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  isDeleted: {
    type: Boolean,
    required: true,
    default: false
  },
  isRemoved: {
    type: Boolean,
    default: false
  }
});

MessageSchema.set('timestamps', true);

MessageSchema.pre('find', function (next) {
  this.sort({ createdAt: -1 });
  next();
});

const Message = mongoose.model('Message', MessageSchema);

module.exports = Message;