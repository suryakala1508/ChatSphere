import { getInitials, getAvatarColor, formatMessageTime } from '../utils/helpers';

const UserList = ({ conversation, user, isOnline, isActive, onClick, unreadCount, lastMessage }) => {
  const isGroup = conversation?.isGroup;
  const displayName = isGroup ? conversation.groupName : user?.name || 'Unknown';
  const avatar = isGroup ? conversation.groupAvatar : user?.avatar;
  const initials = getInitials(displayName);

  const lastMsgText = lastMessage?.text || '';
  const lastMsgTime = lastMessage?.timestamp;
  const lastMsgSender = lastMessage?.senderName;

  const truncate = (str, len) => {
    if (!str) return '';
    return str.length > len ? str.slice(0, len) + '...' : str;
  };

  return (
    <div
      onClick={onClick}
      className={`flex items-center px-3 py-2.5 cursor-pointer transition-colors ${
        isActive
          ? 'bg-[--accent]/10'
          : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
      }`}
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <div className="relative flex-shrink-0">
        {isGroup && !avatar ? (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
            {initials}
          </div>
        ) : avatar ? (
          <img src={avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarColor(displayName)} flex items-center justify-center text-white font-semibold text-sm`}>
            {initials}
          </div>
        )}
        {isOnline && !isGroup && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-[--bg-sidebar] rounded-full" />
        )}
      </div>

      <div className="ml-3 flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
            {displayName}
          </p>
          {lastMsgTime && (
            <span className="text-[10px] flex-shrink-0 ml-2" style={{ color: 'var(--text-meta)' }}>
              {formatMessageTime(lastMsgTime)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-0.5">
          <p className="text-xs truncate flex-1" style={{ color: 'var(--text-secondary)' }}>
            {isGroup && lastMsgSender && (
              <span className="font-medium">{lastMsgSender}: </span>
            )}
            {truncate(lastMsgText || (isOnline ? 'Online' : 'Offline'), 35)}
          </p>
          {unreadCount > 0 && (
            <span className="flex-shrink-0 ml-2 min-w-[18px] h-[18px] rounded-full bg-[--accent] text-white text-[10px] font-bold flex items-center justify-center px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserList;
