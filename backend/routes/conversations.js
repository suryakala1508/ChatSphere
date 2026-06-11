const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const router = express.Router();

const serializeConversation = (conv, currentUserId) => {
  const object = conv.toObject();
  const myParticipation = object.participants.find(
    p => p.userId && p.userId._id && p.userId._id.toString() === currentUserId
  );
  const otherParticipants = object.participants
    .filter(p => p.userId && p.userId._id && p.userId._id.toString() !== currentUserId)
    .map(p => p.userId);

  return {
    ...object,
    unreadCount: myParticipation ? myParticipation.unreadCount : 0,
    otherParticipants
  };
};

const findPopulatedConversation = (id) => {
  return Conversation.findById(id)
    .populate('participants.userId', 'name email avatar status lastSeen')
    .populate('lastMessage.senderId', 'name');
};

router.get('/', authMiddleware, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      'participants.userId': req.user.userId
    })
      .populate('participants.userId', 'name email avatar status lastSeen')
      .populate('lastMessage.senderId', 'name')
      .sort({ 'lastMessage.timestamp': -1, createdAt: -1 });

    // Filter out conversations where participants are all null (deleted users)
    const validConversations = conversations.filter(conv => {
      return conv.participants.some(p => p.userId != null);
    });

    const enriched = validConversations.map(conv => serializeConversation(conv, req.user.userId));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { participantIds, isGroup, groupName } = req.body;
    const allParticipants = [req.user.userId, ...participantIds];

    // Prevent duplicate conversations (both DM and group)
    const existing = await Conversation.findOne({
      isGroup: isGroup || false,
      $and: [
        { 'participants.userId': req.user.userId },
        ...participantIds.map(id => ({ 'participants.userId': id }))
      ],
      $expr: { $eq: [{ $size: '$participants' }, allParticipants.length] }
    });
    if (existing) {
      const populatedExisting = await findPopulatedConversation(existing._id);
      return res.json(serializeConversation(populatedExisting, req.user.userId));
    }

    const conversation = new Conversation({
      participants: allParticipants.map(id => ({ userId: id, unreadCount: 0 })),
      isGroup: isGroup || false,
      groupName: isGroup ? groupName : undefined,
      groupAdmin: isGroup ? req.user.userId : undefined
    });

    await conversation.save();

    const populated = await findPopulatedConversation(conversation._id);

    res.status(201).json(serializeConversation(populated, req.user.userId));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    if (conversation.groupAdmin?.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Only group admin can update' });
    }

    const { groupName, groupAvatar, addParticipants, removeParticipants } = req.body;

    if (groupName) conversation.groupName = groupName;
    if (groupAvatar) conversation.groupAvatar = groupAvatar;

    if (addParticipants) {
      for (const id of addParticipants) {
        if (!conversation.participants.find(p => p.userId.toString() === id)) {
          conversation.participants.push({ userId: id, unreadCount: 0 });
        }
      }
    }

    if (removeParticipants) {
      conversation.participants = conversation.participants.filter(
        p => !removeParticipants.includes(p.userId.toString())
      );
    }

    await conversation.save();

    const populated = await Conversation.findById(conversation._id)
      .populate('participants.userId', 'name email avatar status lastSeen');

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    conversation.participants = conversation.participants.filter(
      p => p.userId.toString() !== req.user.userId
    );

    if (conversation.participants.length === 0) {
      await Message.deleteMany({ conversationId: conversation._id });
      await Conversation.findByIdAndDelete(conversation._id);
    } else {
      await conversation.save();
    }

    res.json({ message: 'Conversation removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/unread-counts', authMiddleware, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      'participants.userId': req.user.userId
    });

    const counts = {};
    conversations.forEach(conv => {
      const participant = conv.participants.find(
        p => p.userId.toString() === req.user.userId
      );
      if (participant && participant.unreadCount > 0) {
        conv.participants.forEach(p => {
          if (p.userId.toString() !== req.user.userId) {
            counts[p.userId.toString()] = participant.unreadCount;
          }
        });
      }
    });

    res.json(counts);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const conversation = await findPopulatedConversation(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    const isParticipant = conversation.participants.some(
      p => p.userId && p.userId._id && p.userId._id.toString() === req.user.userId
    );
    if (!isParticipant) return res.status(403).json({ message: 'Not authorized' });

    res.json(serializeConversation(conversation, req.user.userId));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
