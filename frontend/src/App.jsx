import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { ChatProvider } from './context/ChatContext';
import { ThemeProvider } from './context/ThemeContext';
import { CallProvider } from './context/CallContext';
import Register from './pages/Register';
import Login from './pages/Login';
import Home from './pages/Home';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <SocketProvider>
          <ChatProvider>
            <CallProvider>
              <Routes>
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Home />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </CallProvider>
          </ChatProvider>
        </SocketProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
