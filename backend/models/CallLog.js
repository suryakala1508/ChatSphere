const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
  callerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['audio', 'video'], required: true },
  status: { type: String, enum: ['missed', 'answered', 'rejected'], default: 'missed' },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date, default: null },
  duration: { type: Number, default: 0 }
});

module.exports = mongoose.model('CallLog', callLogSchema);
