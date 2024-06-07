const mongoose = require('mongoose');

const BlockSchema = new mongoose.Schema({
  blocker: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true
  },
  blockedUser: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true
  }
});


BlockSchema.set('timestamps', true);

const Block = mongoose.model('Block', BlockSchema);

module.exports = Block;