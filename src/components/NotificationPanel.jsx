import { motion, AnimatePresence } from 'framer-motion';
import { X, BellOff, CheckCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useNotifications,
  useMarkAllRead,
  useMarkRead,
} from '../hooks/useNotifications.js';
import { fromNow } from '../utils/formatters.js';

const typeColor = {
  expense_added: 'bg-secondary/15 text-secondary',
  settled_up: 'bg-accent/15 text-accent',
  group_invite: 'bg-warning/15 text-warning',
  default: 'bg-white/5 text-text-muted',
};

export default function NotificationPanel({ open, onClose }) {
  const { data: notifications = [], isLoading } = useNotifications();
  const markAll = useMarkAllRead();
  const markOne = useMarkRead();

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40">
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="absolute right-0 top-0 h-full w-full sm:w-96 border-l border-border bg-bg-elevated shadow-2xl flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="heading text-lg">Notifications</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => markAll.mutate()}
                  className="text-xs text-text-muted hover:text-accent flex items-center gap-1.5 transition"
                  title="Mark all as read"
                >
                  <CheckCheck size={14} /> Mark all
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton h-16 w-full" />
                ))
              ) : notifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12 text-text-muted">
                  <BellOff size={32} className="mb-2 opacity-50" />
                  <p className="text-sm">You're all caught up.</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const color = typeColor[n.type] ?? typeColor.default;
                  const inner = (
                    <div
                      className={`p-3 rounded-xl border transition ${
                        n.is_read
                          ? 'border-border bg-bg-subtle/50'
                          : 'border-accent/30 bg-accent/5'
                      } hover:border-border-strong`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-semibold ${color}`}>
                          {n.type?.replace('_', ' ')}
                        </div>
                        {!n.is_read && (
                          <span className="ml-auto h-2 w-2 rounded-full bg-accent" />
                        )}
                      </div>
                      <p className="mt-2 text-sm text-text">{n.message}</p>
                      <p className="mt-1 text-[11px] text-text-subtle">
                        {fromNow(n.created_at)}
                      </p>
                    </div>
                  );

                  const onClick = () => !n.is_read && markOne.mutate(n.id);
                  return n.related_group_id ? (
                    <Link
                      key={n.id}
                      to={`/groups/${n.related_group_id}`}
                      onClick={() => {
                        onClick();
                        onClose();
                      }}
                      className="block"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div key={n.id} onClick={onClick}>
                      {inner}
                    </div>
                  );
                })
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
