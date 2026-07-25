import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/BottomNav';
import { WhatsAppPopup } from '@/components/WhatsAppPopup';

const BASE_URL = import.meta.env.BASE_URL;

export default function DashboardPage() {
  const { user } = useAuth();
  const isVip = (user as any)?.isVip;

  const services = [
    { name: 'Dépôt',        path: '/deposit',                              icon: 'deposit.png'   },
    { name: 'Retrait',       path: '/withdrawal',                           icon: 'withdrawal.png'},
    { name: 'Coupon du Jour',path: '/coupons',                              icon: 'coupon.png'    },
    { name: 'Coupon VIP',    path: isVip ? '/coupons' : '/vip-purchase',   icon: 'vip.png', vip: true },
    { name: 'Promotions',    path: '/promotions',                           icon: 'promo.png'     },
    { name: 'Parrainage',    path: '/referral',                             icon: 'referral.png'  },
    { name: 'Concours',      path: '/contest',                              icon: 'contest.png'   },
    { name: 'Profil',        path: '/profile',                              icon: 'profile.png'   },
  ];

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-[#F4F6FB]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1a2a5e] to-[#0f1a3e] px-5 pt-8 pb-6 rounded-b-3xl shadow-lg shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="avatar" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/60 text-sm font-medium">Bonjour,</p>
            <h2 className="text-xl font-bold text-white leading-tight truncate">{user?.username}</h2>
            <p className="text-white/50 text-xs mt-0.5">
              {isVip ? 'Statut : VIP' : 'Statut : Standard'} • ID: {(user as any)?.userId}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {(user as any)?.isAdmin && (
              <Link href="/admin">
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  className="px-3 py-1.5 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold border border-amber-400/30"
                >
                  Admin
                </motion.div>
              </Link>
            )}
            <Link href="/notifications">
              <motion.div
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-full bg-white/10"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </motion.div>
            </Link>
          </div>
        </div>
      </div>

      {/* Services grid — fills remaining space, no scroll */}
      <div className="flex-1 min-h-0 px-4 pt-4 pb-20 flex flex-col">
        <p className="text-sm font-semibold text-gray-500 mb-3 shrink-0">Services rapides</p>
        <div className="flex-1 min-h-0 grid grid-cols-2 gap-3" style={{ gridTemplateRows: 'repeat(4, 1fr)' }}>
          {services.map((service, index) => (
            <Link key={service.name} href={service.path}>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                whileTap={{ scale: 0.97 }}
                className="h-full bg-white rounded-2xl flex flex-col items-center justify-center gap-2 shadow-sm border border-gray-100 cursor-pointer relative overflow-hidden"
              >
                <div className="w-12 h-12 flex items-center justify-center">
                  <img
                    src={`${BASE_URL}${service.icon}`}
                    alt={service.name}
                    className="w-12 h-12 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-800 text-center leading-tight px-2">
                  {service.name}
                </span>
                {service.vip && (
                  <span className="absolute top-2 right-2 bg-[#FFD700] text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                    VIP
                  </span>
                )}
              </motion.div>
            </Link>
          ))}
        </div>
      </div>

      <BottomNav />
      <WhatsAppPopup />
    </div>
  );
}
