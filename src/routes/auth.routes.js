const emailAndPasswordSchema = require('../validations/joi-schemas');
const express = require('express');
const Router = express.Router();
const User = require('../models/user.model');
const passport = require('../config/passport.config');
const bcrypt = require('bcrypt');
const OTP = require('../models/otp.model');
const { sendTextEmail } = require('../utils/mailer');
const randomInteger = require('../utils/random-int');

//Registers  a personal account
Router.post('/register/personal', async (req, res) => {
  if (!req.body) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request'
    });
  }
  const { value, schemaError } = emailAndPasswordSchema.validate({
    email: req.body.email,
    password: req.body.password
  });

  if (schemaError) {
    return res.status(400).json({
      success: false,
      message: 'Invalid credentials: ' + schemaError
    });
  }

  const existingUser = await User.findOne({ email: req.body.email }, { email: 1 });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'Your Ofriend personal account already exists. Please sign in instead.'
    });
  }

  const hashedPassword = await bcrypt.hash(req.body.password, 10);

  const newUser = new User({
    name: req.body.name,
    birthday: req.body.birthday,
    gender: req.body.gender.toLowerCase(),
    country: req.body.country.name,
    region: req.body.region,
    email: req.body.email,
    password: hashedPassword,
    isVerified: false,
    isOrg: false,
  });

  await newUser.save();

  return res.status(200).json({
    success: true,
    message: 'Your account was successfully created.',
    user: {
      id: newUser._id,
      email: newUser.email,
      name: newUser.name
    }
  });
});

//Registers an organization account
Router.post('/register/org', async (req, res) => {
  const { value, schemaError } = emailAndPasswordSchema.validate({
    email: req.body.email,
    password: req.body.password
  });

  if (schemaError) {
    return res.status(400).json({
      success: false,
      message: 'Invalid credentials: ' + schemaError
    });
  }

  const existingUser = await User.findOne({ email: req.body.email }, { email: 1 });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'Your ogranization account already exists. Please sign in instead.'
    });
  }

  const hashedPassword = await bcrypt.hash(req.body.password, 10);

  const newUser = new User({
    name: req.body.name,
    yearEstablished: req.body.yearEstablished,
    gender: 'other',
    country: req.body.country.name,
    region: req.body.region,
    address: req.body.address,
    email: req.body.email,
    password: hashedPassword,
    isVerified: false,
    isOrg: true,
  });

  await newUser.save();

  return res.status(200).json({
    success: true,
    message: 'Your account was successfully created.',
    user: {
      id: newUser._id,
      email: newUser.email,
      name: newUser.name
    }
  });
});

Router.post('/send-mail/:email', async(req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(400).json({
      success: false,
      info: 'Not authorized',
      message: 'Please sign in to continue'
    });
  }
  const email = req.params;
  if (!email) {
    return res.status(400).json({
      success: false,
      info: 'Invalid request',
      message: 'No email provided. Could not send OTP'
    });
  }

  let id = user.id;
  let otp = await OTP.findOne({ user: id });
  if (!otp) {
    otp = await new OTP({
      user: id,
      value: randomInteger(100000, 999999),
    }).save();
  }
  const text = `Your secure OTP: ${otp.value}. Note that this password expires in 1 hour`;

  const [ info, error ] = await sendTextEmail(user.email, "Ofriend Account Validation", text);
  if (error) {
    return res.status(500).json({
      success: false,
      info: 'Server Error',
      message: 'Could not send OTP to email. Please, check your network connection and try again.'
    });
  }

  return res.status(200).json({
    success: true,
    info: 'OTP sent',
    message: 'An OTP has been sent to your email.'
  });
});

Router.post('/verify-account/:otp', async (req, res) => {
  if (!req.user) {
    return res.status(400).json({
      success: false,
      info: 'Not authorized',
      message: 'Please sign in to continue'
    });
  }

  if (req.user.isVerified) {
    return res.status(400).json({
      success: false,
      info: 'Account already verified',
      message: 'Your account has already been verified. Please sign in to continue.'
    });
  }

  const { otp } = req.params;
  if (!otp) {
    return res.status(400).json({
      success: false,
      info: 'Invalid request',
      message: 'No OTP provided. Could not complete account verification'
    });
  }
  const existingOtp = await OTP.findOne({ user: req.user });
  if (!existingOtp) {
    return res.status(400).json({
      success: false,
      info: 'Expired OTP',
      message: 'The OTP provided is invalid or has expired. Please sign in to generate a new one.'
    });
  }

  const isOtpCorrect = (otp == existingOtp.value);
  if (!isOtpCorrect) {
    return res.status(400).json({
      success: false,
      info: 'Wrong OTP',
      message: 'The OTP provided is incorrect. Please check your email address and try again.'
    });
  }

  const updatedUser = await User.findByIdAndUpdate(req.user.id, { $set: { isVerified: true } }, { new: true });
  if (!updatedUser) {
    return res.status(404).json({
      success: false,
      info: 'Account not found',
      message: 'This account does not exist. It may have been deleted.'
    });
  }

  return res.status(200).json({
    success: true,
    info: 'Verification complete',
    message: 'Your account has been verified successfully.',
    user: {
      name: req.user.name,
      email: req.user.email
    }
  });
});

Router.post('/sign-in', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return res.status(500).json({ message: 'Authentication failed', err })
    if (!user) return res.status(400).json(info);

    req.logIn(user, (err) => {
      if (err) return res.status(500).json({ message: 'Authentication failed', err });

      return res.status(200).json({
        message: 'Authentication successful',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isVerified: user.isVerified,
          isOrg: user.isOrg
        }
      });
    });
  })(req, res, next);
});

//Confirms user authentication for various purposes
Router.get('/check-auth', (req, res) => {
  if (!req.user || !req.isAuthenticated()) {
    return res.status(401).json({
      isAuthenticated: false,
      info: 'Not authenticated.',
      message: 'User is not authenticated.'
    });
  }
  return res.status(200).json({
    isAuthenticated: true,
    isVerified: req.user.isVerified,
    user: {
      name: req.user.name,
      email: req.user.email
    }
  });
});

Router.get('/sign-out', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed', error: err });
    }
    return res.status(200).json({ message: 'Logged out' });
  });
});

//Sends email for password recovery
Router.post('/send-password-recovery-email/:email', async (req, res) => {
  const { email } = req.params;
  if (!email) {
    return res.status(400).json({
      success: false,
      info: 'Invalid request',
      message: 'No email provided. Could not send OTP'
    });
  }

  const user = await User.findOne({ email: email }, { email: 1 }).lean();
  if (!user) {
    return res.status(400).json({
      success: false,
      info: 'Account not found',
      message: 'No account with the supplied email address was found.'
    });
  }

  let id = user._id;
  let otp = await OTP.findOne({ user: id });
  if (!otp) {
    otp = await new OTP({
      user: id,
      value: randomInteger(100000, 999999),
    }).save();
  }
  const text = `Your secure OTP: ${otp.value}. Note that this password expires in 1 hour`;

  const [info, error] = await sendTextEmail(user.email, "Ofriend Account Validation", text);
  if (error) {
    return res.status(500).json({
      success: false,
      info: 'Server Error',
      message: 'Could not send OTP to email. Please, check your network connection and try again.'
    });
  }

  return res.status(200).json({
    success: true,
    info: 'OTP sent',
    message: 'An OTP has been sent to your email.'
  });
});

//Verifies OTP and changes password
Router.put('/change-password', async(req, res) => {
  const { email, otp, password } = req.body;
  if (!email || !otp || !password) {
    return res.status(400).json({
      success: false,
      info: 'Invalid request',
      message: 'No email or OTP provided. Could not complete password recovery'
    });
  }
  const user = await User.findOne({ email: email }, { email: 1, password: 1 });
  if (!user) {
    return res.status(400).json({
      success: false,
      info: 'Account not found',
      message: 'No account with the supplied email address was found.'
    });
  }
  const existingOtp = await OTP.findOne({ user: user._id }).lean();
  if (!existingOtp) {
    return res.status(400).json({
      success: false,
      info: 'Expired OTP',
      message: 'The OTP provided is invalid or has expired. Please, try again.'
    });
  }

  const isOtpCorrect = (otp == existingOtp.value);
  if (!isOtpCorrect) {
    return res.status(400).json({
      success: false,
      info: 'Wrong OTP',
      message: 'The OTP provided is incorrect. Please check your email address and try again.'
    });
  }

  await OTP.findByIdAndDelete(existingOtp._id);

  const hashedPassword = await bcrypt.hash(password, 10);

  user.password = hashedPassword;
  await user.save();

  return res.status(200).json({
    success: true,
    info: 'Password changed',
    message: 'Your account has been recovered successfully.',
  });
});

module.exports = Router;