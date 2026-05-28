import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={`relative w-full ${widths[size]} mx-0 md:mx-4 max-h-[92vh] flex flex-col rounded-t-3xl md:rounded-2xl border border-border bg-bg-elevated shadow-card`}
            initial={{ y: 60, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', damping: 22, stiffness: 240 }}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
              <h3 className="font-display text-lg font-bold">{title}</h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted hover:text-text transition"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto">{children}</div>
            {footer && <div className="px-5 py-4 border-t border-border">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
