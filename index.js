require('dotenv').config();
require('express-async-errors');
require('./src/database/db')();

const express = require('express');
const PORT = process.env.PORT;
const cors = require('cors');
const passport = require('./src/config/passport.config');
const asyncErrors = require('./src/middleware/async-errors');
const MemoryStore = require('memorystore')(session)

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));


app.use(session({
  cookie: { maxAge: 60 * 60 * 1000 },
  store: new MemoryStore({
    checkPeriod: 60 * 60 * 1000 // prune expired entries every 24h
  }),
  resave: false,
  saveUninitialized: false,
  secret: process.env.SECRET_KEY
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