import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useGetCurrentContest, useGetContestLeaderboard, useCreateContest, useUpdateContest, getGetCurrentContestQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import DatePickerInput from '@/components/DatePickerInput';

export default function AdminContest() {
  const colors = useColors();
  const queryClient = useQueryClient();

  const { data: contest, isLoading: isContestLoading } = useGetCurrentContest({
    query: { queryKey: getGetCurrentContestQueryKey() }
  });
  const { data: leaderboard, isLoading: isLbLoading } = useGetContestLeaderboard();

  const { mutate: createContest, isPending: isCreating } = useCreateContest();
  const { mutate: updateContest, isPending: isUpdating } = useUpdateContest();

  const [form, setForm] = useState({ title: '', description: '', reward: '', startDate: '', endDate: '' });

  useEffect(() => {
    if (contest) {
      setForm({
        title: contest.title,
        description: contest.description,
        reward: contest.reward,
        startDate: contest.startDate.slice(0, 10),
        endDate: contest.endDate.slice(0, 10)
      });
    }
  }, [contest]);

  const handleSave = () => {
    if (!form.startDate || !form.endDate) {
      Alert.alert('Erreur', 'Veuillez sélectionner les dates de début et de fin.');
      return;
    }
    if (contest?.id) {
      updateContest({ id: contest.id, data: form }, {
        onSuccess: () => {
          Alert.alert('Succès', 'Concours mis à jour.');
          queryClient.invalidateQueries({ queryKey: getGetCurrentContestQueryKey() });
        }
      });
    } else {
      createContest({ data: form }, {
        onSuccess: () => {
          Alert.alert('Succès', 'Concours créé.');
          queryClient.invalidateQueries({ queryKey: getGetCurrentContestQueryKey() });
        }
      });
    }
  };

  if (isContestLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.root, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Configuration</Text>
        {contest?.isActive && (
          <View style={[styles.badge, { backgroundColor: colors.success + '20', borderColor: colors.success }]}>
            <Text style={[styles.badgeText, { color: colors.success }]}>ACTIF</Text>
          </View>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
          placeholder="Titre du concours"
          placeholderTextColor={colors.mutedForeground}
          value={form.title}
          onChangeText={t => setForm({ ...form, title: t })}
        />
        <TextInput
          style={[styles.textarea, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
          placeholder="Description"
          placeholderTextColor={colors.mutedForeground}
          value={form.description}
          onChangeText={t => setForm({ ...form, description: t })}
          multiline
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
          placeholder="Récompense (ex: 50.000 XOF)"
          placeholderTextColor={colors.mutedForeground}
          value={form.reward}
          onChangeText={t => setForm({ ...form, reward: t })}
        />

        <DatePickerInput
          label="Date de début"
          value={form.startDate}
          onChange={d => setForm({ ...form, startDate: d })}
        />
        <DatePickerInput
          label="Date de fin"
          value={form.endDate}
          onChange={d => setForm({ ...form, endDate: d })}
        />

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={isCreating || isUpdating}
        >
          {isCreating || isUpdating
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitText}>{contest ? 'Mettre à jour' : 'Créer le concours'}</Text>
          }
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.mutedForeground, marginTop: 24 }]}>Classement</Text>
      <View style={[styles.leaderboard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {isLbLoading ? (
          <ActivityIndicator color={colors.primary} style={{ margin: 20 }} />
        ) : !leaderboard?.entries || leaderboard.entries.length === 0 ? (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>Aucun participant.</Text>
        ) : (
          (leaderboard.entries as any[]).map((entry: any, idx: number) => (
            <View key={idx} style={[styles.lbRow, idx !== leaderboard.entries.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <View style={styles.lbLeft}>
                <Text style={[styles.lbRank, { color: entry.rank === 1 ? colors.warning : colors.mutedForeground }]}>#{entry.rank}</Text>
                <Text style={[styles.lbUser, { color: colors.foreground }]}>{entry.username}</Text>
              </View>
              <Text style={[styles.lbRefs, { color: colors.primary }]}>{entry.referralCount} pts</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginLeft: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, outlineStyle: 'none' as any },
  textarea: { height: 80, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, textAlignVertical: 'top' },
  submitBtn: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  leaderboard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  lbRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  lbLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lbRank: { fontSize: 14, fontWeight: '700', width: 30 },
  lbUser: { fontSize: 15, fontWeight: '600' },
  lbRefs: { fontSize: 15, fontWeight: '700' },
  empty: { textAlign: 'center', margin: 20, fontSize: 14 },
});
