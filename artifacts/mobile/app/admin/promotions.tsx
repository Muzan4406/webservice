import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Modal, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useGetPromotions, useCreatePromotion, useUpdatePromotion, useDeletePromotion, getGetPromotionsQueryKey } from '@workspace/api-client-react';
import { confirmAction } from '../../utils/confirm';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import ImagePickerButton from '@/components/ImagePickerButton';

const PROMO_QUERY_KEY = getGetPromotionsQueryKey();

export default function AdminPromotions() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const { data, isLoading, isRefetching, refetch } = useGetPromotions({
    query: { queryKey: PROMO_QUERY_KEY, staleTime: 0 }
  });

  const { mutate: createPromo, isPending: isCreating } = useCreatePromotion();
  const { mutate: updatePromo, isPending: isUpdating } = useUpdatePromotion();
  const { mutate: deletePromo } = useDeletePromotion();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: '', content: '', imageUrl: '', isActive: true });

  const openCreate = () => {
    setEditingId(null);
    setForm({ title: '', content: '', imageUrl: '', isActive: true });
    setModalVisible(true);
  };

  const openEdit = (promo: any) => {
    setEditingId(promo.id);
    setForm({ title: promo.title, content: promo.content ?? '', imageUrl: promo.imageUrl || '', isActive: promo.isActive });
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      showError('Champ requis', 'Le titre est obligatoire.');
      return;
    }
    const payload = { ...form, imageUrl: form.imageUrl || undefined };

    if (editingId) {
      updatePromo({ id: editingId, data: payload }, {
        onSuccess: () => {
          setModalVisible(false);
          showSuccess('Mise à jour', 'La promotion a été modifiée.');
          queryClient.invalidateQueries({ queryKey: PROMO_QUERY_KEY });
        },
        onError: (err: any) => {
          const msg = err?.data?.error ?? err?.message ?? 'Erreur inconnue';
          showError('Échec de la mise à jour', msg);
        }
      });
    } else {
      createPromo({ data: payload }, {
        onSuccess: () => {
          setModalVisible(false);
          showSuccess('Promotion créée', 'La promotion a été ajoutée avec succès.');
          queryClient.invalidateQueries({ queryKey: PROMO_QUERY_KEY });
        },
        onError: (err: any) => {
          const msg = err?.data?.error ?? err?.message ?? 'Erreur inconnue';
          showError('Échec de la création', msg);
        }
      });
    }
  };

  const handleDelete = (id: number, title: string) => {
    confirmAction('Supprimer', `Supprimer "${title}" définitivement ?`, () => {
      deletePromo({ id }, {
        onSuccess: () => {
          showSuccess('Supprimée', 'La promotion a été supprimée.');
          queryClient.invalidateQueries({ queryKey: PROMO_QUERY_KEY });
        },
        onError: (err: any) => {
          const msg = err?.data?.error ?? err?.message ?? 'Erreur inconnue';
          showError('Échec de la suppression', msg);
        }
      });
    }, 'Supprimer');
  };

  const toggleActive = (item: any) => {
    updatePromo({ id: item.id, data: { ...item, isActive: !item.isActive } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: PROMO_QUERY_KEY }),
      onError: (err: any) => {
        const msg = err?.data?.error ?? err?.message ?? 'Erreur inconnue';
        showError('Erreur', msg);
      }
    });
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[
      styles.card,
      { backgroundColor: colors.card, borderColor: colors.border },
      !item.isActive && { opacity: 0.6 }
    ]}>
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          {!item.isActive && (
            <View style={[styles.inactiveBadge, { backgroundColor: colors.destructive + '20' }]}>
              <Text style={[styles.inactiveBadgeText, { color: colors.destructive }]}>Inactive</Text>
            </View>
          )}
          <Switch
            value={item.isActive}
            onValueChange={() => toggleActive(item)}
            trackColor={{ true: colors.primary }}
          />
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
            <Ionicons name="pencil" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.id, item.title)} style={styles.actionBtn}>
            <Ionicons name="trash" size={20} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.title}</Text>
      {item.content ? (
        <Text style={[styles.cardContent, { color: colors.mutedForeground }]} numberOfLines={2}>{item.content}</Text>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={openCreate}>
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={data?.promotions || []}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.mutedForeground }]}>
              Aucune promotion. Appuyez sur + pour en créer une.
            </Text>
          }
        />
      )}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
              <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>Fermer</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {editingId ? 'Modifier la promotion' : 'Nouvelle promotion'}
            </Text>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Titre *"
              placeholderTextColor={colors.mutedForeground}
              value={form.title}
              onChangeText={t => setForm({ ...form, title: t })}
            />
            <TextInput
              style={[styles.textarea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Description"
              placeholderTextColor={colors.mutedForeground}
              value={form.content}
              onChangeText={t => setForm({ ...form, content: t })}
              multiline
              textAlignVertical="top"
            />
            <ImagePickerButton
              label="Image de la promotion (optionnel)"
              value={form.imageUrl}
              onChange={url => setForm({ ...form, imageUrl: url })}
            />
            <View style={styles.switchRow}>
              <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '600' }}>Promotion active</Text>
              <Switch
                value={form.isActive}
                onValueChange={v => setForm({ ...form, isActive: v })}
                trackColor={{ true: colors.primary }}
              />
            </View>
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: (isCreating || isUpdating) ? 0.7 : 1 }]}
              onPress={handleSave}
              disabled={isCreating || isUpdating}
            >
              {isCreating || isUpdating
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitText}>Enregistrer</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { padding: 16, gap: 12, paddingBottom: 100 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inactiveBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  inactiveBadgeText: { fontSize: 11, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 6 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardContent: { fontSize: 13, lineHeight: 20 },
  empty: { textAlign: 'center', marginTop: 60, fontSize: 15 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5, zIndex: 10 },
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, paddingTop: 60, borderBottomWidth: 1 },
  closeBtn: { position: 'absolute', left: 16, top: 60, zIndex: 1 },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  modalContent: { padding: 16, gap: 12 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, outlineStyle: 'none' as any },
  textarea: { height: 100, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4 },
  submitBtn: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
