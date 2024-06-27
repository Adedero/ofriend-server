require('dotenv').config();
require('express-async-errors');
require('./src/database/db')();
require('./src/config/redis.config');

const http = require('http');
const express = require('express');
const PORT = process.env.PORT;
const cors = require('cors');
const passport = require('./src/config/passport-jwt.config');
const asyncErrors = require('./src/middleware/async-errors');
const { Server } = require("socket.io");


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"]
  }
});
module.exports = io;

require('./src/socket/socket');

app.set("trust proxy" , 1);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_URL
}));

app.use(passport.initialize());

app.use(asyncErrors);

//Routes
app.use('/auth', require('./src/routes/auth/auth.routes'));
app.use('/api', require('./src/routes/api/user.routes'));
app.use('/services', require('./src/routes/services/services.routes'));

app.get('/', (req, res) => res.send({
  name: 'Ofriend',
  version: '1.0',
  location: 'Nigeria',
}));

server.listen(PORT, () => console.log(`Ofriend server started on http://localhost:${PORT}`));
