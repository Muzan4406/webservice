import { motion } from 'framer-motion';
import { useGetReferrals } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/BottomNav';
import { toast } from '@/lib/toast';
import { Copy, Users, UserCheck, Link as LinkIcon, Share2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useLocation } from 'wouter';

export default function ReferralPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const referrals = useGetReferrals();

  const referralCode = referrals.data?.referralCode ?? '';
  const referralCount = referrals.data?.referralCount ?? 0;
  // Use the server-computed active count (filleuls with at least one approved deposit)
  const activeCount = (referrals.data as any)?.activeReferralCount ?? 0;
  const referralList = referrals.data?.referrals ?? [];

  const referralLink = referralCode
    ? `${window.location.origin}/inscription/${referralCode}`
    : '';

  const copyReferralCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      toast.success('Code copié !');
    }
  };

  const copyReferralLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      toast.success('Lien copié !');
    }
  };

  const shareReferralLink = async () => {
    if (!referralLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Muzan Service — Invitation',
          text: `Rejoins Muzan Service avec mon lien de parrainage et profite des avantages !`,
          url: referralLink,
        });
      } catch {
        // user cancelled share
      }
    } else {
      copyReferralLink();
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-24">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-[#1a2a5e] to-[#0f1a3e] px-5 pt-10 pb-16 relative overflow-hidden">
        {/* decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/5" />

        <div className="flex items-center gap-2 mb-4">
          <LinkIcon className="w-5 h-5 text-green-400" />
          <span className="text-green-400 text-sm font-semibold uppercase tracking-wide">Programme parrainage</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-1">Invitez & Gagnez</h1>
        <p className="text-white/50 text-sm">Partagez votre lien, suivez vos filleuls</p>
      </div>

      {/* Cards sit on top of the hero via negative margin — needs z-10 */}
      <div className="relative z-10 px-4 -mt-10 space-y-4">
        {referrals.isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a2a5e]" />
          </div>
        ) : (
          <>
            {/* Code card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-5 py-4">
                  <p className="text-green-100 text-xs font-medium uppercase tracking-wider mb-1">Votre code de parrainage</p>
                  <div className="flex items-center justify-between">
                    <span className="text-white text-2xl font-bold tracking-widest">
                      {referralCode || '—'}
                    </span>
                    <button
                      onClick={copyReferralCode}
                      className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-3 py-1.5 rounded-xl transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      Copier
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 divide-x divide-gray-100">
                  <div className="flex flex-col items-center py-4 gap-1">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-2xl font-bold text-gray-900">{referralCount}</span>
                    </div>
                    <p className="text-xs text-gray-400">Parrainages total</p>
                  </div>
                  <div className="flex flex-col items-center py-4 gap-1">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-green-500" />
                      <span className="text-2xl font-bold text-green-600">{activeCount}</span>
                    </div>
                    <p className="text-xs text-gray-400">Filleuls actifs</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Share referral link */}
            {referralLink && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
                <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Votre lien de parrainage</p>
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                    <p className="text-xs text-gray-600 flex-1 truncate font-mono">{referralLink}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={copyReferralLink}
                      className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-3 py-2.5 rounded-xl transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      Copier
                    </button>
                    <button
                      onClick={shareReferralLink}
                      className="flex items-center justify-center gap-2 bg-[#1a2a5e] hover:bg-[#1a2a5e]/90 text-white text-sm font-semibold px-3 py-2.5 rounded-xl transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      Partager
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Comment ça marche */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
                <span className="text-xl shrink-0">💡</span>
                <p className="text-sm text-blue-800 leading-relaxed">
                  Partagez votre lien à vos amis. Chaque ami inscrit via votre lien devient votre filleul.
                  Il doit effectuer <strong>au moins un dépôt approuvé</strong> pour être compté parmi vos filleuls actifs au concours.
                </p>
              </div>
            </motion.div>

            {/* Concours CTA */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <button
                onClick={() => setLocation('/contest')}
                className="w-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-4 flex items-center justify-between shadow-sm"
              >
                <div className="text-left">
                  <p className="text-white font-bold text-sm">Voir le classement</p>
                  <p className="text-white/80 text-xs mt-0.5">Découvrez votre position au concours</p>
                </div>
                <span className="text-2xl">🏆</span>
              </button>
            </motion.div>

            {/* Referrals list */}
            {referralList.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-4 pt-4 pb-2 border-b border-gray-100">
                    <p className="text-sm font-bold text-gray-800">Mes filleuls</p>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {referralList.map((ref: any, index: number) => (
                      <div key={index} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
                          <img src="/logo.png" alt="avatar" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{ref.username}</p>
                        </div>
                        {ref.isActive && (
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" title="Filleul actif" />
                        )}
                        <p className="text-xs text-gray-400 shrink-0">
                          {format(new Date(ref.createdAt), 'dd MMM yyyy', { locale: fr })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {referralList.length === 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
                  <p className="text-4xl mb-3">👥</p>
                  <p className="text-base font-bold text-gray-800 mb-1">Pas encore de filleuls</p>
                  <p className="text-sm text-gray-400">Partagez votre lien pour commencer !</p>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
