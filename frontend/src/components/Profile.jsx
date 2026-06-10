import { useState, useEffect } from 'react';
import axios from 'axios';
import { getInitials, getAvatarColor } from '../utils/helpers';
const API_URL = 'https://chatsphere-m9gn.onrender.com/api';
const Profile = ({ onClose }) => {
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('${API_URL}/users/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(res.data);
        setName(res.data.name);
        setStatus(res.data.status || '');
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };
    fetchProfile();
  }, []);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('token');
      const res = await axios.post('${API_URL}/upload', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('[Profile] Upload response:', res.data);
      const profileRes = await axios.put('${API_URL}/users/profile', { avatar: res.data.url }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('[Profile] Profile update response:', profileRes.data);
      setUser(prev => ({ ...prev, avatar: res.data.url }));
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Upload failed';
      console.error('[Profile] Upload error:', msg);
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put('${API_URL}/users/profile', { name, status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
      setEditing(false);
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[--accent] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-header)' }}>
        <button onClick={onClose} className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold">Profile</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center py-8 px-4">
          <div className="relative mb-4">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="w-24 h-24 rounded-full object-cover" />
            ) : (
              <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${getAvatarColor(user.name)} flex items-center justify-center text-white text-2xl font-bold`}>
                {getInitials(user.name)}
              </div>
            )}
            <label className="absolute bottom-0 right-0 w-8 h-8 bg-[--accent] rounded-full flex items-center justify-center cursor-pointer hover:bg-[--accent-hover] transition-colors shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
            {uploading && (
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {uploadError && (
            <div className="mb-4 px-4 py-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm text-center max-w-sm">
              {uploadError}
              <button onClick={() => setUploadError('')} className="ml-2 font-bold">&times;</button>
            </div>
          )}

          {editing ? (
            <div className="w-full max-w-sm space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border)'
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Status</label>
                <input
                  type="text"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border)'
                  }}
                  placeholder="Hey there! I am using ChatSphere"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-[--accent] text-white py-2 rounded-lg hover:bg-[--accent-hover] transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditing(false); setName(user.name); setStatus(user.status || ''); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-sm text-center">
              <h2 className="text-xl font-semibold mb-1">{user.name}</h2>
              <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{user.email}</p>
              <p className="text-sm mb-4" style={{ color: 'var(--text-meta)' }}>{user.status}</p>
              <button
                onClick={() => setEditing(true)}
                className="bg-[--accent] text-white px-6 py-2 rounded-lg hover:bg-[--accent-hover] transition-colors text-sm font-medium"
              >
                Edit Profile
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
