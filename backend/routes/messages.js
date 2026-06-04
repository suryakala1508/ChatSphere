const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const router = express.Router();

router.get('/:conversationId', authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.conversationId,
      deleted: false
    })
      .populate('senderId', 'name avatar')
      .sort({ timestamp: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (message.senderId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const now = Date.now();
    const msgTime = new Date(message.timestamp).getTime();
    if (now - msgTime > 15 * 60 * 1000) {
      return res.status(400).json({ message: 'Can only edit within 15 minutes' });
    }

    message.editHistory.push({ message: message.message, editedAt: new Date() });
    message.message = req.body.message;
    message.edited = true;
    await message.save();

    res.json(message);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    const deleteType = req.query.type || 'me';

    if (deleteType === 'everyone') {
      if (message.senderId.toString() !== req.user.userId) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      const now = Date.now();
      const msgTime = new Date(message.timestamp).getTime();
      if (now - msgTime > 60 * 60 * 1000) {
        return res.status(400).json({ message: 'Can only delete for everyone within 1 hour' });
      }
      message.deletedForEveryone = true;
      message.message = 'This message was deleted';
      message.fileUrl = null;
      message.fileName = null;
      await message.save();
    } else {
      message.deleted = true;
      await message.save();
    }

    res.json({ message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/react/:id', authMiddleware, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    const { emoji } = req.body;
    const existingIndex = message.reactions.findIndex(
      r => r.userId.toString() === req.user.userId
    );

    if (existingIndex > -1) {
      if (message.reactions[existingIndex].emoji === emoji) {
        message.reactions.splice(existingIndex, 1);
      } else {
        message.reactions[existingIndex].emoji = emoji;
      }
    } else {
      message.reactions.push({ userId: req.user.userId, emoji });
    }

    await message.save();

    const populated = await Message.findById(message._id).populate('reactions.userId', 'name');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
