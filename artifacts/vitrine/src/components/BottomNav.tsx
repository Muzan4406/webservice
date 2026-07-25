import { Link, useRoute } from 'wouter';
import { Home, FileText, Bell, User, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { path: '/',              icon: Home,          label: 'Accueil', exact: true  },
  { path: '/coupons',       icon: FileText,       label: 'Coupons', exact: false },
  { path: '/chat',          icon: MessageCircle,  label: 'Support', exact: false },
  { path: '/notifications', icon: Bell,           label: 'Alertes', exact: false },
  { path: '/profile',       icon: User,           label: 'Profil',  exact: false },
];

export function BottomNav() {
  const { token } = useAuth() as any;
  const [unreadChat, setUnreadChat] = useState(0);

  useEffect(() => {
    if (!token) return;
    const fetch_ = () =>
      fetch('/api/chat/unread', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => setUnreadChat(d.count ?? 0))
        .catch(() => {});
    fetch_();
    const id = setInterval(fetch_, 15000);
    return () => clearInterval(id);
  }, [token]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden shadow-[0_-2px_12px_0_rgb(0,0,0,0.06)]">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const [isActive] = useRoute(item.path);
          const Icon = item.icon;
          const badge = item.path === '/chat' ? unreadChat : 0;

          return (
            <Link
              key={item.path}
              href={item.path}
              className="flex flex-col items-center justify-center flex-1 h-full relative"
            >
              <motion.div
                className="flex flex-col items-center gap-1 relative"
                whileTap={{ scale: 0.88 }}
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      isActive ? 'text-primary' : 'text-gray-400'
                    }`}
                  />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    isActive ? 'text-primary' : 'text-gray-400'
                  }`}
                >
                  {item.label}
                </span>
              </motion.div>
              {isActive && (
                <motion.div
                  layoutId="bottomnav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
