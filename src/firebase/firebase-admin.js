require('dotenv').config();
const path = require('path');

const admin = require("firebase-admin");


admin.initializeApp({
  credential: admin.credential.cert('./src/firebase/ofriend-31059-firebase-adminsdk-wi3xy-596140c6fd.json'),
  storageBucket: 'gs://ofriend-31059.appspot.com'
});


const bucket = admin.storage().bucket();

module.exports = { admin, bucket }
