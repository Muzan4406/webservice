import { Link, useLocation } from 'wouter';
import { Home, FileText, Bell, User, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { path: '/',              icon: Home,          label: 'Accueil'  },
  { path: '/coupons',       icon: FileText,       label: 'Coupons'  },
  { path: '/chat',          icon: MessageCircle,  label: 'Support'  },
  { path: '/notifications', icon: Bell,           label: 'Alertes'  },
  { path: '/profile',       icon: User,           label: 'Profil'   },
];

export function BottomNav() {
  const { token } = useAuth() as any;
  const [location] = useLocation();
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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 md:hidden"
      style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.08)' }}>
      <div className="flex items-stretch h-16">
        {navItems.map((item) => {
          const isActive = item.path === '/'
            ? location === '/'
            : location.startsWith(item.path);
          const Icon = item.icon;
          const badge = item.path === '/chat' ? unreadChat : 0;

          return (
            <Link
              key={item.path}
              href={item.path}
              className="flex-1 flex flex-col items-center justify-center relative overflow-hidden"
            >
              {/* Active top bar */}
              {isActive && (
                <motion.div
                  layoutId="nav-bar"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[3px] bg-[#1a2a5e] rounded-b-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}

              <motion.div
                whileTap={{ scale: 0.82 }}
                className="flex flex-col items-center gap-1 relative"
              >
                {/* Icon container */}
                <div className={`relative flex items-center justify-center w-10 h-6 rounded-full transition-colors duration-200 ${isActive ? 'text-[#1a2a5e]' : 'text-gray-400'}`}>
                  <Icon className="w-5 h-5" />
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>

                <span className={`text-[10px] font-semibold transition-colors duration-200 ${isActive ? 'text-[#1a2a5e]' : 'text-gray-400'}`}>
                  {item.label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
