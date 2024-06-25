const User = require('../models/user.model');
const Message = require('../models/chat/message.model');
const Follow = require('../models/content-reel/follow.model');
const { client } = require('../config/redis.config');

const io = require('../../index');
const SocketHandler = require('./socket.handler');
io.on('connection', (socket) => {
    console.log('Socket connection established. Socket ID: ', socket.id);

    socket.on('disconnect', () => {
        console.log('Socket connection disconnected');
    });

    socket.on('online', (id) => {
        client.set(id, socket.id)
            .then(reply => console.log(reply))
            .catch(error => console.log(Error))

        SocketHandler.setUserOnline(id, socket);
    });

    socket.on('offline', (id) => {
        client.del(id)
            .then(reply => console.log(reply))
            .catch(error => console.log(error))

        SocketHandler.setUserOffline(id, socket)
    });

    socket.on('joinRoom', (chatId) => {
        socket.join(chatId);
    });

    socket.on('sendMessage', (message) => {
        socket.broadcast.emit('newMessageNotification', message);
        socket.to(message.chat).emit('newMessage', message);
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

    //Comments
    socket.on('comment-created', async (comment) => {
        const authorSocketId = await client.get(comment.author);
        if (authorSocketId) {
            io.to(authorSocketId).emit('new-comment', comment);
        } 
    })
});