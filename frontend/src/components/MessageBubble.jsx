import { useState } from 'react';
import { formatFileSize, getFileIcon, shouldShowTimestamp } from '../utils/helpers';

const MessageBubble = ({ msg, isSender, formatTime, onReact, onDelete, onEdit, onContextMenu, onImageClick, groupedMessages, msgIndex }) => {
  const [imgError, setImgError] = useState(false);
  const handleDownload = (url, name) => {
    const a = window.document.createElement('a');
    a.href = url;
    a.download = name || 'download';
    a.click();
  };

  const renderContent = () => {
    if (msg.deletedForEveryone) {
      return (
        <div className="flex items-center gap-2 italic opacity-60">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M20 5H9l-7 7 7 7h11a2 2 0 002-2V7a2 2 0 00-2-2z" />
            <line x1="18" y1="9" x2="12" y2="15" />
            <line x1="12" y1="9" x2="18" y2="15" />
          </svg>
          <span className="text-sm italic">This message was deleted</span>
        </div>
      );
    }

    switch (msg.type) {
      case 'image':
        return (
          <div>
            {imgError ? (
              <div className="flex items-center gap-2 p-3 opacity-60 rounded-lg bg-black/5 dark:bg-white/5 mb-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span className="text-sm">Image failed to load</span>
              </div>
            ) : (
              <img
                src={msg.fileUrl}
                alt="Shared image"
                className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity mb-1"
                style={{ maxHeight: 300, objectFit: 'cover' }}
                onClick={() => onImageClick?.(msg.fileUrl)}
                onError={() => setImgError(true)}
                loading="lazy"
              />
            )}
            {msg.message && <p className="text-sm leading-relaxed mt-1">{msg.message}</p>}
          </div>
        );

      case 'file':
        return (
          <div className="flex items-center gap-3 p-2 rounded-lg bg-black/5 dark:bg-white/5">
            <span className="text-2xl">{getFileIcon(msg.fileName)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{msg.fileName || 'File'}</p>
              <p className="text-xs opacity-70">{formatFileSize(msg.fileSize)}</p>
            </div>
            <button
              onClick={() => handleDownload(msg.fileUrl, msg.fileName)}
              className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex-shrink-0"
              title="Download"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
          </div>
        );

      case 'voice':
        return (
          <div className="min-w-[200px]">
            <audio src={msg.fileUrl} controls preload="none" className="w-full" />
            {msg.message && <p className="text-xs mt-1 opacity-70">{msg.message}</p>}
          </div>
        );

      default:
        return (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {msg.message}
            {msg.edited && (
              <span className="text-[10px] opacity-60 ml-1 italic">(edited)</span>
            )}
          </p>
        );
    }
  };

  const renderStatus = () => {
    if (!isSender) return null;
    const isDark = document.documentElement.classList.contains('dark');

    if (msg.status === 'seen') {
      return (
        <svg className="w-3.5 h-3.5 ml-0.5 text-blue-500" viewBox="0 0 16 11" fill="currentColor">
          <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.337-.14.457.457 0 0 0-.336.14.478.478 0 0 0-.14.342c0 .133.047.247.14.342l2.368 2.467a.47.47 0 0 0 .345.15.458.458 0 0 0 .356-.178l6.548-8.08a.497.497 0 0 0 .108-.336.478.478 0 0 0-.136-.322zM5.347 10.464l-.132-.144.144.15.85.784a.47.47 0 0 0 .345.15.458.458 0 0 0 .356-.178l6.548-8.08a.497.497 0 0 0 .108-.336.478.478 0 0 0-.136-.322.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178z"/>
        </svg>
      );
    }
    if (msg.status === 'delivered') {
      return (
        <svg className="w-3.5 h-3.5 ml-0.5" viewBox="0 0 16 11" fill="currentColor" opacity="0.6">
          <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.337-.14.457.457 0 0 0-.336.14.478.478 0 0 0-.14.342c0 .133.047.247.14.342l2.368 2.467a.47.47 0 0 0 .345.15.458.458 0 0 0 .356-.178l6.548-8.08a.497.497 0 0 0 .108-.336.478.478 0 0 0-.136-.322zM5.347 10.464l-.132-.144.144.15.85.784a.47.47 0 0 0 .345.15.458.458 0 0 0 .356-.178l6.548-8.08a.497.497 0 0 0 .108-.336.478.478 0 0 0-.136-.322.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178z"/>
        </svg>
      );
    }
    return (
      <svg className="w-3.5 h-3.5 ml-0.5" viewBox="0 0 16 11" fill="currentColor" opacity="0.4">
        <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.337-.14.457.457 0 0 0-.336.14.478.478 0 0 0-.14.342c0 .133.047.247.14.342l2.368 2.467a.47.47 0 0 0 .345.15.458.458 0 0 0 .356-.178l6.548-8.08a.497.497 0 0 0 .108-.336.478.478 0 0 0-.136-.322z"/>
      </svg>
    );
  };

  const renderReactions = () => {
    if (!msg.reactions || msg.reactions.length === 0) return null;
    const grouped = {};
    msg.reactions.forEach(r => {
      grouped[r.emoji] = (grouped[r.emoji] || 0) + 1;
    });
    return (
      <div className="flex flex-wrap gap-0.5 mt-1 -mb-1">
        {Object.entries(grouped).map(([emoji, count]) => (
          <span key={emoji} className="text-xs bg-white/80 dark:bg-black/30 rounded-full px-1.5 py-0.5 shadow-sm border border-white/50 dark:border-white/10">
            {emoji}{count > 1 ? count : ''}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div
      className={`flex ${isSender ? 'justify-end' : 'justify-start'} w-full message-enter`}
      onContextMenu={(e) => onContextMenu?.(e, msg)}
    >
      <div
        className={`max-w-[75%] sm:max-w-[65%] px-3 py-1.5 rounded-lg ${
          isSender
            ? 'bg-[--bg-sent] rounded-tr-sm'
            : 'bg-[--bg-received] rounded-tl-sm'
        }`}
        style={{
          backgroundColor: isSender ? 'var(--bg-sent)' : 'var(--bg-received)',
          color: 'var(--text-primary)',
          boxShadow: '0 1px 1px rgba(0,0,0,0.05)'
        }}
      >
        {renderContent()}
        {renderReactions()}
        {shouldShowTimestamp(groupedMessages || [], msgIndex ?? -1) && (
          <div className={`flex items-center justify-end gap-1 mt-0.5 ${isSender ? 'text-[--text-meta]' : 'text-[--text-meta]'}`}>
            <span className="text-[10px]">{formatTime(msg.timestamp)}</span>
            {renderStatus()}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
