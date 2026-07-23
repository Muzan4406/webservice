import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useBroadcastNotification, useGetNotifications, useDeleteNotification, getGetNotificationsQueryKey } from '@workspace/api-client-react';
import { confirmAction } from '../../utils/confirm';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';

const NOTIF_QUERY_KEY = getGetNotificationsQueryKey();

export default function AdminNotifications() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const { data, isLoading, isRefetching, refetch } = useGetNotifications({
    query: { queryKey: NOTIF_QUERY_KEY, staleTime: 0 }
  });

  const { mutate: broadcast, isPending } = useBroadcastNotification();
  const { mutate: deleteNotif } = useDeleteNotification();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    if (!title.trim() || !message.trim()) {
      showError('Champs requis', 'Le titre et le message sont obligatoires.');
      return;
    }
    confirmAction(
      'Confirmer',
      'Envoyer cette notification à TOUS les utilisateurs ?',
      () => {
        broadcast({ data: { title: title.trim(), message: message.trim() } }, {
          onSuccess: () => {
            setTitle('');
            setMessage('');
            showSuccess('Notification envoyée', 'La notification a été diffusée à tous les utilisateurs.');
            queryClient.invalidateQueries({ queryKey: NOTIF_QUERY_KEY });
          },
          onError: (err: any) => {
            const msg = err?.data?.error ?? err?.message ?? 'Erreur inconnue';
            showError('Échec de l\'envoi', msg);
          }
        });
      },
      'Envoyer'
    );
  };

  const handleDelete = (id: number) => {
    confirmAction('Supprimer', 'Supprimer définitivement cette notification ?', () => {
      deleteNotif({ id }, {
        onSuccess: () => {
          showSuccess('Supprimée', 'La notification a été supprimée.');
          queryClient.invalidateQueries({ queryKey: NOTIF_QUERY_KEY });
        },
        onError: (err: any) => {
          const msg = err?.data?.error ?? err?.message ?? 'Erreur inconnue';
          showError('Échec de la suppression', msg);
        }
      });
    }, 'Supprimer');
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardRow}>
        <View style={styles.cardText}>
          <Text style={[styles.cardDate, { color: colors.mutedForeground }]}>
            {new Date(item.createdAt).toLocaleString('fr-FR')}
          </Text>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.title}</Text>
          <Text style={[styles.cardMessage, { color: colors.mutedForeground }]}>{item.message}</Text>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={20} color={colors.destructive} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <FlatList
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      data={data?.notifications || []}
      keyExtractor={item => item.id.toString()}
      renderItem={renderItem}
      refreshing={isRefetching}
      onRefresh={refetch}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Nouvelle Notification</Text>
          <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
              placeholder="Titre *"
              placeholderTextColor={colors.mutedForeground}
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={[styles.textarea, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
              placeholder="Message *"
              placeholderTextColor={colors.mutedForeground}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.destructive, opacity: isPending ? 0.7 : 1 }]}
              onPress={handleSubmit}
              disabled={isPending}
            >
              {isPending ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="send" size={16} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.submitText}>Envoyer à tous</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.historyHeader}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
              Historique ({data?.notifications?.length ?? 0})
            </Text>
          </View>
        </View>
      }
      ListEmptyComponent={
        isLoading
          ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          : <Text style={[styles.empty, { color: colors.mutedForeground }]}>Aucune notification envoyée.</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16 },
  header: { marginBottom: 8 },
  historyHeader: { marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: 12, marginLeft: 4 },
  form: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, outlineStyle: 'none' as any },
  textarea: { height: 100, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  submitBtn: { height: 48, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardText: { flex: 1, gap: 4 },
  cardDate: { fontSize: 11 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardMessage: { fontSize: 13, lineHeight: 20 },
  deleteBtn: { padding: 4, marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 20, fontSize: 14 },
});
