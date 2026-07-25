import { motion } from 'framer-motion';
import { useGetCurrentContest, useGetContestLeaderboard } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/BottomNav';
import { Clock, Users, ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
const RANK_COLOR: Record<number, { bg: string; text: string; bar: string }> = {
  1: { bg: 'bg-yellow-100', text: 'text-yellow-700', bar: 'bg-yellow-400' },
  2: { bg: 'bg-slate-100',  text: 'text-slate-600',  bar: 'bg-slate-400'  },
  3: { bg: 'bg-orange-100', text: 'text-orange-600', bar: 'bg-orange-400' },
};

function timeLeft(endDate: string) {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return 'Terminé';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}j ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}min`;
  return `${mins}min`;
}

export default function ContestPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const contestQuery = useGetCurrentContest();
  const leaderboardQuery = useGetContestLeaderboard();
  const contest = contestQuery.data as any;
  const entries: any[] = (leaderboardQuery.data as any)?.entries ?? [];
  const endsAt: string | undefined = (leaderboardQuery.data as any)?.contestEndsAt;

  const top3 = entries.filter(e => e.rank <= 3).sort((a, b) => a.rank - b.rank);
  const rest = entries.filter(e => e.rank > 3);
  const isLoading = contestQuery.isLoading;

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1a2a5e] to-[#0f1a3e] px-5 pt-10 pb-16 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/5" />
        <div className="absolute top-4 right-12 w-16 h-16 rounded-full bg-amber-400/10" />

        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setLocation('/')} className="text-white/60 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🏆</span>
          <h1 className="text-3xl font-bold text-white">Concours</h1>
        </div>
        <p className="text-white/50 text-sm">Parrainez le plus de filleuls pour gagner</p>
      </div>

      <div className="px-4 -mt-10 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-[#1a2a5e]" />
          </div>
        ) : !contest ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
              <p className="text-5xl mb-4">🏆</p>
              <p className="text-lg font-bold text-gray-900 mb-2">Aucun concours en cours</p>
              <p className="text-sm text-gray-400">Revenez bientôt pour participer à un nouveau concours !</p>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Contest info card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 text-xs uppercase tracking-wider font-medium mb-1">Concours actif</p>
                      <h2 className="text-white text-xl font-bold leading-tight">{contest.title}</h2>
                    </div>
                    {contest.isActive && (
                      <span className="bg-white/25 text-white text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ml-3">
                        LIVE
                      </span>
                    )}
                  </div>
                  {contest.description && (
                    <p className="text-white/75 text-sm mt-2 leading-relaxed">{contest.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-3 divide-x divide-gray-100">
                  <div className="flex flex-col items-center py-3 gap-0.5">
                    <span className="text-lg font-bold text-amber-600">{contest.reward}</span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide">Récompense</span>
                  </div>
                  {endsAt && (
                    <div className="flex flex-col items-center py-3 gap-0.5">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm font-bold text-gray-800">{timeLeft(endsAt)}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wide">Restant</span>
                    </div>
                  )}
                  <div className="flex flex-col items-center py-3 gap-0.5">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-sm font-bold text-gray-800">{entries.length}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide">Participants</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Podium */}
            {top3.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="bg-white rounded-2xl shadow-sm p-5">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5">Podium</p>
                  <div className="flex items-end justify-center gap-4">
                    {[
                      top3.find(e => e.rank === 2),
                      top3.find(e => e.rank === 1),
                      top3.find(e => e.rank === 3),
                    ].filter(Boolean).map((entry: any) => {
                      const isMe = entry.username === user?.username;
                      const c = RANK_COLOR[entry.rank] ?? RANK_COLOR[3];
                      const heights = { 1: 80, 2: 60, 3: 48 };
                      const h = heights[entry.rank as 1|2|3] ?? 48;
                      return (
                        <div key={entry.rank} className="flex flex-col items-center gap-1" style={{ width: 90 }}>
                          <span className="text-xl">{RANK_MEDAL[entry.rank]}</span>
                          <div className={`w-12 h-12 rounded-full overflow-hidden ${isMe ? 'ring-2 ring-green-400' : ''}`}>
                            <img src="/logo.png" alt="avatar" className="w-full h-full object-cover" />
                          </div>
                          <p className={`text-xs font-bold truncate max-w-full text-center ${isMe ? 'text-green-700' : 'text-gray-800'}`}>
                            {entry.username}
                          </p>
                          <p className="text-sm font-bold text-gray-500">{entry.referralCount} <span className="text-[10px] font-normal">filleuls</span></p>
                          <div
                            className={`w-full rounded-t-xl flex items-center justify-center ${c.bar}`}
                            style={{ height: h }}
                          >
                            <span className="text-white text-xs font-bold">#{entry.rank}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Rest of leaderboard */}
            {rest.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-4 pt-4 pb-2 border-b border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Classement</p>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {rest.map((entry: any) => {
                      const isMe = entry.username === user?.username;
                      return (
                        <div key={entry.rank} className={`flex items-center gap-3 px-4 py-3 ${isMe ? 'bg-green-50' : ''}`}>
                          <span className="text-xs font-bold text-gray-400 w-6 text-center">#{entry.rank}</span>
                          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
                            <img src="/logo.png" alt="avatar" className="w-full h-full object-cover" />
                          </div>
                          <span className={`flex-1 text-sm font-semibold truncate ${isMe ? 'text-green-700' : 'text-gray-800'}`}>
                            {entry.username}
                            {isMe && <span className="ml-1 text-[10px] font-normal text-green-500">(vous)</span>}
                          </span>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-[#1a2a5e]">{entry.referralCount}</p>
                            <p className="text-[10px] text-gray-400">filleuls</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {entries.length === 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
                  <p className="text-4xl mb-3">🏃</p>
                  <p className="text-base font-bold text-gray-900 mb-1">Soyez le premier !</p>
                  <p className="text-sm text-gray-400">Parrainez des amis pour apparaître au classement.</p>
                </div>
              </motion.div>
            )}

            {/* Tip */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
                <span className="text-lg shrink-0">💡</span>
                <p className="text-sm text-blue-800 leading-relaxed">
                  Partagez votre code depuis l'onglet <strong>Parrainage</strong>. Chaque filleul inscrit compte comme 1 point.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
