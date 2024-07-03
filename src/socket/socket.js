const User = require('../models/user.model');
const Message = require('../models/chat/message.model');
const Subscription = require('../models/content-reel/subscription.model');
const { subscribersQueue } = require('../services/post-notification.service');
const webpush = require('../services/push-notifications');
const Notification = require('../models/notification.model');
const redis = require('../config/redis.config');


const io = require('../../index');

io.on('connection', (socket) => {
    console.log('Socket connection established. Socket ID: ', socket.id);

    socket.on('disconnect', () => {
        console.log('Socket connection disconnected');
    });

    socket.on('online', async (id) => {
        if (!id) return;
        const update = {
            isOnline: true,
            lastSeen: Date.now()
        }

        const user = await User.findByIdAndUpdate(id, { $set: update }, { new: true });
        socket.broadcast.emit('userOnline', id);

        const sub = user.subscription;
        if (sub) {
            await redis.set(`sub-${user._id.toString()}`, JSON.stringify(sub));
        }        
    });

    socket.on('offline', async (id) => {
        if (!id) return;
        const update = {
            isOnline: false,
            lastSeen: Date.now()
        }
        await User.updateOne({ _id: id }, { $set: update });
        socket.broadcast.emit('userOffline', id);

        await redis.del(`sub-${id}`);
    });

    //Notifications

    socket.on('post-created', async (author, post) => {
        const mentions = post.mentions;

        if (mentions.length > 0) {
            const mentionedUsersIds = new Set(mentions.map(mention => mention.id));
            const mentionedUsers = await User.find({ _id: { $in: [...mentionedUsersIds] } }, { subscription: 1 });

            const payload = {
                title: 'Mentions',
                body: `${author.name} mentioned you in a post.`,
                url: `/app/post/${post._id}`
            }

            const notifications = mentionedUsers.map(user => ({
                user: user._id,
                fromUser: post.author,
                type: 'mention',
                link: payload.url,
                description: payload.body,
                isRead: false,
                post: post._id,
            }));

            await Notification.insertMany(notifications);

            // Send web push notifications concurrently
            const webPushPromises = mentionedUsers.map(async user => {
                if (user.subscription) {
                    await webpush.sendNotification(user.subscription, JSON.stringify(payload));
                }
            });

            await Promise.all(webPushPromises);
        }
                
        const batchSize = 1000; // Number of subscribers per batch
        let page = 0;
        let hasMore = true;

        while (hasMore) {
            const subscribers = await Subscription.find({ user: author.id }, { subscriber: 1 })
                .sort('_id')
                .skip(page * batchSize)
                .limit(batchSize)
                .lean()
                .exec();

            if (subscribers.length > 0) {
                const subscriberIds = subscribers.map(sub => sub.subscriber);
                await subscribersQueue.add('send-notifications', { subscribers: subscriberIds, author, postId: post._id });
                //console.log(`Added batch ${page + 1} to queue:`, subscriberIds);
                page++;
            } else {
                hasMore = false;
            }
        }

    });

    socket.on('user-followed', async(data) => {
        const { userId, follower } = data;

        const payload = {
            title: 'New follower',
            body: `${follower.name} followed you.`,
            url: `$/app/user/${follower.id}`
        }

        const user = await User.findById(userId, { subscription: 1 });
        const subscription = user.subscription;

        if (!subscription) return;

        const newNotification = new Notification({
            user: userId,
            fromUser: follower.id,
            type: 'follow',
            link: payload.url,
            description: payload.body,
            isRead: false,
        });

        await Promise.all([
            webpush.sendNotification(subscription, JSON.stringify(payload)),
            newNotification.save()
        ]);
    });


    //Chats
    socket.on('joinRoom', (chatId) => {
        socket.join(chatId);
    });

    socket.on('sendMessage', async ({ message, senderName, receiverId }) => {
        socket.broadcast.emit('newMessageNotification', message);
        socket.to(message.chat).emit('newMessage', message);

        let title, body;
        if (message.hasText) {
            title = `${ senderName } sent you a message.`;
            body = (message.textContent.lenght < 30) ? message.textContent : `${ message.textContent.substring(0, 30) }...`;
        } else {
            title = `${ senderName } sent you a file`;
            body = message.file.name;
        }

        const payload = {
            title,
            body,
        }

        let sub = await redis.get(`sub-${receiverId.toString()}`);

        if (!sub) {
            const user = await User.findById(receiverId, { subscription: 1 });
            sub = user.subscription;
        }

        if (!sub) return;

        await webpush.sendNotification(JSON.parse(sub), JSON.stringify(payload));
    });

    socket.on('openMessage', async (chatId, userId) => {
        await Message.updateMany(
            { chat: chatId },
            { $addToSet: { readBy: userId } }
        );
        socket.to(chatId).emit('messageRead', userId)
    });

    socket.on('typing', (chatId) => {
        socket.broadcast.to(chatId).emit('isTyping');
    });

    socket.on('stopTyping', (chatId) => {
        socket.broadcast.to(chatId).emit('isNotTyping');
    });

    socket.on('deleteMessage', (chatId, messageId) => {
        socket.to(chatId).emit('messageDeleted', messageId);
    });

    socket.on('editMessage', (chatId, messageId, text) => {
        socket.to(chatId).emit('messageEdited', messageId, text);
    });
});