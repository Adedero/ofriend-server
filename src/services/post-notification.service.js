require('dotenv').config();
const Redis = require('ioredis');

//const redis = require('../config/redis.config');
const webpush = require('./push-notifications');
const User = require('../models/user.model');
const Notification = require('../models/notification.model');

const { Queue, Worker } = require('bullmq');

const redis = process.env.NODE_ENV === 'production' ?
  require('../config/redis.config') :
  new Redis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    connectTimeout: 20000,
    maxRetriesPerRequest: null,
  })

const subscribersQueue = new Queue('post-subscribers', {
  connection: redis
});

const subscriptionWorker = new Worker('post-subscribers', async (job) => {
  const { subscribers, author, postId } = job.data;

  const payload = {
    title: 'New post',
    body: `${author.name} made a new post.`,
    url: `/app/post/${postId}`
  }


  for (const subscriber of subscribers) {
    const user = await User.findById(subscriber, { subscription: 1 });
    const subscription = user.subscription;

    if (!subscription) continue;

    const newNotification = new Notification({
      user: subscriber,
      fromUser: author.id,
      type: 'post',
      link: payload.url,
      description: payload.body,
      isRead: false,
      post: postId,
    });

    await Promise.all([
      webpush.sendNotification(subscription, JSON.stringify(payload)),
      newNotification.save()
    ]);
  }
}, { connection: redis });

subscriptionWorker.on('error', (error) => {
  console.error('Error with subscription worker: ', error);
});

subscriptionWorker.on('completed', job => {
  console.log('All subscribers have been sent notifications');
});

subscriptionWorker.on('failed', (job, err) => {
  console.log(`Error sending notifications to subscribers: ${err.message}`);
});




module.exports = { subscribersQueue };
