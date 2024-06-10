const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true
  },
  reportedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reportedPost: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
  },
  reportedComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
  },
  reason: {
    type: String,
    required: true
  }
});

ReportSchema.set('timestamps', true);

const Report = mongoose.model('Report', ReportSchema);

module.exports = Report;