function checkParams(res, params = []) {
  // Handle single parameter case
  if (params.length === 1) {
    let field = params[0];
    if (!field) {
      return res.status(400).json({
        success: false,
        info: 'Bad request',
        message: `No ${field} provided`
      });
    }
  } else {
    // Handle multiple parameters case
    let missingParams = params.filter(param => !param);

    if (missingParams.length > 0) {
      return res.status(400).json({
        success: false,
        info: 'Bad request',
        message: `No ${missingParams.join(' or ')} provided`
      });
    }
  }
}

module.exports = checkParams;