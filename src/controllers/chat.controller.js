const User = require('../models/user.model');
const Chat = require('../models/chat/chat.model');
const Message = require('../models/chat/message.model');
const Block = require('../models/content-reel/block.model');
const checkParams = require('../utils/check-params');
const mongoose = require('mongoose');
const { bucket } = require('../firebase/firebase-admin');


const ChatController = {
    //Creates a new chat
    initializeChat: async (req, res) => {
        const { receiver } = req.query;
        const { msg } = req.body;

        checkParams(res, [receiver, msg]);
        let existingChat = await Chat.findOne({
            participants: { $all: [req.user.id, receiver] }
        });

        if (!existingChat) {
           existingChat = await Chat.create({
                participants: [req.user.id, receiver]
            });
        }

        const newMessage = await Message.create({
            ...msg,
            chat: existingChat._id,
            sender: req.user.id,
            readBy: [req.user.id],
            isVisibleTo: [req.user.id, receiver]
        });

        existingChat.lastMessage = newMessage._id;

        await existingChat.save();

        return res.status(200).json({ newMessage });
    },

    //Retrieves all user's chats
    getChats: async (req, res) => {
      const userId = req.user.id;
      const { skip } = req.query;
    
      let chats = await Chat.find({ participants: { $in: [userId] } })
        .skip(skip)
        .limit(10)
        .populate({
            path: 'participants',
            match: { _id: { $ne: userId } },
            select: 'name imageUrl',
        })
        .populate({
            path: 'lastMessage',
            select: 'sender hasText textContent hasFile file isRead createdAt isDeleted'
        }).lean();

        const chatIds = chats.map(chat => chat._id);
        const objectId = mongoose.Types.ObjectId.createFromHexString(userId);

        const unreadMessagesCount = await Message.aggregate([
            { $match:
                { chat: { $in: chatIds }, readBy: { $nin: [objectId] } }
            },
            { $group: { _id: "$chat", count: { $sum: 1 } } },
        ]);

        // Create a map for unread messages count
        const unreadMessagesMap = unreadMessagesCount.reduce((map, item) => {
            map[item._id] = item.count;
            return map;
        }, {});

        chats = chats.map(chat => ({
            id: chat._id,
            friend: chat.participants[0],
            lastMessage: chat.lastMessage,
            unreadMessages: unreadMessagesMap[chat._id] || 0,
            createdAt: chat.createdAt,
            updatedAt: chat.updatedAt,
        }));

      return res.status(200).json(chats);
    },

    getMessages: async (req, res) => {
        const { chatId } = req.params;
        const { skip, limit } = req.query;
        checkParams(res, [ chatId ]);

        const [ chat, messages ] = await Promise.all([
            Chat.findById(chatId)
                .populate({
                    path: 'participants',
                    match: { _id: { $ne: req.user.id } },
                    select: 'name bio imageUrl isOnline lastSeen'
                }).lean(),

            Message.find({ chat: chatId, isVisibleTo: { $in: [req.user._id] } })
                .skip(skip)
                .limit(limit)
                .populate({
                    path: 'quotedMessage',
                    select: 'sender hasText textContent hasFile file isDeleted',
                })
                .lean(),
        ]);
        const receiver = chat.participants[0];

        const blocks = await Block.find({
            $or: [
                { blocker: req.user.id, blockedUser: receiver._id },
                { blocker: receiver.id, blockedUser: req.user.id}
            ]
        }).lean();

        if (blocks.length) {
            const hasUserBlocked = blocks.find(block => block.blocker.toString() === req.user.id.toString());
            const isUserBlocked = blocks.find(block => block.blockedUser.toString() === req.user.id.toString());

            if (hasUserBlocked) {
                receiver.isBlocked = true;
                receiver.blockId = hasUserBlocked._id;
            }
            if (isUserBlocked) receiver.hasBlocked = true;
        }
        messages.reverse();

        return res.status(200).json({ receiver, messages });
    },

    sendMessage: async (req, res) => {
        const message = req.body;

        const newMessage = new Message({
            ...message,
            quotedMessage: message.quotedMessage._id,
            sender: req.user.id,
            isSent: true,
            readBy: [req.user.id],
            isVisibleTo: [req.user.id, message.receiver]
        });

        await newMessage.save();
        await Chat.findByIdAndUpdate(message.chat, { $set: { lastMessage: newMessage._id } });

        return res.status(200).json({ newMessage });
    },

    deleteMessage: async (req, res) => {
        const { id } = req.params;
        const { url } = req.body;
        checkParams(res, [ id ]);

        const update = {
            hasText: false,
            textContent: '',
            hasFile: false,
            file: {},
            isDeleted: true
        }

        if (url) {
            const fileUrl = new URL(url);
            const pathname = fileUrl.pathname;
            const fileName = pathname.split('/').pop();
            const decodedUrl = decodeURIComponent(fileName);

            await Promise.all([
                bucket.file(decodedUrl).delete(),
                Message.findByIdAndUpdate(id, { $set: update })
            ])
            return res.status(200).json({
                success: true,
                message: 'Message successfully deleted'
            });
        }
        
        await Message.findByIdAndUpdate(id, { $set: update });

        return res.status(200).json({
            success: true,
            message: 'Message successfully deleted'
        });
    },

    editMessage: async (req, res) => {
        const { id } = req.params;
        const { edit } = req.body;
        checkParams(res, [ id, edit ]);
        await Message.findByIdAndUpdate(id, { $set: { textContent: edit } });
        return res.status(200).json({
            success: true,
            message: 'Message successfully edited'
        });
    },

    removeMessageFromView: async (req, res) => {
        const { messageId } = req.params;
        checkParams(res, [ messageId ]);

        await Message.updateOne({ _id: messageId }, { $pull: { isVisibleTo: req.user.id } });

        return res.status(200).json({
            success: true,
            message: 'Message successfully removed from view'
        });
    },

    //Clear messages in a chat
    clearMessages: async (req, res) => {
        const { chatId } = req.params;
        checkParams(res, [ chatId ]);
        await Message.deleteMany({ chat: chatId });
        return res.status(200).json({
            success: true,
            message: 'Messages successfully cleared'
        });

    },

    deleteConversation: async (req, res) => {
        const { chatId } = req.params;
        checkParams(res, [chatId]);
        await Promise.all([
            Message.deleteMany({ chat: chatId }),
            Chat.deleteOne({ _id: chatId }),
        ])
        return res.status(200).json({
            success: true,
            message: 'Messages successfully cleared'
        });
    },
}

module.exports = ChatController;
