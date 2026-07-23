import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/BottomNav';
import { Badge } from '@/components/ui/badge';

const BASE_URL = import.meta.env.BASE_URL;

const services = [
  { name: 'Dépôt', path: '/deposit', icon: 'deposit.png', color: 'from-blue-500/20 to-blue-600/20' },
  { name: 'Retrait', path: '/withdrawal', icon: 'withdrawal.png', color: 'from-orange-500/20 to-orange-600/20' },
  { name: 'Coupon du Jour', path: '/coupons', icon: 'coupon.png', color: 'from-green-500/20 to-green-600/20' },
  { name: 'Coupon VIP', path: '/coupons', icon: 'vip.png', color: 'from-yellow-500/20 to-yellow-600/20', vip: true },
  { name: 'Promotions', path: '/promotions', icon: 'promo.png', color: 'from-purple-500/20 to-purple-600/20' },
  { name: 'Parrainage', path: '/referral', icon: 'referral.png', color: 'from-green-500/20 to-green-600/20' },
  { name: 'Concours', path: '/contest', icon: 'contest.png', color: 'from-amber-500/20 to-amber-600/20' },
  { name: 'Profil', path: '/profile', icon: 'profile.png', color: 'from-blue-500/20 to-blue-600/20' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = (user as any)?.isAdmin;

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-20 md:pb-6">
      <div className="bg-gradient-to-br from-[#1a2a5e] to-[#0f1a3e] p-6 rounded-b-3xl shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <img src={`${BASE_URL}logo.png`} alt="MUZAN" className="h-10 w-10" />
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link href="/admin">
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  className="px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30"
                >
                  Admin
                </motion.div>
              </Link>
            )}
            <Link href="/notifications">
              <motion.div
                whileTap={{ scale: 0.95 }}
                className="relative p-2 rounded-full bg-white/10 backdrop-blur-sm"
              >
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </motion.div>
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
            {user?.username.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">{user?.username}</h2>
              {(user as any)?.isVip && (
                <Badge className="bg-[#FFD700] text-black font-bold">VIP</Badge>
              )}
            </div>
            <p className="text-white/60 text-sm">{user?.userId}</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-8">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Services rapides</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {services.map((service, index) => (
            <Link key={service.name} href={service.path}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileTap={{ scale: 0.95 }}
                className={`bg-gradient-to-br ${service.color} backdrop-blur-sm rounded-2xl p-6 flex flex-col items-center justify-center gap-3 shadow-lg border border-white/20 hover:shadow-xl transition-shadow relative overflow-hidden cursor-pointer`}
              >
                <div className="absolute inset-0 bg-white/5 opacity-0 hover:opacity-100 transition-opacity" />
                <img
                  src={`${BASE_URL}${service.icon}`}
                  alt={service.name}
                  className="w-12 h-12 object-contain"
                />
                <span className="text-sm font-bold text-gray-900 text-center relative z-10">
                  {service.name}
                </span>
                {service.vip && (
                  <Badge className="bg-[#FFD700] text-black text-xs font-bold absolute top-2 right-2">
                    VIP
                  </Badge>
                )}
              </motion.div>
            </Link>
          ))}
        </div>

        {/* VIP upsell if not VIP */}
        {!(user as any)?.isVip && (
          <Link href="/vip-purchase">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              whileTap={{ scale: 0.98 }}
              className="mt-6 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-2xl p-5 flex items-center gap-4 shadow-lg cursor-pointer"
            >
              <span className="text-3xl">⭐</span>
              <div className="flex-1">
                <p className="font-bold text-white text-base">Devenir VIP</p>
                <p className="text-white/80 text-sm">Accédez à des coupons exclusifs et plus encore</p>
              </div>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </motion.div>
          </Link>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
