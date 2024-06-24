const passport = require('../config/passport-jwt.config');

const verifyAuth = async (req, res, next) => {
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

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        authMessage: true,
        info: 'Forbidden',
        message: 'Please, verify your account to continue.'
      });
    }

    req.user = {
      ...user,
      id: user._id.toString(), 
    };
    next();
  })(req, res, next);
} 

/* const verifyAuth = async (req, res, next) => {
  if (req.user && req.isAuthenticated() && req.user.isVerified) {
    next();
  } else {
    return res.status(401).json({
      status: 401,
      authMessage: true,
      message: 'You are not authorized to access this resource. Please sign in.',
    });
  }
} */

module.exports = verifyAuth;
