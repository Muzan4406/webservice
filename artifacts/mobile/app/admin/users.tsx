import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useGetAdminUsers, useUpdateAdminUser, useDeleteAdminUser, useResetAdminUserPassword, getGetAdminUsersQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { confirmAction } from '../../utils/confirm';

const WHITE = '#FFFFFF';
const MUTED = 'rgba(255,255,255,0.5)';
const BORDER = 'rgba(255,255,255,0.12)';

export default function AdminUsers() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Password reset modal state
  const [resetModal, setResetModal] = useState<{ id: number; username: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { data, isLoading } = useGetAdminUsers({ page, limit: 20, search }, {
    query: { queryKey: getGetAdminUsersQueryKey({ page, limit: 20, search }) }
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });

  const { mutate: updateUser } = useUpdateAdminUser();
  const { mutate: deleteUser } = useDeleteAdminUser();
  const { mutate: resetPassword, isPending: isResetting } = useResetAdminUserPassword();
  const { showError, showSuccess } = useToast();

  const handleUpdate = (id: number, payload: { isVip?: boolean; isBanned?: boolean; isAdmin?: boolean }) => {
    updateUser({ id, data: payload }, {
      onSuccess: () => { showSuccess('Mis à jour', 'Modification enregistrée.'); invalidate(); },
      onError: (err: any) => showError('Erreur', err?.data?.error ?? err?.message ?? 'Opération échouée.'),
    });
  };

  const handleAdminToggle = (id: number, isAdmin: boolean, username: string) => {
    if (isAdmin && id === currentUser?.id) {
      showError('Action impossible', 'Vous ne pouvez pas retirer vos propres droits admin.');
      return;
    }
    confirmAction(
      isAdmin ? 'Retirer Admin' : 'Nommer Admin',
      isAdmin ? `Retirer les droits admin de "${username}" ?` : `Donner les droits admin à "${username}" ?`,
      () => handleUpdate(id, { isAdmin: !isAdmin }),
      'Confirmer'
    );
  };

  const handleDelete = (id: number, username: string) => {
    if (id === currentUser?.id) {
      showError('Action impossible', 'Vous ne pouvez pas supprimer votre propre compte.');
      return;
    }
    confirmAction('Supprimer le compte', `Supprimer définitivement "${username}" ?`, () => {
      deleteUser({ id }, {
        onSuccess: () => { showSuccess('Supprimé', `${username} a été supprimé.`); invalidate(); },
        onError: (err: any) => showError('Erreur', err?.data?.error ?? err?.message ?? 'Suppression échouée.'),
      });
    }, 'Supprimer');
  };

  const handleOpenResetModal = (id: number, username: string) => {
    setNewPassword('');
    setShowPassword(false);
    setResetModal({ id, username });
  };

  const handleResetPassword = () => {
    if (!resetModal) return;
    if (newPassword.length < 6) {
      showError('Mot de passe trop court', 'Le mot de passe doit faire au moins 6 caractères.');
      return;
    }
    resetPassword(
      { id: resetModal.id, data: { newPassword } },
      {
        onSuccess: () => {
          showSuccess('Mot de passe changé', `Le mot de passe de ${resetModal.username} a été mis à jour.`);
          setResetModal(null);
        },
        onError: (err: any) => showError('Erreur', err?.data?.error ?? err?.message ?? 'Opération échouée.'),
      }
    );
  };

  const confirm = (title: string, msg: string, onConfirm: () => void) => {
    confirmAction(title, msg, onConfirm, 'Confirmer');
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.userInfo}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.username, { color: colors.foreground }]}>{item.username}</Text>
          <Text style={[styles.userPhone, { color: colors.mutedForeground }]}>{item.phone ?? '—'}</Text>
          <Text style={[styles.userId, { color: colors.primary }]}>{item.userId}</Text>
        </View>
        <View style={styles.badges}>
          {item.isAdmin && (
            <View style={[styles.badge, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
              <Text style={[styles.badgeText, { color: colors.primary }]}>ADMIN</Text>
            </View>
          )}
          {item.isVip && (
            <View style={[styles.badge, { backgroundColor: colors.vipGoldBg, borderColor: colors.warning }]}>
              <Text style={[styles.badgeText, { color: colors.warning }]}>VIP</Text>
            </View>
          )}
          {item.isBanned && (
            <View style={[styles.badge, { backgroundColor: colors.destructive + '20', borderColor: colors.destructive }]}>
              <Text style={[styles.badgeText, { color: colors.destructive }]}>BANNI</Text>
            </View>
          )}
          <View style={[styles.badge, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>{item.referralCount} Filleuls</Text>
          </View>
        </View>
      </View>

      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: colors.border }]}
          onPress={() => confirm(
            item.isVip ? 'Retirer VIP' : 'Passer VIP',
            item.isVip ? `Retirer le statut VIP de ${item.username} ?` : `Passer ${item.username} en VIP ?`,
            () => handleUpdate(item.id, { isVip: !item.isVip })
          )}
        >
          <Ionicons name="star" size={14} color={item.isVip ? colors.mutedForeground : colors.warning} />
          <Text style={[styles.actionText, { color: colors.foreground }]}>{item.isVip ? 'Retirer VIP' : 'Passer VIP'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: colors.border }]}
          onPress={() => handleAdminToggle(item.id, !!item.isAdmin, item.username)}
        >
          <Ionicons name="shield-checkmark" size={14} color={item.isAdmin ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.actionText, { color: item.isAdmin ? colors.primary : colors.foreground }]}>{item.isAdmin ? 'Retirer Admin' : 'Nommer Admin'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: colors.border }]}
          onPress={() => handleOpenResetModal(item.id, item.username)}
        >
          <Ionicons name="key-outline" size={14} color={colors.warning} />
          <Text style={[styles.actionText, { color: colors.warning }]}>MDP</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: colors.border, borderRightWidth: 0 }]}
          onPress={() => handleDelete(item.id, item.username)}
        >
          <Ionicons name="trash" size={14} color={colors.destructive} />
          <Text style={[styles.actionText, { color: colors.destructive }]}>Supprimer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Rechercher nom, téléphone ou ID..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={(t) => { setSearch(t); setPage(1); }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={data?.users || []}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={[styles.empty, { color: colors.mutedForeground }]}>Aucun utilisateur trouvé.</Text>}
          ListFooterComponent={
            data && data.total > 0 ? (
              <View style={styles.pagination}>
                <TouchableOpacity disabled={page === 1} onPress={() => setPage(p => p - 1)} style={[styles.pageBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={{ color: page === 1 ? colors.mutedForeground : colors.foreground }}>Précédent</Text>
                </TouchableOpacity>
                <Text style={{ color: colors.mutedForeground }}>Page {page}</Text>
                <TouchableOpacity disabled={!data || data.users.length < 20} onPress={() => setPage(p => p + 1)} style={[styles.pageBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={{ color: (!data || data.users.length < 20) ? colors.mutedForeground : colors.foreground }}>Suivant</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      {/* ── Modal réinitialisation mot de passe ────────────────── */}
      <Modal
        visible={!!resetModal}
        transparent
        animationType="slide"
        onRequestClose={() => setResetModal(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setResetModal(null)}
        >
          <TouchableOpacity activeOpacity={1} style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Réinitialiser le mot de passe</Text>
                {resetModal && (
                  <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>{resetModal.username}</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setResetModal(null)}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={[styles.pwInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.mutedForeground} style={{ marginRight: 10 }} />
                <TextInput
                  style={[styles.pwInputText, { color: colors.foreground }]}
                  placeholder="Nouveau mot de passe (min. 6 car.)"
                  placeholderTextColor={colors.mutedForeground}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(v => !v)}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.warning }, isResetting && { opacity: 0.6 }]}
                onPress={handleResetPassword}
                disabled={isResetting}
                activeOpacity={0.85}
              >
                {isResetting ? (
                  <ActivityIndicator color={WHITE} />
                ) : (
                  <>
                    <Ionicons name="key" size={18} color={WHITE} />
                    <Text style={styles.confirmBtnText}>Confirmer le changement</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchContainer: { padding: 16, paddingBottom: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 48, borderRadius: 12, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, fontSize: 15 },
  list: { padding: 16, gap: 12 },
  userCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  userInfo: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  username: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  userPhone: { fontSize: 13, marginBottom: 4 },
  userId: { fontSize: 12, fontWeight: '600' },
  badges: { alignItems: 'flex-end', gap: 6 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  actions: { flexDirection: 'row', borderTopWidth: 1 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 11, gap: 6, borderRightWidth: 1 },
  actionText: { fontSize: 11, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  pageBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  modalBody: {
    padding: 20,
    gap: 16,
  },
  pwInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
  },
  pwInputText: {
    flex: 1,
    fontSize: 15,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    height: 56,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: WHITE,
  },
});
