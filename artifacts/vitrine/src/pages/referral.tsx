import { motion } from 'framer-motion';
import { useGetReferrals, useGetCurrentContest, useGetContestLeaderboard } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Copy, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ReferralPage() {
  const { user } = useAuth();
  const referrals = useGetReferrals();
  const contest = useGetCurrentContest();
  const leaderboard = useGetContestLeaderboard();

  const copyReferralCode = () => {
    if (referrals.data?.referralCode) {
      navigator.clipboard.writeText(referrals.data.referralCode);
      toast.success('Code copié dans le presse-papiers');
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-20 md:pb-6">
      <div className="bg-gradient-to-br from-[#1a2a5e] to-[#0f1a3e] p-6 pb-8">
        <h1 className="text-2xl font-bold text-white">Parrainage & Concours</h1>
        <p className="text-white/60 text-sm">Invitez vos amis et gagnez</p>
      </div>

      <div className="px-6 -mt-4 space-y-6">
        {/* Referral Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
            <CardHeader>
              <CardTitle className="text-lg">Programme de parrainage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {referrals.isLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 p-4 bg-white/50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Votre code</p>
                      <p className="text-xl font-bold">{referrals.data?.referralCode}</p>
                    </div>
                    <Button
                      data-testid="button-copy-code"
                      onClick={copyReferralCode}
                      size="sm"
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copier
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {referrals.data?.referralCount || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Parrainages</p>
                    </div>
                    <div className="p-4 bg-white/50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {referrals.data?.referrals?.filter((r) => r.username).length || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Actifs</p>
                    </div>
                  </div>

                  {referrals.data?.referrals && referrals.data.referrals.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Vos filleuls</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {referrals.data.referrals.map((ref, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-white/50 rounded-lg text-sm"
                          >
                            <span className="font-medium">{ref.username}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(ref.createdAt), 'dd MMM yyyy', { locale: fr })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Contest Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-amber-500/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <CardTitle className="text-lg">Concours en cours</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {contest.isLoading || leaderboard.isLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : contest.data ? (
                <>
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg">{contest.data.title}</h3>
                    <p className="text-sm text-muted-foreground">{contest.data.description}</p>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-500 text-black">
                        Récompense: {contest.data.reward}
                      </Badge>
                      {leaderboard.data?.contestEndsAt && (
                        <Badge variant="outline">
                          Fin: {format(new Date(leaderboard.data.contestEndsAt), 'dd MMM', { locale: fr })}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {leaderboard.data?.entries && leaderboard.data.entries.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Classement Top 10</h4>
                      <div className="space-y-2">
                        {leaderboard.data.entries.slice(0, 10).map((entry) => {
                          const isCurrentUser = entry.userId === user?.userId;
                          return (
                            <div
                              key={entry.rank}
                              className={`flex items-center gap-3 p-3 rounded-lg ${
                                isCurrentUser
                                  ? 'bg-primary/20 border-2 border-primary'
                                  : 'bg-white/50'
                              }`}
                            >
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                                  entry.rank === 1
                                    ? 'bg-amber-500 text-white'
                                    : entry.rank === 2
                                    ? 'bg-gray-400 text-white'
                                    : entry.rank === 3
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-gray-200 text-gray-700'
                                }`}
                              >
                                {entry.rank}
                              </div>
                              <span className="flex-1 font-medium">{entry.username}</span>
                              <span className="text-sm font-bold text-green-600">
                                {entry.referralCount} parrainages
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  Aucun concours actif pour le moment
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}
