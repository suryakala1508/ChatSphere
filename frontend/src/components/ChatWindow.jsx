import { useEffect, useRef, useState, useCallback } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { useSocket } from '../context/SocketContext';
import { useChat } from '../context/ChatContext';
import { useCall } from '../context/CallContext';
import MessageBubble from './MessageBubble';
import DateSeparator from './DateSeparator';
import MessageInput from './MessageInput';
import ReactionPicker from './ReactionPicker';
import ContextMenu from './ContextMenu';
import ScrollToBottom from './ScrollToBottom';
import Lightbox from './Lightbox';
import {
  formatMessageTime, formatLastSeen, getInitials, getAvatarColor,
  groupMessagesByDate, shouldShowSender, shouldShowTimestamp
} from '../utils/helpers';
const API_URL = 'https://chatsphere-m9gn.onrender.com/api';
const ChatWindow = ({ selectedUser, selectedConversation, onToggleSidebar, onConversationCreated }) => {
  const {
    messages, onlineUsers, typingUsers, fetchMessages, markMessagesRead,
    deleteMessage, editMessage, reactToMessage, getUserId, lastSeenMap, socket, joinGroup
  } = useSocket();
  const { isUserOnline } = useChat();
  const { initiateCall } = useCall();

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [showPicker, setShowPicker] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [wallpaper] = useState(() => localStorage.getItem('chatWallpaper') || '');
  const [sendSuccess, setSendSuccess] = useState('');

  const currentUserId = getUserId;
  const conversationId = selectedConversation?._id || selectedUser?._id;
  const chatMessages = conversationId ? (messages[conversationId] || []) : [];
  const isGroup = selectedConversation?.isGroup;

  const isTyping = selectedUser ? typingUsers[selectedUser._id] : false;
  const partner = isGroup ? null : selectedUser;

  useEffect(() => {
    if (conversationId) {
      fetchMessages(conversationId);
      markMessagesRead(conversationId, selectedUser?._id);
      if (isGroup) {
        joinGroup(conversationId);
      }
    }
  }, [conversationId, isGroup, selectedUser?._id, fetchMessages, markMessagesRead, joinGroup]);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    if (chatMessages.length === 0) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  // Listen for new conversation from sendMessage response
  useEffect(() => {
    if (!socket) return;
    const handler = (response) => {
      if (response?.conversationId && !selectedConversation) {
        // Fetch the conversation data to populate state
        const token = localStorage.getItem('token');
        fetch(`${API_URL}/conversations/${response.conversationId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json()).then(conv => {
          onConversationCreated?.(conv);
        }).catch(() => {});
      }
    };
    // We use a custom approach - the sendMessage callback handles this
  }, [socket, selectedConversation, onConversationCreated]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
    setShowScrollBtn(!isNearBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBtn(false);
  }, []);

  // Context menu handlers
  const handleContextMenu = useCallback((e, msg) => {
    e.preventDefault();
    if (msg.senderId._id === currentUserId) {
      setContextMenu({ x: e.clientX, y: e.clientY, msgId: msg._id, msg });
    }
  }, [currentUserId]);

  const handleEdit = useCallback((msg) => {
    setEditingMessage(msg._id);
    setEditText(msg.message);
    setContextMenu(null);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (editText.trim() && editingMessage) {
      editMessage(editingMessage, editText.trim(), conversationId);
      setEditingMessage(null);
      setEditText('');
    }
  }, [editText, editingMessage, editMessage, conversationId]);

  const handleDelete = useCallback((msgId, type) => {
    deleteMessage(msgId, type, conversationId);
    setContextMenu(null);
  }, [deleteMessage, conversationId]);

  const handleReact = useCallback((msgId, emoji) => {
    reactToMessage(msgId, emoji, conversationId);
    setShowReactionPicker(null);
  }, [reactToMessage, conversationId]);

  const messageGroups = groupMessagesByDate(chatMessages);

  // Build context menu options
  const contextOptions = contextMenu ? [
    {
      icon: '✏️',
      label: 'Edit',
      action: () => handleEdit(contextMenu.msg)
    },
    {
      icon: '🗑️',
      label: 'Delete for me',
      action: () => handleDelete(contextMenu.msgId, 'me')
    },
    {
      icon: '🚫',
      label: 'Delete for everyone',
      danger: true,
      action: () => handleDelete(contextMenu.msgId, 'everyone')
    }
  ].filter(opt => {
    const isSender = contextMenu.msg.senderId._id === currentUserId;
    if (opt.label === 'Edit' && !isSender) return false;
    if (opt.label === 'Delete for everyone' && !isSender) return false;
    return true;
  }) : [];

  if (!selectedUser && !selectedConversation) {
    return (
      <div className="flex-1 flex items-center justify-center chat-bg">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--accent)', opacity: 0.2 }}>
            <svg className="w-10 h-10" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>ChatSphere</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Select a conversation to start chatting</p>
        </div>
      </div>
    );
  }

  const isOnline = partner ? isUserOnline(partner._id) : false;
  const displayName = isGroup ? selectedConversation.groupName : partner?.name || 'Unknown';
  const displayAvatar = isGroup ? selectedConversation.groupAvatar : partner?.avatar;

  const initials = getInitials(displayName);

  return (
    <div className="flex-1 flex flex-col min-h-0 relative" style={{ backgroundColor: 'var(--bg-chat)' }}>
      {/* Header */}
      <div className="px-3 py-2 flex items-center shadow-sm" style={{ backgroundColor: 'var(--bg-header)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={onToggleSidebar} className="md:hidden p-1 mr-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
            <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="relative flex-shrink-0" onClick={() => onToggleSidebar?.()}>
          {isGroup ? (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
              {initials}
            </div>
          ) : displayAvatar ? (
            <img src={displayAvatar} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(displayName)} flex items-center justify-center text-white font-semibold text-sm`}>
              {initials}
            </div>
          )}
          {isOnline && !isGroup && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-[--bg-header] rounded-full" />
          )}
        </div>

        <div className="ml-3 flex-1 min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{displayName}</p>
          <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
            {isTyping ? (
              <span className="text-green-500 italic">typing...</span>
            ) : isGroup ? (
              `${selectedConversation.participants?.length || 0} members`
            ) : isOnline ? (
              'Online'
            ) : partner ? (
              `last seen ${formatLastSeen(lastSeenMap[partner._id] || partner.lastSeen)}`
            ) : ''}
          </p>
        </div>

        {/* Call buttons */}
        {partner && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => initiateCall(partner, 'audio')}
              className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              title="Voice call"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </button>
            <button
              onClick={() => initiateCall(partner, 'video')}
              className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              title="Video call"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Send success notification */}
      {sendSuccess && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10 animate-fadeIn">
          <span className="text-green-600 dark:text-green-400 text-xs bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-full shadow-sm border border-green-200 dark:border-green-800 whitespace-nowrap">
            ✓ {sendSuccess}
          </span>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto px-3 py-3 relative messages-scroll"
        style={{
          backgroundImage: wallpaper || 'var(--bg-chat-pattern)',
          backgroundColor: wallpaper ? 'transparent' : 'var(--bg-chat)',
          backgroundSize: 'cover',
          backgroundAttachment: 'fixed'
        }}
      >
        {chatMessages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-sm" style={{ color: 'var(--text-meta)' }}>
                {selectedConversation?.isGroup ? 'No messages in this group yet.' : 'No messages yet. Say hello!'}
              </p>
            </div>
          </div>
        )}

        {messageGroups.map((group, gi) => (
          <div key={gi}>
            <DateSeparator timestamp={group.date} />
            {group.messages.map((msg, mi) => {
              const isSender = msg.senderId._id === currentUserId;
              return (
                <div key={msg._id} className="mb-1">
                  {/* Show sender name in group chats */}
                  {isGroup && !isSender && shouldShowSender(group.messages, mi) && (
                    <p className="text-xs font-medium mb-0.5 ml-1" style={{ color: msg.senderId?.color || '#667781' }}>
                      {msg.senderId?.name || 'Unknown'}
                    </p>
                  )}

                  {editingMessage === msg._id ? (
                    <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-[--accent]/10" style={{ maxWidth: '75%' }}>
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-sm rounded-lg outline-none border"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          borderColor: 'var(--border)'
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') setEditingMessage(null);
                        }}
                        autoFocus
                      />
                      <button onClick={handleSaveEdit} className="text-xs text-[--accent] font-medium">Save</button>
                      <button onClick={() => setEditingMessage(null)} className="text-xs" style={{ color: 'var(--text-meta)' }}>Cancel</button>
                    </div>
                  ) : (
                    <div className={`flex ${isSender ? 'flex-row-reverse' : 'flex-row'} items-start gap-1 group`}>
                      <MessageBubble
                        msg={msg}
                        isSender={isSender}
                        formatTime={formatMessageTime}
                        onContextMenu={handleContextMenu}
                        onImageClick={(url) => setLightboxSrc(url)}
                        groupedMessages={group.messages}
                        msgIndex={mi}
                      />
                      {/* Reaction button */}
                      <button
                        onClick={() => setShowReactionPicker(showReactionPicker === msg._id ? null : msg._id)}
                        className="mt-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-[--bg-secondary]"
                        style={{ color: 'var(--text-meta)' }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <circle cx="12" cy="12" r="10" />
                          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                          <line x1="9" y1="9" x2="9.01" y2="9" />
                          <line x1="15" y1="9" x2="15.01" y2="9" />
                        </svg>
                      </button>
                      {showReactionPicker === msg._id && (
                        <ReactionPicker
                          onReact={(emoji) => handleReact(msg._id, emoji)}
                          onClose={() => setShowReactionPicker(null)}
                          position={isSender ? { bottom: '100%', left: 'auto', right: 0 } : { bottom: '100%', left: 0 }}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start mb-2">
            <div className="px-3 py-2 rounded-lg rounded-tl-sm shadow-sm" style={{ backgroundColor: 'var(--bg-received)' }}>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[--text-meta] animate-bounce-dot" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[--text-meta] animate-bounce-dot" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[--text-meta] animate-bounce-dot" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <ScrollToBottom onClick={scrollToBottom} visible={showScrollBtn} />
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji picker */}
      {showPicker && (
        <div className="flex-shrink-0 border-t overflow-hidden" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-primary)' }}>
          <EmojiPicker
            width="100%"
            height={300}
            onEmojiClick={(emojiData) => {
              setInputMessage(prev => prev + emojiData.emoji);
            }}
            searchDisabled={true}
            skinTonesDisabled={true}
            emojiStyle="native"
            lazyLoadEmojis={true}
          />
        </div>
      )}

      <div className="flex-shrink-0">
        <MessageInput
          selectedUser={partner}
          selectedConversation={selectedConversation}
          message={inputMessage}
          setMessage={setInputMessage}
          onTogglePicker={() => setShowPicker(prev => !prev)}
          showPicker={showPicker}
          onSendSuccess={(msg) => {
            setSendSuccess(msg);
            setTimeout(() => setSendSuccess(''), 3000);
          }}
        />
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          options={contextOptions}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Lightbox */}
      {lightboxSrc && (
        <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </div>
  );
};

export default ChatWindow;
