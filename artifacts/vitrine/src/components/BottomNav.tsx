import { Link, useRoute } from 'wouter';
import { Home, FileText, Bell, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { path: '/', icon: Home, label: 'Accueil', exact: true },
  { path: '/coupons', icon: FileText, label: 'Coupons', exact: false },
  { path: '/notifications', icon: Bell, label: 'Alertes', exact: false },
  { path: '/profile', icon: User, label: 'Profil', exact: false },
];

export function BottomNav() {
  const { user } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-white/10 z-50 md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const [isActive] = useRoute(item.path);
          const Icon = item.icon;

          return (
            <Link key={item.path} href={item.path} className="flex flex-col items-center justify-center flex-1 h-full relative">
              <motion.div
                className="flex flex-col items-center gap-1"
                whileTap={{ scale: 0.9 }}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-xs font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {item.label}
                </span>
              </motion.div>
              {isActive && (
                <motion.div
                  layoutId="bottomnav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-full"
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
