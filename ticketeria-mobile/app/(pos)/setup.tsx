import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { redeemPairingCode } from '../../src/lib/posDevice';
import { usePosSession } from '../../src/contexts/PosSessionProvider';

export default function Setup() {
  const router = useRouter();
  const { refreshPaired } = usePosSession();
  const [permission, requestPermission] = useCameraPermissions();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (value: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await redeemPairingCode(value.trim().toUpperCase());
      await refreshPaired();
      router.replace('/(pos)/pin');
    } catch {
      Alert.alert('Erro', 'Código inválido ou expirado');
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 16 }}>
        Parear este dispositivo
      </Text>
      {permission?.granted ? (
        <View style={{ height: 280, marginBottom: 16 }}>
          <CameraView
            style={{ flex: 1 }}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => submit(data)}
          />
        </View>
      ) : (
        <TouchableOpacity onPress={requestPermission}>
          <Text>Permitir câmera para escanear o QR</Text>
        </TouchableOpacity>
      )}
      <Text style={{ marginVertical: 8 }}>ou digite o código:</Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        maxLength={8}
        style={{ borderBottomWidth: 2, fontSize: 28, letterSpacing: 6, textAlign: 'center' }}
      />
      <TouchableOpacity
        disabled={code.length !== 8 || busy}
        onPress={() => submit(code)}
        style={{ marginTop: 24, backgroundColor: '#000', padding: 14, borderRadius: 8 }}
      >
        <Text style={{ color: '#fff', textAlign: 'center' }}>Parear</Text>
      </TouchableOpacity>
    </View>
  );
}
