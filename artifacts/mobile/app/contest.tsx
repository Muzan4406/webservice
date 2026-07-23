import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGetCurrentContest, useGetContestLeaderboard } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';
import { useToast } from '@/contexts/ToastContext';

const RANK_COLORS: Record<number, string> = {
  1: '#D89B1E',
  2: '#8899B0',
  3: '#B45309',
};

const RANK_BG: Record<number, string> = {
  1: '#FEF3C7',
  2: '#F1F5F9',
  3: '#FEF0E6',
};

const RANK_ICONS: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

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

function PodiumCard({ entry, height, isMe }: { entry: any; height: number; isMe: boolean }) {
  const rankColor = RANK_COLORS[entry.rank];
  const rankBg = RANK_BG[entry.rank];
  return (
    <View style={[podiumStyles.container, { height }]}>
      <View style={[podiumStyles.avatarWrap, { borderColor: rankColor, backgroundColor: isMe ? '#DCFCE7' : '#fff' }]}>
        <Text style={[podiumStyles.avatarLetter, { color: isMe ? '#16a34a' : rankColor }]}>
          {entry.username.charAt(0).toUpperCase()}
        </Text>
        <Text style={podiumStyles.emoji}>{RANK_ICONS[entry.rank]}</Text>
      </View>
      <Text style={[podiumStyles.username, { color: isMe ? '#16a34a' : '#1e293b' }]} numberOfLines={1}>
        {entry.username}
      </Text>
      <Text style={[podiumStyles.count, { color: rankColor }]}>{entry.referralCount}</Text>
      <Text style={podiumStyles.label}>filleuls</Text>
      <View style={[podiumStyles.block, { backgroundColor: rankBg, borderTopColor: rankColor, height: height * 0.38 }]}>
        <Text style={[podiumStyles.rankNum, { color: rankColor }]}>#{entry.rank}</Text>
      </View>
    </View>
  );
}

const podiumStyles = StyleSheet.create({
  container: { width: 104, alignItems: 'center', justifyContent: 'flex-end' },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarLetter: { fontSize: 20, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  emoji: { position: 'absolute', top: -8, right: -8, fontSize: 18 },
  username: { fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold', maxWidth: 96, textAlign: 'center', marginBottom: 2 },
  count: { fontSize: 22, fontWeight: '700', fontFamily: 'Inter_700Bold', lineHeight: 26 },
  label: { fontSize: 11, color: '#94a3b8', fontFamily: 'Inter_500Medium', marginBottom: 6 },
  block: {
    width: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderTopWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNum: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
});

export default function ContestScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { user } = useAuth();
  const { showError } = useToast();

  const contestQuery = useGetCurrentContest();
  const leaderboardQuery = useGetContestLeaderboard();

  const bottomPad = insets.bottom + (Platform.OS === 'web' ? 34 : 24);
  const contest = contestQuery.data;
  const entries = leaderboardQuery.data?.entries ?? [];
  const contestEndsAt = leaderboardQuery.data?.contestEndsAt;

  const isLoading = contestQuery.isLoading || leaderboardQuery.isLoading;
  const isError = contestQuery.isError || leaderboardQuery.isError;

  React.useEffect(() => {
    if (isError) showError('Erreur de chargement', 'Impossible de récupérer les données du concours.');
  }, [isError]);

  function onRefresh() {
    contestQuery.refetch();
    leaderboardQuery.refetch();
  }

  const myRank = entries.findIndex((e: any) => e.username === user?.username);

  // Split entries: top 3 for podium, rest for list
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  // Podium order: 2nd – 1st – 3rd
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const podiumHeights: Record<number, number> = { 1: 170, 2: 140, 3: 120 };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
      refreshControl={
        <RefreshControl
          refreshing={contestQuery.isRefetching || leaderboardQuery.isRefetching}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {isLoading ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 80 }} />
      ) : (
        <>
          {/* ── Hero Banner ── */}
          {contest ? (
            <LinearGradient
              colors={['#1a1a2e', '#16213e', '#0f3460']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              {/* Decorative circles */}
              <View style={styles.decCircle1} />
              <View style={styles.decCircle2} />

              {/* Trophy */}
              <View style={styles.trophyRow}>
                <View style={styles.trophyGlow}>
                  <Text style={styles.trophyEmoji}>🏆</Text>
                </View>
              </View>

              <Text style={styles.heroTitle}>{contest.title}</Text>
              <Text style={styles.heroDesc}>{contest.description}</Text>

              {/* Timer pill */}
              {contestEndsAt && (
                <View style={styles.timerRow}>
                  <Ionicons name="time-outline" size={15} color="#fbbf24" />
                  <Text style={styles.timerText}>{timeLeft(contestEndsAt)}</Text>
                </View>
              )}

              {/* Reward chip */}
              <View style={styles.rewardChip}>
                <Text style={styles.rewardEmoji}>🎁</Text>
                <Text style={styles.rewardLabel}>Récompense</Text>
                <Text style={styles.rewardValue}>{contest.reward}</Text>
              </View>
            </LinearGradient>
          ) : (
            <View style={[styles.noContest, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.noContestEmoji}>🏆</Text>
              <Text style={[styles.noContestTitle, { color: colors.foreground }]}>Aucun concours actif</Text>
              <Text style={[styles.noContestSub, { color: colors.mutedForeground }]}>Revenez bientôt pour le prochain concours de parrainage !</Text>
            </View>
          )}

          {/* ── My rank card ── */}
          {myRank >= 0 && (
            <LinearGradient
              colors={['#052e16', '#14532d']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.myRankCard}
            >
              <View style={styles.myRankLeft}>
                <Text style={styles.myRankIcon}>🙋</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.myRankLabel}>Votre position</Text>
                <Text style={styles.myRankValue}>
                  #{myRank + 1}{' '}
                  <Text style={styles.myRankSub}>· {entries[myRank]?.referralCount} filleul{entries[myRank]?.referralCount !== 1 ? 's' : ''}</Text>
                </Text>
              </View>
              {myRank < 3 && (
                <Text style={{ fontSize: 28 }}>{RANK_ICONS[myRank + 1]}</Text>
              )}
            </LinearGradient>
          )}

          {/* ── Section header ── */}
          {entries.length > 0 && (
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>CLASSEMENT</Text>
              <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
            </View>
          )}

          {/* ── Podium (top 3) ── */}
          {top3.length > 0 && (
            <View style={[styles.podiumWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.podiumRow}>
                {podiumOrder.map((entry) => (
                  <PodiumCard
                    key={entry.rank}
                    entry={entry}
                    height={podiumHeights[entry.rank] ?? 120}
                    isMe={entry.username === user?.username}
                  />
                ))}
              </View>
            </View>
          )}

          {/* ── Rest of leaderboard (4th and beyond) ── */}
          {rest.length > 0 && (
            <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {rest.map((entry: any, index: number) => {
                const isMe = entry.username === user?.username;
                return (
                  <View
                    key={entry.rank}
                    style={[
                      styles.listRow,
                      index < rest.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                      isMe && { backgroundColor: colors.success + '0D' },
                    ]}
                  >
                    <View style={[styles.listRankBadge, { backgroundColor: isMe ? colors.success + '20' : colors.secondary }]}>
                      <Text style={[styles.listRankNum, { color: isMe ? colors.success : colors.mutedForeground }]}>
                        #{entry.rank}
                      </Text>
                    </View>
                    <View style={[styles.listAvatar, { backgroundColor: isMe ? colors.success : colors.primary }]}>
                      <Text style={styles.listAvatarText}>{entry.username.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={[styles.listUsername, { color: isMe ? colors.success : colors.foreground }]} numberOfLines={1}>
                      {entry.username}
                      {isMe ? '  (vous)' : ''}
                    </Text>
                    <View style={styles.listCountCol}>
                      <Text style={[styles.listCount, { color: isMe ? colors.success : colors.foreground }]}>
                        {entry.referralCount}
                      </Text>
                      <Text style={[styles.listCountLabel, { color: colors.mutedForeground }]}>filleuls</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* ── Empty leaderboard ── */}
          {entries.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Aucun participant</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Parrainez des amis pour apparaître dans le classement !
              </Text>
            </View>
          )}

          {/* ── Info strip ── */}
          <View style={[styles.infoStrip, { backgroundColor: colors.infoBg, borderColor: colors.info + '30' }]}>
            <Ionicons name="people-outline" size={18} color={colors.info} />
            <Text style={[styles.infoText, { color: colors.info }]}>
              Le classement se base sur le nombre de filleuls actifs parrainés.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 14 },

  /* Hero */
  hero: {
    borderRadius: 24,
    padding: 28,
    overflow: 'hidden',
    gap: 10,
    shadowColor: '#0f3460',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  decCircle1: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.04)', top: -60, right: -40,
  },
  decCircle2: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.03)', bottom: -30, left: -30,
  },
  trophyRow: { alignItems: 'center', marginBottom: 4 },
  trophyGlow: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(251,191,36,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)',
  },
  trophyEmoji: { fontSize: 40 },
  heroTitle: {
    fontSize: 22, fontWeight: '700', fontFamily: 'Inter_700Bold',
    color: '#f8fafc', textAlign: 'center', lineHeight: 28,
  },
  heroDesc: {
    fontSize: 14, fontFamily: 'Inter_400Regular',
    color: 'rgba(248,250,252,0.72)', textAlign: 'center', lineHeight: 20,
  },
  timerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'center',
    backgroundColor: 'rgba(251,191,36,0.15)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)',
    marginTop: 2,
  },
  timerText: {
    fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#fbbf24',
  },
  rewardChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16, padding: 16, marginTop: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  rewardEmoji: { fontSize: 22 },
  rewardLabel: {
    fontSize: 12, fontFamily: 'Inter_600SemiBold',
    color: 'rgba(248,250,252,0.55)', marginRight: 2,
  },
  rewardValue: {
    flex: 1, fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold',
    color: '#f8fafc',
  },

  /* No contest */
  noContest: {
    borderRadius: 20, borderWidth: 1, alignItems: 'center',
    paddingVertical: 52, paddingHorizontal: 24, gap: 10,
  },
  noContestEmoji: { fontSize: 52, marginBottom: 4 },
  noContestTitle: { fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  noContestSub: {
    fontSize: 14, fontFamily: 'Inter_400Regular',
    textAlign: 'center', lineHeight: 20,
  },

  /* My rank */
  myRankCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 18, padding: 18,
    shadowColor: '#14532d', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 4,
  },
  myRankLeft: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  myRankIcon: { fontSize: 22 },
  myRankLabel: {
    fontSize: 12, fontFamily: 'Inter_600SemiBold',
    color: 'rgba(134,239,172,0.8)', marginBottom: 2,
  },
  myRankValue: {
    fontSize: 20, fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#86efac',
  },
  myRankSub: { fontSize: 14, fontWeight: '500', fontFamily: 'Inter_500Medium', color: 'rgba(134,239,172,0.7)' },

  /* Section header */
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 4,
  },
  sectionLine: { flex: 1, height: 1 },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold',
    letterSpacing: 1.4,
  },

  /* Podium */
  podiumWrapper: {
    borderRadius: 20, borderWidth: 1, paddingVertical: 24, paddingHorizontal: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  podiumRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'center', gap: 4,
  },

  /* Rest list */
  listCard: {
    borderRadius: 18, borderWidth: 1, overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
  },
  listRankBadge: {
    width: 44, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  listRankNum: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  listAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  listAvatarText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'Inter_700Bold' },
  listUsername: { flex: 1, fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  listCountCol: { alignItems: 'flex-end' },
  listCount: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  listCountLabel: { fontSize: 11, fontFamily: 'Inter_500Medium' },

  /* Empty */
  emptyCard: {
    borderRadius: 18, borderWidth: 1,
    alignItems: 'center', paddingVertical: 44, paddingHorizontal: 24, gap: 10,
  },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  emptySub: {
    fontSize: 14, fontFamily: 'Inter_400Regular',
    textAlign: 'center', lineHeight: 20,
  },

  /* Info strip */
  infoStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  infoText: { flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium', lineHeight: 18 },
});
