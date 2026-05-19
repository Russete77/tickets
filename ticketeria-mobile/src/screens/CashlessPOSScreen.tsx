/**
 * CashlessPOSScreen — tela do operador de bar.
 *
 * Fluxo:
 *   1. Operador se loga com PIN do POSOperator
 *   2. Scaneia QR/NFC da pulseira do participante (CashlessWallet.walletCode ou nfcTagId)
 *   3. Adiciona produtos do POSProduct
 *   4. Confirma charge — POST /cashless/charge
 *   5. Mostra recibo (saldo restante)
 *
 * Modo offline (futuro): cache em expo-sqlite, sync quando reconecta.
 *
 * Auditoria CTO 2026-05 — gap 4.4
 */
import React, { useState, useEffect } from 'react';
import { joinPos, onCatalogUpdated, getSocket } from '../lib/socket';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation, formatCurrency } from '../i18n';
import { authenticate } from '../lib/biometrics';

/** Acima deste valor, exige confirmação biométrica do operador */
const BIOMETRIC_CHARGE_THRESHOLD_CENTS = 5000;

interface POSProduct {
  id: string;
  name: string;
  category: string;
  priceCents: number;
  imageUrl?: string;
  isAvailable: boolean;
  stockQty?: number;
}

interface WalletInfo {
  id: string;
  walletCode: string;
  balanceCents: number;
  status: string;
  userName: string;
}

interface CartItem {
  product: POSProduct;
  qty: number;
}

interface ChargeResult {
  transactionId: string;
  amountCents: number;
  tipCents: number;
  newBalance: number;
  timestamp: string;
}

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
  posId: string;
  operatorJwt: string;
}

export function CashlessPOSScreen({ posId, operatorJwt }: Props) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [pin, setPin] = useState('');
  const [pinValidated, setPinValidated] = useState(false);
  const [scannedWallet, setScannedWallet] = useState<WalletInfo | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tipCents, setTipCents] = useState(0);
  const [showScanner, setShowScanner] = useState(false);
  const [lastResult, setLastResult] = useState<ChargeResult | null>(null);

  // Carrega catálogo de produtos do POS
  const { data: products = [], refetch: refetchProducts } = useQuery({
    queryKey: ['pos-products', posId],
    queryFn: () => api<POSProduct[]>(`/cashless/pos/${posId}/products`, {}, operatorJwt),
    enabled: pinValidated,
  });

  // Sub-projeto 1 (cashless admin): sync de catálogo via Socket.IO + polling fallback de 5min
  useEffect(() => {
    if (!pinValidated || !posId) return;
    let cleanup: (() => void) | undefined;
    let pollInterval: ReturnType<typeof setInterval> | undefined;

    const setup = async () => {
      await joinPos(posId);
      cleanup = await onCatalogUpdated(() => { refetchProducts(); });
      pollInterval = setInterval(async () => {
        const s = await getSocket();
        if (!s.connected) refetchProducts();
      }, 5 * 60 * 1000);
    };
    void setup();

    return () => {
      cleanup?.();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [pinValidated, posId, refetchProducts]);

  // Valida PIN do operador
  const validatePinMut = useMutation({
    mutationFn: () =>
      api<{ valid: boolean }>(
        `/cashless/pos/${posId}/operator/login`,
        { method: 'POST', body: JSON.stringify({ pin }) },
        operatorJwt,
      ),
    onSuccess: (data) => {
      if (data.valid) setPinValidated(true);
      else Alert.alert('PIN inválido');
    },
    onError: () => Alert.alert('Erro ao validar PIN'),
  });

  // Busca wallet pelo código scaneado
  const lookupWalletMut = useMutation({
    mutationFn: (walletCode: string) =>
      api<WalletInfo>(`/cashless/wallet/by-code/${walletCode}`, {}, operatorJwt),
    onSuccess: (data) => {
      setScannedWallet(data);
      setShowScanner(false);
    },
    onError: (err: Error) => Alert.alert('Wallet não encontrada', err.message),
  });

  // Efetiva charge
  const chargeMut = useMutation({
    mutationFn: () => {
      if (!scannedWallet) throw new Error('Wallet não scaneada');
      const items = cart.map((c) => ({
        productId: c.product.id,
        name: c.product.name,
        qty: c.qty,
        priceCents: c.product.priceCents,
      }));
      const amountCents = cart.reduce((sum, c) => sum + c.product.priceCents * c.qty, 0);
      return api<ChargeResult>(
        `/cashless/wallet/${scannedWallet.id}/charge`,
        {
          method: 'POST',
          headers: { 'X-Idempotency-Key': `${Date.now()}-${Math.random()}` },
          body: JSON.stringify({ amountCents, items, tipCents, posId }),
        },
        operatorJwt,
      );
    },
    onSuccess: (data) => {
      setLastResult(data);
      setCart([]);
      setTipCents(0);
      setScannedWallet(null);
    },
    onError: (err: Error) => Alert.alert('Falha na cobrança', err.message),
  });

  const cartTotal = cart.reduce((sum, c) => sum + c.product.priceCents * c.qty, 0);
  const grandTotal = cartTotal + tipCents;
  const balanceAfter = scannedWallet ? scannedWallet.balanceCents - grandTotal : 0;
  const insufficientFunds = balanceAfter < 0;

  const handleConfirmCharge = async () => {
    if (grandTotal > BIOMETRIC_CHARGE_THRESHOLD_CENTS) {
      const ok = await authenticate(
        `Confirme a cobrança de ${formatCurrency(grandTotal)}`,
      );
      if (!ok) {
        Alert.alert('Cancelado', 'Confirmação biométrica não concluída');
        return;
      }
    }
    chargeMut.mutate();
  };

  // ==================== TELA 1: PIN ====================
  if (!pinValidated) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>POS · {t('checkin.scan')}</Text>
        <Text style={styles.label}>PIN do operador</Text>
        <TextInput
          value={pin}
          onChangeText={setPin}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          style={styles.pinInput}
        />
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => validatePinMut.mutate()}
          disabled={pin.length < 4}
        >
          <Text style={styles.btnText}>
            {validatePinMut.isPending ? '...' : t('common.confirm')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ==================== TELA 2: SCANNER ====================
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
            if (!lookupWalletMut.isPending) {
              lookupWalletMut.mutate(data);
            }
          }}
        />
        <TouchableOpacity style={styles.cancelOverlay} onPress={() => setShowScanner(false)}>
          <Text style={styles.btnText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ==================== TELA 3: RECIBO PÓS-CHARGE ====================
  if (lastResult) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>✓ Cobrado</Text>
        <Text style={styles.amount}>{formatCurrency(lastResult.amountCents + lastResult.tipCents)}</Text>
        <Text style={styles.label}>Saldo restante</Text>
        <Text style={styles.balance}>{formatCurrency(lastResult.newBalance)}</Text>
        <Text style={styles.tx}>tx: {lastResult.transactionId.slice(0, 8)}…</Text>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => setLastResult(null)}>
          <Text style={styles.btnText}>Próxima venda</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ==================== TELA 4: PDV (catálogo + carrinho) ====================
  return (
    <View style={{ flex: 1, backgroundColor: '#fafafa' }}>
      {/* Header com wallet */}
      {scannedWallet ? (
        <View style={[styles.header, insufficientFunds && styles.headerError]}>
          <Text style={styles.headerName}>{scannedWallet.userName}</Text>
          <Text style={styles.headerBalance}>
            {t('wallet.balance')}: {formatCurrency(scannedWallet.balanceCents)}
          </Text>
          {insufficientFunds && <Text style={styles.headerError}>SALDO INSUFICIENTE</Text>}
          <TouchableOpacity onPress={() => setScannedWallet(null)}>
            <Text style={{ color: '#fff', fontSize: 12 }}>trocar wallet</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.scanBanner} onPress={() => setShowScanner(true)}>
          <Text style={styles.scanText}>📷 {t('checkin.scan')} pulseira</Text>
        </TouchableOpacity>
      )}

      {/* Catálogo */}
      <FlatList
        data={products.filter((p) => p.isAvailable)}
        keyExtractor={(p) => p.id}
        numColumns={2}
        contentContainerStyle={{ padding: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.productCard}
            onPress={() => {
              setCart((prev) => {
                const existing = prev.find((c) => c.product.id === item.id);
                if (existing) {
                  return prev.map((c) =>
                    c.product.id === item.id ? { ...c, qty: c.qty + 1 } : c,
                  );
                }
                return [...prev, { product: item, qty: 1 }];
              });
            }}
          >
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productCat}>{item.category}</Text>
            <Text style={styles.productPrice}>{formatCurrency(item.priceCents)}</Text>
            {item.stockQty !== undefined && item.stockQty < 10 && (
              <Text style={styles.stockLow}>estoque: {item.stockQty}</Text>
            )}
          </TouchableOpacity>
        )}
      />

      {/* Carrinho */}
      {cart.length > 0 && (
        <View style={styles.cart}>
          {cart.map((c) => (
            <View key={c.product.id} style={styles.cartRow}>
              <Text style={{ flex: 1 }}>{c.qty}× {c.product.name}</Text>
              <Text>{formatCurrency(c.product.priceCents * c.qty)}</Text>
              <TouchableOpacity
                onPress={() =>
                  setCart((prev) =>
                    prev
                      .map((p) =>
                        p.product.id === c.product.id ? { ...p, qty: p.qty - 1 } : p,
                      )
                      .filter((p) => p.qty > 0),
                  )
                }
              >
                <Text style={{ marginLeft: 12, color: 'crimson' }}>−</Text>
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.cartTotal}>
            <Text style={{ fontWeight: 'bold' }}>Subtotal</Text>
            <Text style={{ fontWeight: 'bold' }}>{formatCurrency(cartTotal)}</Text>
          </View>

          {/* Gorjeta */}
          <View style={styles.tipRow}>
            <Text style={{ fontSize: 12 }}>Gorjeta:</Text>
            {[0, 10, 15, 20].map((pct) => (
              <TouchableOpacity
                key={pct}
                style={[styles.tipBtn, tipCents === Math.round(cartTotal * pct / 100) && styles.tipBtnActive]}
                onPress={() => setTipCents(Math.round(cartTotal * pct / 100))}
              >
                <Text>{pct === 0 ? '0' : `${pct}%`}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.cartTotal}>
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Total</Text>
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{formatCurrency(grandTotal)}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.btnConfirm,
              (!scannedWallet || insufficientFunds || chargeMut.isPending) && styles.btnDisabled,
            ]}
            disabled={!scannedWallet || insufficientFunds || chargeMut.isPending}
            onPress={handleConfirmCharge}
          >
            {chargeMut.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>
                {!scannedWallet ? 'Scanear pulseira primeiro' : insufficientFunds ? 'Saldo insuficiente' : `Cobrar ${formatCurrency(grandTotal)}`}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 24 },
  label: { fontSize: 14, color: '#666', marginBottom: 8 },
  pinInput: {
    fontSize: 32,
    letterSpacing: 12,
    borderBottomWidth: 2,
    borderColor: '#000',
    width: 200,
    textAlign: 'center',
    marginBottom: 24,
  },
  btnPrimary: {
    backgroundColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  btnText: { color: '#fff', fontWeight: '600' },
  scanBanner: {
    backgroundColor: '#FF3366',
    padding: 24,
    alignItems: 'center',
  },
  scanText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  header: { backgroundColor: '#000', padding: 16 },
  headerError: { backgroundColor: 'crimson', color: '#fff', fontWeight: 'bold' },
  headerName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  headerBalance: { color: '#fff', fontSize: 14 },
  productCard: {
    flex: 1,
    margin: 4,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    minHeight: 90,
  },
  productName: { fontWeight: 'bold' },
  productCat: { fontSize: 11, color: '#888', marginTop: 4 },
  productPrice: { fontSize: 16, fontWeight: 'bold', marginTop: 6, color: '#FF3366' },
  stockLow: { fontSize: 10, color: 'orange', marginTop: 2 },
  cart: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  cartRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  cartTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: '#eee',
    marginTop: 4,
  },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 8 },
  tipBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  tipBtnActive: { backgroundColor: '#000', borderColor: '#000' },
  btnConfirm: {
    backgroundColor: '#FF3366',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { backgroundColor: '#ccc' },
  amount: { fontSize: 32, fontWeight: 'bold', marginVertical: 16 },
  balance: { fontSize: 24, color: '#666', marginBottom: 24 },
  tx: { fontSize: 11, color: '#aaa', marginBottom: 24 },
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
