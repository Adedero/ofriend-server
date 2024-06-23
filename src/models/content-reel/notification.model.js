const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
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
  }
});

NotificationSchema.set('timestamps', true);

const Notification = mongoose.model('Notification', NotificationSchema);

module.exports = Notification;
