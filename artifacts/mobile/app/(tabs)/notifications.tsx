import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useGetNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  getGetNotificationsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';

function timeAgo(dateStr: string) {
  const ts = new Date(dateStr).getTime();
  if (isNaN(ts)) return '';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Il y a ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `Il y a ${days}j`;
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const queryClient = useQueryClient();
  const { data, isLoading, isRefetching, refetch } = useGetNotifications();
  const { mutate: markRead } = useMarkNotificationRead();
  const { mutate: markAllRead, isPending: markingAll } = useMarkAllNotificationsRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = notifications.filter((n: any) => !n.isRead).length;
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomPad = insets.bottom + 60 + (Platform.OS === 'web' ? 34 : 0);

  const handleMarkRead = useCallback((id: number, isRead: boolean) => {
    if (isRead) return;
    markRead({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
      },
    });
  }, [markRead, queryClient]);

  const handleMarkAll = useCallback(() => {
    markAllRead(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
      },
    });
  }, [markAllRead, queryClient]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 80 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingTop: topPad + 16, paddingBottom: bottomPad, gap: 12 }}
          refreshControl={
            <RefreshControl refreshing={!!isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          scrollEnabled={notifications.length > 0}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <View style={styles.listHeaderLeft}>
                <Text style={[styles.title, { color: colors.foreground }]}>Notifications</Text>
                {unreadCount > 0 && (
                  <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.countText}>{unreadCount}</Text>
                  </View>
                )}
              </View>
              {unreadCount > 0 && (
                <TouchableOpacity
                  onPress={handleMarkAll}
                  disabled={markingAll}
                  style={[styles.markAllBtn, { backgroundColor: colors.secondary }]}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.markAllText, { color: colors.primary }]}>
                    {markingAll ? 'En cours…' : 'Tout lire'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[styles.emptyCircle, { backgroundColor: colors.secondary }]}>
                <Ionicons name="notifications-off-outline" size={40} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Aucune notification</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Vous verrez ici les alertes importantes de MUZAN SERVICE.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={item.isRead ? 1 : 0.75}
              onPress={() => handleMarkRead(item.id, item.isRead)}
            >
              <View style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
                !item.isRead && { borderColor: colors.primary + '40', backgroundColor: colors.primary + '0A' }
              ]}>
                <View style={[styles.iconCircle, { backgroundColor: item.isRead ? colors.secondary : colors.primary + '15' }]}>
                  <Ionicons name="notifications" size={20} color={item.isRead ? colors.mutedForeground : colors.primary} />
                </View>
                <View style={styles.cardContent}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.title}</Text>
                  <Text style={[styles.cardMessage, { color: colors.mutedForeground }]}>{item.message}</Text>
                  <Text style={[styles.cardTime, { color: colors.mutedForeground }]}>{timeAgo(item.createdAt)}</Text>
                </View>
                {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  listHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  countBadge: {
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Inter_700Bold',
  },
  markAllBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
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
  emptyText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardContent: { flex: 1, gap: 6 },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  cardMessage: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
  },
  cardTime: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: 4,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
    marginTop: 6,
  },
});
