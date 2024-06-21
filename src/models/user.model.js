const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  nameRecord: {
    isChanged: {
      type: Boolean,
      required: true,
      default: false
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  email: {
    type: String,
    required: true,
    index: { unique: true }
  },
  password: {
    type: String,
    required: true,
    minLength: 6,
    maxLength: 1024
  },
  isVerified: {
    type: Boolean,
    required: true,
    default: false
  },
  isOrg: {
    type: Boolean,
    required: true,
    default: false
  },
  bio: {
    type: String,
    default: ''
  },
  birthday: {
    type: Date,
  },
  yearEstablished: {
    type: Number,
  },
  gender:{
    type: String,
    enum: ['male', 'female', 'other']
  },
  country: {
    type: String,
    required: true,
  },
  region: {
    type: String,
    required: true,
  },
  address: {
    type: String
  },
  businessDescription: {
    type: String
  },
  imageUrl: {
    type: String,
  },
  bannerImageUrl: {
    type: String
  },
  followers: {
    type: Number,
    required: true,
    default: 0
  },
  following: {
    type: Number,
    required: true,
    default: 0
  },
  isViewingSelf: {
    type: Boolean,
    required: true,
    default: false
  },
  viewerFollowsUser: {
    type: Boolean,
    required: true,
    default: false
  },
  isOnline: {
    type: Boolean,
    required: true,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now,
    required: true
  }
});

UserSchema.set('timestamps', true);

const User = mongoose.model('User', UserSchema);
module.exports = User;