import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSocket } from './SocketContext';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const { onlineUsers, socket } = useSocket();

  const fetchConversations = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/conversations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(res.data);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!socket) return;

    const handleConversationUpdated = (conv) => {
      setConversations(prev => {
        const existing = prev.findIndex(c => c._id === conv._id);
        if (existing > -1) {
          const updated = [...prev];
          updated[existing] = conv;
          return updated;
        }
        return [conv, ...prev];
      });
    };

    socket.on('conversationUpdated', handleConversationUpdated);

    return () => {
      socket.off('conversationUpdated', handleConversationUpdated);
    };
  }, [socket]);

  const selectConversation = useCallback((conversation) => {
    setActiveConversation(conversation);
  }, []);

  const getUnreadCount = useCallback((conversationId) => {
    const conv = conversations.find(c => c._id === conversationId);
    return conv?.unreadCount || 0;
  }, [conversations]);

  const getLastMessage = useCallback((conversationId) => {
    const conv = conversations.find(c => c._id === conversationId);
    return conv?.lastMessage || null;
  }, [conversations]);

  const isUserOnline = useCallback((userId) => {
    return onlineUsers.includes(userId);
  }, [onlineUsers]);

  return (
    <ChatContext.Provider value={{
      conversations,
      activeConversation,
      loading,
      fetchConversations,
      selectConversation,
      getUnreadCount,
      getLastMessage,
      isUserOnline
    }}>
      {children}
    </ChatContext.Provider>
  );
};
