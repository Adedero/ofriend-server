const mongoose = require('mongoose');

const verifyId = (res, id) => {
  const stringValue = id.toString();
  const isValid = mongoose.Types.ObjectId.isValid(stringValue);

  if (!isValid) {
    return res.status(400).json({
      success: false,
      info: 'Bad request',
      message: 'The ID entered is invalid.'
    });
  }
}

module.exports = verifyId;