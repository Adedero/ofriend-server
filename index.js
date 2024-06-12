require('dotenv').config();
require('express-async-errors');
require('./src/database/db')();

const express = require('express');
const PORT = process.env.PORT;
const cors = require('cors');
const passport = require('./src/config/passport.config');
const asyncErrors = require('./src/middleware/async-errors');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();

const mongoStore = MongoStore.create({
  mongoUrl: process.env.MONGODB_LOCAL
});

app.set("trust proxy" , 1);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));

app.use(session({
  cookie: { 
    sameSite: 'none',
    maxAge: 60 * 60 * 1000
  },
  resave: false,
  saveUninitialized: false,
  secret: process.env.SECRET_KEY,
  store: mongoStore
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(asyncErrors);

//Routes
app.use('/auth', require('./src/routes/auth.routes'));
app.use('/api', require('./src/routes/api/user.routes'));

app.get('/', (req, res) => res.send({
  name: 'Ofriend',
  verion: '1.0',
  location: 'Nigeria',
}));

app.listen(PORT, () => console.log(`Ofriend server started on http://localhost:${PORT}`));