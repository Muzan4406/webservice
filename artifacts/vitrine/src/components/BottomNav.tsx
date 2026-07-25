import { Link, useRoute } from 'wouter';
import { Home, FileText, Bell, User } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { path: '/',             icon: Home,     label: 'Accueil', exact: true  },
  { path: '/coupons',      icon: FileText, label: 'Coupons', exact: false },
  { path: '/notifications',icon: Bell,     label: 'Alertes', exact: false },
  { path: '/profile',      icon: User,     label: 'Profil',  exact: false },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden shadow-[0_-2px_12px_0_rgb(0,0,0,0.06)]">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const [isActive] = useRoute(item.path);
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              href={item.path}
              className="flex flex-col items-center justify-center flex-1 h-full relative"
            >
              <motion.div
                className="flex flex-col items-center gap-1"
                whileTap={{ scale: 0.88 }}
              >
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-primary' : 'text-gray-400'
                  }`}
                />
                <span
                  className={`text-[11px] font-medium transition-colors ${
                    isActive ? 'text-primary' : 'text-gray-400'
                  }`}
                >
                  {item.label}
                </span>
              </motion.div>
              {isActive && (
                <motion.div
                  layoutId="bottomnav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-primary rounded-full"
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
