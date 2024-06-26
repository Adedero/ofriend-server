const User = require('../models/user.model');
const Block = require('../models/content-reel/block.model');
const Follow = require('../models/content-reel/follow.model')
const checkParams = require('../utils/check-params');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const Subscription = require('../models/content-reel/subscription.model');


const ProfileController = {
  changeName: async(req, res) => {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({
        success: false,
        info: 'Bad request',
        message: 'No name provided'
      });
    }
    const userId = req.user.id;
    const user = await User.findById(userId, { name: 1, nameRecord: 1 });

    if (user.nameRecord.isChanged) {
      const currentDate = new Date();
      const updatedAt = new Date(user.nameRecord.updatedAt);

      const differenceInMilliseconds = currentDate - updatedAt;
      const differenceInDays = differenceInMilliseconds / (1000 * 60 * 60 * 24);

      if (differenceInDays < 60) {
        return res.status(403).json({
          success: false,
          info: 'Forbidden',
          message: 'You can only change your name once every 60 days'
        });
      } 
    }

    user.name = name;
    user.nameRecord.isChanged = true;
    user.nameRecord.updatedAt = new Date();
    await user.save();
    return res.status(200).json({
      success: true,
      info: 'Success',
      message: 'Name changed successfully'
    });
  },

  changeEmail: async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        info: 'Bad request',
        message: 'No email provided'
      });
    }
    const userId = req.user.id;
    const updatedData = {
      email: email,
      isVerified: false
    }
    await User.findByIdAndUpdate(
      userId,
      { $set: updatedData }
    );
    return res.status(200).json({
      success: true,
      info: 'Success',
      message: 'Email changed successfully'
    });
  },

  changeBirthday: async (req, res) => {
    const { birthday } = req.body;
    if (!birthday) {
      return res.status(400).json({
        success: false,
        info: 'Bad request',
        message: 'No birthday provided'
      });
    }
    const userId = req.user.id;
    
    await User.findByIdAndUpdate(
      userId,
      { $set: { birthday: birthday } }
    );
    return res.status(200).json({
      success: true,
      info: 'Success',
      message: 'Birthday changed successfully'
    });
  },

  changeGender: async (req, res) => {
    const { gender } = req.body;
    if (!gender) {
      return res.status(400).json({
        success: false,
        info: 'Bad request',
        message: 'No gender provided'
      });
    }
    const userId = req.user.id;

    await User.findByIdAndUpdate(
      userId,
      { $set: { gender: gender } }
    );
    return res.status(200).json({
      success: true,
      info: 'Success',
      message: 'Gender changed successfully'
    });
  },

  changeCountryAndRegion: async (req, res) => {
    const { country, region } = req.body;
    if (!country || !region) {
      return res.status(400).json({
        success: false,
        info: 'Bad request',
        message: 'No country or region provided'
      });
    }
    const userId = req.user.id;
    const updatedData = { country: country, region: region }

    await User.findByIdAndUpdate(userId, { $set: updatedData });
    return res.status(200).json({
      success: true,
      info: 'Success',
      message: 'Country and region changed successfully'
    });
  },

  changeAddress: async (req, res) => {
    const { address } = req.body;
    if (!address) {
      return res.status(400).json({
        success: false,
        info: 'Bad request',
        message: 'No address provided'
      });
    }
    const userId = req.user.id;

    await User.findByIdAndUpdate(
      userId,
      { $set: { address: address } }
    );
    return res.status(200).json({
      success: true,
      info: 'Success',
      message: 'Address changed successfully'
    });
  },

  changeBusinessDescription: async (req, res) => {
    const { description } = req.body;
    if (!description) {
      return res.status(400).json({
        success: false,
        info: 'Bad request',
        message: 'No description provided'
      });
    }
    const userId = req.user.id;

    await User.findByIdAndUpdate(
      userId,
      { $set: { businessDescription: description } }
    );
    return res.status(200).json({
      success: true,
      info: 'Success',
      message: 'Business description changed successfully'
    });
  },

  getBlockedUsers: async (req, res) => {
    const { skip } = req.query;
    if (!skip) skip = 0;

    const userId = req.user.id;
    const SKIP = parseInt(skip);
    const LIMIT = 30;
    const blocks = await Block.find(
      { blocker: userId }, { blockedUser: 1 }
    )
      .skip(SKIP)
      .limit(LIMIT)
      .populate('blockedUser', 'name imageUrl');

    const blockedUsers = blocks.map(block => {
      return {
        id: block.blockedUser._id,
        name: block.blockedUser.name,
        imageUrl: block.blockedUser.imageUrl,
      }
    });

    return res.status(200).json(blockedUsers);
  },

  blockUser: async (req, res) => {
    const { userId } = req.params;

    // Check if userId is provided
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // Fetch follows and subscriptions in parallel
      const [follows, subscriptions] = await Promise.all([
        Follow.find({
          $or: [
            { user: req.user.id, follower: userId },
            { user: userId, follower: req.user.id }
          ]
        }),
        Subscription.find({
          $or: [
            { user: req.user.id, subscriber: userId },
            { user: userId, subscriber: req.user.id }
          ]
        })
      ]);

      // Process follow relationships
      const userFollowsBlocked = follows.find(follow => follow.follower.toString() === req.user.id.toString());
      const blockedFollowsUser = follows.find(follow => follow.user.toString() === req.user.id.toString());
      const userSubscribesToBlocked = subscriptions.find(sub => sub.subscriber.toString() === req.user.id.toString());
      const blockedSubscribesToUser = subscriptions.find(sub => sub.user.toString() === req.user.id.toString());

      const operations = [];

      if (userFollowsBlocked) {
        operations.push(
          Follow.findByIdAndDelete(userFollowsBlocked._id),
          User.findByIdAndUpdate(req.user.id, { $inc: { following: -1 } })
        );
      }

      if (blockedFollowsUser) {
        operations.push(
          Follow.findByIdAndDelete(blockedFollowsUser._id),
          User.findByIdAndUpdate(req.user.id, { $inc: { followers: -1 } })
        );
      }

      if (userSubscribesToBlocked) {
        operations.push(
          Subscription.deleteOne({ _id: userSubscribesToBlocked._id }),
          User.updateOne({ _id: userId }, { $inc: { subscribers: -1 } })
        );
      }

      if (blockedSubscribesToUser) {
        operations.push(
          Subscription.deleteOne({ _id: blockedSubscribesToUser._id }),
          User.updateOne({ _id: req.user.id }, { $inc: { subscribers: -1 } })
        );
      }

      // Execute all operations in parallel
      if (operations.length > 0) {
        await Promise.all(operations);
      }

      // Create a block record
      await Block.create([{ blocker: req.user.id, blockedUser: userId }]);

      // Commit transaction
      await session.commitTransaction();
      return res.status(200).json({
        success: true,
        message: 'User successfully blocked'
      });
    } catch (error) {
      await session.abortTransaction();
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        info: error.message
      });
    } finally {
      session.endSession();
    }
  },

  unblockUser: async (req, res) => {
    const { userId } = req.params;
    checkParams(res, [userId]);4

    await Block.deleteOne({ blocker: req.user.id, blockedUser: userId });
    return res.status(200).json({
      success: true,
      message: 'User successfully unblocked'
    })
  },

  changePassword: async (req, res) => {
    const { oldpassword, newpassword, confirm } = req.body;
    checkParams(res, [ oldpassword, newpassword, confirm ]);
    const userId = req.user.id;

    if (confirm !== newpassword) {
      return res.status(400).json({
        success: false,
        info: 'Request failed',
        message: 'Passwords do not match.'
      });
    }
    const user = await User.findById(userId, { password: 1 });

    const isMatch = await bcrypt.compare(oldpassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        info: 'Request failed',
        message: 'Incorrect password.'
      });
    }
    const hashedPassword = await bcrypt.hash(newpassword, 10);
    user.password = hashedPassword;
    await user.save();
    return res.status(200).json({
      success: true,
      info: 'Success',
      message: 'Password changed successfully'
    });
  },

  deleteAccount: async (req, res) => {
    const userId = req.user.id;
    //Delete logic
    return res.status(200).json({
      success: true,
      message: 'Account successfully deleted'
    })
  }
}

module.exports = ProfileController;