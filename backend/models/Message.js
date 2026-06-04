const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', default: null },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  message: { type: String, default: '' },
  type: { type: String, enum: ['text', 'image', 'file', 'voice'], default: 'text' },
  fileUrl: { type: String, default: null },
  fileName: { type: String, default: null },
  fileSize: { type: Number, default: null },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['sent', 'delivered', 'seen'], default: 'sent' },
  deliveredAt: { type: Date, default: null },
  seenAt: { type: Date, default: null },
  read: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
  deletedForEveryone: { type: Boolean, default: false },
  edited: { type: Boolean, default: false },
  editHistory: [{
    message: String,
    editedAt: { type: Date, default: Date.now }
  }],
  reactions: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: String
  }]
});

module.exports = mongoose.model('Message', messageSchema);
