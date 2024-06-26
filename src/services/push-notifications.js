require('dotenv').config();

const webpush = require('web-push');
//const vapidKeys = webpush.generateVAPIDKeys();

webpush.setVapidDetails(
  `mailto:${process.env.CLIENT_URL}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

module.exports = webpush;