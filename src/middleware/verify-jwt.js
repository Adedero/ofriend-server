const passport = require('../config/passport-jwt.config');

const verifyWithoutVerification = async (req, res, next) => {
  passport.authenticate('jwt', (err, user, info) => {
    if (err) {
      return res.status(401).json({
        success: false,
        authMessage: true,
        info: 'An error occurred',
        message: err
      }); 
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        authMessage: true,
        info: 'Unauthorized',
        message: 'Please, sign in to continue'
      });
    }

    req.user = {
      ...user,
      id: user._id.toString(), 
    };
    next();
  })(req, res, next);
}

module.exports = verifyWithoutVerification;
