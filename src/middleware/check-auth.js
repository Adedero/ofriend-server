const verifyAuth = async (req, res, next) => {
  if (req.user && req.isAuthenticated() && req.user.isVerified) {
    next();
  } else {
    return res.status(401).json({
      status: 401,
      authMessage: true,
      message: 'You are not authorized to access this resource. Please sign in.',
    });
  }
}

module.exports = verifyAuth;