require('dotenv').config();
const transporter = require('../config/nodemailer.config');

const sendTextEmail = async (email, subject, text) => {
  let info, error;
  try {
    info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      text: text,
    });
    console.log("Email sent sucessfully");
    return [ info, null ]
  } catch (err) {
    error = err;
    console.error('Error sending email', err);
    return [ null, error ]
  }
}


const sendHTMLEmail = async (email, subject, html) => {
  let info, error;
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      html: html,
    });
    console.log("Email sent sucessfully");
    return [info, null]
  } catch (err) {
    error = err;
    console.error('Error sending email', err);
    return [null, error]
  }
}

module.exports = { sendTextEmail, sendHTMLEmail };
