const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const CallLog = require('../models/CallLog');
const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { receiverId, type, status, startTime, endTime, duration } = req.body;
    const callLog = new CallLog({
      callerId: req.user.userId,
      receiverId,
      type,
      status: status || 'missed',
      startTime: startTime || new Date(),
      endTime,
      duration: duration || 0
    });
    await callLog.save();

    const populated = await CallLog.findById(callLog._id)
      .populate('callerId', 'name avatar')
      .populate('receiverId', 'name avatar');

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const callLogs = await CallLog.find({
      $or: [
        { callerId: req.user.userId },
        { receiverId: req.user.userId }
      ]
    })
      .populate('callerId', 'name avatar')
      .populate('receiverId', 'name avatar')
      .sort({ startTime: -1 })
      .limit(50);

    res.json(callLogs);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
