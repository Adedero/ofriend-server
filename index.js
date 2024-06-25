require('dotenv').config();
require('express-async-errors');
require('./src/database/db')();
const { redisConnection } = require('./src/config/redis.config');
redisConnection();

require('./src/services/push-notifications')

const http = require('http');
const express = require('express');
const PORT = process.env.PORT;
const cors = require('cors');
//const passport = require('./src/config/passport.config');
const passport = require('./src/config/passport-jwt.config');
const asyncErrors = require('./src/middleware/async-errors');
//const session = require('express-session');
//const MongoStore = require('connect-mongo');
const { Server } = require("socket.io");


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL
  }
});
module.exports = io;

require('./src/socket/socket');
/* 
const mongoStore = MongoStore.create({
  mongoUrl: process.env.MONGODB_LOCAL
}); */

app.set("trust proxy" , 1);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));

/* process.env.NODE_ENV === 'production' ? 
app.use(session({
  cookie: {
    maxAge: 60 * 60 * 1000,
    sameSite: 'none',
    secure: true
  },
  resave: false,
  saveUninitialized: false,
  secret: process.env.SECRET_KEY,
  store: mongoStore
}))

: app.use(session({
  cookie: { 
    maxAge: 60 * 60 * 1000
  },
  resave: false,
  saveUninitialized: false,
  secret: process.env.SECRET_KEY,
  store: mongoStore
})); */

app.use(passport.initialize());
//app.use(passport.session());

app.use(asyncErrors);

//Routes
app.use('/auth', require('./src/routes/auth.routes'));
app.use('/api', require('./src/routes/api/user.routes'));

app.get('/', (req, res) => res.send({
  name: 'Ofriend',
  version: '1.0',
  location: 'Nigeria',
}));

server.listen(PORT, () => console.log(`Ofriend server started on http://localhost:${PORT}`));
