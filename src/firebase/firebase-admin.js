require('dotenv').config();
const path = require('path');

const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert(process.env.NODE_ENV === 'production' ?
    '/etc/secrets/ofriend-31059-firebase-adminsdk-wi3xy-596140c6fd.json' :
    path.join(__dirname, 'ofriend-31059-firebase-adminsdk-wi3xy-596140c6fd.json')),

  storageBucket: 'gs://ofriend-31059.appspot.com'
});


const bucket = admin.storage().bucket();

module.exports = { admin, bucket }
