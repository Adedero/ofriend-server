require('dotenv').config();

const Redis = require('ioredis');

const redis = process.env.NODE_ENV === 'production' ?
  new Redis({
    host: process.env.REDIS_HOST,
    password: process.env.REDIS_PASSWORD,
    port: process.env.REDIS_PORT,
    connectTimeout: 20000,
    maxRetriesPerRequest: null,
  }):
  new Redis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    connectTimeout: 20000,
  })

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
