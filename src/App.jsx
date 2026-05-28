import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from './lib/auth.jsx';
import AuthGuard from './components/AuthGuard.jsx';
import Navbar from './components/Navbar.jsx';
import BottomNav from './components/BottomNav.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import GroupDetail from './pages/GroupDetail.jsx';
import Profile from './pages/Profile.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';

export default function App() {
  const location = useLocation();
  const { loading } = useAuth();

  if (loading) return <LoadingScreen />;

  const isAuthRoute = location.pathname === '/login';

  return (
    <div className="min-h-screen flex flex-col">
      {!isAuthRoute && <Navbar />}
      <main className={`flex-1 ${isAuthRoute ? '' : 'pb-24 md:pb-8'}`}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <AuthGuard>
                  <Dashboard />
                </AuthGuard>
              }
            />
            <Route
              path="/groups/:groupId"
              element={
                <AuthGuard>
                  <GroupDetail />
                </AuthGuard>
              }
            />
            <Route
              path="/profile"
              element={
                <AuthGuard>
                  <Profile />
                </AuthGuard>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </main>
      {!isAuthRoute && <BottomNav />}
    </div>
  );
}
