const verifyAuth = async (req, res, next) => {
  if (req.user && req.isAuthenticated()) {
    next();
  } else {
    return res.status(401).json({
      message: 'You are not authorized to access this resource. Please sign in.',
    });
  }
}

module.exports = verifyAuth;