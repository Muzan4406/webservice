import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Modal, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useGetAllCoupons, useCreateCoupon, useDeleteCoupon, getGetAllCouponsQueryKey, CouponType, CreateCouponRequestType } from '@workspace/api-client-react';
import { confirmAction } from '../../utils/confirm';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import ImagePickerButton from '@/components/ImagePickerButton';

export default function AdminCoupons() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const [type, setType] = useState<CouponType>('daily');
  const [modalVisible, setModalVisible] = useState(false);

  const queryKey = getGetAllCouponsQueryKey({ type });

  const { data, isLoading, isRefetching, refetch } = useGetAllCoupons({ type }, {
    query: { queryKey, staleTime: 0 }
  });

  const { mutate: createCoupon, isPending: isCreating } = useCreateCoupon();
  const { mutate: deleteCoupon } = useDeleteCoupon();

  const todayStr = () => new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ title: '', couponCode: '', odds: '', imageUrl: '', date: todayStr() });

  const handleCreate = () => {
    if (!form.title.trim()) {
      showError('Champ requis', 'Le titre est obligatoire.');
      return;
    }
    if (!form.date.trim()) {
      showError('Champ requis', 'La date est obligatoire (AAAA-MM-JJ).');
      return;
    }
    createCoupon({
      data: {
        type: type as CreateCouponRequestType,
        title: form.title.trim(),
        content: form.couponCode.trim() || undefined,
        date: new Date(form.date) as any,
        odds: form.odds ? parseFloat(form.odds) : undefined,
        imageUrl: form.imageUrl || undefined,
      } as any
    }, {
      onSuccess: () => {
        setModalVisible(false);
        setForm({ title: '', couponCode: '', odds: '', imageUrl: '', date: todayStr() });
        showSuccess('Coupon créé', 'Le coupon a été ajouté avec succès.');
        queryClient.invalidateQueries({ queryKey });
      },
      onError: (err: any) => {
        const msg = err?.data?.error ?? err?.message ?? 'Erreur inconnue';
        showError('Échec de la création', msg);
      }
    });
  };

  const handleDelete = (id: number) => {
    confirmAction('Supprimer', 'Supprimer ce coupon définitivement ?', () => {
      deleteCoupon({ id }, {
        onSuccess: () => {
          showSuccess('Supprimé', 'Le coupon a été supprimé.');
          queryClient.invalidateQueries({ queryKey });
        },
        onError: (err: any) => {
          const msg = err?.data?.error ?? err?.message ?? 'Erreur inconnue';
          showError('Échec de la suppression', msg);
        },
      });
    }, 'Supprimer');
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {item.imageUrl && (
        <Image
          source={{ uri: item.imageUrl.startsWith('/api') ? `https://${process.env.EXPO_PUBLIC_DOMAIN}${item.imageUrl}` : item.imageUrl }}
          style={styles.cardImage}
          resizeMode="cover"
        />
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={2}>{item.title}</Text>
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
            <Ionicons name="trash" size={20} color={colors.destructive} />
          </TouchableOpacity>
        </View>
        {item.content ? (
          <View style={[styles.codePill, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}>
            <Ionicons name="barcode-outline" size={14} color={colors.primary} />
            <Text style={[styles.codeText, { color: colors.primary }]}>{item.content}</Text>
          </View>
        ) : null}
        {item.odds ? (
          <View style={[styles.badge, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Text style={[styles.badgeText, { color: colors.foreground }]}>Cote: {item.odds}</Text>
          </View>
        ) : null}
        <Text style={[styles.cardDate, { color: colors.mutedForeground }]}>
          {item.date ?? ''}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.tabs, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(['daily', 'vip'] as CouponType[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, type === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setType(t)}
          >
            <Text style={[styles.tabText, { color: type === t ? colors.primary : colors.mutedForeground }]}>
              {t === 'daily' ? 'Coupons du jour' : 'Coupons VIP'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={data?.coupons || []}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.mutedForeground }]}>
              Aucun coupon trouvé. Appuyez sur + pour en créer un.
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
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Nouveau Coupon</Text>
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
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Code du coupon (ex: PSG vs OM)"
              placeholderTextColor={colors.mutedForeground}
              value={form.couponCode}
              onChangeText={t => setForm({ ...form, couponCode: t })}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Date (AAAA-MM-JJ) *"
              placeholderTextColor={colors.mutedForeground}
              value={form.date}
              onChangeText={t => setForm({ ...form, date: t })}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Cote totale (optionnel)"
              placeholderTextColor={colors.mutedForeground}
              value={form.odds}
              onChangeText={t => setForm({ ...form, odds: t })}
              keyboardType="numeric"
            />
            <ImagePickerButton
              label="Image du coupon (optionnel)"
              value={form.imageUrl}
              onChange={url => setForm({ ...form, imageUrl: url })}
            />
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: isCreating ? 0.7 : 1 }]}
              onPress={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Créer le coupon</Text>}
            </TouchableOpacity>
          </ScrollView>
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
  list: { padding: 16, gap: 12, paddingBottom: 100 },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  cardImage: { width: '100%', height: 160 },
  cardBody: { padding: 14, gap: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 12 },
  deleteBtn: { padding: 4 },
  codePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, alignSelf: 'flex-start' },
  codeText: { fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardDate: { fontSize: 11 },
  empty: { textAlign: 'center', marginTop: 60, fontSize: 15, lineHeight: 24 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5, zIndex: 10 },
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, paddingTop: 60, borderBottomWidth: 1 },
  closeBtn: { position: 'absolute', left: 16, top: 60, zIndex: 1 },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  modalContent: { padding: 16, gap: 12 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, outlineStyle: 'none' as any },
  submitBtn: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
