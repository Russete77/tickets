import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@shared/layout/AdminLayout/AdminLayout';
import { api } from '@shared/lib/api';
import shared from './admin.shared.module.css';
import styles from './AdminPromoters.module.css';

// ── Types ──────────────────────────────────────────────────────────────────

interface AdminEvent {
  id: string;
  title: string;
  startDate: string;
}

type PromoterTier = 'gold' | 'silver' | 'bronze';

interface Promoter {
  id: string;
  eventId: string;
  name: string;
  email: string;
  slug: string;
  tier: PromoterTier;
  totalGuests: number;
  checkIns: number;
  conversionPct: number;
  score: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────

const tierLabel: Record<PromoterTier, { label: string; cls: string }> = {
  gold:   { label: 'Ouro',   cls: styles.tierGold   },
  silver: { label: 'Prata',  cls: styles.tierSilver },
  bronze: { label: 'Bronze', cls: styles.tierBronze },
};

const BASE_URL = import.meta.env.VITE_APP_URL || window.location.origin;

// ── Modal ─────────────────────────────────────────────────────────────────

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ title, onClose, children }) => (
  <div className={styles.modalOverlay} onClick={onClose}>
    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
      <div className={styles.modalHeader}>
        <h3 className={styles.modalTitle}>{title}</h3>
        <button className={styles.modalClose} onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className={styles.modalBody}>{children}</div>
    </div>
  </div>
);

// ── Add Promoter Form ─────────────────────────────────────────────────────

interface AddPromoterFormProps {
  eventId: string;
  onClose: () => void;
}

const AddPromoterForm: React.FC<AddPromoterFormProps> = ({ eventId, onClose }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '', slug: '' });

  const slugify = (v: string) =>
    v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const mutation = useMutation({
    mutationFn: () => api.post('/v1/promoters', { ...form, eventId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promoters', eventId] });
      onClose();
    },
  });

  return (
    <div className={styles.formStack}>
      <div className={styles.formField}>
        <label className={styles.label}>Nome</label>
        <input
          className={styles.input}
          value={form.name}
          onChange={(e) => {
            const name = e.target.value;
            setForm({ ...form, name, slug: form.slug || slugify(name) });
          }}
          placeholder="Diego Souza"
        />
      </div>
      <div className={styles.formField}>
        <label className={styles.label}>E-mail</label>
        <input
          className={styles.input}
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="diego@promo.com"
        />
      </div>
      <div className={styles.formField}>
        <label className={styles.label}>Slug do link</label>
        <div className={styles.slugInputRow}>
          <span className={styles.slugPrefix}>/p/</span>
          <input
            className={`${styles.input} ${styles.slugInput}`}
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
            placeholder="diego-s"
          />
        </div>
        <span className={styles.hint}>
          Link gerado: {BASE_URL}/p/{form.slug || 'slug'}
        </span>
      </div>
      <div className={styles.formActions}>
        <button className={shared.btnSecondary} onClick={onClose}>Cancelar</button>
        <button
          className={shared.btnPrimary}
          onClick={() => mutation.mutate()}
          disabled={!form.name.trim() || !form.slug.trim() || mutation.isPending}
        >
          {mutation.isPending ? 'Adicionando...' : 'Adicionar Promoter'}
        </button>
      </div>
    </div>
  );
};

// ── KPI Card ──────────────────────────────────────────────────────────────

interface KpiProps {
  label: string;
  value: string;
  sub?: string;
  color?: 'blue' | 'green' | 'orange' | 'purple';
}

const KpiCard: React.FC<KpiProps> = ({ label, value, sub, color = 'blue' }) => (
  <div className={`${shared.kpiMini} ${styles[`kpiColor_${color}`]}`}>
    <p className={shared.kpiMiniLabel}>{label}</p>
    <p className={shared.kpiMiniValue}>{value}</p>
    {sub && <p className={shared.kpiMiniSub}>{sub}</p>}
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────

const AdminPromoters: React.FC = () => {
  const [selectedEventId, setSelectedEventId] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: events = [] } = useQuery<AdminEvent[]>({
    queryKey: ['admin-events-dropdown'],
    queryFn: async () => {
      const r = await api.get<{ events: AdminEvent[]; total: number }>('/v1/admin/events?limit=100');
      return r.data?.events ?? [];
    },
  });

  const { data: promoters = [], isLoading } = useQuery<Promoter[]>({
    queryKey: ['promoters', selectedEventId],
    queryFn: async () => {
      const r = await api.get<Promoter[]>(`/v1/promoters?eventId=${selectedEventId}`);
      return r.data ?? [];
    },
    enabled: !!selectedEventId,
  });

  const filtered = promoters.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase()),
  );

  const sorted = [...filtered].sort((a, b) => b.score - a.score);

  const totalGuests = promoters.reduce((s, p) => s + p.totalGuests, 0);
  const avgConversion = promoters.length
    ? (promoters.reduce((s, p) => s + p.conversionPct, 0) / promoters.length).toFixed(1)
    : '0.0';
  const top = promoters.length ? [...promoters].sort((a, b) => b.score - a.score)[0] : null;

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${BASE_URL}/p/${slug}`);
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <AdminLayout>
      <div className={shared.page}>
        {showAdd && selectedEventId && (
          <Modal title="Adicionar Promoter" onClose={() => setShowAdd(false)}>
            <AddPromoterForm eventId={selectedEventId} onClose={() => setShowAdd(false)} />
          </Modal>
        )}

        {/* Header */}
        <div className={shared.pageHeader}>
          <div>
            <h1 className={shared.pageTitle}>Promoters</h1>
            <p className={shared.pageSubtitle}>Gerencie e acompanhe o desempenho dos promoters</p>
          </div>
        </div>

        {/* Event Selector */}
        <div className={shared.card}>
          <div className={shared.cardHeader}>
            <h2 className={shared.cardTitle}>Selecionar Evento</h2>
          </div>
          <div className={shared.cardBody}>
            <select
              className={styles.eventSelect}
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
            >
              <option value="">— Selecione um evento —</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedEventId && (
          <>
            {/* KPIs */}
            <div className={shared.kpiRow}>
              <KpiCard label="Total Promoters" value={String(promoters.length)} color="blue" />
              <KpiCard label="Total Convidados" value={totalGuests.toLocaleString('pt-BR')} color="green" />
              <KpiCard label="Conversão Média" value={`${avgConversion}%`} color="orange" />
              <KpiCard
                label="Top Promoter"
                value={top?.name ?? '—'}
                sub={top ? `Score: ${top.score}` : undefined}
                color="purple"
              />
            </div>

            {/* Table */}
            <div className={shared.card}>
              <div className={shared.cardHeader}>
                <h2 className={shared.cardTitle}>Ranking de Promoters</h2>
                <div className={shared.toolbar}>
                  <div className={shared.searchWrapper}>
                    <svg className={shared.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      className={shared.searchInput}
                      placeholder="Buscar promoter..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <button className={shared.btnPrimary} onClick={() => setShowAdd(true)}>
                    + Adicionar
                  </button>
                </div>
              </div>

              <div className={shared.tableWrapper}>
                {isLoading ? (
                  <div className={styles.loading}>Carregando promoters...</div>
                ) : (
                  <table className={shared.table}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Nome</th>
                        <th>Slug</th>
                        <th>Tier</th>
                        <th>Convidados</th>
                        <th>Check-ins</th>
                        <th>Conversão</th>
                        <th>Score</th>
                        <th>Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((p, idx) => {
                        const t = tierLabel[p.tier];
                        return (
                          <tr key={p.id}>
                            <td className={shared.tdMono}>#{idx + 1}</td>
                            <td>
                              <div className={shared.avatarCell}>
                                <div className={shared.avatarInitials}>
                                  {p.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                                </div>
                                <div>
                                  <div className={shared.avatarName}>{p.name}</div>
                                  <div className={shared.avatarEmail}>{p.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className={shared.tdMono}>{p.slug}</td>
                            <td>
                              <span className={`${shared.badge} ${t.cls}`}>{t.label}</span>
                            </td>
                            <td className={shared.tdBold}>{p.totalGuests.toLocaleString('pt-BR')}</td>
                            <td>{p.checkIns.toLocaleString('pt-BR')}</td>
                            <td>
                              <div className={styles.convRow}>
                                <div className={shared.inlineProgressTrack}>
                                  <div
                                    className={`${shared.inlineProgressFill} ${p.conversionPct < 50 ? shared.inlineProgressFillDanger : ''}`}
                                    style={{ width: `${p.conversionPct}%` }}
                                  />
                                </div>
                                <span className={shared.tdMuted}>{p.conversionPct.toFixed(1)}%</span>
                              </div>
                            </td>
                            <td>
                              <span className={`${styles.scoreChip} ${p.score >= 90 ? styles.scoreHigh : p.score >= 70 ? styles.scoreMid : styles.scoreLow}`}>
                                {p.score}
                              </span>
                            </td>
                            <td>
                              <button
                                className={`${shared.actionBtn} ${copied === p.slug ? styles.copied : ''}`}
                                title="Copiar link"
                                onClick={() => copyLink(p.slug)}
                              >
                                {copied === p.slug ? (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                ) : (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                                  </svg>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {sorted.length === 0 && (
                        <tr>
                          <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--tl-text-muted)' }}>
                            Nenhum promoter encontrado
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Top 5 Rankings */}
            {sorted.length > 0 && (
              <div className={shared.card}>
                <div className={shared.cardHeader}>
                  <h2 className={shared.cardTitle}>Top 5 Promoters</h2>
                </div>
                <div className={shared.cardBody}>
                  {sorted.slice(0, 5).map((p, idx) => {
                    const pct = sorted[0].score > 0 ? (p.score / sorted[0].score) * 100 : 0;
                    const t = tierLabel[p.tier];
                    return (
                      <div key={p.id} className={styles.rankRow}>
                        <span className={styles.rankPos}>#{idx + 1}</span>
                        <div className={styles.rankInfo}>
                          <div className={styles.rankNameRow}>
                            <span className={styles.rankName}>{p.name}</span>
                            <span className={`${shared.badge} ${t.cls}`}>{t.label}</span>
                          </div>
                          <div className={styles.rankBar}>
                            <div className={styles.rankFill} style={{ width: `${pct}%` }} />
                          </div>
                          <div className={styles.rankMeta}>
                            {p.totalGuests} convidados &bull; {p.checkIns} check-ins &bull; {p.conversionPct.toFixed(1)}% conversão
                          </div>
                        </div>
                        <span className={`${styles.scoreChip} ${p.score >= 90 ? styles.scoreHigh : p.score >= 70 ? styles.scoreMid : styles.scoreLow}`}>
                          {p.score}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPromoters;
