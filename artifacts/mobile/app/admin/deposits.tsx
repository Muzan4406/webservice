import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useGetAdminDeposits, useValidateDeposit, useRejectDeposit, useDeleteDeposit, getGetAdminDepositsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import { confirmAction } from '../../utils/confirm';

type Status = 'pending' | 'validated' | 'rejected';

export default function AdminDeposits() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('pending');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  
  const { data, isLoading } = useGetAdminDeposits({ status, page }, {
    query: { queryKey: getGetAdminDepositsQueryKey({ status, page }) }
  });

  const { mutate: validateDeposit, isPending: isValidating } = useValidateDeposit();
  const { mutate: rejectDeposit, isPending: isRejecting } = useRejectDeposit();
  const { mutate: deleteDeposit } = useDeleteDeposit();

  const { showError, showSuccess } = useToast();

  const handleDelete = (id: number) => {
    confirmAction('Supprimer le dépôt', 'Supprimer définitivement ce dépôt de l\'historique ?', () => {
      deleteDeposit({ id }, {
        onSuccess: () => {
          showSuccess('Supprimé', 'Le dépôt a été supprimé.');
          queryClient.invalidateQueries({ queryKey: getGetAdminDepositsQueryKey({ status, page }) });
        },
        onError: (err: any) => {
          showError('Erreur', err?.data?.error ?? 'Impossible de supprimer.');
        }
      });
    }, 'Supprimer');
  };

  const handleValidate = (id: number) => {
    confirmAction('Valider le dépôt', 'Confirmer la validation de ce dépôt ?', () => {
      validateDeposit({ id }, {
        onSuccess: () => {
          showSuccess('Validé', 'Le dépôt a été validé avec succès.');
          queryClient.invalidateQueries({ queryKey: getGetAdminDepositsQueryKey({ status, page }) });
        },
        onError: (err: any) => {
          showError('Erreur', err?.data?.error ?? 'Impossible de valider.');
        }
      });
    }, 'Valider');
  };

  const openReject = (id: number) => {
    setRejectId(id);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const confirmReject = () => {
    if (!rejectId || !rejectReason.trim()) {
      showError('Motif requis', 'Veuillez indiquer un motif de rejet.');
      return;
    }
    rejectDeposit({ id: rejectId, data: { reason: rejectReason } }, {
      onSuccess: () => {
        showSuccess('Rejeté', 'Le dépôt a été rejeté.');
        setRejectModalVisible(false);
        queryClient.invalidateQueries({ queryKey: getGetAdminDepositsQueryKey({ status, page }) });
      },
      onError: (err: any) => {
        showError('Erreur', err?.data?.error ?? 'Impossible de rejeter.');
      }
    });
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.amount, { color: colors.primary }]}>{item.amount.toLocaleString()} XOF</Text>
        <Text style={[styles.date, { color: colors.mutedForeground }]}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Utilisateur</Text>
          <Text style={[styles.detailValue, { color: colors.foreground }]}>{item.username}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Opérateur</Text>
          <Text style={[styles.detailValue, { color: colors.foreground, textTransform: 'uppercase' }]}>{item.operator}</Text>
        </View>
        {item.referenceId && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Référence</Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>{item.referenceId}</Text>
          </View>
        )}
        {item.oneXbetAccountId && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>ID compte 1xBet</Text>
            <Text style={[styles.detailValue, { color: colors.foreground, fontWeight: '700' }]}>{item.oneXbetAccountId}</Text>
          </View>
        )}
        {item.status === 'rejected' && item.reason && (
          <View style={[styles.detailRow, { marginTop: 4 }]}>
            <Text style={[styles.detailLabel, { color: colors.destructive }]}>Motif rejet</Text>
            <Text style={[styles.detailValue, { color: colors.destructive }]}>{item.reason}</Text>
          </View>
        )}
      </View>

      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        {item.screenshotUrl ? (
          <TouchableOpacity 
            style={[styles.actionBtn, { borderColor: colors.border, borderRightWidth: status === 'pending' ? 1 : 0 }]} 
            onPress={() => {
              const url = item.screenshotUrl.startsWith('/')
                ? `https://${process.env.EXPO_PUBLIC_DOMAIN}${item.screenshotUrl}`
                : item.screenshotUrl;
              Linking.openURL(url);
            }}
          >
            <Ionicons name="image" size={16} color={colors.info} />
            <Text style={[styles.actionText, { color: colors.info }]}>Reçu</Text>
          </TouchableOpacity>
        ) : null}
        {status === 'pending' && (
          <>
            <TouchableOpacity 
              style={[styles.actionBtn, { borderColor: colors.border }]} 
              onPress={() => handleValidate(item.id)}
            >
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={[styles.actionText, { color: colors.success }]}>Valider</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionBtn, { borderColor: colors.border, borderRightWidth: 0 }]} 
              onPress={() => openReject(item.id)}
            >
              <Ionicons name="close-circle" size={16} color={colors.destructive} />
              <Text style={[styles.actionText, { color: colors.destructive }]}>Rejeter</Text>
            </TouchableOpacity>
          </>
        )}
        {status !== 'pending' && (
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

  // Client-side filtering on username/reference
  const filteredDeposits = (data?.deposits ?? []).filter((d: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.username?.toLowerCase().includes(q) ||
      d.referenceId?.toLowerCase().includes(q) ||
      String(d.amount).includes(q)
    );
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.tabs, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(['pending', 'validated', 'rejected'] as Status[]).map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.tab, status === s && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => { setStatus(s); setPage(1); }}
          >
            <Text style={[styles.tabText, { color: status === s ? colors.primary : colors.mutedForeground }]}>
              {s === 'pending' ? 'En attente' : s === 'validated' ? 'Validés' : 'Rejetés'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Rechercher utilisateur, référence..."
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
          data={filteredDeposits}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={[styles.empty, { color: colors.mutedForeground }]}>Aucun dépôt trouvé.</Text>}
          ListFooterComponent={
            data && data.total > 0 ? (
              <View style={styles.pagination}>
                <TouchableOpacity disabled={page === 1} onPress={() => setPage(p => p - 1)} style={[styles.pageBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={{ color: page === 1 ? colors.mutedForeground : colors.foreground }}>Précédent</Text>
                </TouchableOpacity>
                <Text style={{ color: colors.mutedForeground }}>Page {page}</Text>
                <TouchableOpacity disabled={!data || data.deposits.length < 20} onPress={() => setPage(p => p + 1)} style={[styles.pageBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={{ color: (!data || data.deposits.length < 20) ? colors.mutedForeground : colors.foreground }}>Suivant</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      {/* Reject Modal */}
      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Motif du rejet</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Saisissez le motif..."
              placeholderTextColor={colors.mutedForeground}
              value={rejectReason}
              onChangeText={setRejectReason}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.muted }]} onPress={() => setRejectModalVisible(false)}>
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.destructive }]} onPress={confirmReject} disabled={isRejecting}>
                {isRejecting ? <ActivityIndicator color="#fff" /> : <Text style={[styles.modalBtnText, { color: '#fff' }]}>Rejeter</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, gap: 8, borderRightWidth: 1 },
  actionText: { fontSize: 13, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  pageBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { padding: 20, borderRadius: 16, borderWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  modalInput: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, minWidth: 100, alignItems: 'center' },
  modalBtnText: { fontWeight: '600', fontSize: 15 },
});