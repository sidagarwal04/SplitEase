import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Home, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import Avatar from './Avatar.jsx';
import NotificationPanel from './NotificationPanel.jsx';
import { useUnreadCount } from '../hooks/useNotifications.js';

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const { data: unread = 0 } = useUnreadCount();

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-accent to-secondary grid place-items-center shadow-[0_0_24px_-6px_rgba(0,212,170,0.5)]">
            <span className="text-bg font-display font-extrabold">S</span>
          </div>
          <span className="heading text-lg hidden sm:block">OweNow</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <NavItem to="/" icon={<Home size={16} />}>Dashboard</NavItem>
          <NavItem to="/profile" icon={<UserIcon size={16} />}>Profile</NavItem>
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setNotifOpen(true)}
            className="relative p-2.5 rounded-xl hover:bg-white/5 text-text-muted hover:text-text transition"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-bg text-[10px] font-bold grid place-items-center ring-2 ring-bg">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          <Link to="/profile" className="hidden sm:flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/5 transition">
            <Avatar name={profile?.full_name || user.email} url={profile?.avatar_url} size="sm" />
            <span className="text-sm text-text-muted max-w-[140px] truncate">
              {profile?.full_name || user.email}
            </span>
          </Link>

          <button
            onClick={handleSignOut}
            className="p-2.5 rounded-xl hover:bg-white/5 text-text-muted hover:text-danger transition"
            aria-label="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </header>
  );
}

function NavItem({ to, icon, children }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition ${
          isActive
            ? 'bg-accent/10 text-accent'
            : 'text-text-muted hover:text-text hover:bg-white/5'
        }`
      }
    >
      {icon}
      {children}
    </NavLink>
  );
}
