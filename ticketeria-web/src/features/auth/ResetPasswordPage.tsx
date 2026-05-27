import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDocumentHead } from '@shared/hooks/useDocumentHead';
import { Button } from '@shared/ui/Button/Button';
import { Input } from '@shared/ui/Input/Input';
import { Icon } from '@shared/ui/Icon/Icon';
import { api } from '@shared/lib/api';
import { useTranslation } from '@shared/i18n';
import styles from './ResetPasswordPage.module.css';

interface FormErrors {
  newPassword?: string;
  confirmPassword?: string;
}

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const ResetPasswordPage: React.FC = () => {
  useTranslation();
  useDocumentHead({
    title: 'Nova senha — Ticketeria Digital',
    description: 'Defina sua nova senha na Ticketeria Digital',
    ogTitle: 'Nova senha — Ticketeria Digital',
    ogType: 'website',
  });

  const { userId, token } = useParams<{ userId: string; token: string }>();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): boolean => {
    const next: FormErrors = {};

    if (!newPassword) {
      next.newPassword = 'Senha obrigatória';
    } else if (!PASSWORD_REGEX.test(newPassword)) {
      next.newPassword =
        'Mínimo 8 caracteres com maiúscula, minúscula, número e caractere especial';
    }

    if (!confirmPassword) {
      next.confirmPassword = 'Confirmação obrigatória';
    } else if (newPassword !== confirmPassword) {
      next.confirmPassword = 'As senhas não conferem';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await api.post('/v1/auth/reset-password', {
        userId,
        token,
        newPassword,
      });

      if (res.error) {
        setErrors({ newPassword: res.error });
        return;
      }

      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
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
          <h1 className={styles.title}>Nova senha</h1>
          <p className={styles.subtitle}>
            {success
              ? 'Senha alterada com sucesso!'
              : 'Crie uma nova senha segura para sua conta'}
          </p>
        </div>

        {success ? (
          <div className={styles.successBox}>
            <div className={styles.successIcon}>✓</div>
            <p className={styles.successMessage}>
              Sua senha foi alterada com sucesso. Você será redirecionado para o login em instantes.
            </p>
            <Link to="/login" className={styles.backLink}>
              Ir para o login agora
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className={styles.form} noValidate>
              <div className={styles.field}>
                <label htmlFor="newPassword" className={styles.label}>Nova senha</label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: undefined }));
                  }}
                  autoComplete="new-password"
                  aria-invalid={!!errors.newPassword}
                />
                {errors.newPassword && (
                  <span className={styles.error}>{errors.newPassword}</span>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="confirmPassword" className={styles.label}>Confirmar nova senha</label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }}
                  autoComplete="new-password"
                  aria-invalid={!!errors.confirmPassword}
                />
                {errors.confirmPassword && (
                  <span className={styles.error}>{errors.confirmPassword}</span>
                )}
              </div>

              <div className={styles.hints}>
                <p className={styles.hintTitle}>Requisitos:</p>
                <ul className={styles.hintList}>
                  <li className={newPassword.length >= 8 ? styles.hintMet : ''}>Mínimo 8 caracteres</li>
                  <li className={/[A-Z]/.test(newPassword) ? styles.hintMet : ''}>Uma letra maiúscula</li>
                  <li className={/[a-z]/.test(newPassword) ? styles.hintMet : ''}>Uma letra minúscula</li>
                  <li className={/\d/.test(newPassword) ? styles.hintMet : ''}>Um número</li>
                  <li className={/[^A-Za-z\d]/.test(newPassword) ? styles.hintMet : ''}>Um caractere especial</li>
                </ul>
              </div>

              <Button type="submit" variant="primary" fullWidth loading={loading}>
                Redefinir senha
              </Button>
            </form>

            <p className={styles.registerLink}>
              Lembrou a senha?{' '}
              <Link to="/login">Voltar para o login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
