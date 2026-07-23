import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGetPromotions } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useToast } from '@/contexts/ToastContext';

const PROMO_COLORS = ['#9333EA', '#2F55F0', '#16A34A', '#EA580C', '#D89B1E'];

function resolveImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('/api')) return `https://${process.env.EXPO_PUBLIC_DOMAIN}${url}`;
  return url;
}

export default function PromotionsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { showError } = useToast();
  const { data, isLoading, isError, isRefetching, refetch } = useGetPromotions();
  const promotions = data?.promotions ?? [];

  React.useEffect(() => {
    if (isError) showError('Erreur de chargement', 'Impossible de récupérer les promotions.');
  }, [isError]);

  const bottomPad = insets.bottom + (Platform.OS === 'web' ? 34 : 24);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={promotions}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad, gap: 16 }}
          refreshControl={
            <RefreshControl refreshing={!!isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          scrollEnabled={promotions.length > 0}
          ListHeaderComponent={
            <Text style={[styles.headerNote, { color: colors.mutedForeground }]}>
              {promotions.length} offre{promotions.length !== 1 ? 's' : ''} active{promotions.length !== 1 ? 's' : ''}
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[styles.emptyCircle, { backgroundColor: colors.secondary }]}>
                <Ionicons name="gift-outline" size={40} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Aucune promotion</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Les promotions actives apparaîtront ici.</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const accent = PROMO_COLORS[index % PROMO_COLORS.length];
            const imageUri = resolveImageUrl((item as any).imageUrl);
            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {/* Promotion image */}
                {imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.cardTop, { backgroundColor: accent + '10', borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                    <View style={[styles.iconBox, { backgroundColor: '#ffffff', borderColor: accent + '30', borderWidth: 1 }]}>
                      <Ionicons name="gift" size={24} color={accent} />
                    </View>
                    <View style={styles.cardTopText}>
                      <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.title}</Text>
                      <View style={styles.activePill}>
                        <View style={[styles.activeDot, { backgroundColor: accent }]} />
                        <Text style={[styles.activeLabel, { color: accent }]}>Active</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Title row when image present */}
                {imageUri && (
                  <View style={[styles.cardTitleRow, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                    <Text style={[styles.cardTitle, { color: colors.foreground, flex: 1 }]}>{item.title}</Text>
                    <View style={styles.activePill}>
                      <View style={[styles.activeDot, { backgroundColor: accent }]} />
                      <Text style={[styles.activeLabel, { color: accent }]}>Active</Text>
                    </View>
                  </View>
                )}

                <Text style={[styles.cardContent, { color: colors.mutedForeground }]}>{item.content}</Text>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerNote: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  empty: { alignItems: 'center', paddingTop: 80, gap: 16, paddingHorizontal: 32 },
  emptyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  emptyText: { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  cardImage: {
    width: '100%',
    height: 180,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTopText: { flex: 1, gap: 6 },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    lineHeight: 24,
  },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  activeLabel: { fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold', textTransform: 'uppercase' },
  cardContent: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 24,
    padding: 20,
  },
});
