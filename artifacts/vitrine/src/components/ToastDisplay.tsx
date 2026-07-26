import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { subscribeToast, type ToastItem } from '@/lib/toast';

const COLORS: Record<ToastItem['type'], string> = {
  success: '#1a7a4a',
  error:   '#c0392b',
  warning: '#d97706',
  info:    '#1a2a5e',
};

export function ToastDisplay() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return subscribeToast((item) => {
      setToasts((prev) => [...prev, item]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== item.id));
      }, 2500);
    });
  }, []);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none"
      style={{ paddingBottom: '80px' }} // évite la bottom nav
    >
      <div className="flex flex-col items-center gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: -6 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              style={{ backgroundColor: COLORS[t.type] }}
              className="px-6 py-3 rounded-full text-white text-sm font-semibold shadow-2xl select-none max-w-[280px] text-center"
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
