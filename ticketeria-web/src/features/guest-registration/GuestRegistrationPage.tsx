import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@shared/lib/api';
import { Skeleton } from '@shared/ui/Skeleton/Skeleton';
import styles from './GuestRegistrationPage.module.css';

// ── Types ──────────────────────────────────────────────────────────────────

interface PublicEvent {
  id: string;
  title: string;
  startDate: string;
  venue: { name: string; city: string; state: string };
  coverImage: string;
  promoter: { name: string };
}

interface RegisterResult {
  guestId: string;
  name: string;
  qrCodeUrl: string;
  message: string;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  cpf: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatPhone = (v: string) => {
  const digits = v.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const formatCpf = (v: string) => {
  const digits = v.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

// ── Page ──────────────────────────────────────────────────────────────────

const GuestRegistrationPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<FormState>({ name: '', email: '', phone: '', cpf: '' });
  const [result, setResult] = useState<RegisterResult | null>(null);
  const [errors, setErrors] = useState<Partial<FormState>>({});

  const { data: eventData, isLoading: eventLoading, error: eventError } = useQuery({
    queryKey: ['guest-list-public', slug],
    queryFn: async () => {
      const response = await api.get<PublicEvent>(`/v1/guest-lists/public/${slug}`);
      if (response.error) throw new Error(response.error);
      return response.data!;
    },
    enabled: !!slug,
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post<RegisterResult>('/v1/guest-lists/register', {
        slug,
        ...form,
      });
      if (response.error) throw new Error(response.error);
      return response.data!;
    },
    onSuccess: (data) => {
      setResult(data);
    },
  });

  const validate = (): boolean => {
    const errs: Partial<FormState> = {};
    if (!form.name.trim()) errs.name = 'Nome é obrigatório';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'E-mail inválido';
    }
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 10) {
      errs.phone = 'Telefone inválido';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      registerMutation.mutate();
    }
  };

  // ── Success screen ──
  if (result) {
    return (
      <div className={styles.root}>
        <div className={styles.successContainer}>
          <div className={styles.successIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className={styles.successTitle}>Você está na lista!</h1>
          <p className={styles.successSub}>
            Olá, <strong>{result.name}</strong>! Seu cadastro foi confirmado.
          </p>
          <p className={styles.successInstructions}>
            Apresente este QR code na entrada do evento
          </p>
          {result.qrCodeUrl && (
            <div className={styles.qrWrap}>
              <img src={result.qrCodeUrl} alt="QR Code de entrada" className={styles.qrImage} />
            </div>
          )}
          <p className={styles.successNote}>
            Salve este QR code ou tire um print desta tela. Boa diversão!
          </p>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (eventError) {
    return (
      <div className={styles.root}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>🔍</div>
          <h1 className={styles.errorTitle}>Link não encontrado</h1>
          <p className={styles.errorDesc}>
            Este link de convite pode ter expirado ou não existe.
            Entre em contato com o promoter que te enviou o link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {/* ── Cover ── */}
      {eventLoading ? (
        <Skeleton width="100%" height="280px" borderRadius="0" />
      ) : eventData ? (
        <div className={styles.hero}>
          <img src={eventData.coverImage} alt={eventData.title} className={styles.heroImage} />
          <div className={styles.heroOverlay} />
          <div className={styles.heroContent}>
            <p className={styles.heroPre}>Você foi convidado por <strong>{eventData.promoter.name}</strong></p>
            <h1 className={styles.heroTitle}>{eventData.title}</h1>
            <div className={styles.heroMeta}>
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {formatDate(eventData.startDate)}
              </span>
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                {eventData.venue.name} — {eventData.venue.city}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Form ── */}
      <div className={styles.formContainer}>
        <div className={styles.formCard}>
          <h2 className={styles.formTitle}>Garanta seu lugar na lista</h2>
          <p className={styles.formSubtitle}>
            Preencha seus dados para confirmar presença no evento.
          </p>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {/* Name */}
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="name">Nome completo *</label>
              <input
                id="name"
                className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                type="text"
                placeholder="Seu nome completo"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoComplete="name"
              />
              {errors.name && <span className={styles.errorMsg}>{errors.name}</span>}
            </div>

            {/* Email */}
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="email">E-mail *</label>
              <input
                id="email"
                className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                type="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
              />
              {errors.email && <span className={styles.errorMsg}>{errors.email}</span>}
            </div>

            {/* Phone */}
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="phone">Telefone / WhatsApp *</label>
              <input
                id="phone"
                className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
                type="tel"
                placeholder="(11) 99999-0000"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
                autoComplete="tel"
              />
              {errors.phone && <span className={styles.errorMsg}>{errors.phone}</span>}
            </div>

            {/* CPF (optional) */}
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="cpf">
                CPF <span className={styles.optional}>(opcional)</span>
              </label>
              <input
                id="cpf"
                className={styles.input}
                type="text"
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: formatCpf(e.target.value) })}
              />
            </div>

            {registerMutation.isError && (
              <div className={styles.submitError}>
                {(registerMutation.error as Error).message || 'Erro ao realizar cadastro. Tente novamente.'}
              </div>
            )}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? (
                <>
                  <span className={styles.spinner} />
                  Confirmando presença...
                </>
              ) : (
                'Confirmar presença na lista'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GuestRegistrationPage;
