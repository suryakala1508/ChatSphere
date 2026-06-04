const Message = require('../models/Message');
const User = require('../models/User');
const Conversation = require('../models/Conversation');

const onlineUsers = new Map();

module.exports = (io) => {
  io.on('connection', async (socket) => {
    console.log('User connected:', socket.userId);
    onlineUsers.set(socket.userId, socket.id);

    try {
      await User.findByIdAndUpdate(socket.userId, { lastSeen: new Date() });
    } catch (e) { /* ignore */ }

    io.emit('onlineUsers', Array.from(onlineUsers.keys()));

    const getReceiverSocketId = (userId) => onlineUsers.get(userId);

    // ========== Presence ==========
    socket.on('userOnline', () => {
      onlineUsers.set(socket.userId, socket.id);
      io.emit('onlineUsers', Array.from(onlineUsers.keys()));
    });

    socket.on('joinGroup', ({ conversationId }) => {
      socket.join(conversationId);
    });

    socket.on('leaveGroup', ({ conversationId }) => {
      socket.leave(conversationId);
    });

    // ========== Sending Messages ==========
    socket.on('sendMessage', async ({ conversationId, receiverId, message, type, fileUrl, fileName, fileSize }, callback) => {
      try {
        const senderId = socket.userId;
        console.log(`[sendMessage] sender=${senderId}, receiver=${receiverId}, conv=${conversationId}, type=${type}, msg="${message?.substring(0, 50)}"`);

        let convId = conversationId;
        if (!convId) {
          let conversation = await Conversation.findOne({
            isGroup: false,
            $and: [
              { 'participants.userId': senderId },
              { 'participants.userId': receiverId }
            ],
            $expr: { $eq: [{ $size: '$participants' }, 2] }
          });
          if (!conversation) {
            conversation = new Conversation({
              participants: [
                { userId: senderId, unreadCount: 0 },
                { userId: receiverId, unreadCount: 0 }
              ],
              isGroup: false
            });
            await conversation.save();
            console.log(`[sendMessage] Created new conversation: ${conversation._id}`);
          }
          convId = conversation._id;
        }

        const newMessage = new Message({
          conversationId: convId,
          senderId,
          receiverId,
          message: message || '',
          type: type || 'text',
          fileUrl: fileUrl || null,
          fileName: fileName || null,
          fileSize: fileSize || null,
          status: 'sent',
          timestamp: new Date()
        });
        await newMessage.save();

        const populatedMessage = await Message.findById(newMessage._id)
          .populate('senderId', 'name avatar')
          .populate('reactions.userId', 'name');

        // Update conversation's lastMessage
        await Conversation.findByIdAndUpdate(convId, {
          lastMessage: {
            text: message || (type === 'image' ? '📷 Image' : type === 'file' ? `📎 ${fileName || 'File'}` : type === 'voice' ? '🎤 Voice message' : ''),
            senderId,
            senderName: populatedMessage.senderId?.name || 'Unknown',
            timestamp: new Date(),
            type: type || 'text'
          }
        });

        // Increment unread count for receiver(s)
        const conversation = await Conversation.findById(convId);
        if (conversation) {
          for (let i = 0; i < conversation.participants.length; i++) {
            const p = conversation.participants[i];
            if (p.userId.toString() !== senderId) {
              conversation.participants[i].unreadCount += 1;
            }
          }
          await conversation.save();

          // Deliver to receiver(s)
          const isGroup = conversation.isGroup;
          if (isGroup) {
            io.to(convId).emit('receiveMessage', populatedMessage);
            const updatedConv = await Conversation.findById(convId)
              .populate('participants.userId', 'name email avatar status lastSeen')
              .populate('lastMessage.senderId', 'name');
            io.to(convId).emit('conversationUpdated', updatedConv);
          } else {
            const receiverSocketId = getReceiverSocketId(receiverId);
            if (receiverSocketId) {
              io.to(receiverSocketId).emit('receiveMessage', populatedMessage);
              // Mark as delivered if receiver is online
              newMessage.status = 'delivered';
              newMessage.deliveredAt = new Date();
              await newMessage.save();
              populatedMessage.status = 'delivered';
              io.to(receiverSocketId).emit('messageDelivered', { messageId: newMessage._id, conversationId: convId });
              socket.emit('messageDelivered', { messageId: newMessage._id, conversationId: convId });
              // Emit conversation update to both
              const updatedConv = await Conversation.findById(convId)
                .populate('participants.userId', 'name email avatar status lastSeen')
                .populate('lastMessage.senderId', 'name');
              io.to(socket.id).emit('conversationUpdated', updatedConv);
              io.to(receiverSocketId).emit('conversationUpdated', updatedConv);
            } else {
              socket.emit('conversationUpdated', await Conversation.findById(convId)
                .populate('participants.userId', 'name email avatar status lastSeen')
                .populate('lastMessage.senderId', 'name'));
            }
          }
        }

        socket.emit('receiveMessage', populatedMessage);
        if (callback) callback({ success: true, messageId: newMessage._id, conversationId: convId });
      } catch (err) {
        console.error('=== sendMessage Error Details ===');
        console.error('Name:', err.name);
        console.error('Message:', err.message);
        console.error('Stack:', err.stack?.split('\n').slice(0, 5).join('\n'));
        if (callback) callback({ error: err.message || 'Failed to send message' });
      }
    });

    // ========== Message Status ==========
    socket.on('markRead', async ({ conversationId, senderId }) => {
      try {
        const receiverId = socket.userId;
        let convId = conversationId;

        if (!convId && senderId) {
          const conversation = await Conversation.findOne({
            isGroup: false,
            $and: [
              { 'participants.userId': senderId },
              { 'participants.userId': receiverId }
            ],
            $expr: { $eq: [{ $size: '$participants' }, 2] }
          });
          if (conversation) convId = conversation._id;
        }

        if (convId) {
          const result = await Message.updateMany(
            { conversationId: convId, receiverId, status: { $ne: 'seen' } },
            { $set: { status: 'seen', seenAt: new Date(), read: true } }
          );

          await Conversation.updateOne(
            { _id: convId, 'participants.userId': receiverId },
            { $set: { 'participants.$.unreadCount': 0 } }
          );

          if (result.modifiedCount > 0) {
            const conversation = await Conversation.findById(convId);
            for (const p of conversation.participants) {
              const psId = getReceiverSocketId(p.userId.toString());
              if (psId) {
                io.to(psId).emit('messagesRead', { userId: receiverId, conversationId: convId });
                io.to(psId).emit('messageSeen', { conversationId: convId, userId: receiverId });
              }
            }
          }
        }
      } catch (err) {
        console.error('Error marking messages as read:', err);
      }
    });

    // ========== Typing Indicator ==========
    socket.on('typing', ({ conversationId, receiverId }) => {
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('userTyping', { senderId: socket.userId, conversationId });
      }
    });

    socket.on('stopTyping', ({ conversationId, receiverId }) => {
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('userStoppedTyping', { senderId: socket.userId, conversationId });
      }
    });

    // ========== Delete Message ==========
    socket.on('deleteMessage', async ({ messageId, type, conversationId }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        if (type === 'everyone') {
          message.deletedForEveryone = true;
          message.message = 'This message was deleted';
          message.fileUrl = null;
          await message.save();
          // Notify all participants
          const conversation = await Conversation.findById(conversationId);
          if (conversation) {
            for (const p of conversation.participants) {
              const psId = getReceiverSocketId(p.userId.toString());
              if (psId) io.to(psId).emit('messageDeleted', { messageId, conversationId });
            }
          }
        } else {
          // Delete for me - just hide
          message.deleted = true;
          await message.save();
          socket.emit('messageDeleted', { messageId, conversationId });
        }
      } catch (err) {
        console.error('Error deleting message:', err);
      }
    });

    // ========== Edit Message ==========
    socket.on('editMessage', async ({ messageId, newMessage, conversationId }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message || message.senderId.toString() !== socket.userId) return;

        message.editHistory.push({ message: message.message, editedAt: new Date() });
        message.message = newMessage;
        message.edited = true;
        await message.save();

        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
          for (const p of conversation.participants) {
            const psId = getReceiverSocketId(p.userId.toString());
            if (psId) io.to(psId).emit('messageEdited', { messageId, newMessage, edited: true, conversationId });
          }
        }
      } catch (err) {
        console.error('Error editing message:', err);
      }
    });

    // ========== Message Reactions ==========
    socket.on('reactToMessage', async ({ messageId, emoji, conversationId }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        const existingIndex = message.reactions.findIndex(
          r => r.userId.toString() === socket.userId
        );

        if (existingIndex > -1) {
          if (message.reactions[existingIndex].emoji === emoji) {
            message.reactions.splice(existingIndex, 1);
          } else {
            message.reactions[existingIndex].emoji = emoji;
          }
        } else {
          message.reactions.push({ userId: socket.userId, emoji });
        }

        await message.save();

        const populated = await Message.findById(messageId).populate('reactions.userId', 'name');
        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
          for (const p of conversation.participants) {
            const psId = getReceiverSocketId(p.userId.toString());
            if (psId) io.to(psId).emit('messageReacted', { messageId, reactions: populated.reactions, conversationId });
          }
        }
      } catch (err) {
        console.error('Error reacting to message:', err);
      }
    });

    // ========== WebRTC Signaling ==========
    socket.on('callUser', async ({ receiverId, type, offer }) => {
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('incomingCall', {
          callerId: socket.userId,
          type,
          offer
        });
      } else {
        socket.emit('callFailed', { reason: 'User is offline' });
        // Log missed call
        try {
          const CallLog = require('../models/CallLog');
          await new CallLog({
            callerId: socket.userId,
            receiverId,
            type,
            status: 'missed'
          }).save();
        } catch (e) { /* ignore */ }
      }
    });

    socket.on('answerCall', ({ callerId, answer }) => {
      const callerSocketId = getReceiverSocketId(callerId);
      if (callerSocketId) {
        io.to(callerSocketId).emit('callAnswered', { answer });
      }
    });

    socket.on('iceCandidate', ({ userId, candidate }) => {
      const targetSocketId = getReceiverSocketId(userId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('iceCandidate', { candidate });
      }
    });

    socket.on('endCall', async ({ userId, type, duration }) => {
      const targetSocketId = getReceiverSocketId(userId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('callEnded');
      }
      try {
        const CallLog = require('../models/CallLog');
        const existingCall = await CallLog.findOne({
          $or: [
            { callerId: socket.userId, receiverId: userId, endTime: null },
            { callerId: userId, receiverId: socket.userId, endTime: null }
          ]
        }).sort({ startTime: -1 });
        if (existingCall) {
          existingCall.status = duration > 0 ? 'answered' : 'missed';
          existingCall.endTime = new Date();
          existingCall.duration = duration || 0;
          await existingCall.save();
        }
      } catch (e) { /* ignore */ }
    });

    socket.on('muteCall', ({ userId }) => {
      const targetSocketId = getReceiverSocketId(userId);
      if (targetSocketId) io.to(targetSocketId).emit('callMuted');
    });

    socket.on('unmuteCall', ({ userId }) => {
      const targetSocketId = getReceiverSocketId(userId);
      if (targetSocketId) io.to(targetSocketId).emit('callUnmuted');
    });

    socket.on('toggleCamera', ({ userId, isCameraOff }) => {
      const targetSocketId = getReceiverSocketId(userId);
      if (targetSocketId) io.to(targetSocketId).emit('cameraToggled', { isCameraOff });
    });

    // ========== Disconnect ==========
    socket.on('disconnect', async () => {
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
      try {
        await User.findByIdAndUpdate(socket.userId, { lastSeen: new Date() });
      } catch (e) { /* ignore */ }
      io.emit('onlineUsers', Array.from(onlineUsers.keys()));
      io.emit('userWentOffline', { userId: socket.userId, lastSeen: new Date() });
      console.log('User disconnected:', socket.userId);
    });
  });
};
