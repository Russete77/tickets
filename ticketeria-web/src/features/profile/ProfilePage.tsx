import React, { useState } from 'react';
import { useAuth } from '@shared/hooks/useAuth';
import { useToastStore } from '@shared/stores/toastStore';
import { api } from '@shared/lib/api';
import { PublicLayout } from '@shared/layout/PublicLayout/PublicLayout';
import { Button } from '@shared/ui/Button/Button';
import { Input } from '@shared/ui/Input/Input';
import { Avatar } from '@shared/ui/Avatar/Avatar';
import styles from './ProfilePage.module.css';

type Tab = 'info' | 'security' | 'preferences';

const ProfilePage: React.FC = () => {
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

  const handleToggle = async (key: string, value: boolean) => {
    // Optimistic update
    setPreferences((prev) => ({ ...prev, [key]: value }));
    try {
      await api.patch('/v1/users/me/preferences', { [key]: value });
    } catch {
      // Revert on failure
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

  const tabs: { id: Tab; label: string }[] = [
    { id: 'info', label: 'Informações pessoais' },
    { id: 'security', label: 'Segurança' },
    { id: 'preferences', label: 'Preferências' },
  ];

  return (
    <PublicLayout>
      <div className={styles.page}>
        <div className={styles.hero}>
          <div className={styles.avatarSection}>
            <div className={styles.avatarWrapper}>
              <Avatar
                src={avatarPreview ?? user?.avatar}
                name={user?.name ?? ''}
                size="xl"
              />
              <label className={styles.avatarEdit} aria-label="Alterar foto">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            <div className={styles.userSummary}>
              <h1 className={styles.userName}>{user?.name}</h1>
              <p className={styles.userEmail}>{user?.email}</p>
              <span className={styles.roleBadge}>{user?.role}</span>
            </div>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.sidebar}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`${styles.sidebarTab} ${activeTab === tab.id ? styles.sidebarTabActive : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={styles.content}>
            {activeTab === 'info' && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Informações pessoais</h2>
                <form onSubmit={handleSaveInfo} className={styles.form}>
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
                    <label className={styles.label}>E-mail</label>
                    <Input
                      type="email"
                      value={user?.email ?? ''}
                      disabled
                      placeholder="seu@email.com"
                    />
                    <span className={styles.hint}>O e-mail não pode ser alterado</span>
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
                  <Button type="submit" variant="primary" loading={infoLoading}>
                    Salvar alterações
                  </Button>
                </form>
              </section>
            )}

            {activeTab === 'security' && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Alterar senha</h2>
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
                      placeholder="Mínimo 8 caracteres"
                      autoComplete="new-password"
                    />
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
                  </div>
                  <Button type="submit" variant="primary" loading={securityLoading}>
                    Alterar senha
                  </Button>
                </form>
              </section>
            )}

            {activeTab === 'preferences' && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Preferências de notificação</h2>
                <div className={styles.preferencesList}>
                  <label className={styles.toggle}>
                    <div className={styles.toggleInfo}>
                      <span className={styles.toggleLabel}>Notificações por e-mail</span>
                      <span className={styles.toggleDesc}>Receba atualizações sobre seus pedidos e eventos</span>
                    </div>
                    <div
                      className={`${styles.toggleSwitch} ${preferences.emailNotifications ? styles.toggleOn : ''}`}
                      role="switch"
                      aria-checked={preferences.emailNotifications}
                      onClick={() => handleToggle('emailNotifications', !preferences.emailNotifications)}
                    >
                      <div className={styles.toggleThumb} />
                    </div>
                  </label>

                  <label className={styles.toggle}>
                    <div className={styles.toggleInfo}>
                      <span className={styles.toggleLabel}>Notificações push</span>
                      <span className={styles.toggleDesc}>Alertas no navegador sobre eventos próximos</span>
                    </div>
                    <div
                      className={`${styles.toggleSwitch} ${preferences.pushNotifications ? styles.toggleOn : ''}`}
                      role="switch"
                      aria-checked={preferences.pushNotifications}
                      onClick={() => handleToggle('pushNotifications', !preferences.pushNotifications)}
                    >
                      <div className={styles.toggleThumb} />
                    </div>
                  </label>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default ProfilePage;
