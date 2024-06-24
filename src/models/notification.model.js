const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type:
  { type: String,
    enum: ['like', 'comment',  'reply', 'follow', 'mention', 'admin', 'account'],
    required: true,
    index: true,
  },
  link: {
    type: String
  },
  description: {
    type: String
  },
  isRead: {
    type: Boolean,
    required: true,
    default: false
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  comment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now
  }
});

//NotificationSchema.set('timestamps', true);

NotificationSchema.pre('find', function (next) {
  this.sort({ createdAt: -1 });
  next();
});

const Notification = mongoose.model('Notification', NotificationSchema);

module.exports = Notification;
