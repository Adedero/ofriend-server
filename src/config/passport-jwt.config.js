require('dotenv').config();

const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
};

passport.use(new JwtStrategy(jwtOptions, async (jwtPayload, done) => {
  try {
    const user = await User.findById(jwtPayload.id, {
      name: 1, email: 1, imageUrl: 1, isVerified: 1, isOrg: 1, createdAt: 1, bio: 1
    }).lean();
    if (!user) return done(null, false);
    return done(null, user);
  } catch (error) {
    return done(error, false)
  }
}));

module.exports = passport;