import { useState, useEffect } from 'react';
import axios from 'axios';
import UserList from './UserList';
import { useSocket } from '../context/SocketContext';
import { useChat } from '../context/ChatContext';
import LoadingSkeleton from './LoadingSkeleton';

const Sidebar = ({ selectedUser, selectedConversation, onSelectUser, onSelectConversation, onToggleProfile, onNewGroup, isMobileOpen, onToggleTheme, isDark, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { onlineUsers } = useSocket();
  const { conversations, getUnreadCount, getLastMessage, fetchConversations } = useChat();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/users', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(res.data);
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };
    if (!conversations?.length) fetchUsers();
  }, [conversations]);

  // Build conversation list combining conversations and direct chats
  const conversationList = conversations?.map(conv => {
    const otherParticipants = conv.otherParticipants || [];
    const otherUser = otherParticipants[0];
    return {
      type: 'conversation',
      conversation: conv,
      user: conv.isGroup ? null : otherUser,
      lastMessage: conv.lastMessage,
      unreadCount: conv.unreadCount || 0
    };
  }).filter(item => {
    // Filter out 1-on-1 conversations with no valid other user
    if (item.conversation.isGroup) return true;
    return item.user != null;
  }) || [];

  // Add direct users that don't have conversations yet
  const userConversationIds = new Set(
    conversationList.map(c => c.user?._id).filter(Boolean)
  );
  const directUsers = users.filter(u => !userConversationIds.has(u._id)).map(u => ({
    type: 'user',
    user: u,
    conversation: null,
    lastMessage: null,
    unreadCount: 0
  }));

  const allItems = [...conversationList, ...directUsers];

  const filteredItems = allItems.filter(item => {
    const name = item.user?.name || item.conversation?.groupName || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const handleSelect = async (item) => {
    if (item.type === 'conversation') {
      onSelectConversation?.(item.conversation);
      if (!item.conversation.isGroup && item.user) {
        onSelectUser?.(item.user);
      }
    } else {
      // Create or find conversation before selecting
      try {
        const token = localStorage.getItem('token');
        const res = await axios.post('/api/conversations', {
          participantIds: [item.user._id],
          isGroup: false
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        onSelectUser?.(item.user);
        onSelectConversation?.(res.data);
        fetchConversations(); // refresh sidebar list
      } catch (err) {
        console.error('Error creating conversation:', err);
        onSelectUser?.(item.user);
        onSelectConversation?.(null);
      }
    }
  };

  const isItemActive = (item) => {
    if (item.type === 'conversation') {
      return selectedConversation?._id === item.conversation._id;
    }
    return selectedUser?._id === item.user?._id && !selectedConversation;
  };

  return (
    <div className={`w-full md:w-80 lg:w-96 bg-[--bg-sidebar] border-r flex flex-col`} style={{ borderColor: 'var(--border)' }}>
      {/* Header */}
      <div className="px-3 py-2.5 flex items-center justify-between" style={{ backgroundColor: 'var(--bg-header)' }}>
        <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>ChatSphere</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewGroup}
            className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            title="New group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
              <path d="M11 19l-7 2 2-7L18.36 3.64a2 2 0 0 1 2.82 0L21 4.18a2 2 0 0 1 0 2.82L11 19z" />
            </svg>
          </button>
          <button
            onClick={onToggleProfile}
            className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            title="Profile"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            title="Toggle theme"
          >
            {isDark ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
          <button
            onClick={onLogout}
            className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            title="Logout"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-2">
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-meta)' }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search or start new chat"
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid transparent'
            }}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <LoadingSkeleton key={i} type="user" />)
        ) : filteredItems.length === 0 ? (
          <div className="flex items-center justify-center h-32" style={{ color: 'var(--text-meta)' }}>
            <p className="text-sm">No conversations found</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <UserList
              key={item.conversation?._id || item.user?._id}
              conversation={item.conversation}
              user={item.user}
              isOnline={item.user ? onlineUsers.includes(item.user._id) : false}
              isActive={isItemActive(item)}
              onClick={() => handleSelect(item)}
              unreadCount={item.unreadCount}
              lastMessage={item.lastMessage}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Sidebar;
