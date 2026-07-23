import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGetCurrentContest, useGetContestLeaderboard } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Clock, Users } from 'lucide-react';
import { useLocation } from 'wouter';

const RANK_COLORS: Record<number, string> = { 1: '#D89B1E', 2: '#8899B0', 3: '#B45309' };
const RANK_ICONS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

function timeLeft(endDate: string) {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return 'Terminé';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}j ${hours}h restants`;
  if (hours > 0) return `${hours}h ${mins}min restantes`;
  return `${mins}min restantes`;
}

export default function ContestPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const contestQuery = useGetCurrentContest();
  const leaderboardQuery = useGetContestLeaderboard();
  const contest = (contestQuery.data as any);
  const entries: any[] = (leaderboardQuery.data as any)?.entries ?? [];

  const top3 = entries.filter(e => e.rank <= 3).sort((a, b) => a.rank - b.rank);
  const rest = entries.filter(e => e.rank > 3);

  const isLoading = contestQuery.isLoading;

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-20 md:pb-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1a2a5e] to-[#0f1a3e] p-6 pb-8">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setLocation('/')} className="text-white/70 hover:text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-white">Concours</h1>
        </div>
        <p className="text-white/60 text-sm">Parrainez le plus de filleuls pour gagner</p>
      </div>

      <div className="px-4 -mt-4 space-y-4 pb-6">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : !contest ? (
          <Card className="mt-4">
            <CardContent className="py-12 text-center">
              <p className="text-4xl mb-3">🏆</p>
              <p className="text-lg font-bold text-foreground mb-1">Aucun concours en cours</p>
              <p className="text-muted-foreground text-sm">Revenez bientôt pour participer à un nouveau concours !</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Contest Info Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-foreground">{contest.title}</h2>
                        {contest.isActive && (
                          <Badge className="bg-green-100 text-green-700 border-green-300 text-xs mt-0.5">ACTIF</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">{contest.description}</p>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span className="font-medium text-amber-700">{timeLeft(contest.endDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-amber-600" />
                      <span className="font-medium text-amber-700">{entries.length} participants</span>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-amber-100 rounded-xl">
                    <p className="text-xs text-amber-600 font-medium mb-0.5">Récompense</p>
                    <p className="text-base font-bold text-amber-800">{contest.reward}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Podium */}
            {top3.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card>
                  <CardContent className="p-5">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-5">Podium</h3>
                    <div className="flex items-end justify-center gap-3">
                      {/* Reorder: 2nd, 1st, 3rd */}
                      {[
                        top3.find(e => e.rank === 2),
                        top3.find(e => e.rank === 1),
                        top3.find(e => e.rank === 3),
                      ].filter(Boolean).map((entry: any) => {
                        const isMe = entry.username === user?.username;
                        const heights = { 1: 140, 2: 110, 3: 90 };
                        const h = heights[entry.rank as 1 | 2 | 3] ?? 90;
                        const color = RANK_COLORS[entry.rank];
                        return (
                          <div key={entry.rank} className="flex flex-col items-center" style={{ width: 100 }}>
                            <div
                              className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 relative mb-1"
                              style={{
                                borderColor: color,
                                backgroundColor: isMe ? '#DCFCE7' : '#fff',
                                color: isMe ? '#16a34a' : color,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                              }}
                            >
                              {entry.username.charAt(0).toUpperCase()}
                              <span className="absolute -top-2 -right-2 text-base">{RANK_ICONS[entry.rank]}</span>
                            </div>
                            <p className="text-xs font-bold truncate max-w-full text-center mb-0.5" style={{ color: isMe ? '#16a34a' : '#1e293b' }}>
                              {entry.username}
                            </p>
                            <p className="text-lg font-bold" style={{ color }}>{entry.referralCount}</p>
                            <p className="text-xs text-muted-foreground mb-1">filleuls</p>
                            <div
                              className="w-full rounded-t-lg flex items-center justify-center"
                              style={{ height: h * 0.38, backgroundColor: color + '20', borderTop: `3px solid ${color}` }}
                            >
                              <span className="text-sm font-bold" style={{ color }}>#{entry.rank}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Rest of leaderboard */}
            {rest.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card>
                  <CardContent className="p-0 divide-y">
                    {rest.map((entry: any) => {
                      const isMe = entry.username === user?.username;
                      return (
                        <div key={entry.rank} className={`flex items-center gap-3 p-4 ${isMe ? 'bg-green-50' : ''}`}>
                          <div className="w-10 h-8 rounded-lg bg-muted flex items-center justify-center">
                            <span className="text-xs font-bold text-muted-foreground">#{entry.rank}</span>
                          </div>
                          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
                            {entry.username.charAt(0).toUpperCase()}
                          </div>
                          <span className={`flex-1 text-sm font-semibold ${isMe ? 'text-green-700' : 'text-foreground'}`}>
                            {entry.username}
                          </span>
                          <div className="text-right">
                            <p className="text-base font-bold text-primary">{entry.referralCount}</p>
                            <p className="text-xs text-muted-foreground">filleuls</p>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {entries.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-4xl mb-3">🏃</p>
                  <p className="text-base font-bold mb-1">Soyez le premier !</p>
                  <p className="text-sm text-muted-foreground">Parrainez des amis pour apparaître au classement.</p>
                </CardContent>
              </Card>
            )}

            {/* Info strip */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4 flex items-start gap-3">
                <span className="text-xl">💡</span>
                <p className="text-sm text-blue-800 leading-relaxed">
                  Partagez votre code de parrainage depuis l'onglet <strong>Parrainage</strong>. Chaque filleul inscrit compte comme 1 point dans le classement.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
