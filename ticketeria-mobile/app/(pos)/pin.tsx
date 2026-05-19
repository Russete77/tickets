import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { operatorLogin } from '../../src/lib/posDevice';
import { usePosSession } from '../../src/contexts/PosSessionProvider';

export default function Pin() {
  const router = useRouter();
  const { setOperator } = usePosSession();
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const op = await operatorLogin(pin);
      setOperator(op);
      router.replace('/(pos)');
    } catch {
      Alert.alert('PIN inválido');
      setPin('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 20, marginBottom: 24 }}>PIN do operador</Text>
      <TextInput
        value={pin}
        onChangeText={setPin}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
        style={{ fontSize: 32, letterSpacing: 12, borderBottomWidth: 2, width: 200, textAlign: 'center' }}
      />
      <TouchableOpacity
        disabled={pin.length < 4 || busy}
        onPress={submit}
        style={{ marginTop: 24, backgroundColor: '#000', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 8 }}
      >
        <Text style={{ color: '#fff' }}>Entrar</Text>
      </TouchableOpacity>
    </View>
  );
}
