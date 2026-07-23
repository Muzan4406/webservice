import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import {
  useGetDailyCoupons,
  useGetVipCoupons,
  useGetAppSettings,
} from '@workspace/api-client-react';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';

type Tab = 'daily' | 'vip';

export default function CouponsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('daily');

  const dailyQuery = useGetDailyCoupons();
  const vipQuery = useGetVipCoupons();
  const { data: appSettings } = useGetAppSettings();
  const vipPriceLabel = `${(appSettings?.vipPriceFcfa ?? 5000).toLocaleString('fr-FR')} FCFA`;

  const topPad = insets.top;
  const bottomPad = insets.bottom + (Platform.OS === 'web' ? 84 : 60) + 16;

  const isLoading = tab === 'daily' ? dailyQuery.isLoading : vipQuery.isLoading;
  const isRefetching = tab === 'daily' ? dailyQuery.isRefetching : vipQuery.isRefetching;
  const coupons = (tab === 'daily' ? dailyQuery.data?.coupons : vipQuery.data?.coupons) ?? [];

  function onRefresh() {
    if (tab === 'daily') dailyQuery.refetch();
    else vipQuery.refetch();
  }

  async function copyCode(code: string) {
    await Clipboard.setStringAsync(code);
    Alert.alert('Copié !', 'Le code a été copié dans le presse-papier.');
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Coupons</Text>
        {user?.isVip && (
          <View style={[styles.vipPill, { backgroundColor: colors.vipGoldBg, borderColor: colors.vipGold + '40' }]}>
            <Ionicons name="star" size={12} color={colors.vipGold} />
            <Text style={[styles.vipPillText, { color: colors.vipGold }]}>VIP</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(['daily', 'vip'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[
              styles.tabBtn,
              { borderColor: colors.border, backgroundColor: colors.secondary },
              tab === t && { backgroundColor: colors.primary, borderColor: colors.primary }
            ]}
            onPress={() => setTab(t)}
            activeOpacity={0.75}
          >
            <Ionicons
              name={t === 'daily' ? 'calendar' : 'star'}
              size={18}
              color={tab === t ? colors.primaryForeground : colors.mutedForeground}
            />
            <Text style={[
              styles.tabBtnText,
              { color: colors.mutedForeground },
              tab === t && { color: colors.primaryForeground, fontWeight: '700' }
            ]}>
              {t === 'daily' ? 'Du jour' : 'VIP'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* VIP gate */}
      {tab === 'vip' && !user?.isVip && (
        <View style={styles.vipGate}>
          <View style={[styles.lockCircle, { backgroundColor: colors.vipGoldBg }]}>
            <Ionicons name="lock-closed" size={40} color={colors.vipGold} />
          </View>
          <Text style={[styles.vipGateTitle, { color: colors.foreground }]}>Accès VIP requis</Text>
          <Text style={[styles.vipGateText, { color: colors.mutedForeground }]}>
            Débloquez les coupons VIP exclusifs pour seulement{' '}
            <Text style={{ color: colors.vipGold, fontWeight: '700' }}>{vipPriceLabel}</Text> à vie.
          </Text>
          <TouchableOpacity
            style={[styles.vipBtn, { backgroundColor: colors.vipGold }]}
            onPress={() => router.push('/vip-purchase' as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.vipBtnText}>Devenir Membre VIP</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Coupons list */}
      {(tab === 'daily' || user?.isVip) && (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
          refreshControl={
            <RefreshControl
              refreshing={!!isRefetching}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} size="large" />
          ) : coupons.length === 0 ? (
            <View style={styles.empty}>
              <View style={[styles.emptyCircle, { backgroundColor: colors.secondary }]}>
                 <Ionicons name="ticket-outline" size={40} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Aucun coupon disponible</Text>
            </View>
          ) : (
            (coupons as any[]).map((coupon: any) => (
              <View
                key={coupon.id}
                style={[
                  styles.couponCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  coupon.type === 'vip' && { borderColor: colors.vipGold + '40' },
                ]}
              >
                {/* Image */}
                {coupon.imageUrl && (
                  <Image
                    source={{ uri: coupon.imageUrl.startsWith('/api') ? `https://${process.env.EXPO_PUBLIC_DOMAIN}${coupon.imageUrl}` : coupon.imageUrl }}
                    style={styles.couponImage}
                    resizeMode="cover"
                  />
                )}

                <View style={styles.couponBody}>
                  {/* Badge row */}
                  <View style={styles.couponHeader}>
                    <View style={[
                      styles.couponBadge,
                      { backgroundColor: coupon.type === 'vip' ? colors.vipGoldBg : colors.successBg }
                    ]}>
                      <Ionicons
                        name={coupon.type === 'vip' ? 'star' : 'calendar'}
                        size={14}
                        color={coupon.type === 'vip' ? colors.vipGold : colors.success}
                      />
                      <Text style={[styles.couponBadgeText, { color: coupon.type === 'vip' ? colors.vipGold : colors.success }]}>
                        {coupon.type === 'vip' ? 'VIP' : 'Jour'}
                      </Text>
                    </View>
                    {coupon.odds != null && (
                      <View style={[styles.oddsBadge, { backgroundColor: colors.secondary }]}>
                        <Text style={[styles.oddsText, { color: colors.foreground }]}>Cote: {Number(coupon.odds).toFixed(2)}</Text>
                      </View>
                    )}
                  </View>

                  {/* Title */}
                  <Text style={[styles.couponTitle, { color: colors.foreground }]}>{coupon.title}</Text>

                  {/* Coupon code */}
                  {coupon.content && (
                    <TouchableOpacity
                      style={[styles.codeBox, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}
                      onPress={() => copyCode(coupon.content)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="barcode-outline" size={20} color={colors.primary} />
                      <Text style={[styles.codeValue, { color: colors.primary }]}>{coupon.content}</Text>
                      <Ionicons name="copy-outline" size={16} color={colors.primary} style={{ marginLeft: 'auto' }} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  vipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  vipPillText: { fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  tabs: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabBtnText: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  vipGate: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  lockCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  vipGateTitle: { fontSize: 24, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  vipGateText: { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 24 },
  vipBtn: { borderRadius: 14, paddingHorizontal: 32, paddingVertical: 16, marginTop: 16 },
  vipBtnText: { fontSize: 16, fontWeight: '700', color: '#ffffff', fontFamily: 'Inter_700Bold' },
  scroll: { padding: 16, gap: 16 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 16 },
  emptyCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, fontFamily: 'Inter_500Medium' },
  couponCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  couponImage: { width: '100%', height: 200 },
  couponBody: { padding: 20, gap: 14 },
  couponHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  couponBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  couponBadgeText: { fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold', textTransform: 'uppercase' },
  oddsBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  oddsText: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  couponTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  codeValue: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold', letterSpacing: 2, flex: 1 },
});
