import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles/tokens';
import { User, Order } from '../types';
import { useTranslation } from '../i18n';
import {
  BiometricPref,
  isBiometricsAvailable,
  isBiometricsEnabled,
  setBiometricsEnabled,
  authenticate,
} from '../lib/biometrics';

interface ProfileSettings {
  notifications: boolean;
  theme: 'light' | 'dark';
  marketingEmails: boolean;
}

export function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [settings, setSettings] = useState<ProfileSettings>({
    notifications: true,
    theme: 'dark',
    marketingEmails: false,
  });
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [bioLogin, setBioLogin] = useState(false);
  const [bioPayment, setBioPayment] = useState(false);
  const [bioTicket, setBioTicket] = useState(false);

  useEffect(() => {
    (async () => {
      const available = await isBiometricsAvailable();
      setBiometricsAvailable(available);
      if (!available) return;
      const [l, p, tk] = await Promise.all([
        isBiometricsEnabled(BiometricPref.LOGIN),
        isBiometricsEnabled(BiometricPref.PAYMENT),
        isBiometricsEnabled(BiometricPref.TICKET),
      ]);
      setBioLogin(l);
      setBioPayment(p);
      setBioTicket(tk);
    })();
  }, []);

  const toggleBiometric = async (
    pref: BiometricPref,
    next: boolean,
    setLocal: (v: boolean) => void,
  ) => {
    // Ativar exige provar a biometria uma vez
    if (next) {
      const ok = await authenticate('Confirme sua biometria para ativar');
      if (!ok) return;
    }
    await setBiometricsEnabled(pref, next);
    setLocal(next);
  };

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: () => apiClient.get<User>('/users/profile'),
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['user', 'orders'],
    queryFn: () => apiClient.get<Order[]>('/users/orders'),
  });

  const handleLogout = async () => {
    Alert.alert(
      'Sair',
      'Você tem certeza que deseja sair de sua conta?',
      [
        {
          text: 'Cancelar',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Sair',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await apiClient.post('/auth/logout', {});
              router.replace('/login');
            } catch (error) {
              Alert.alert('Erro', 'Erro ao fazer logout');
            } finally {
              setIsLoggingOut(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  if (userLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Dados não encontrados</Text>
      </View>
    );
  }

  const MenuOption = ({
    title,
    subtitle,
    onPress,
  }: {
    title: string;
    subtitle?: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity style={styles.menuOption} onPress={onPress}>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  );

  const SettingOption = ({
    title,
    value,
    onToggle,
  }: {
    title: string;
    value: boolean;
    onToggle: (value: boolean) => void;
  }) => (
    <View style={styles.settingOption}>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.border, true: Colors.accent }}
        thumbColor={Colors.textPrimary}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.headerSection}>
          <View style={styles.profileContainer}>
            <View style={styles.avatarContainer}>
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText}>
                    {user.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.name}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push('/edit-profile')}
          >
            <Text style={styles.editButtonText}>Editar</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{orders?.length || 0}</Text>
            <Text style={styles.statLabel}>Ingressos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{orders?.length || 0}</Text>
            <Text style={styles.statLabel}>Pedidos</Text>
          </View>
        </View>

        {/* Menu Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Menu</Text>
          <MenuOption
            title="Favoritos"
            onPress={() => router.push('/favorites')}
          />
          <MenuOption
            title="Histórico de Pedidos"
            subtitle={`${orders?.length || 0} pedidos`}
            onPress={() => router.push('/order-history')}
          />
          <MenuOption
            title="Métodos de Pagamento"
            onPress={() => router.push('/payment-methods')}
          />
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferências</Text>
          <SettingOption
            title="Notificações"
            value={settings.notifications}
            onToggle={(value) =>
              setSettings({ ...settings, notifications: value })
            }
          />
          <SettingOption
            title="Emails de Marketing"
            value={settings.marketingEmails}
            onToggle={(value) =>
              setSettings({ ...settings, marketingEmails: value })
            }
          />
        </View>

        {/* Biometria */}
        {biometricsAvailable && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Segurança Biométrica</Text>
            <SettingOption
              title="Exigir biometria no login"
              value={bioLogin}
              onToggle={(v) => toggleBiometric(BiometricPref.LOGIN, v, setBioLogin)}
            />
            <SettingOption
              title="Exigir biometria em pagamentos"
              value={bioPayment}
              onToggle={(v) => toggleBiometric(BiometricPref.PAYMENT, v, setBioPayment)}
            />
            <SettingOption
              title="Exigir biometria para revelar ingresso"
              value={bioTicket}
              onToggle={(v) => toggleBiometric(BiometricPref.TICKET, v, setBioTicket)}
            />
          </View>
        )}

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conta</Text>
          <MenuOption
            title="Alterar Senha"
            onPress={() => router.push('/change-password')}
          />
          <MenuOption
            title="Configurações da Conta"
            onPress={() => router.push('/account-settings')}
          />
          <MenuOption
            title="Sobre"
            subtitle="Versão 1.0.0"
            onPress={() => {
              Alert.alert(
                'Ticketeria',
                'Versão 1.0.0\n\nSua plataforma de ingressos confiável.'
              );
            }}
          />
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <ActivityIndicator color={Colors.error} />
          ) : (
            <Text style={styles.logoutButtonText}>{t('auth.logout')}</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  headerSection: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  profileContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: Spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  profileEmail: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  editButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  editButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.accent,
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    ...Shadows.sm,
  },
  statValue: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.accent,
    marginBottom: Spacing.sm,
  },
  statLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
    textTransform: 'uppercase',
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuIcon: {
    fontSize: 24,
    marginRight: Spacing.lg,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  menuSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  menuArrow: {
    fontSize: Typography.fontSize.lg,
    color: Colors.textTertiary,
  },
  settingOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    fontSize: 20,
    marginRight: Spacing.lg,
  },
  settingTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  logoutButton: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.error,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.error,
  },
});