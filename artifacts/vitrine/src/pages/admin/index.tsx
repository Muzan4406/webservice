import { motion } from 'framer-motion';
import { Link, useLocation } from 'wouter';
import {
  useGetAdminStats,
  useResetCounters,
  getGetAdminStatsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Star, ArrowDownCircle, ArrowUpCircle, RotateCcw } from 'lucide-react';

const BASE = '/admin';

const MENU = [
  { id: 'users',         label: 'Utilisateurs',    emoji: '👥', path: `${BASE}/users`,         color: 'bg-blue-100 text-blue-700' },
  { id: 'deposits',      label: 'Dépôts',          emoji: '💰', path: `${BASE}/deposits`,       color: 'bg-yellow-100 text-yellow-700' },
  { id: 'withdrawals',   label: 'Retraits',        emoji: '💸', path: `${BASE}/withdrawals`,    color: 'bg-red-100 text-red-700' },
  { id: 'contest',       label: 'Concours',        emoji: '🏆', path: `${BASE}/contest`,        color: 'bg-amber-100 text-amber-700' },
  { id: 'coupons',       label: 'Coupons',         emoji: '🎫', path: `${BASE}/coupons`,        color: 'bg-green-100 text-green-700' },
  { id: 'promotions',    label: 'Promotions',      emoji: '📣', path: `${BASE}/promotions`,     color: 'bg-purple-100 text-purple-700' },
  { id: 'notifications', label: 'Notifications',   emoji: '🔔', path: `${BASE}/notifications`,  color: 'bg-blue-100 text-blue-700' },
  { id: 'config',        label: 'Configuration',   emoji: '⚙️', path: `${BASE}/config`,         color: 'bg-gray-100 text-gray-700' },
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
      <div className="bg-gradient-to-br from-[#1a2a5e] to-[#0f1a3e] p-6 pb-8">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setLocation('/')} className="text-white/70 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-white">Administration</h1>
        </div>
        <p className="text-white/60 text-sm">Tableau de bord de gestion</p>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Stats */}
        {isLoading ? (
          <Card><CardContent className="py-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></CardContent></Card>
        ) : stats && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Utilisateurs', value: (stats as any).totalUsers, icon: Users, color: 'text-blue-600' },
                { label: 'VIP', value: (stats as any).vipUsers, icon: Star, color: 'text-yellow-600' },
                { label: 'Dépôts (en attente)', value: (stats as any).pendingDeposits, icon: ArrowDownCircle, color: 'text-green-600' },
                { label: 'Retraits (en attente)', value: (stats as any).pendingWithdrawals, icon: ArrowUpCircle, color: 'text-red-600' },
              ].map((s, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <s.icon className={`w-4 h-4 ${s.color}`} />
                    </div>
                    <p className="text-2xl font-bold">{s.value ?? '—'}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* Menu grid */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {MENU.map((item, i) => (
              <Link key={item.id} href={item.path}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="bg-white rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm border border-border hover:shadow-md transition-shadow cursor-pointer"
                >
                  <span className="text-3xl">{item.emoji}</span>
                  <span className="text-sm font-semibold text-center text-foreground">{item.label}</span>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Danger zone */}
        <Card className="border-red-200">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-red-600 mb-1">Zone dangereuse</p>
            <p className="text-xs text-muted-foreground mb-3">Réinitialiser les compteurs supprime définitivement tous les dépôts et retraits enregistrés.</p>
            <Button variant="destructive" size="sm" onClick={handleReset} disabled={isResetting}>
              <RotateCcw className="w-4 h-4 mr-2" />
              {isResetting ? 'Réinitialisation…' : 'Réinitialiser les compteurs'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
