require('dotenv').config();

const { createClient } = require('redis');

const client = createClient({
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: 16637,
    reconnectStrategy: function (retries) {
      if (retries > 20) {
        console.log("Too many attempts to reconnect. Redis connection was terminated");
        return new Error("Too many retries.");
      } else {
        return retries * 500;
      }
    }
  },
  connectTimeout: 20000 //20 seconds
});

client.on('connect', () => {
  console.log('Redis client connected');
});
  
client.on('error', error => {
  console.error(`Redis client error:`, error);
});

const redisConnection = async () => await client.connect();

module.exports = { client, redisConnection };