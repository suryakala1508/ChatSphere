import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import Profile from '../components/Profile';
import GroupModal from '../components/GroupModal';
import CallModal from '../components/CallModal';
import { useTheme } from '../context/ThemeContext';
import { useChat } from '../context/ChatContext';

const Home = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { fetchConversations } = useChat();

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setSidebarOpen(false);
  };

  const handleSelectConversation = (conv) => {
    setSelectedConversation(conv);
  };

  const handleConversationCreated = (conv) => {
    setSelectedConversation(conv);
  };

  return (
    <div className="h-screen flex" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'block' : 'hidden'} md:block flex-shrink-0`}>
        <Sidebar
          selectedUser={selectedUser}
          selectedConversation={selectedConversation}
          onSelectUser={handleSelectUser}
          onSelectConversation={handleSelectConversation}
          onToggleProfile={() => setShowProfile(true)}
          onNewGroup={() => setShowGroupModal(true)}
          isMobileOpen={sidebarOpen}
          onToggleTheme={toggleTheme}
          isDark={isDark}
          onLogout={handleLogout}
        />
      </div>

      {/* Chat area */}
      <div className={`flex-1 min-w-0 ${!sidebarOpen ? 'flex flex-col' : 'hidden'} md:flex md:flex-col`}>
        {showProfile ? (
          <Profile onClose={() => setShowProfile(false)} />
        ) : (
          <ChatWindow
            selectedUser={selectedUser}
            selectedConversation={selectedConversation}
            onToggleSidebar={() => setSidebarOpen(true)}
            onConversationCreated={handleConversationCreated}
          />
        )}
      </div>

      {/* Group modal */}
      {showGroupModal && (
        <GroupModal
          onClose={() => setShowGroupModal(false)}
          onCreated={(conv) => {
            setSelectedConversation(conv);
            setSidebarOpen(false);
            fetchConversations();
          }}
        />
      )}

      {/* Call modal */}
      <CallModal />
    </div>
  );
};

export default Home;
