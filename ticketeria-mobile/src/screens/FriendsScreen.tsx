import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors } from '../styles/tokens';
import {
  requestFriendship,
  acceptFriendship,
  rejectFriendship,
  listFriendships,
  type Friendship,
} from '../lib/friendships';

export function FriendsScreen() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'accepted' | 'pending'>('accepted');
  const [addInput, setAddInput] = useState('');

  const friendsQ = useQuery({
    queryKey: ['friendships', tab],
    queryFn: () => listFriendships(tab),
  });

  const reqMut = useMutation({
    mutationFn: (addressee: string) => requestFriendship(addressee),
    onSuccess: () => {
      setAddInput('');
      Alert.alert('Solicitação enviada!');
      void qc.invalidateQueries({ queryKey: ['friendships'] });
    },
    onError: (e: Error) => Alert.alert('Erro', e.message),
  });

  const acceptMut = useMutation({
    mutationFn: (id: string) => acceptFriendship(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['friendships'] }),
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) => rejectFriendship(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['friendships'] }),
  });

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Amigos</Text>

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="Email do amigo"
          placeholderTextColor={Colors.textSecondary}
          value={addInput}
          onChangeText={setAddInput}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => addInput && reqMut.mutate(addInput)}
          disabled={reqMut.isPending}
        >
          <Text style={styles.addBtnText}>{reqMut.isPending ? '…' : 'Adicionar'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {(['accepted', 'pending'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'accepted' ? 'Amigos' : 'Pendentes'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {friendsQ.isLoading ? (
        <ActivityIndicator color={Colors.textPrimary} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={friendsQ.data ?? []}
          keyExtractor={(f) => f.id}
          renderItem={({ item }: { item: Friendship }) => (
            <View style={styles.row}>
              <Text style={styles.friendName}>{item.friend.name}</Text>
              <Text style={styles.friendEmail}>{item.friend.email}</Text>
              {tab === 'pending' && (
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptMut.mutate(item.id)}>
                    <Text style={styles.acceptBtnText}>Aceitar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectMut.mutate(item.id)}>
                    <Text style={styles.rejectBtnText}>Recusar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {tab === 'accepted' ? 'Você ainda não tem amigos no app.' : 'Sem pedidos pendentes.'}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.bg },
  header: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  addRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    color: Colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
  },
  addBtn: { backgroundColor: Colors.accent, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '700' },
  tabs: { flexDirection: 'row', marginBottom: 16 },
  tab: { flex: 1, padding: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: Colors.accent },
  tabText: { color: Colors.textSecondary, fontSize: 14 },
  tabTextActive: { color: Colors.textPrimary, fontWeight: '700' },
  row: { padding: 12, backgroundColor: Colors.surface, borderRadius: 8, marginBottom: 8 },
  friendName: { color: Colors.textPrimary, fontWeight: '600', fontSize: 16 },
  friendEmail: { color: Colors.textSecondary, fontSize: 13, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  acceptBtn: { backgroundColor: Colors.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  acceptBtnText: { color: '#fff', fontWeight: '600' },
  rejectBtn: { borderWidth: 1, borderColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  rejectBtnText: { color: '#ef4444', fontWeight: '600' },
  empty: { color: Colors.textSecondary, textAlign: 'center', marginTop: 32 },
});
