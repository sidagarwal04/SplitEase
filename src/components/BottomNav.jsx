import { NavLink } from 'react-router-dom';
import { Home, User as UserIcon, Plus } from 'lucide-react';
import { useState } from 'react';
import CreateGroupModal from './CreateGroupModal.jsx';

export default function BottomNav() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-bg/90 backdrop-blur-xl">
        <div className="grid grid-cols-3 max-w-md mx-auto px-3 py-2">
          <Tab to="/" icon={<Home size={20} />} label="Home" />
          <div className="flex items-center justify-center">
            <button
              onClick={() => setOpen(true)}
              className="h-12 w-12 -mt-6 rounded-full bg-accent text-bg grid place-items-center shadow-[0_8px_24px_-6px_rgba(0,212,170,0.6)] active:scale-95 transition"
              aria-label="Create group"
            >
              <Plus size={22} strokeWidth={2.5} />
            </button>
          </div>
          <Tab to="/profile" icon={<UserIcon size={20} />} label="Profile" />
        </div>
      </nav>
      <CreateGroupModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function Tab({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[11px] transition ${
          isActive ? 'text-accent' : 'text-text-muted'
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}
