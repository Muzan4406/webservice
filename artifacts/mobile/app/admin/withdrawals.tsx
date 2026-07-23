import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useGetAdminWithdrawals, useProcessWithdrawal, useDeleteWithdrawal, getGetAdminWithdrawalsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import { confirmAction } from '../../utils/confirm';

type Status = 'pending' | 'processed' | 'rejected';

export default function AdminWithdrawals() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('pending');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  
  const { data, isLoading } = useGetAdminWithdrawals({ status, page }, {
    query: { queryKey: getGetAdminWithdrawalsQueryKey({ status, page }) }
  });

  const { mutate: processWithdrawal } = useProcessWithdrawal();
  const { mutate: deleteWithdrawal } = useDeleteWithdrawal();
  const { showError, showSuccess } = useToast();

  const handleDelete = (id: number) => {
    confirmAction('Supprimer le retrait', 'Supprimer définitivement ce retrait de l\'historique ?', () => {
      deleteWithdrawal({ id }, {
        onSuccess: () => {
          showSuccess('Supprimé', 'Le retrait a été supprimé.');
          queryClient.invalidateQueries({ queryKey: getGetAdminWithdrawalsQueryKey({ status, page }) });
        },
        onError: (err: any) => {
          showError('Erreur', err?.data?.error ?? 'Impossible de supprimer.');
        }
      });
    }, 'Supprimer');
  };

  const handleProcess = (id: number) => {
    confirmAction('Traiter le retrait', 'Confirmer que vous avez envoyé les fonds ?', () => {
      processWithdrawal({ id }, {
        onSuccess: () => {
          showSuccess('Traité', 'Le retrait a été marqué comme traité.');
          queryClient.invalidateQueries({ queryKey: getGetAdminWithdrawalsQueryKey({ status, page }) });
        },
        onError: (err: any) => {
          showError('Erreur', err?.data?.error ?? 'Impossible de traiter.');
        }
      });
    }, 'Confirmer');
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.amount, { color: colors.destructive }]}>{item.amount.toLocaleString()} XOF</Text>
        <Text style={[styles.date, { color: colors.mutedForeground }]}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Utilisateur</Text>
          <Text style={[styles.detailValue, { color: colors.foreground }]}>{item.username}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Téléphone</Text>
          <Text style={[styles.detailValue, { color: colors.foreground }]}>{item.phone}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Opérateur</Text>
          <Text style={[styles.detailValue, { color: colors.foreground, textTransform: 'uppercase' }]}>{item.operator}</Text>
        </View>
        {item.country ? (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Pays</Text>
            <Text style={[styles.detailValue, { color: colors.foreground, textTransform: 'uppercase' }]}>{item.country}</Text>
          </View>
        ) : null}
        {item.code ? (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Code 1xBet</Text>
            <Text style={[styles.detailValue, { color: colors.foreground, fontWeight: '700' }]}>{item.code}</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        {status === 'pending' ? (
          <TouchableOpacity 
            style={[styles.actionBtn, { borderColor: colors.border, borderRightWidth: 0 }]} 
            onPress={() => handleProcess(item.id)}
          >
            <Ionicons name="checkmark-done" size={16} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primary }]}>Marquer comme traité</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: colors.border, borderRightWidth: 0 }]}
            onPress={() => handleDelete(item.id)}
          >
            <Ionicons name="trash-outline" size={16} color={colors.destructive} />
            <Text style={[styles.actionText, { color: colors.destructive }]}>Supprimer</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const filtered = (data?.withdrawals ?? []).filter((w: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      w.username?.toLowerCase().includes(q) ||
      w.phone?.toLowerCase().includes(q) ||
      w.operator?.toLowerCase().includes(q) ||
      String(w.amount).includes(q)
    );
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.tabs, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(['pending', 'processed', 'rejected'] as Status[]).map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.tab, status === s && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => { setStatus(s); setPage(1); }}
          >
            <Text style={[styles.tabText, { color: status === s ? colors.primary : colors.mutedForeground }]}>
              {s === 'pending' ? 'En attente' : s === 'processed' ? 'Traités' : 'Rejetés'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Rechercher utilisateur, téléphone..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={[styles.empty, { color: colors.mutedForeground }]}>Aucun retrait trouvé.</Text>}
          ListFooterComponent={
            data && data.total > 0 ? (
              <View style={styles.pagination}>
                <TouchableOpacity disabled={page === 1} onPress={() => setPage(p => p - 1)} style={[styles.pageBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={{ color: page === 1 ? colors.mutedForeground : colors.foreground }}>Précédent</Text>
                </TouchableOpacity>
                <Text style={{ color: colors.mutedForeground }}>Page {page}</Text>
                <TouchableOpacity disabled={!data || (data.withdrawals?.length ?? 0) < 20} onPress={() => setPage(p => p + 1)} style={[styles.pageBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={{ color: (!data || (data.withdrawals?.length ?? 0) < 20) ? colors.mutedForeground : colors.foreground }}>Suivant</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabText: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  searchContainer: { padding: 12, paddingBottom: 4 },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 44, borderRadius: 10, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  list: { padding: 16, gap: 12 },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  amount: { fontSize: 18, fontWeight: '700' },
  date: { fontSize: 12, fontWeight: '500' },
  details: { padding: 16, gap: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 13, fontWeight: '600' },
  actions: { flexDirection: 'row', borderTopWidth: 1 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, gap: 8 },
  actionText: { fontSize: 14, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  pageBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
});