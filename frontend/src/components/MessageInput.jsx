import { useState, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import ImagePreview from './ImagePreview';
import VoiceRecorder from './VoiceRecorder';

const MessageInput = ({ selectedUser, selectedConversation, message, setMessage, onTogglePicker, showPicker, onSendSuccess }) => {
  const [sendError, setSendError] = useState('');
  const [showImagePreview, setShowImagePreview] = useState(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { sendMessage, emitTyping, emitStopTyping } = useSocket();
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);

  const partnerId = selectedUser?._id;
  const conversationId = selectedConversation?._id;

  const handleTyping = useCallback(() => {
    if (!partnerId) return;
    emitTyping(conversationId, partnerId);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitStopTyping(conversationId, partnerId);
    }, 2000);
  }, [conversationId, partnerId, emitTyping, emitStopTyping]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      console.warn('[MessageInput] Cannot send: empty message');
      return;
    }
    if (!conversationId) {
      console.warn('[MessageInput] No conversationId available');
      setSendError('Please select a chat first');
      return;
    }
    try {
      const result = await sendMessage(conversationId, partnerId || null, message.trim(), 'text');
      setSendError('');
      setMessage('');
      onSendSuccess?.('Message sent');
      if (showPicker) onTogglePicker();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (partnerId) emitStopTyping(conversationId, partnerId);
    } catch (err) {
      console.error('[MessageInput] sendMessage caught error:', err);
      setSendError(typeof err === 'string' ? err : 'Failed to send message');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const uploadFile = async (file) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      return data;
    } catch (err) {
      console.error('[MessageInput] Upload error:', err.message);
      setSendError(err.message || 'Upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setShowImagePreview(file);
    }
    e.target.value = '';
  };

  const handleImageSend = async (caption) => {
    if (!showImagePreview) return;
    if (!conversationId) return;
    const uploaded = await uploadFile(showImagePreview);
    if (uploaded) {
      await sendMessage(conversationId, partnerId || null, caption || '', 'image', uploaded.url, uploaded.name, uploaded.size);
    }
    setShowImagePreview(null);
  };

  const handleDocSelect = async (e) => {
    const file = e.target.files[0];
    if (!file || !conversationId) return;
    const uploaded = await uploadFile(file);
    if (uploaded) {
      await sendMessage(conversationId, partnerId || null, '', 'file', uploaded.url, uploaded.name, uploaded.size);
    }
    e.target.value = '';
  };

  const handleVoiceSend = async (blob, duration) => {
    if (!conversationId) return;
    const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
    const uploaded = await uploadFile(file);
    if (uploaded) {
      await sendMessage(conversationId, partnerId || null, `Voice (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})`, 'voice', uploaded.url, uploaded.name, uploaded.size);
    }
    setShowVoiceRecorder(false);
  };

  return (
    <div className="relative">
      {sendError && (
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10">
          <span className="text-red-500 text-xs bg-red-50 dark:bg-red-900/30 px-3 py-1 rounded-full shadow-sm border border-red-200 dark:border-red-800 whitespace-nowrap">
            ⚠ {sendError}
          </span>
        </div>
      )}

      {showImagePreview && (
        <ImagePreview
          file={showImagePreview}
          onSend={handleImageSend}
          onCancel={() => setShowImagePreview(null)}
          uploading={uploading}
        />
      )}

      {showVoiceRecorder && (
        <VoiceRecorder
          onSend={handleVoiceSend}
          onCancel={() => setShowVoiceRecorder(false)}
        />
      )}

      <form onSubmit={handleSubmit} className="px-2 md:px-3 py-2 flex items-center gap-1 md:gap-2" style={{ backgroundColor: 'var(--bg-input)' }}>
        {/* Emoji picker */}
        <button
          type="button"
          onClick={onTogglePicker}
          className={`p-2 rounded-full transition-colors flex-shrink-0 ${
            showPicker ? 'text-[--accent]' : 'text-[--text-secondary] hover:text-[--text-primary]'
          } hover:bg-black/5 dark:hover:bg-white/10`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </button>

        {/* Attachment */}
        <div className="relative">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-full text-[--text-secondary] hover:text-[--text-primary] hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex-shrink-0"
            disabled={uploading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />
          <input
            ref={docInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.zip,.rar,.7z"
            className="hidden"
            onChange={handleDocSelect}
          />
        </div>

        {/* Document upload */}
        <button
          type="button"
          onClick={() => docInputRef.current?.click()}
          className="p-2 rounded-full text-[--text-secondary] hover:text-[--text-primary] hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex-shrink-0"
          disabled={uploading}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
            <polyline points="13 2 13 9 20 9" />
          </svg>
        </button>

        {/* Voice recorder */}
        <button
          type="button"
          onClick={() => setShowVoiceRecorder(prev => !prev)}
          className="p-2 rounded-full text-[--text-secondary] hover:text-[--text-primary] hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z" />
            <path d="M17 11a5 5 0 0 1-10 0H5a7 7 0 0 0 14 0h-2z" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        </button>

        {/* Text input */}
        <textarea
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (e.target.value.trim()) {
              handleTyping();
            } else {
              if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
              if (partnerId) emitStopTyping(conversationId, partnerId);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 px-4 py-2 rounded-lg text-sm outline-none border resize-none"
          style={{
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            borderColor: 'transparent'
          }}
          autoFocus
        />

        {/* Send button */}
        <button
          type="submit"
          disabled={!message.trim() || uploading}
          className="bg-[--accent] text-white p-2.5 rounded-full hover:bg-[--accent-hover] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
