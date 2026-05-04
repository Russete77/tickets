import React, { useState } from 'react';
import { useAuth } from '@shared/hooks/useAuth';
import { useToastStore } from '@shared/stores/toastStore';
import { api } from '@shared/lib/api';
import { PublicLayout } from '@shared/layout/PublicLayout/PublicLayout';
import { Button } from '@shared/ui/Button/Button';
import { Input } from '@shared/ui/Input/Input';
import { Avatar } from '@shared/ui/Avatar/Avatar';
import { useTranslation } from '@shared/i18n';
import styles from './ProfilePage.module.css';

type Tab = 'info' | 'security' | 'preferences';

const ROLE_LABEL: Record<string, string> = {
  admin:    'Admin',
  promoter: 'Produtor',
  staff:    'Staff',
  buyer:    'Comprador',
};

const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const addToast = useToastStore((s) => s.addToast);

  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [infoLoading, setInfoLoading] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
  });

  // Password strength
  const getPasswordStrength = (pwd: string): { level: number; label: string; color: string } => {
    if (!pwd) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 1) return { level: 1, label: 'Fraca', color: styles.strengthWeak };
    if (score <= 3) return { level: 2, label: 'Média', color: styles.strengthMedium };
    return { level: 3, label: 'Forte', color: styles.strengthStrong };
  };

  const strength = getPasswordStrength(newPassword);

  const handleToggle = async (key: string, value: boolean) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    try {
      await api.patch('/v1/users/me/preferences', { [key]: value });
    } catch {
      setPreferences((prev) => ({ ...prev, [key]: !value }));
      addToast({ type: 'error', message: 'Erro ao salvar preferência' });
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoLoading(true);
    try {
      const payload: Record<string, unknown> = { name, phone };
      if (avatarFile) payload.avatarFileName = avatarFile.name;
      const response = await api.patch<typeof user>('/v1/users/me', payload);
      if (response.error) {
        addToast({ type: 'error', message: response.error });
      } else {
        if (response.data) setUser(response.data!);
        addToast({ type: 'success', message: 'Perfil atualizado com sucesso!' });
      }
    } finally {
      setInfoLoading(false);
    }
  };

  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast({ type: 'error', message: 'As senhas não conferem' });
      return;
    }
    if (newPassword.length < 8) {
      addToast({ type: 'error', message: 'A senha deve ter no mínimo 8 caracteres' });
      return;
    }
    setSecurityLoading(true);
    try {
      const response = await api.patch('/v1/users/me/password', {
        currentPassword,
        newPassword,
      });
      if (response.error) {
        addToast({ type: 'error', message: response.error });
      } else {
        addToast({ type: 'success', message: 'Senha alterada com sucesso!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } finally {
      setSecurityLoading(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'info',
      label: 'Informacoes',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      ),
    },
    {
      id: 'security',
      label: 'Seguranca',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      ),
    },
    {
      id: 'preferences',
      label: 'Preferencias',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M20 12h2M2 12h2M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41"/>
        </svg>
      ),
    },
  ];

  return (
    <PublicLayout>
      <div className={styles.page}>
        {/* ── Hero header ── */}
        <div className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.avatarWrap}>
              <Avatar
                src={avatarPreview ?? user?.avatar}
                name={user?.name ?? ''}
                size="xl"
              />
              <label className={styles.avatarEdit} aria-label="Alterar foto" title="Alterar foto">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <input
                  type="file"
                  accept="image/*"
                  className={styles.hiddenInput}
                  onChange={handleAvatarChange}
                />
              </label>
            </div>

            <div className={styles.heroInfo}>
              <h1 className={styles.heroName}>{user?.name}</h1>
              <p className={styles.heroEmail}>{user?.email}</p>
              <span className={styles.heroBadge}>
                {ROLE_LABEL[user?.role ?? ''] ?? user?.role}
              </span>
            </div>
          </div>

          {/* Tab pills inside hero */}
          <div className={styles.tabRow}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`${styles.tabPill} ${activeTab === tab.id ? styles.tabPillActive : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        <div className={styles.content}>
          {/* INFO TAB */}
          {activeTab === 'info' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--tl-brand)" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <h2 className={styles.cardTitle}>Informacoes pessoais</h2>
              </div>
              <form onSubmit={handleSaveInfo} className={styles.form}>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label className={styles.label}>Nome completo</label>
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome"
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Telefone</label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>
                    E-mail
                    <span className={styles.lockBadge}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="11" width="18" height="11" rx="2"/>
                        <path d="M7 11V7a5 5 0 0110 0v4"/>
                      </svg>
                      Nao editavel
                    </span>
                  </label>
                  <Input
                    type="email"
                    value={user?.email ?? ''}
                    disabled
                    placeholder="seu@email.com"
                  />
                </div>
                <div className={styles.formActions}>
                  <Button type="submit" variant="primary" loading={infoLoading}>
                    Salvar alteracoes
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--tl-brand)" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <h2 className={styles.cardTitle}>Alterar senha</h2>
              </div>
              <form onSubmit={handleSaveSecurity} className={styles.form}>
                <div className={styles.field}>
                  <label className={styles.label}>Senha atual</label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Nova senha</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimo 8 caracteres"
                    autoComplete="new-password"
                  />
                  {newPassword && (
                    <div className={styles.strengthWrap}>
                      <div className={styles.strengthBar}>
                        {[1, 2, 3].map((lvl) => (
                          <div
                            key={lvl}
                            className={`${styles.strengthSegment} ${lvl <= strength.level ? strength.color : ''}`}
                          />
                        ))}
                      </div>
                      <span className={`${styles.strengthLabel} ${strength.color}`}>{strength.label}</span>
                    </div>
                  )}
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Confirmar nova senha</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    autoComplete="new-password"
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <span className={styles.mismatch}>As senhas nao conferem</span>
                  )}
                </div>
                <div className={styles.formActions}>
                  <Button type="submit" variant="primary" loading={securityLoading}>
                    Alterar senha
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* PREFERENCES TAB */}
          {activeTab === 'preferences' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--tl-brand)" strokeWidth="2">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
                <h2 className={styles.cardTitle}>Preferencias de notificacao</h2>
              </div>
              <div className={styles.prefList}>
                <div className={styles.prefItem}>
                  <div className={styles.prefIcon}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  <div className={styles.prefInfo}>
                    <span className={styles.prefLabel}>Notificacoes por e-mail</span>
                    <span className={styles.prefDesc}>Receba atualizacoes sobre seus pedidos e eventos</span>
                  </div>
                  <button
                    className={`${styles.toggle} ${preferences.emailNotifications ? styles.toggleOn : ''}`}
                    role="switch"
                    aria-checked={preferences.emailNotifications}
                    onClick={() => handleToggle('emailNotifications', !preferences.emailNotifications)}
                  >
                    <span className={styles.toggleThumb} />
                  </button>
                </div>

                <div className={styles.prefItem}>
                  <div className={styles.prefIcon}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
                    </svg>
                  </div>
                  <div className={styles.prefInfo}>
                    <span className={styles.prefLabel}>Notificacoes push</span>
                    <span className={styles.prefDesc}>Alertas no navegador sobre eventos proximos</span>
                  </div>
                  <button
                    className={`${styles.toggle} ${preferences.pushNotifications ? styles.toggleOn : ''}`}
                    role="switch"
                    aria-checked={preferences.pushNotifications}
                    onClick={() => handleToggle('pushNotifications', !preferences.pushNotifications)}
                  >
                    <span className={styles.toggleThumb} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
};

export default ProfilePage;
