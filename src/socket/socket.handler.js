const User = require('../models/user.model');
const Message = require('../models/chat/message.model');

const SocketHandler = {
    setUserOnline: async (id, socket) => {
        if (!id) return;
        const update = {
            isOnline: true,
            lastSeen: Date.now()
        }
        await User.findByIdAndUpdate(id, { $set: update });
        socket.broadcast.emit('userOnline', id);
    },

    setUserOffline: async (id, socket) => {
        if (!id) return;
        const update = {
            isOnline: false,
            lastSeen: Date.now()
        }
        await User.findByIdAndUpdate(id, { $set: update });
        socket.broadcast.emit('userOffline', id);
    }
}

module.exports = SocketHandler;