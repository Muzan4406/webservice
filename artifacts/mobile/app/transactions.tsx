import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGetTransactions } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';

const STATUS_LABEL: Record<string, string> = {
  pending:   'En attente',
  validated: 'Validé',
  rejected:  'Rejeté',
  processed: 'Traité',
};

const STATUS_COLOR: Record<string, string> = {
  pending:   '#D97706',
  validated: '#16A34A',
  processed: '#16A34A',
  rejected:  '#DC2626',
};

export default function TransactionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useGetTransactions({ page });

  const transactions = data?.transactions ?? [];
  const total        = data?.total ?? 0;
  const hasMore      = transactions.length === 20;
  const hasPrev      = page > 1;

  const renderItem = ({ item }: { item: any }) => {
    const isDeposit   = item.kind === 'deposit';
    const statusColor = STATUS_COLOR[item.status] ?? colors.mutedForeground;

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Icône */}
        <View style={[styles.iconWrap, { backgroundColor: isDeposit ? '#EAF0FE' : '#FFEDD5' }]}>
          <Ionicons
            name={isDeposit ? 'arrow-down-circle' : 'arrow-up-circle'}
            size={26}
            color={isDeposit ? '#2F55F0' : '#EA580C'}
          />
        </View>

        {/* Infos */}
        <View style={styles.info}>
          <Text style={[styles.kindText, { color: colors.foreground }]}>
            {isDeposit ? 'Dépôt' : 'Retrait'}
            {item.operator ? ` · ${item.operator.replace('_', ' ').toUpperCase()}` : ''}
          </Text>
          <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
            {item.createdAt
              ? new Date(item.createdAt).toLocaleDateString('fr-FR', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })
              : ''}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {STATUS_LABEL[item.status] ?? item.status}
            </Text>
          </View>
        </View>

        {/* Montant */}
        <View style={styles.right}>
          <Text style={[styles.amount, { color: isDeposit ? '#16A34A' : '#DC2626' }]}>
            {isDeposit ? '+' : '-'}{(Number(item.amount) || 0).toLocaleString('fr-FR')} XOF
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} size="large" />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => `${item.kind}-${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Aucune transaction pour l'instant.
              </Text>
            </View>
          }
          ListHeaderComponent={
            total > 0 ? (
              <Text style={[styles.totalText, { color: colors.mutedForeground }]}>
                {total} transaction{total > 1 ? 's' : ''} au total
              </Text>
            ) : null
          }
          ListFooterComponent={
            total > 0 ? (
              <View style={styles.pagination}>
                <TouchableOpacity
                  disabled={!hasPrev || isFetching}
                  onPress={() => setPage((p) => p - 1)}
                  style={[styles.pageBtn, { backgroundColor: colors.card, borderColor: colors.border, opacity: !hasPrev ? 0.4 : 1 }]}
                >
                  <Ionicons name="chevron-back" size={18} color={colors.foreground} />
                  <Text style={[styles.pageBtnText, { color: colors.foreground }]}>Précédent</Text>
                </TouchableOpacity>
                <Text style={[styles.pageNum, { color: colors.mutedForeground }]}>Page {page}</Text>
                <TouchableOpacity
                  disabled={!hasMore || isFetching}
                  onPress={() => setPage((p) => p + 1)}
                  style={[styles.pageBtn, { backgroundColor: colors.card, borderColor: colors.border, opacity: !hasMore ? 0.4 : 1 }]}
                >
                  <Text style={[styles.pageBtnText, { color: colors.foreground }]}>Suivant</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.foreground} />
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
      {isFetching && !isLoading && (
        <ActivityIndicator style={styles.fetchingIndicator} color={colors.primary} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { padding: 16, gap: 10 },
  totalText: { fontSize: 13, fontFamily: 'Inter_500Medium', marginBottom: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: { flex: 1, gap: 4 },
  kindText:   { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  dateText:   { fontSize: 12, fontFamily: 'Inter_400Regular' },
  statusBadge:{ alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  right:      { alignItems: 'flex-end' },
  amount:     { fontSize: 15, fontFamily: 'Inter_700Bold', fontWeight: '700' },
  empty:      { alignItems: 'center', marginTop: 80, gap: 16 },
  emptyText:  { fontSize: 15, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  pageBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  pageBtnText:{ fontSize: 14, fontFamily: 'Inter_500Medium' },
  pageNum:    { fontSize: 14, fontFamily: 'Inter_500Medium' },
  fetchingIndicator: { position: 'absolute', bottom: 32, alignSelf: 'center' },
});
