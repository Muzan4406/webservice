import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { router } from 'expo-router';
import { useGetAdminStats, useResetCounters, getGetAdminStatsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import { confirmAction } from '../../utils/confirm';

const MENU_ITEMS = [
  { id: 'users',         label: 'Utilisateurs',  icon: 'people',           color: '#2F55F0' },
  { id: 'deposits',      label: 'Dépôts',         icon: 'arrow-down-circle',color: '#D89B1E' },
  { id: 'withdrawals',   label: 'Retraits',        icon: 'arrow-up-circle',  color: '#E11D48' },
  { id: 'contest',       label: 'Concours',        icon: 'trophy',           color: '#D89B1E' },
  { id: 'coupons',       label: 'Coupons',         icon: 'ticket',           color: '#16A34A' },
  { id: 'promotions',    label: 'Promotions',      icon: 'megaphone',        color: '#2F55F0' },
  { id: 'notifications', label: 'Notifications',   icon: 'notifications',    color: '#2F55F0' },
  { id: 'config',        label: 'Configuration',   icon: 'settings',         color: '#6B7280' },
];

export default function AdminDashboard() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const { data: stats, isLoading } = useGetAdminStats();
  const { mutate: resetCounters, isPending: isResetting } = useResetCounters();

  const handleReset = () => {
    confirmAction(
      'Réinitialiser les compteurs',
      'Cette action supprime définitivement TOUS les dépôts et retraits enregistrés. Les statistiques seront remises à zéro. Continuer ?',
      () => {
        resetCounters(undefined, {
          onSuccess: (data: any) => {
            showSuccess(
              'Compteurs réinitialisés',
              `${data.deletedDeposits} dépôt(s) et ${data.deletedWithdrawals} retrait(s) supprimés.`
            );
            queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
          },
          onError: (err: any) => {
            showError('Erreur', err?.data?.error ?? 'Réinitialisation échouée.');
          },
        });
      },
      'Réinitialiser'
    );
  };

  return (
    <ScrollView style={[styles.root, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Vue d'ensemble</Text>

      {isLoading || !stats ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.statHeader}>
              <Text style={[styles.statTitle, { color: colors.mutedForeground }]}>Utilisateurs</Text>
              <Ionicons name="people" size={16} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{stats.totalUsers}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.statHeader}>
              <Text style={[styles.statTitle, { color: colors.mutedForeground }]}>VIP</Text>
              <Ionicons name="star" size={16} color={colors.warning} />
            </View>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{stats.vipUsers}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.statHeader}>
              <Text style={[styles.statTitle, { color: colors.mutedForeground }]}>Dépôts (XOF)</Text>
              <Ionicons name="arrow-down" size={16} color={colors.success} />
            </View>
            <Text style={[styles.statValue, { color: colors.success }]}>{stats.totalDepositAmount?.toLocaleString() || 0}</Text>
            <Text style={[styles.statSub, { color: colors.mutedForeground }]}>{stats.pendingDeposits} en attente</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.statHeader}>
              <Text style={[styles.statTitle, { color: colors.mutedForeground }]}>Retraits (XOF)</Text>
              <Ionicons name="arrow-up" size={16} color={colors.destructive} />
            </View>
            <Text style={[styles.statValue, { color: colors.destructive }]}>{stats.totalWithdrawalAmount?.toLocaleString() || 0}</Text>
            <Text style={[styles.statSub, { color: colors.mutedForeground }]}>{stats.pendingWithdrawals} en attente</Text>
          </View>
        </View>
      )}

      {/* Bouton reset */}
      <TouchableOpacity
        style={[styles.resetBtn, { borderColor: colors.destructive + '60', backgroundColor: colors.destructive + '10' }]}
        onPress={handleReset}
        disabled={isResetting}
        activeOpacity={0.75}
      >
        {isResetting ? (
          <ActivityIndicator size="small" color={colors.destructive} />
        ) : (
          <Ionicons name="refresh-circle-outline" size={20} color={colors.destructive} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.resetBtnLabel, { color: colors.destructive }]}>Réinitialiser les compteurs</Text>
          <Text style={[styles.resetBtnSub, { color: colors.destructive, opacity: 0.7 }]}>Supprime tous les dépôts et retraits</Text>
        </View>
        <Ionicons name="warning-outline" size={16} color={colors.destructive} />
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, { color: colors.mutedForeground, marginTop: 24 }]}>Gestion</Text>
      <View style={[styles.menuGrid, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {MENU_ITEMS.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.menuItem,
              index !== MENU_ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }
            ]}
            onPress={() => router.push(`/admin/${item.id}` as any)}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
              <Ionicons name={item.icon as any} size={20} color={item.color} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: 12, marginLeft: 4 },
  loading: { height: 100, justifyContent: 'center', alignItems: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: '48%', padding: 16, borderRadius: 16, borderWidth: 1 },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statTitle: { fontSize: 12, fontWeight: '500' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statSub: { fontSize: 10, marginTop: 4, fontWeight: '500' },
  menuGrid: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 16 },
  menuIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  resetBtnLabel: { fontSize: 15, fontWeight: '700' },
  resetBtnSub: { fontSize: 12, marginTop: 2 },
});
