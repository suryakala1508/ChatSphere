export const formatMessageTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const formatDateSeparator = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (msgDate.getTime() === today.getTime()) return 'Today';
  if (msgDate.getTime() === yesterday.getTime()) return 'Yesterday';

  const dayDiff = Math.floor((today - msgDate) / (1000 * 60 * 60 * 24));
  if (dayDiff < 7) {
    return date.toLocaleDateString([], { weekday: 'long' });
  }

  const year = date.getFullYear();
  const currentYear = now.getFullYear();
  if (year === currentYear) {
    return date.toLocaleDateString([], { month: 'long', day: 'numeric' });
  }
  return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
};

export const formatLastSeen = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const getAvatarColor = (name) => {
  const colors = [
    'from-green-500 to-green-600',
    'from-blue-500 to-blue-600',
    'from-purple-500 to-purple-600',
    'from-pink-500 to-pink-600',
    'from-yellow-500 to-yellow-600',
    'from-red-500 to-red-600',
    'from-indigo-500 to-indigo-600',
    'from-teal-500 to-teal-600'
  ];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

export const getFileIcon = (fileName) => {
  if (!fileName) return '📄';
  const ext = fileName.split('.').pop().toLowerCase();
  const icons = {
    pdf: '📕',
    doc: '📘',
    docx: '📘',
    xls: '📗',
    xlsx: '📗',
    zip: '📦',
    rar: '📦',
    '7z': '📦',
    mp3: '🎵',
    mp4: '🎬',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️',
    gif: '🖼️'
  };
  return icons[ext] || '📄';
};

export const groupMessagesByDate = (messages) => {
  const groups = [];
  let currentDate = null;
  let currentGroup = [];

  for (const msg of messages) {
    const msgDate = new Date(msg.timestamp).toDateString();
    if (msgDate !== currentDate) {
      if (currentGroup.length > 0) {
        groups.push({ date: currentDate, messages: [...currentGroup] });
      }
      currentDate = msgDate;
      currentGroup = [msg];
    } else {
      currentGroup.push(msg);
    }
  }

  if (currentGroup.length > 0) {
    groups.push({ date: currentDate, messages: currentGroup });
  }

  return groups;
};

export const shouldShowSender = (messages, index) => {
  if (index === 0) return true;
  const prev = messages[index - 1];
  const curr = messages[index];
  return prev.senderId._id !== curr.senderId._id;
};

export const shouldShowTimestamp = (messages, index) => {
  if (index === messages.length - 1) return true;
  const curr = messages[index];
  const next = messages[index + 1];
  const diff = new Date(next.timestamp) - new Date(curr.timestamp);
  return diff > 60000 || curr.senderId._id !== next.senderId._id;
};
