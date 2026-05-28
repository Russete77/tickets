import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@shared/hooks/useAuth';
import { useDocumentHead } from '@shared/hooks/useDocumentHead';
import { useToastStore } from '@shared/stores/toastStore';
import { useTranslation } from '@shared/i18n';
import {
  Aurora,
  PButton,
  Logo,
  flyerPalette,
} from '@/design-system';
import styles from './LoginPage.module.css';

const LoginPage: React.FC = () => {
  useTranslation();
  const { login } = useAuth();
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect') ?? '/';

  useDocumentHead({
    title: 'Entrar — PulsePass',
    description: 'Acesse sua conta PulsePass para ver ingressos, saldo cashless e amigos no evento.',
    ogTitle: 'Entrar — PulsePass',
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!email.trim()) next.email = 'E-mail obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'E-mail inválido';
    if (!password) next.password = 'Senha obrigatória';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email, password);
      navigate(redirect);
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Credenciais inválidas',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Aurora style={{ minHeight: '100vh' }} intensity={1.2}>
      <div className={styles.page}>
        {/* HERO ARTWORK — 3 cards empilhados em depth */}
        <div className={styles.hero}>
          <div className={styles.heroStack}>
            {[
              { rot: -8, ty: 0, tx: -90, hue: flyerPalette.violet, hue2: flyerPalette.pink, label: 'Festival Sol', date: 'SÁB · 22H' },
              { rot: 4, ty: -40, tx: 30, hue: flyerPalette.green, hue2: flyerPalette.cyan, label: 'Boate Roxa', date: 'TODA QUI', front: true },
              { rot: 12, ty: 40, tx: 120, hue: flyerPalette.pink, hue2: flyerPalette.amber, label: 'Sunset Bar', date: 'DOM · 19H' },
            ].map((c, i) => (
              <div
                key={i}
                className={`${styles.stackCard} ${c.front ? styles.stackCardFront : ''}`}
                style={{
                  transform: `translate(${c.tx}px, ${c.ty}px) rotate(${c.rot}deg)`,
                  background: `radial-gradient(80% 80% at 20% 20%, ${c.hue}, transparent 60%), radial-gradient(80% 80% at 80% 80%, ${c.hue2}, transparent 60%), #0a0a0c`,
                }}
              >
                <div className={styles.stackCardOverlay} />
                <div className={styles.stackCardDate}>{c.date}</div>
                <div className={styles.stackCardLabel}>{c.label}</div>
              </div>
            ))}
            {/* Pulse rings */}
            <svg className={styles.pulseRings} aria-hidden>
              <circle cx="50%" cy="50%" r="200" fill="none" stroke={flyerPalette.green} strokeOpacity="0.10" strokeWidth="1" />
              <circle cx="50%" cy="50%" r="280" fill="none" stroke={flyerPalette.green} strokeOpacity="0.06" strokeWidth="1" />
            </svg>
          </div>
        </div>

        {/* BOTTOM SHEET — glass form */}
        <div className={styles.sheet}>
          <div className={styles.sheetInner}>
            <div className={styles.brand}>
              <Logo size={32} />
              <div className={styles.brandText}>
                <span>Pulse</span>
                <span className={styles.brandPass}>PASS</span>
              </div>
            </div>

            <div className={styles.eyebrow}>Bem-vindo de volta</div>
            <h1 className={styles.title}>
              Sua noite,{' '}
              <span className={styles.titleAccent}>do ingresso ao último gole.</span>
            </h1>
            <p className={styles.subtitle}>
              Ticketeria, lista de convidados e cashless num app só.
              Sem fila, sem dinheiro, sem complicação.
            </p>

            <form onSubmit={handleSubmit} className={styles.form} noValidate>
              <div className={styles.field}>
                <label htmlFor="email" className={styles.label}>E-mail</label>
                <div className={`${styles.inputWrap} ${errors.email ? styles.inputWrapError : ''}`}>
                  <input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className={styles.input}
                  />
                </div>
                {errors.email && <span className={styles.errorText}>{errors.email}</span>}
              </div>

              <div className={styles.field}>
                <div className={styles.passwordRow}>
                  <label htmlFor="password" className={styles.label}>Senha</label>
                  <Link to="/forgot-password" className={styles.forgot}>Esqueci a senha</Link>
                </div>
                <div className={`${styles.inputWrap} ${errors.password ? styles.inputWrapError : ''}`}>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className={styles.input}
                  />
                </div>
                {errors.password && <span className={styles.errorText}>{errors.password}</span>}
              </div>

              <PButton
                type="submit"
                variant="primary"
                size="lg"
                full
                loading={loading}
                iconRight={
                  !loading && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  )
                }
              >
                {loading ? 'Entrando…' : 'Entrar'}
              </PButton>
            </form>

            <div className={styles.register}>
              Novo no PulsePass? <Link to="/register" className={styles.registerLink}>Crie sua conta</Link>
            </div>

            <div className={styles.terms}>
              Ao entrar você aceita os{' '}
              <Link to="/terms" className={styles.termsLink}>Termos</Link> e a{' '}
              <Link to="/privacy" className={styles.termsLink}>Política</Link>
            </div>
          </div>
        </div>
      </div>
    </Aurora>
  );
};

export default LoginPage;
