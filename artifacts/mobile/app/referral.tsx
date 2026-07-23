import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Share,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGetReferrals } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';

export default function ReferralScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { user } = useAuth();
  const { data, isLoading, isRefetching, refetch } = useGetReferrals();

  const bottomPad = insets.bottom + (Platform.OS === 'web' ? 34 : 24);
  const referrals = data?.referrals ?? [];
  const referralCount = data?.referralCount ?? 0;
  const activeReferralCount = data?.activeReferralCount ?? 0;
  const referralCode = data?.referralCode ?? user?.referralCode ?? '—';

  async function handleShare() {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: `Rejoins MUZAN SERVICE avec mon code de parrainage : ${referralCode}\n\nTélécharge l'appli et inscris-toi pour accéder aux coupons sportifs et nos services premium !`,
        title: 'MUZAN SERVICE — Code de parrainage',
      });
    } catch (_) {}
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
      refreshControl={
        <RefreshControl refreshing={!!isRefetching} onRefresh={refetch} tintColor={colors.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: colors.successBg, borderColor: colors.success + '40' }]}>
          <Ionicons name="people" size={40} color={colors.success} />
        </View>
        <Text style={[styles.heroTitle, { color: colors.foreground }]}>Programme Parrainage</Text>
        <Text style={[styles.heroText, { color: colors.mutedForeground }]}>
          Invitez vos amis à rejoindre MUZAN SERVICE et participez au{' '}
          <Text style={[styles.heroHighlight, { color: colors.success }]}>concours mensuel</Text> pour gagner des récompenses.
        </Text>
      </View>

      {/* Code card */}
      <View style={[styles.codeCard, { backgroundColor: colors.card, borderColor: colors.success + '40' }]}>
        <Text style={[styles.codeLabel, { color: colors.mutedForeground }]}>Votre code de parrainage</Text>
        <Text style={[styles.code, { color: colors.success }]}>{referralCode}</Text>
        <TouchableOpacity 
          style={[styles.shareBtn, { backgroundColor: colors.success }]} 
          onPress={handleShare} 
          activeOpacity={0.8}
        >
          <Ionicons name="share-social" size={20} color="#ffffff" />
          <Text style={styles.shareBtnText}>Partager mon code</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{referralCount}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total filleuls</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.success + '30', borderWidth: 1.5 }]}>
          <Text style={[styles.statValue, { color: colors.success }]}>{activeReferralCount}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Filleuls actifs</Text>
        </View>
      </View>

      {/* Info message */}
      <View style={[styles.infoBox, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
        <Ionicons name="information-circle-outline" size={18} color={colors.primary} style={{ marginTop: 1 }} />
        <Text style={[styles.infoText, { color: colors.primary }]}>
          Un filleul est <Text style={{ fontWeight: '700' }}>actif</Text> seulement après son premier dépôt approuvé. Seuls les filleuls actifs comptent dans le classement du concours.
        </Text>
      </View>

      {/* How it works */}
      <View style={[styles.howSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Comment ça marche</Text>
        {[
          { icon: 'share-outline' as const, text: 'Partagez votre code à vos amis' },
          { icon: 'person-add-outline' as const, text: "Ils s'inscrivent avec votre code" },
          { icon: 'trophy-outline' as const, text: 'Vous grimpez dans le classement mensuel' },
          { icon: 'gift-outline' as const, text: 'Le top 10 reçoit des récompenses' },
        ].map((step, i) => (
          <View key={i} style={styles.howRow}>
            <View style={[styles.howIcon, { backgroundColor: colors.secondary }]}>
              <Ionicons name={step.icon} size={20} color={colors.primary} />
            </View>
            <Text style={[styles.howText, { color: colors.foreground }]}>{step.text}</Text>
          </View>
        ))}
      </View>

      {/* Referrals list */}
      <View style={styles.listSection}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          Mes filleuls ({referralCount} total · {activeReferralCount} actif{activeReferralCount !== 1 ? 's' : ''})
        </Text>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : referrals.length === 0 ? (
          <View style={[styles.emptyReferrals, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.secondary }]}>
               <Ionicons name="people-outline" size={32} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyText, { color: colors.foreground }]}>Pas encore de filleuls</Text>
            <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>Partagez votre code pour inviter des amis !</Text>
          </View>
        ) : (
          referrals.map((ref: any, i: number) => (
            <View key={i} style={[styles.referralRow, { backgroundColor: colors.card, borderColor: ref.isActive ? colors.success + '50' : colors.border }]}>
              <View style={[styles.referralAvatar, { backgroundColor: ref.isActive ? colors.successBg : colors.secondary }]}>
                <Text style={[styles.referralAvatarText, { color: ref.isActive ? colors.success : colors.mutedForeground }]}>
                  {ref.username.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.referralName, { color: colors.foreground }]}>{ref.username}</Text>
                <Text style={[styles.referralDate, { color: colors.mutedForeground }]}>
                  Inscrit le {new Date(ref.createdAt).toLocaleDateString('fr-FR')}
                </Text>
              </View>
              <View style={[
                styles.activeBadge,
                { backgroundColor: ref.isActive ? colors.success + '20' : colors.secondary, borderColor: ref.isActive ? colors.success + '60' : colors.border }
              ]}>
                <Ionicons
                  name={ref.isActive ? 'checkmark-circle' : 'time-outline'}
                  size={12}
                  color={ref.isActive ? colors.success : colors.mutedForeground}
                />
                <Text style={[styles.activeBadgeText, { color: ref.isActive ? colors.success : colors.mutedForeground }]}>
                  {ref.isActive ? 'Actif' : 'En attente'}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 20 },
  hero: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  heroText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  heroHighlight: { fontWeight: '700', fontFamily: 'Inter_700Bold' },
  codeCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  codeLabel: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  code: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 6,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 16,
    marginTop: 8,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  shareBtnText: { fontSize: 16, fontWeight: '700', color: '#ffffff', fontFamily: 'Inter_700Bold' },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  statIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 36,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  statLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  howSection: {
    borderRadius: 20,
    padding: 24,
    gap: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  howIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  howText: { flex: 1, fontSize: 15, fontFamily: 'Inter_500Medium', lineHeight: 22 },
  listSection: { gap: 12, marginTop: 8 },
  emptyReferrals: { alignItems: 'center', paddingVertical: 32, gap: 12, borderRadius: 16, borderWidth: 1 },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  emptySubText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  referralRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  referralAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  referralAvatarText: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  referralName: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  referralDate: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    flexShrink: 0,
  },
  activeBadgeText: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
});
