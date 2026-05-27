import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { useTranslation } from '../i18n';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles/tokens';
import { CheckInEvent, CheckInResult } from '../types';

export function CheckinScreen() {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['checkin', 'events'],
    queryFn: () => apiClient.get<CheckInEvent[]>('/checkin/events'),
  });

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['checkin', 'stats', selectedEventId],
    queryFn: () =>
      apiClient.get<{ checkedIn: number; total: number }>(
        `/checkin/stats/${selectedEventId}`
      ),
    enabled: !!selectedEventId,
  });

  const checkInMutation = useMutation({
    mutationFn: async (code: string) => {
      return apiClient.post<CheckInResult>('/checkin/validate', {
        ticketCode: code,
        eventId: selectedEventId,
      });
    },
    onSuccess: (data) => {
      setCheckInResult(data);
      refetchStats();
      setManualCode('');
      setScannedCode(null);
    },
    onError: (error: any) => {
      setCheckInResult({
        result: 'invalid_hash',
        ticket: null,
        message: error.message || 'Erro ao validar ingresso',
        success: false,
      });
    },
  });

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const handleBarCodeScanned = (data: string) => {
    setScannedCode(data);
    checkInMutation.mutate(data);
  };

  const handleManualCheckIn = () => {
    if (!manualCode.trim()) {
      Alert.alert('Aviso', 'Digite o código do ingresso');
      return;
    }
    checkInMutation.mutate(manualCode);
  };

  const getResultColor = () => {
    if (!checkInResult) return Colors.textSecondary;
    if (checkInResult.success) {
      if (checkInResult.ticket?.status === 'valid') return Colors.success;
      if (checkInResult.ticket?.status === 'already_used') return Colors.warning;
      if (checkInResult.ticket?.status === 'invalid') return Colors.error;
    }
    return Colors.error;
  };

  const getResultIcon = () => {
    if (!checkInResult) return '';
    if (checkInResult.success && checkInResult.ticket?.status === 'valid') return '✓';
    if (checkInResult.ticket?.status === 'already_used') return '⚠';
    return '✕';
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Permissão de Câmera</Text>
        <Text style={styles.permissionText}>
          É necessário acesso à câmera para realizar check-in
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Permitir Acesso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Event Selector */}
      {!selectedEventId ? (
        <ScrollView style={styles.eventList} contentContainerStyle={styles.eventListContent}>
          <Text style={styles.selectEventTitle}>Selecione um evento</Text>
          {eventsLoading ? (
            <ActivityIndicator size="large" color={Colors.accent} />
          ) : (
            events?.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventOption}
                onPress={() => setSelectedEventId(event.id)}
              >
                <View style={styles.eventOptionContent}>
                  <Text style={styles.eventOptionTitle}>{event.title}</Text>
                  <Text style={styles.eventOptionDate}>{event.date}</Text>
                  <Text style={styles.eventOptionVenue}>{event.venue}</Text>
                </View>
                <Text style={styles.eventOptionArrow}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : (
        <>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setSelectedEventId(null)}>
              <Text style={styles.backButton}>← Voltar</Text>
            </TouchableOpacity>
            <Text style={styles.eventTitle}>
              {events?.find((e) => e.id === selectedEventId)?.title}
            </Text>
          </View>

          {/* Camera */}
          {!showManualInput && (
            <CameraView
              style={styles.camera}
              onBarcodeScanned={({ data }) => handleBarCodeScanned(data)}
            >
              <View style={styles.overlayContainer}>
                <View style={styles.scanArea} />
                <Text style={styles.scanText}>Aponte a câmera para o QR Code</Text>
              </View>
            </CameraView>
          )}

          {/* Manual Input */}
          {showManualInput && (
            <View style={styles.manualInputContainer}>
              <TextInput
                style={styles.manualInput}
                placeholder="Digite o código do ingresso"
                placeholderTextColor={Colors.textTertiary}
                value={manualCode}
                onChangeText={setManualCode}
                autoFocus
              />
              <TouchableOpacity
                style={styles.manualSubmitButton}
                onPress={handleManualCheckIn}
              >
                {checkInMutation.isPending ? (
                  <ActivityIndicator color={Colors.textInverse} />
                ) : (
                  <Text style={styles.manualSubmitButtonText}>Validar</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Stats */}
          {stats && (
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Check-ins</Text>
                <Text style={styles.statValue}>{stats.checkedIn}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Total</Text>
                <Text style={styles.statValue}>{stats.total}</Text>
              </View>
            </View>
          )}

          {/* Toggle Manual Input */}
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setShowManualInput(!showManualInput)}
          >
            <Text style={styles.toggleButtonText}>
              {showManualInput ? 'Usar Câmera' : 'Digitar Código'}
            </Text>
          </TouchableOpacity>

          {/* Result Modal */}
          <Modal
            transparent
            visible={!!checkInResult}
            animationType="fade"
            onRequestClose={() => setCheckInResult(null)}
          >
            <View style={styles.resultOverlay}>
              <View style={[styles.resultCard, { borderTopColor: getResultColor() }]}>
                <Text style={[styles.resultIcon, { color: getResultColor() }]}>
                  {getResultIcon()}
                </Text>
                <Text style={styles.resultStatus}>
                  {checkInResult?.ticket?.status === 'valid'
                    ? 'Ingresso Válido'
                    : checkInResult?.ticket?.status === 'already_used'
                    ? 'Já Utilizado'
                    : 'Ingresso Inválido'}
                </Text>
                {checkInResult?.ticket && (
                  <>
                    <View style={styles.resultDetails}>
                      <Text style={styles.resultLabel}>Titular</Text>
                      <Text style={styles.resultValue}>
                        {checkInResult.ticket.holderName}
                      </Text>
                    </View>
                    <View style={styles.resultDetails}>
                      <Text style={styles.resultLabel}>Evento</Text>
                      <Text style={styles.resultValue}>
                        {checkInResult.ticket.eventTitle}
                      </Text>
                    </View>
                    <View style={styles.resultDetails}>
                      <Text style={styles.resultLabel}>Código</Text>
                      <Text style={styles.resultValue}>{checkInResult.ticket.code}</Text>
                    </View>
                  </>
                )}
                <Text style={[styles.resultMessage, { color: getResultColor() }]}>
                  {checkInResult?.message}
                </Text>
                <TouchableOpacity
                  style={styles.resultButton}
                  onPress={() => {
                    setCheckInResult(null);
                    setManualCode('');
                  }}
                >
                  <Text style={styles.resultButtonText}>Próximo</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  permissionTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  permissionButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  permissionButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
  },
  eventList: {
    flex: 1,
  },
  eventListContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  selectEventTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  eventOption: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    alignItems: 'center',
    ...Shadows.sm,
  },
  eventOptionContent: {
    flex: 1,
  },
  eventOptionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  eventOptionDate: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  eventOptionVenue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
  },
  eventOptionArrow: {
    fontSize: Typography.fontSize.xl,
    color: Colors.accent,
  },
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  backButton: {
    fontSize: Typography.fontSize.base,
    color: Colors.accent,
    fontWeight: Typography.fontWeight.semibold,
  },
  eventTitle: {
    flex: 1,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  camera: {
    flex: 1,
  },
  overlayContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.accent,
    backgroundColor: 'transparent',
  },
  scanText: {
    marginTop: Spacing.xl,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  manualInputContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface,
  },
  manualInput: {
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  manualSubmitButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  manualSubmitButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  statLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.accent,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  toggleButton: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  toggleButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.accent,
  },
  resultOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderTopWidth: 4,
  },
  resultIcon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  resultStatus: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  resultDetails: {
    width: '100%',
    marginBottom: Spacing.lg,
  },
  resultLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  resultValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  resultMessage: {
    fontSize: Typography.fontSize.base,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  resultButton: {
    width: '100%',
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  resultButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
  },
});
