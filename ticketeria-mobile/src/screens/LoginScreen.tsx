import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { useTranslation } from '../i18n';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles/tokens';
import { AuthResponse } from '../types';
import { SecureStorage, StorageKey } from '../lib/storage';
import {
  authenticate,
  isBiometricsAvailable,
  isBiometricsEnabled,
  setBiometricsEnabled,
  BiometricPref,
} from '../lib/biometrics';

export function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [biometricLoginAvailable, setBiometricLoginAvailable] = useState(false);

  // Oferece login biométrico se: device suporta + preferência ligada + há sessão salva
  useEffect(() => {
    (async () => {
      const [available, enabled, refreshToken] = await Promise.all([
        isBiometricsAvailable(),
        isBiometricsEnabled(BiometricPref.LOGIN),
        SecureStorage.getItem(StorageKey.REFRESH_TOKEN),
      ]);
      setBiometricLoginAvailable(available && enabled && !!refreshToken);
    })();
  }, []);

  const persistSession = async (data: AuthResponse) => {
    await Promise.all([
      SecureStorage.setItem(StorageKey.AUTH_TOKEN, data.accessToken),
      SecureStorage.setItem(StorageKey.REFRESH_TOKEN, data.refreshToken),
      SecureStorage.setJSON(StorageKey.USER_DATA, data.user),
    ]);
  };

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      return apiClient.post<AuthResponse>('/auth/login', credentials);
    },
    onSuccess: async (data) => {
      await persistSession(data);

      // Primeiro login bem-sucedido num device com biometria: oferece ativar
      const available = await isBiometricsAvailable();
      const alreadyEnabled = await isBiometricsEnabled(BiometricPref.LOGIN);
      if (available && !alreadyEnabled) {
        Alert.alert(
          'Ativar biometria?',
          'Use Face ID / digital para entrar mais rápido na próxima vez.',
          [
            { text: 'Agora não', style: 'cancel' },
            {
              text: 'Ativar',
              onPress: () => setBiometricsEnabled(BiometricPref.LOGIN, true),
            },
          ],
        );
      }

      router.replace('/(tabs)/home');
    },
    onError: () => {
      Alert.alert('Erro', 'Email ou senha incorretos');
    },
  });

  const handleBiometricLogin = async () => {
    const ok = await authenticate('Entre com sua biometria');
    if (ok) {
      router.replace('/(tabs)/home');
    }
  };

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('Aviso', 'Preencha todos os campos');
      return;
    }

    loginMutation.mutate({ email, password });
  };

  const handleForgotPassword = () => {
    router.push('/forgot-password');
  };

  const handleSignUp = () => {
    router.push('/register');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>Ticketeria</Text>
        <Text style={styles.logoSubtext}>Seus ingressos, sempre com você</Text>
      </View>

      {/* Form */}
      <View style={styles.formContainer}>
        <Text style={styles.title}>{t('auth.login')}</Text>

        {/* Email Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>{t("auth.email")}</Text>
          <TextInput
            style={styles.input}
            placeholder="seu@email.com"
            placeholderTextColor={Colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loginMutation.isPending}
          />
        </View>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>{t('auth.password')}</Text>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Sua senha"
              placeholderTextColor={Colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!loginMutation.isPending}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.passwordToggle}
            >
              <Text style={styles.passwordToggleIcon}>
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Login Button */}
        <TouchableOpacity
          style={[
            styles.loginButton,
            loginMutation.isPending && styles.loginButtonDisabled,
          ]}
          onPress={handleLogin}
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? (
            <ActivityIndicator color={Colors.textInverse} />
          ) : (
            <Text style={styles.loginButtonText}>{t('auth.login')}</Text>
          )}
        </TouchableOpacity>

        {/* Forgot Password Link */}
        <TouchableOpacity
          onPress={handleForgotPassword}
          disabled={loginMutation.isPending}
        >
          <Text style={styles.forgotPasswordLink}>{t('auth.forgotPassword')}</Text>
        </TouchableOpacity>

        {/* Biometric Login */}
        {biometricLoginAvailable && (
          <TouchableOpacity
            style={styles.biometricButton}
            onPress={handleBiometricLogin}
            disabled={loginMutation.isPending}
          >
            <Text style={styles.biometricButtonText}>
              Entrar com Face ID / digital
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Divider */}
      <View style={styles.dividerContainer}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>Ou</Text>
        <View style={styles.divider} />
      </View>

      {/* Sign Up */}
      <View style={styles.signUpContainer}>
        <Text style={styles.signUpText}>Ainda não tem conta?</Text>
        <TouchableOpacity onPress={handleSignUp} disabled={loginMutation.isPending}>
          <Text style={styles.signUpLink}>Criar conta</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
    marginTop: Spacing.xl,
  },
  logoText: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.accent,
    marginBottom: Spacing.sm,
  },
  logoSubtext: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  formContainer: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  passwordToggle: {
    paddingHorizontal: Spacing.lg,
  },
  passwordToggleIcon: {
    fontSize: 18,
  },
  loginButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
  },
  forgotPasswordLink: {
    fontSize: Typography.fontSize.sm,
    color: Colors.accent,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  biometricButton: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.accent,
    alignItems: 'center',
  },
  biometricButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.accent,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    marginHorizontal: Spacing.lg,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  signUpText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  signUpLink: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.accent,
  },
});