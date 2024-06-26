const express = require('express');
const verifyAuth = require('../../middleware/check-auth');
const Router = express.Router();
const User = require('../../models/user.model');

Router.post('/subscribe', verifyAuth, async (req, res) => {
  const subscription = req.body;
  
  await User.updateOne({ _id: req.user._id }, { $set: { subscription: subscription } });
  return res.status(200).json({
    success: true,
    info: 'Successful',
    message: 'User has been subscribed'
  });
});

module.exports = Router;