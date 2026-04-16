import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@shared/lib/api';
import { Icon } from '@shared/ui/Icon/Icon';
import CheckinResult from './CheckinResult';
import styles from './CheckinPage.module.css';

interface Event {
  id: string;
  title: string;
  slug: string;
}

interface CheckinStats {
  total: number;
  checkedIn: number;
  remaining: number;
  percentage: number;
}

interface RecentCheckin {
  id: string;
  holderName: string;
  batchType: string;
  ticketNumber: string;
  checkedInAt: string;
  status: 'valid' | 'invalid' | 'warning';
}

interface ValidationResult {
  valid: boolean;
  reason?: string;
  holderName?: string;
  batchType?: string;
  ticketNumber?: string;
  status: 'valid' | 'invalid' | 'warning';
}

const decodeQRFromCanvas = (canvas: HTMLCanvasElement): string | null => {
  // Simulate QR code detection by checking canvas pixel patterns
  // In a real app, you'd use jsQR or similar library
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Simple fallback: detect if canvas has content and return a test code
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  let darkPixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (brightness < 128) darkPixels++;
  }

  if (darkPixels > (data.length / 4) * 0.1) {
    return 'tkt-001-demo-qr-code';
  }

  return null;
};

const CheckinPage: React.FC = () => {
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [manualInput, setManualInput] = useState('');
  const [result, setResult] = useState<{
    show: boolean;
    data: ValidationResult | null;
  }>({ show: false, data: null });
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch events for dropdown
  const { data: eventsData } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await api.get('/events?limit=50');
      return response.data as Event[];
    },
  });

  const events: Event[] = eventsData || [];

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['checkin-stats', selectedEventId],
    queryFn: async () => {
      const response = await api.get(`/checkin/stats/${selectedEventId}`);
      return response.data as CheckinStats;
    },
    enabled: !!selectedEventId,
  });

  const stats: CheckinStats = statsData || {
    total: 0,
    checkedIn: 0,
    remaining: 0,
    percentage: 0,
  };

  // Fetch recent checkins
  const { data: recentData } = useQuery({
    queryKey: ['checkin-recent', selectedEventId],
    queryFn: async () => {
      const response = await api.get(`/checkin/recent/${selectedEventId}`);
      return response.data as RecentCheckin[];
    },
    enabled: !!selectedEventId,
  });

  const recentCheckins: RecentCheckin[] = recentData || [];

  // Validation mutation
  const validateMutation = useMutation({
    mutationFn: async (qrData: string) => {
      const response = await api.post('/checkin/validate', {
        qr_data: qrData,
        event_id: selectedEventId,
      });
      return response.data as ValidationResult;
    },
    onSuccess: (data) => {
      setResult({ show: true, data });
      setManualInput('');
    },
  });

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        startScanning();
      }
    } catch (error) {
      console.error('Camera access denied:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    setCameraActive(false);
  };

  // Scan QR codes from video frames
  const startScanning = () => {
    if (!videoRef.current || !canvasRef.current) return;

    scanIntervalRef.current = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || video.readyState !== HTMLMediaElement.HAVE_ENOUGH_DATA) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      const qrCode = decodeQRFromCanvas(canvas);
      if (qrCode && selectedEventId) {
        validateMutation.mutate(qrCode);
        stopCamera();
      }
    }, 500);
  };

  // Handle manual validation
  const handleManualValidation = () => {
    if (!manualInput.trim() || !selectedEventId) return;
    validateMutation.mutate(manualInput);
  };

  // Set default event on load
  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  return (
    <div className={styles.container}>
      {/* Header with event selector */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Check-in</h1>
          <div className={styles.eventSelector}>
            <label htmlFor="event-select" className={styles.label}>
              Evento
            </label>
            <select
              id="event-select"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className={styles.selectInput}
            >
              <option value="">Selecionar evento...</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedEventId ? (
        <>
          {/* Camera Section */}
          <div className={styles.cameraSection}>
            {cameraActive ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className={styles.video}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <div className={styles.cameraOverlay}>
                  <div className={styles.qrFrame} />
                </div>
                <button
                  onClick={stopCamera}
                  className={`${styles.button} ${styles.buttonDanger}`}
                  type="button"
                >
                  <Icon name="close" size={20} />
                  Fechar câmera
                </button>
              </>
            ) : (
              <button
                onClick={startCamera}
                className={`${styles.button} ${styles.buttonPrimary}`}
                type="button"
                disabled={validateMutation.isPending}
              >
                <Icon name="qr-code" size={24} />
                Abrir câmera
              </button>
            )}
          </div>

          {/* Manual Input Section */}
          <div className={styles.manualSection}>
            <div className={styles.inputGroup}>
              <input
                type="text"
                placeholder="Hash do ingresso ou CPF do portador"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleManualValidation()}
                className={styles.manualInput}
                disabled={validateMutation.isPending}
              />
              <button
                onClick={handleManualValidation}
                className={`${styles.button} ${styles.buttonSecondary}`}
                type="button"
                disabled={!manualInput.trim() || validateMutation.isPending}
              >
                <Icon name="search" size={20} />
                Buscar
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className={styles.statsBar}>
            <div className={styles.statItem}>
              <div className={styles.statLabel}>Entrada</div>
              <div className={styles.statValue}>
                {stats.checkedIn} / {stats.total}
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statLabel}>Capacidade</div>
              <div className={styles.statValue}>{stats.percentage}%</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statLabel}>Restante</div>
              <div className={styles.statValue}>{stats.remaining}</div>
            </div>
          </div>

          {/* Recent Check-ins */}
          {recentCheckins.length > 0 && (
            <div className={styles.recentSection}>
              <h2 className={styles.recentTitle}>Últimas entradas</h2>
              <div className={styles.recentList}>
                {recentCheckins.map((checkin) => (
                  <div
                    key={checkin.id}
                    className={`${styles.recentItem} ${styles[`status-${checkin.status}`]}`}
                  >
                    <div className={styles.recentIcon}>
                      {checkin.status === 'valid' && (
                        <Icon name="check-circle" size={20} />
                      )}
                      {checkin.status === 'invalid' && (
                        <Icon name="x-circle" size={20} />
                      )}
                      {checkin.status === 'warning' && (
                        <Icon name="warning" size={20} />
                      )}
                    </div>
                    <div className={styles.recentInfo}>
                      <div className={styles.recentName}>{checkin.holderName}</div>
                      <div className={styles.recentMeta}>
                        {checkin.batchType} • {checkin.ticketNumber}
                      </div>
                    </div>
                    <div className={styles.recentTime}>
                      {new Date(checkin.checkedInAt).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Result Overlay */}
          <CheckinResult
            show={result.show}
            data={result.data}
            onDismiss={() => setResult({ show: false, data: null })}
          />
        </>
      ) : (
        <div className={styles.emptyState}>
          <Icon name="calendar" size={48} />
          <p>Selecione um evento para começar</p>
        </div>
      )}
    </div>
  );
};

export default CheckinPage;
