import { useState, useEffect } from 'react';
import axios from 'axios';
const API_URL = 'https://chatsphere-m9gn.onrender.com/api';
const GroupModal = ({ onClose, onCreated }) => {
  const [groupName, setGroupName] = useState('');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(res.data);
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };
    fetchUsers();
  }, []);

  const toggleUser = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedIds.length === 0) return;
    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/conversations`, {
        participantIds: selectedIds,
        isGroup: true,
        groupName: groupName.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onCreated(res.data);
      onClose();
    } catch (err) {
      console.error('Error creating group:', err);
    } finally {
      setCreating(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md mx-4 rounded-xl shadow-xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-primary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-header)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>New Group</h2>
        </div>

        <div className="p-4">
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none border mb-4"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border)'
            }}
            autoFocus
          />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full px-3 py-2 rounded-lg text-sm outline-none border mb-3"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border)'
            }}
          />

          <div className="max-h-60 overflow-y-auto space-y-1">
            {filteredUsers.map(user => (
              <button
                key={user._id}
                onClick={() => toggleUser(user._id)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
                style={{
                  backgroundColor: selectedIds.includes(user._id) ? 'var(--accent)' : 'transparent',
                  color: selectedIds.includes(user._id) ? 'white' : 'var(--text-primary)'
                }}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                  {user.name[0]?.toUpperCase()}
                </div>
                <span className="text-sm font-medium truncate">{user.name}</span>
              </button>
            ))}
            {filteredUsers.length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: 'var(--text-meta)' }}>No users found</p>
            )}
          </div>
        </div>

        <div className="px-4 py-3 border-t flex justify-end gap-2" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ color: 'var(--text-primary)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !groupName.trim() || selectedIds.length === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[--accent] text-white hover:bg-[--accent-hover] transition-colors disabled:opacity-50"
          >
            {creating ? 'Creating...' : `Create (${selectedIds.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupModal;
