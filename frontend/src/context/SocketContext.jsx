import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { getSenderId } from '../utils/helpers';

const SocketContext = createContext();
const API_URL = 'https://chatsphere-m9gn.onrender.com/api';
const SOCKET_URL = API_URL.replace(/\/api$/, '');

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messages, setMessages] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [connected, setConnected] = useState(false);
  const [lastSeenMap, setLastSeenMap] = useState({});
  const [messageStatuses, setMessageStatuses] = useState({});
  const userIdRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userIdRef.current = payload.userId;
    } catch (e) {
      return;
    }

    const newSocket = io(SOCKET_URL, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      setConnected(true);
      newSocket.emit('userOnline');
    });

    newSocket.on('disconnect', () => setConnected(false));

    newSocket.on('onlineUsers', (users) => {
      setOnlineUsers(users);
    });

    newSocket.on('userWentOffline', ({ userId, lastSeen }) => {
      setLastSeenMap(prev => ({ ...prev, [userId]: lastSeen }));
    });

    newSocket.on('receiveMessage', (message) => {
      setMessages(prev => {
        const currentUserId = userIdRef.current;
        const senderId = getSenderId(message);
        const otherUserId = senderId === currentUserId
          ? message.receiverId
          : senderId;
        const convId = message.conversationId || otherUserId;
        if (!convId) return prev;
        const existing = prev[convId] || [];
        if (existing.some(m => m._id === message._id)) return prev;
        return { ...prev, [convId]: [...existing, message] };
      });
    });

    newSocket.on('messageDelivered', ({ messageId, conversationId }) => {
      setMessages(prev => {
        const updated = { ...prev };
        for (const key of Object.keys(updated)) {
          updated[key] = updated[key].map(m =>
            m._id === messageId ? { ...m, status: 'delivered', deliveredAt: new Date() } : m
          );
        }
        return updated;
      });
    });

    newSocket.on('messageSeen', ({ conversationId, userId }) => {
      setMessages(prev => {
        const updated = { ...prev };
        const convKey = conversationId || userId;
        if (updated[convKey]) {
          updated[convKey] = updated[convKey].map(m => {
            const senderId = getSenderId(m);
            const isSentByMe = senderId === userIdRef.current;
            const isToThisUser = m.receiverId === userId || senderId === userId;
            if (isSentByMe && (isToThisUser || m.conversationId === conversationId)) {
              return { ...m, status: 'seen', read: true, seenAt: new Date() };
            }
            return m;
          });
        }
        return updated;
      });
    });

    newSocket.on('messagesRead', ({ userId, conversationId }) => {
      setMessages(prev => {
        const updated = { ...prev };
        for (const key of Object.keys(updated)) {
          updated[key] = updated[key].map(m =>
            m.receiverId === userId || getSenderId(m) === userId
              ? { ...m, read: true, status: 'seen', seenAt: new Date() }
              : m
          );
        }
        return updated;
      });
    });

    newSocket.on('messageDeleted', ({ messageId, conversationId }) => {
      setMessages(prev => {
        const updated = { ...prev };
        for (const key of Object.keys(updated)) {
          updated[key] = updated[key].map(m =>
            m._id === messageId
              ? { ...m, message: 'This message was deleted', deletedForEveryone: true, fileUrl: null, fileName: null }
              : m
          );
        }
        return updated;
      });
    });

    newSocket.on('messageEdited', ({ messageId, newMessage, edited, conversationId }) => {
      setMessages(prev => {
        const updated = { ...prev };
        for (const key of Object.keys(updated)) {
          updated[key] = updated[key].map(m =>
            m._id === messageId ? { ...m, message: newMessage, edited } : m
          );
        }
        return updated;
      });
    });

    newSocket.on('messageReacted', ({ messageId, reactions, conversationId }) => {
      setMessages(prev => {
        const updated = { ...prev };
        for (const key of Object.keys(updated)) {
          updated[key] = updated[key].map(m =>
            m._id === messageId ? { ...m, reactions } : m
          );
        }
        return updated;
      });
    });

    newSocket.on('userTyping', ({ senderId, conversationId }) => {
      setTypingUsers(prev => ({ ...prev, [senderId || conversationId]: true }));
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setTypingUsers(prev => {
          const next = { ...prev };
          delete next[senderId || conversationId];
          return next;
        });
      }, 3000);
    });

    newSocket.on('userStoppedTyping', ({ senderId, conversationId }) => {
      setTypingUsers(prev => {
        const next = { ...prev };
        delete next[senderId || conversationId];
        return next;
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [token]);

  const sendMessage = useCallback((conversationId, receiverId, message, type = 'text', fileUrl = null, fileName = null, fileSize = null) => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject('Socket not connected');
      socket.emit('sendMessage', { conversationId, receiverId, message, type, fileUrl, fileName, fileSize }, (response) => {
        if (response?.error) {
          console.error('[SocketContext] sendMessage backend error:', response.error);
          reject(response.error);
        } else resolve(response);
      });
    });
  }, [socket]);

  const emitTyping = useCallback((conversationId, receiverId) => {
    if (socket) socket.emit('typing', { conversationId, receiverId });
  }, [socket]);

  const emitStopTyping = useCallback((conversationId, receiverId) => {
    if (socket) socket.emit('stopTyping', { conversationId, receiverId });
  }, [socket]);

  const fetchMessages = useCallback(async (conversationId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/messages/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = Array.isArray(res.data) ? res.data : [];
      setMessages(prev => ({ ...prev, [conversationId]: data }));
      return data;
    } catch (err) {
      console.error('Error fetching messages:', err);
      return [];
    }
  }, []);

  const markMessagesRead = useCallback((conversationId, senderId) => {
    if (socket) socket.emit('markRead', { conversationId, senderId });
  }, [socket]);

  const deleteMessage = useCallback((messageId, type, conversationId) => {
    if (socket) socket.emit('deleteMessage', { messageId, type, conversationId });
  }, [socket]);

  const editMessage = useCallback((messageId, newMessage, conversationId) => {
    if (socket) socket.emit('editMessage', { messageId, newMessage, conversationId });
  }, [socket]);

  const reactToMessage = useCallback((messageId, emoji, conversationId) => {
    if (socket) socket.emit('reactToMessage', { messageId, emoji, conversationId });
  }, [socket]);

  const joinGroup = useCallback((conversationId) => {
    if (socket) socket.emit('joinGroup', { conversationId });
  }, [socket]);

  return (
    <SocketContext.Provider value={{
      socket,
      onlineUsers,
      messages,
      typingUsers,
      lastSeenMap,
      sendMessage,
      emitTyping,
      emitStopTyping,
      fetchMessages,
      markMessagesRead,
      deleteMessage,
      editMessage,
      reactToMessage,
      joinGroup,
      getUserId: userIdRef.current,
      connected
    }}>
      {children}
    </SocketContext.Provider>
  );
};
