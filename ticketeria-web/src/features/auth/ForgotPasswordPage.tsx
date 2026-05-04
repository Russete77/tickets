import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentHead } from '@shared/hooks/useDocumentHead';
import { Button } from '@shared/ui/Button/Button';
import { Input } from '@shared/ui/Input/Input';
import { Icon } from '@shared/ui/Icon/Icon';
import { api } from '@shared/lib/api';
import { useTranslation } from '@shared/i18n';
import styles from './ForgotPasswordPage.module.css';

const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  useDocumentHead({
    title: 'Recuperar senha — Ticketeria Digital',
    description: 'Recupere o acesso à sua conta Ticketeria',
    ogTitle: 'Recuperar senha — Ticketeria Digital',
    ogType: 'website',
  });

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [emailError, setEmailError] = useState('');

  const validate = (): boolean => {
    if (!email.trim()) {
      setEmailError('E-mail obrigatório');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('E-mail inválido');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post('/v1/auth/forgot-password', { email });
      setSubmitted(true);
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
          <h1 className={styles.title}>Recuperar senha</h1>
          <p className={styles.subtitle}>
            {submitted
              ? 'Verifique sua caixa de entrada'
              : 'Informe seu e-mail para receber o link de recuperação'}
          </p>
        </div>

        {submitted ? (
          <div className={styles.successBox}>
            <div className={styles.successIcon}>✓</div>
            <p className={styles.successMessage}>
              Se o email estiver cadastrado, voce recebera um link de recuperacao
            </p>
            <Link to="/login" className={styles.backLink}>
              Voltar para o login
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className={styles.form} noValidate>
              <div className={styles.field}>
                <label htmlFor="email" className={styles.label}>{t('auth.email')}</label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  autoComplete="email"
                  aria-invalid={!!emailError}
                />
                {emailError && <span className={styles.error}>{emailError}</span>}
              </div>

              <Button type="submit" variant="primary" fullWidth loading={loading}>
                Enviar link de recuperação
              </Button>
            </form>

            <p className={styles.registerLink}>
              Lembrou a senha?{' '}
              <Link to="/login">Voltar para o login</Link>
            </p>
 