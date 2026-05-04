import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { useTranslation } from '../i18n';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles/tokens';
import { AuthResponse } from '../types';

interface FormData {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    cpf: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const registerMutation = useMutation({
    mutationFn: async (data: Omit<FormData, 'confirmPassword'>) => {
      return apiClient.post<AuthResponse>('/auth/register', data);
    },
    onSuccess: () => {
      Alert.alert(
        'Sucesso',
        'Conta criada! Você será redirecionado para o login.'
      );
      router.replace('/login');
    },
    onError: (error: any) => {
      Alert.alert('Erro', error.message || 'Erro ao criar conta');
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.email.includes('@')) {
      newErrors.email = 'Email inválido';
    }

    if (formData.cpf.length < 14) {
      newErrors.cpf = 'CPF inválido';
    }

    if (formData.phone.length < 10) {
      newErrors.phone = 'Telefone inválido';
    }

    if (formData.password.length < 6) {
      newErrors.password = 'Senha deve ter no mínimo 6 caracteres';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'As senhas não conferem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = () => {
    if (!validateForm()) {
      return;
    }

    const { confirmPassword, ...registerData } = formData;
    registerMutation.mutate(registerData);
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const formatCPF = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
    if (cleaned.length <= 9) {
      return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
    }
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
  };

  const formatPhone = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Voltar</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>Criar conta</Text>
        <Text style={styles.subtitle}>Junte-se à Ticketeria</Text>
      </View>

      {/* Name Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Nome completo</Text>
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          placeholder="Seu nome"
          placeholderTextColor={Colors.textTertiary}
          value={formData.name}
          onChangeText={(text) => handleInputChange('name', text)}
          editable={!registerMutation.isPending}
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
      </View>

      {/* Email Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>{t("auth.email")}</Text>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          placeholder="seu@email.com"
          placeholderTextColor={Colors.textTertiary}
          value={formData.email}
          onChangeText={(text) => handleInputChange('email', text)}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!registerMutation.isPending}
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
      </View>

      {/* CPF Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>CPF</Text>
        <TextInput
          style={[styles.input, errors.cpf && styles.inputError]}
          placeholder="XXX.XXX.XXX-XX"
          placeholderTextColor={Colors.textTertiary}
          value={formData.cpf}
          onChangeText={(text) =>
            handleInputChange('cpf', formatCPF(text))
          }
          keyboardType="numeric"
          editable={!registerMutation.isPending}
        />
        {errors.cpf && <Text style={styles.errorText}>{errors.cpf}</Text>}
      </View>

      {/* Phone Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Telefone</Text>
        <TextInput
          style={[styles.input, errors.phone && styles.inputError]}
          placeholder="(XX) XXXXX-XXXX"
          placeholderTextColor={Colors.textTertiary}
          value={formData.phone}
          onChangeText={(text) =>
            handleInputChange('phone', formatPhone(text))
          }
          keyboardType="phone-pad"
          editable={!registerMutation.isPending}
        />
        {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
      </View>

      {/* Password Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>{t("auth.password")}</Text>
        <View style={[styles.passwordInputContainer, errors.password && styles.inputError]}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Mínimo 6 caracteres"
            placeholderTextColor={Colors.textTertiary}
            value={formData.password}
            onChangeText={(text) => handleInputChange('password', text)}
            secureTextEntry={!showPassword}
            editable={!registerMutation.isPending}
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
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
      </View>

      {/* Confirm Password Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Confirmar senha</Text>
        <View style={[styles.passwordInputContainer, errors.confirmPassword && styles.inputError]}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Confirme sua senha"
            placeholderTextColor={Colors.textTertiary}
            value={formData.confirmPassword}
            onChangeText={(text) => handleInputChange('confirmPassword', text)}
            secureTextEntry={!showConfirmPassword}
            editable={!registerMutation.isPending}
          />
          <TouchableOpacity
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            style={styles.passwordToggle}
          >
            <Text style={styles.passwordToggleIcon}>
              {showConfirmPassword ? 'Ocultar' : 'Mostrar'}
            </Text>
          </TouchableOpacity>
        </View>
        {errors.confirmPassword && (
          <Text style={styles.errorText}>{errors.confirmPassword}</Text>
        )}
      </View>

      {/* Register Button */}
      <TouchableOpacity
        style={[
          styles.registerButton,
          registerMutation.isPending && styles.registerButtonDisabled,
        ]}
        onPress={handleRegister}
        disabled={registerMutation.isPending}
      >
        {registerMutation.isPending ? (
          <ActivityIndicator color={Colors.textInverse} />
        ) : (
          <Text style={styles.registerButtonText}>Criar conta</Text>
        )}
      </TouchableOpacity>

      {/* Login Link */}
      <View style={styles.loginContainer}>
        <Text style={styles.loginText}>Já tenho conta</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.loginLink}>{t("auth.login")}</Text>
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
    paddingVertical: Spacing.lg,
  },
  backButton: {
    marginBottom: Spacing.lg,
  },
  backButtonText: {
    fontSize: Typography.fontSize.base,
    color: Colors.accent,
    fontWeight: Typography.fontWeight.semibold,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
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
  inputError: {
    borderColor: Colors.error,
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
  errorText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.error,
    marginTop: Spacing.sm,
  },
  registerButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  loginText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  loginLink: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.accent,
    textDecorationLine: 'underline',
  },
});
