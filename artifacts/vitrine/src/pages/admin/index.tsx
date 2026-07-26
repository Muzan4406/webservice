import { motion } from 'framer-motion';
import { Link, useLocation } from 'wouter';
import {
  useGetAdminStats,
  useResetCounters,
  getGetAdminStatsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Users, Star, ArrowDownCircle, ArrowUpCircle,
  RotateCcw, ChevronRight, Bell, Tag, Megaphone, Trophy, Settings, MessageCircle,
} from 'lucide-react';

const BASE = '/admin';

const MENU = [
  {
    id: 'users',
    label: 'Utilisateurs',
    desc: 'Gérer les comptes',
    icon: Users,
    path: `${BASE}/users`,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    id: 'deposits',
    label: 'Dépôts',
    desc: 'Valider les versements',
    icon: ArrowDownCircle,
    path: `${BASE}/deposits`,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  {
    id: 'withdrawals',
    label: 'Retraits',
    desc: 'Traiter les retraits',
    icon: ArrowUpCircle,
    path: `${BASE}/withdrawals`,
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
  },
  {
    id: 'contest',
    label: 'Concours',
    desc: 'Gérer les concours',
    icon: Trophy,
    path: `${BASE}/contest`,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
  {
    id: 'coupons',
    label: 'Coupons',
    desc: 'Publier des pronostics',
    icon: Tag,
    path: `${BASE}/coupons`,
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
  },
  {
    id: 'promotions',
    label: 'Promotions',
    desc: 'Gérer les offres',
    icon: Megaphone,
    path: `${BASE}/promotions`,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    desc: 'Diffuser des messages',
    icon: Bell,
    path: `${BASE}/notifications`,
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
  },
  {
    id: 'chat',
    label: 'Chat Support',
    desc: 'Répondre aux utilisateurs',
    icon: MessageCircle,
    path: `${BASE}/chat`,
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
  },
  {
    id: 'config',
    label: 'Configuration',
    desc: 'Paramètres système',
    icon: Settings,
    path: `${BASE}/config`,
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600',
  },
];

const STAT_CONFIG = [
  { key: 'totalUsers',        label: 'Utilisateurs',        icon: Users,           bg: 'bg-blue-50',    iconColor: 'text-blue-500',   valueColor: 'text-blue-700' },
  { key: 'vipUsers',          label: 'Membres VIP',         icon: Star,            bg: 'bg-amber-50',   iconColor: 'text-amber-500',  valueColor: 'text-amber-700' },
  { key: 'pendingDeposits',   label: 'Dépôts en attente',   icon: ArrowDownCircle, bg: 'bg-emerald-50', iconColor: 'text-emerald-500',valueColor: 'text-emerald-700' },
  { key: 'pendingWithdrawals',label: 'Retraits en attente', icon: ArrowUpCircle,   bg: 'bg-rose-50',    iconColor: 'text-rose-500',   valueColor: 'text-rose-700' },
];

export default function AdminDashboardPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: stats, isLoading } = useGetAdminStats();
  const { mutate: resetCounters, isPending: isResetting } = useResetCounters();

  const handleReset = () => {
    if (!window.confirm('Réinitialiser TOUS les dépôts et retraits ? Cette action est irréversible.')) return;
    resetCounters(undefined, {
      onSuccess: (data: any) => {
        toast.success(`${data.deletedDeposits} dépôt(s) et ${data.deletedWithdrawals} retrait(s) supprimés.`);
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
      },
      onError: (err: any) => toast.error(err?.data?.error ?? 'Réinitialisation échouée.'),
    });
  };

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1a2a5e] to-[#0f1a3e] px-6 pt-6 pb-10">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => setLocation('/')} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Administration</h1>
            <p className="text-white/50 text-xs">Tableau de bord de gestion</p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-6 space-y-4">
        {/* Stats grid */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          {isLoading ? (
            <Card>
              <CardContent className="py-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {STAT_CONFIG.map((s) => {
                const Icon = s.icon;
                const value = (stats as any)?.[s.key];
                return (
                  <Card key={s.key} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                        <Icon className={`w-5 h-5 ${s.iconColor}`} />
                      </div>
                      <p className={`text-2xl font-extrabold ${s.valueColor}`}>{value ?? '—'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{s.label}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Navigation menu */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Card className="overflow-hidden divide-y divide-border">
            {MENU.map((item, i) => {
              const Icon = item.icon;
              return (
                <Link key={item.id} href={item.path}>
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    whileTap={{ backgroundColor: 'rgba(0,0,0,0.04)' }}
                    className="flex items-center gap-4 px-4 py-3.5 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-xl ${item.iconBg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 ${item.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                  </motion.div>
                </Link>
              );
            })}
          </Card>
        </motion.div>

        {/* Danger zone */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
          <Card className="border-red-200 bg-red-50/40">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-red-700 text-sm mb-0.5">Zone dangereuse</p>
                  <p className="text-xs text-red-500/80 mb-3">
                    Supprime définitivement tous les dépôts et retraits enregistrés. Action irréversible.
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleReset}
                    disabled={isResetting}
                    className="h-8 text-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    {isResetting ? 'Réinitialisation…' : 'Réinitialiser les compteurs'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
