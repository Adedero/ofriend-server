require('dotenv').config();

const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST,
  password: process.env.REDIS_PASSWORD,
  port: 16637,
  connectTimeout: 20000,
  maxRetriesPerRequest: null,
});

redis.on('connect', () => {
  console.log('Redis client connected');
});


redis.on('error', (err) => {
  console.log('Redis connection error: ', err);
});


process.on('SIGINT', () => {
  redis.disconnect();
  console.log('Redis client disconnected due to app termination');
  process.exit(0);
});

module.exports = redis;
