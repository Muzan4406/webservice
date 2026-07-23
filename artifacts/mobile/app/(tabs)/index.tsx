import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  type ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';

interface DashboardItem {
  label: string;
  image: ImageSourcePropType;
  route: string;
  badge?: string;
  badgeColor?: string;
}

const DASHBOARD_ITEMS: DashboardItem[] = [
  { label: 'Dépôt', image: require('@/assets/images/dashboard/deposit.png'), route: '/deposit' },
  { label: 'Retrait', image: require('@/assets/images/dashboard/withdrawal.png'), route: '/withdrawal' },
  { label: 'Coupon du Jour', image: require('@/assets/images/dashboard/coupon.png'), route: '/(tabs)/coupons' },
  { label: 'Coupon VIP', image: require('@/assets/images/dashboard/vip.png'), route: '/(tabs)/coupons', badge: 'VIP', badgeColor: '#D89B1E' },
  { label: 'Promotions', image: require('@/assets/images/dashboard/promo.png'), route: '/promotions' },
  { label: 'Parrainage', image: require('@/assets/images/dashboard/referral.png'), route: '/referral' },
  { label: 'Concours', image: require('@/assets/images/dashboard/contest.png'), route: '/contest' },
  { label: 'Profil', image: require('@/assets/images/dashboard/profile.png'), route: '/(tabs)/profile' },
];

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const colors = useColors();

  const topPad = insets.top;
  const bottomPad = insets.bottom + (Platform.OS === 'web' ? 84 : 60) + 16;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* User card */}
        <View style={[styles.balanceCard, { backgroundColor: '#1a2a5e', shadowColor: '#1a2a5e' }]}>
          <View style={styles.userCardLeft}>
            <View style={styles.avatarCircle}>
              <Image source={require('@/assets/images/logo.png')} style={styles.avatarLogo} resizeMode="cover" />
              {user?.isVip && (
                <View style={styles.vipOverlay}>
                  <Text style={styles.vipOverlayText}>VIP</Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userCardGreeting}>Bonjour,</Text>
              <Text style={styles.userCardName}>{user?.username ?? '—'}</Text>
              <Text style={styles.userCardStatus}>
                Statut : {user?.isVip ? 'VIP' : 'Standard'} • ID: {user?.userId ?? '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Section title */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Services rapides</Text>

        {/* 8-card grid */}
        <View style={styles.grid}>
          {DASHBOARD_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.75}
            >
              <View style={styles.iconWrapper}>
                <Image source={item.image} style={styles.iconImage} resizeMode="contain" />
              </View>
              <Text style={[styles.cardLabel, { color: colors.foreground }]}>{item.label}</Text>
              {item.badge && (
                <View style={[styles.badge, { backgroundColor: item.badgeColor ?? colors.primary }]}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 20 },
  balanceCard: {
    borderRadius: 20,
    padding: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  userCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  avatarLogo: { width: 64, height: 64 },
  vipOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#D89B1E',
    paddingVertical: 2,
    alignItems: 'center',
  },
  vipOverlayText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
  userCardGreeting: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Inter_400Regular',
    marginBottom: 2,
  },
  userCardName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  userCardStatus: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Inter_400Regular',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    paddingHorizontal: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    position: 'relative',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconImage: {
    width: 56,
    height: 56,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Inter_700Bold',
  },
});
