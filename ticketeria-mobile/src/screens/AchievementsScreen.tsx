import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors } from '../styles/tokens';
import { listAchievements, evaluateAchievements, type Achievement } from '../lib/achievements';

export function AchievementsScreen() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ['achievements'],
    queryFn: listAchievements,
  });

  const evalMut = useMutation({
    mutationFn: evaluateAchievements,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['achievements'] }),
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.textPrimary} />
      </View>
    );
  }

  const unlocked = data.filter((a) => a.unlockedAt).length;
  const total = data.length;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Conquistas</Text>
      <Text style={styles.subtitle}>{unlocked}/{total} desbloqueadas</Text>

      <TouchableOpacity style={styles.evalBtn} onPress={() => evalMut.mutate()} disabled={evalMut.isPending}>
        <Text style={styles.evalBtnText}>{evalMut.isPending ? 'Verificando…' : 'Verificar progresso'}</Text>
      </TouchableOpacity>

      <FlatList
        data={data}
        keyExtractor={(a) => a.key}
        renderItem={({ item }: { item: Achievement }) => (
          <View style={[styles.card, item.unlockedAt && styles.cardUnlocked]}>
            <View style={styles.row}>
              <Text style={[styles.name, !item.unlockedAt && styles.dim]}>{item.name}</Text>
              <Text style={styles.tier}>tier {item.tier}</Text>
            </View>
            <Text style={[styles.desc, !item.unlockedAt && styles.dim]}>{item.description}</Text>
            {item.unlockedAt ? (
              <Text style={styles.unlockedLabel}>Desbloqueada {new Date(item.unlockedAt).toLocaleDateString('pt-BR')}</Text>
            ) : (
              <Text style={styles.progressLabel}>Progresso: {item.progress}</Text>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { color: Colors.textSecondary, marginTop: 4, marginBottom: 16 },
  evalBtn: { backgroundColor: Colors.accent, padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  evalBtnText: { color: '#fff', fontWeight: '700' },
  card: { backgroundColor: Colors.surface, padding: 12, borderRadius: 8, marginBottom: 8, opacity: 0.6 },
  cardUnlocked: { opacity: 1, borderLeftWidth: 4, borderLeftColor: Colors.accent },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  name: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  tier: { color: Colors.textSecondary, fontSize: 12 },
  desc: { color: Colors.textPrimary, fontSize: 13, marginTop: 4 },
  unlockedLabel: { color: Colors.accent, fontSize: 12, marginTop: 6, fontWeight: '600' },
  progressLabel: { color: Colors.textSecondary, fontSize: 12, marginTop: 6 },
  dim: { opacity: 0.7 },
});
