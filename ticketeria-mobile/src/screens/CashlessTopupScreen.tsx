/**
 * CashlessTopupScreen — operador gera Pix de recarga.
 *
 * Fluxo:
 *   1. Operador escolhe valor (presets + custom)
 *   2. Scaneia wallet do participante
 *   3. POST /cashless/wallet/:id/topup → recebe Pix QR
 *   4. Mostra QR pro participante pagar
 *   5. Polling do status (ou push do webhook)
 *
 * Auditoria CTO 2026-05 — gap 4.4
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation, formatCurrency } from '../i18n';

interface WalletInfo {
  id: string;
  walletCode: string;
  balanceCents: number;
  userName: string;
}

interface TopupResult {
  paymentId: string;
  method: 'pix' | 'credit_card';
  pixQrCode?: string;
  pixCopyPaste?: string;
  expiresAt: string;
}

const PRESETS = [5000, 10000, 20000, 50000, 100000]; // R$ 50, 100, 200, 500, 1000

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3333/api';

async function api<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE}/v1${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { success: boolean; data: T };
  return json.data;
}

interface Props {
  operatorJwt: string;
}

export function CashlessTopupScreen({ operatorJwt }: Props) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [showScanner, setShowScanner] = useState(false);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [amountCents, setAmountCents] = useState(10000);
  const [customAmount, setCustomAmount] = useState('');
  const [topup, setTopup] = useState<TopupResult | null>(null);

  const lookupMut = useMutation({
    mutationFn: (code: string) =>
      api<WalletInfo>(`/cashless/wallet/by-code/${code}`, {}, operatorJwt),
    onSuccess: (data) => {
      setWallet(data);
      setShowScanner(false);
    },
    onError: (err: Error) => Alert.alert('Wallet não encontrada', err.message),
  });

  const topupMut = useMutation({
    mutationFn: () => {
      if (!wallet) throw new Error('Wallet não scaneada');
      return api<TopupResult>(
        `/cashless/wallet/${wallet.id}/topup`,
        {
          method: 'POST',
          headers: { 'X-Idempotency-Key': `topup-${Date.now()}` },
          body: JSON.stringify({ amountCents, paymentMethod: 'pix' }),
        },
        operatorJwt,
      );
    },
    onSuccess: (data) => setTopup(data),
    onError: (err: Error) => Alert.alert('Falha ao gerar recarga', err.message),
  });

  // Polling do status do pagamento (fallback caso webhook demore)
  const { data: pollStatus } = useQuery({
    queryKey: ['topup-status', topup?.paymentId, wallet?.id],
    queryFn: () =>
      api<{ status: string; balanceCents: number }>(
        `/cashless/wallet/${wallet!.id}`,
        {},
        operatorJwt,
      ),
    enabled: !!topup && !!wallet,
    refetchInterval: 3000,
  });

  // Detecta confirmação do Pix via mudança de saldo
  useEffect(() => {
    if (
      topup &&
      pollStatus &&
      wallet &&
      pollStatus.balanceCents > wallet.balanceCents
    ) {
      Alert.alert('✓ Recarga confirmada!', `Novo saldo: ${formatCurrency(pollStatus.balanceCents)}`);
      setTopup(null);
      setWallet({ ...wallet, balanceCents: pollStatus.balanceCents });
    }
  }, [pollStatus, topup, wallet]);

  // ==================== TELA: Scanner ====================
  if (showScanner) {
    if (!permission?.granted) {
      requestPermission();
      return (
        <View style={styles.center}>
          <Text>{t('common.loading')}</Text>
        </View>
      );
    }
    return (
      <View style={{ flex: 1 }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => {
            if (!lookupMut.isPending) lookupMut.mutate(data);
          }}
        />
        <TouchableOpacity style={styles.cancelOverlay} onPress={() => setShowScanner(false)}>
          <Text style={styles.btnText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ==================== TELA: Pix QR pronto ====================
  if (topup && topup.pixQrCode) {
    return (
      <ScrollView contentContainerStyle={styles.center}>
        <Text style={styles.title}>{t('wallet.topUp')}</Text>
        <Text style={styles.amount}>{formatCurrency(amountCents)}</Text>
        <Text style={styles.label}>Mostre este QR pro participante pagar</Text>

        <View style={{ padding: 16, backgroundColor: '#fff' }}>
          <QRCode value={topup.pixQrCode} size={240} />
        </View>

        <Text style={styles.copyLabel}>Pix copia-e-cola:</Text>
        <Text selectable style={styles.copyValue}>
          {topup.pixCopyPaste?.slice(0, 60)}…
        </Text>

        <ActivityIndicator size="small" color="#888" style={{ marginTop: 16 }} />
        <Text style={{ color: '#888', marginTop: 4 }}>Aguardando confirmação…</Text>

        <TouchableOpacity style={styles.btnSecondary} onPress={() => setTopup(null)}>
          <Text>{t('common.cancel')}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ==================== TELA: PDV de topup ====================
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>{t('wallet.topUp')}</Text>

      {wallet ? (
        <View style={styles.walletBanner}>
          <Text style={{ fontWeight: 'bold' }}>{wallet.userName}</Text>
          <Text>{t('wallet.balance')}: {formatCurrency(wallet.balanceCents)}</Text>
          <TouchableOpacity onPress={() => setWallet(null)}>
            <Text style={{ color: '#FF3366', fontSize: 12 }}>trocar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.scanBanner} onPress={() => setShowScanner(true)}>
          <Text style={styles.scanText}>📷 {t('checkin.scan')} pulseira</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.label}>Valor</Text>
      <View style={styles.presets}>
        {PRESETS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.preset, amountCents === p && styles.presetActive]}
            onPress={() => {
              setAmountCents(p);
              setCustomAmount('');
            }}
          >
            <Text style={amountCents === p ? styles.presetTextActive : styles.presetText}>
              {formatCurrency(p)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Ou digite o valor</Text>
      <TextInput
        keyboardType="number-pad"
        value={customAmount}
        onChangeText={(v) => {
          setCustomAmount(v);
          const cents = Math.max(0, parseInt(v.replace(/\D/g, ''), 10) || 0) * 100;
          if (cents > 0) setAmountCents(cents);
        }}
        placeholder="100"
        style={styles.amountInput}
      />

      <Text style={styles.summary}>
        Total a recarregar: <Text style={{ fontWeight: 'bold' }}>{formatCurrency(amountCents)}</Text>
      </Text>

      <TouchableOpacity
        style={[styles.btnPrimary, (!wallet || amountCents <= 0) && styles.btnDisabled]}
        disabled={!wallet || amountCents <= 0 || topupMut.isPending}
        onPress={() => topupMut.mutate()}
      >
        {topupMut.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Gerar QR Pix</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  label: { fontSize: 14, color: '#666', marginVertical: 12 },
  amount: { fontSize: 36, fontWeight: 'bold', marginVertical: 16 },
  amountInput: {
    fontSize: 24,
    borderBottomWidth: 2,
    borderColor: '#000',
    paddingVertical: 8,
  },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  presetActive: { backgroundColor: '#000', borderColor: '#000' },
  presetText: { color: '#000' },
  presetTextActive: { color: '#fff', fontWeight: 'bold' },
  walletBanner: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  scanBanner: {
    backgroundColor: '#FF3366',
    padding: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  scanText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  summary: { marginVertical: 16, fontSize: 16 },
  btnPrimary: {
    backgroundColor: '#FF3366',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnSecondary: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  btnDisabled: { backgroundColor: '#ccc' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  copyLabel: { marginTop: 16, fontSize: 12, color: '#666' },
  copyValue: { fontFamily: 'monospace', fontSize: 12, marginTop: 4 },
  cancelOverlay: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
});
