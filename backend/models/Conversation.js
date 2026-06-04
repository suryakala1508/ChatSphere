const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    unreadCount: { type: Number, default: 0 }
  }],
  isGroup: { type: Boolean, default: false },
  groupName: { type: String, default: null },
  groupAvatar: { type: String, default: null },
  groupAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  lastMessage: {
    text: { type: String, default: '' },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    senderName: { type: String, default: '' },
    timestamp: { type: Date, default: null },
    type: { type: String, default: 'text' }
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Conversation', conversationSchema);
