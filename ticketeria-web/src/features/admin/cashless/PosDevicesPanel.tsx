import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { Button } from '@shared/ui/Button/Button';
import { Input } from '@shared/ui/Input/Input';
import { useToastStore } from '@shared/stores/toastStore';
import { cashlessApi } from './api';

interface PosDevice {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'revoked';
  lastSeenAt: string | null;
  appVersion: string | null;
  pairedAt: string | null;
}

interface PairResponse {
  deviceId: string;
  pairingCode: string;
  expiresAt: string;
}

function PairingQR({ code }: { code: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, code, {
        width: 180,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
      });
    }
  }, [code]);

  return <canvas ref={canvasRef} style={{ display: 'block', margin: '0 auto' }} />;
}

export function PosDevicesPanel({ posId }: { posId: string }) {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [pairing, setPairing] = useState<PairResponse | null>(null);
  const [label, setLabel] = useState('');

  const { data: devices = [] } = useQuery({
    queryKey: ['pos-devices', posId],
    queryFn: () => cashlessApi<PosDevice[]>(`/pos-devices/pos/${posId}/devices`),
  });

  const pairMut = useMutation({
    mutationFn: () =>
      cashlessApi<PairResponse>(`/pos-devices/pos/${posId}/devices/pair-code`, {
        method: 'POST',
        body: JSON.stringify({ label }),
      }),
    onSuccess: (d) => {
      setPairing(d);
      setLabel('');
      addToast({ type: 'success', message: 'Código de pareamento gerado' });
      qc.invalidateQueries({ queryKey: ['pos-devices', posId] });
    },
    onError: (e: Error) => addToast({ type: 'error', message: e.message }),
  });

  const revokeMut = useMutation({
    mutationFn: (deviceId: string) =>
      cashlessApi(`/pos-devices/pos/${posId}/devices/${deviceId}`, { method: 'DELETE' }),
    onSuccess: () => {
      addToast({ type: 'success', message: 'Dispositivo revogado' });
      qc.invalidateQueries({ queryKey: ['pos-devices', posId] });
    },
    onError: (e: Error) => addToast({ type: 'error', message: e.message }),
  });

  return (
    <section style={{ marginTop: 32, padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
      <h3 style={{ marginTop: 0 }}>Dispositivos POS</h3>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 16 }}>
        <label style={{ flex: 1 }}>
          <div style={{ marginBottom: 4 }}>Rótulo do dispositivo</div>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex: Bar Principal — Tablet 3"
          />
        </label>
        <Button disabled={!label || pairMut.isPending} onClick={() => pairMut.mutate()}>
          {pairMut.isPending ? 'Gerando...' : 'Parear dispositivo'}
        </Button>
      </div>

      {pairing && (
        <div
          role="status"
          style={{
            padding: 24,
            border: '2px solid #4f46e5',
            borderRadius: 8,
            marginBottom: 16,
            background: '#f8f7ff',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: '0 0 8px', fontWeight: 600 }}>
            Código de pareamento — válido até{' '}
            {new Date(pairing.expiresAt).toLocaleTimeString('pt-BR')}
          </p>
          <PairingQR code={pairing.pairingCode} />
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: 8,
              margin: '12px 0',
              fontFamily: 'monospace',
            }}
          >
            {pairing.pairingCode}
          </div>
          <p style={{ margin: '0 0 16px', color: '#555', fontSize: 14 }}>
            No app POS, escaneie o QR ou digite este código.
          </p>
          <Button onClick={() => setPairing(null)}>Fechar</Button>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
            <th style={{ padding: 8 }}>Rótulo</th>
            <th style={{ padding: 8 }}>Status</th>
            <th style={{ padding: 8 }}>Versão do app</th>
            <th style={{ padding: 8 }}>Último contato</th>
            <th style={{ padding: 8 }}>Pareado em</th>
            <th style={{ padding: 8 }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {devices.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: 16, textAlign: 'center', color: '#888' }}>
                Nenhum dispositivo pareado.
              </td>
            </tr>
          )}
          {devices.map((d) => (
            <tr key={d.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: 8 }}>{d.label}</td>
              <td style={{ padding: 8 }}>{d.status}</td>
              <td style={{ padding: 8 }}>{d.appVersion ?? '—'}</td>
              <td style={{ padding: 8 }}>
                {d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString('pt-BR') : '—'}
              </td>
              <td style={{ padding: 8 }}>
                {d.pairedAt ? new Date(d.pairedAt).toLocaleString('pt-BR') : '—'}
              </td>
              <td style={{ padding: 8 }}>
                {d.status !== 'revoked' && (
                  <Button
                    disabled={revokeMut.isPending}
                    onClick={() => {
                      if (confirm(`Revogar dispositivo "${d.label}"?`)) revokeMut.mutate(d.id);
                    }}
                  >
                    Revogar
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
