import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@shared/hooks/useAuth';
import { useDocumentHead } from '@shared/hooks/useDocumentHead';
import { Button } from '@shared/ui/Button/Button';
import { Input } from '@shared/ui/Input/Input';
import { Icon } from '@shared/ui/Icon/Icon';
import { useToastStore } from '@shared/stores/toastStore';
import styles from './RegisterPage.module.css';

interface FormValues {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

type FormErrors = Partial<Record<keyof FormValues, string>>;

const formatCpf = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  }
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
};

const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();

  useDocumentHead({
    title: 'Criar conta — Ticketeria Digital',
    description: 'Crie sua conta grátis na Ticketeria e comece a comprar ingressos para seus eventos favoritos',
    ogTitle: 'Criar conta — Ticketeria Digital',
    ogType: 'website',
  });

  const [values, setValues] = useState<FormValues>({
    name: '',
    email: '',
    cpf: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const set = (field: keyof FormValues, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!values.name.trim()) next.name = 'Nome obrigatório';
    if (!values.email.trim()) next.email = 'E-mail obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) next.email = 'E-mail inválido';
    const cpfDigits = values.cpf.replace(/\D/g, '');
    if (cpfDigits.length !== 11) next.cpf = 'CPF inválido';
    const phoneDigits = values.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) next.phone = 'Telefone inválido';
    if (!values.password) next.password = 'Senha obrigatória';
    else if (values.password.length < 8) next.password = 'Mínimo 8 caracteres';
    if (values.password !== values.confirmPassword) next.confirmPassword = 'As senhas não conferem';
    if (!values.acceptTerms) next.acceptTerms = 'Você deve aceitar os termos';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await register({
        name: values.name,
        email: values.email,
        cpf: values.cpf.replace(/\D/g, ''),
        phone: values.phone.replace(/\D/g, ''),
        password: values.password,
      });
      navigate('/');
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao criar conta',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <Link to="/" className={styles.logo}>
            <Icon name="ticket" size={20} className={styles.logoIcon} />
            <span className={styles.logoText}>Ticketeria</span>
          </Link>
          <h1 className={styles.title}>Criar conta</h1>
          <p className={styles.subtitle}>É rápido e gratuito</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.field}>
            <label htmlFor="name" className={styles.label}>Nome completo</label>
            <Input
              id="name"
              type="text"
              placeholder="João da Silva"
              value={values.name}
              onChange={(e) => set('name', e.target.value)}
              autoComplete="name"
              aria-invalid={!!errors.name}
            />
            {errors.name && <span className={styles.error}>{errors.name}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>E-mail</label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={values.email}
              onChange={(e) => set('email', e.target.value)}
              autoComplete="email"
              aria-invalid={!!errors.email}
            />
            {errors.email && <span className={styles.error}>{errors.email}</span>}
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="cpf" className={styles.label}>CPF</label>
              <Input
                id="cpf"
                type="text"
                placeholder="000.000.000-00"
                value={values.cpf}
                onChange={(e) => set('cpf', formatCpf(e.target.value))}
                inputMode="numeric"
                aria-invalid={!!errors.cpf}
              />
              {errors.cpf && <span className={styles.error}>{errors.cpf}</span>}
            </div>

            <div className={styles.field}>
              <label htmlFor="phone" className={styles.label}>Telefone</label>
              <Input
                id="phone"
                type="tel"
                placeholder="(00) 00000-0000"
                value={values.phone}
                onChange={(e) => set('phone', formatPhone(e.target.value))}
                inputMode="tel"
                aria-invalid={!!errors.phone}
              />
              {errors.phone && <span className={styles.error}>{errors.phone}</span>}
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>Senha</label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={values.password}
              onChange={(e) => set('password', e.target.value)}
              autoComplete="new-password"
              aria-invalid={!!errors.password}
            />
            {errors.password && <span className={styles.error}>{errors.password}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="confirmPassword" className={styles.label}>Confirmar senha</label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repita a senha"
              value={values.confirmPassword}
              onChange={(e) => set('confirmPassword', e.target.value)}
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
            />
            {errors.confirmPassword && (
              <span className={styles.error}>{errors.confirmPassword}</span>
            )}
          </div>

          <div className={styles.checkboxField}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={values.acceptTerms}
                onChange={(e) => set('acceptTerms', e.target.checked)}
                className={styles.checkbox}
              />
              <span>
                Aceito os{' '}
                <a href="#" className={styles.termsLink}>Termos de Uso</a>
                {' '}e a{' '}
                <a href="#" className={styles.termsLink}>Política de Privacidade</a>
              </span>
            </label>
            {errors.acceptTerms && (
              <span className={styles.error}>{errors.acceptTerms}</span>
            )}
          </div>

          <Button type="submit" variant="primary" fullWidth loading={loading}>
            Criar conta
          </Button>
        </form>

        <p className={styles.loginLink}>
          Já tem uma conta?{' '}
          <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
