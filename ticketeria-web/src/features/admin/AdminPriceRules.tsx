import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@shared/layout/AdminLayout/AdminLayout';
import { api } from '@shared/lib/api';
import shared from './admin.shared.module.css';
import styles from './AdminPriceRules.module.css';

// ── Types ──────────────────────────────────────────────────────────────────

interface AdminEvent {
  id: string;
  title: string;
  startDate: string;
}

interface PriceBatch {
  id: string;
  name: string;
  currentPrice: number;
}

type ConditionType = 'sold_pct' | 'time_before';
type ActionType = 'increase_pct' | 'decrease_pct';

interface PriceRule {
  id: string;
  eventId: string;
  batchId: string;
  batchName: string;
  conditionType: ConditionType;
  conditionValue: number;
  actionType: ActionType;
  actionValue: number;
  active: boolean;
  createdAt: string;
}

interface RuleFormState {
  batchId: string;
  conditionType: ConditionType;
  conditionValue: string;
  actionType: ActionType;
  actionValue: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const CONDITION_LABELS: Record<ConditionType, string> = {
  sold_pct: 'Vendidos >',
  time_before: 'Horas antes do evento <',
};

const ACTION_LABELS: Record<ActionType, string> = {
  increase_pct: 'Aumentar preço em',
  decrease_pct: 'Diminuir preço em',
};

const describeRule = (rule: PriceRule) => {
  const cond =
    rule.conditionType === 'sold_pct'
      ? `Vendidos > ${rule.conditionValue}%`
      : `< ${rule.conditionValue}h antes do evento`;
  const action =
    rule.actionType === 'increase_pct'
      ? `↑ +${rule.actionValue}%`
      : `↓ -${rule.actionValue}%`;
  return { cond, action };
};

// ── Add Rule Modal ────────────────────────────────────────────────────────

interface AddRuleModalProps {
  eventId: string;
  batches: PriceBatch[];
  onClose: () => void;
}

const AddRuleModal: React.FC<AddRuleModalProps> = ({ eventId, batches, onClose }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState<RuleFormState>({
    batchId: '',
    conditionType: 'sold_pct',
    conditionValue: '80',
    actionType: 'increase_pct',
    actionValue: '10',
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/v1/admin/price-rules', {
        eventId,
        batchId: form.batchId,
        conditionType: form.conditionType,
        conditionValue: Number(form.conditionValue),
        actionType: form.actionType,
        actionValue: Number(form.actionValue),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['price-rules', eventId] });
      onClose();
    },
  });

  const valid = form.batchId && Number(form.conditionValue) > 0 && Number(form.actionValue) > 0;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Adicionar Regra de Preço</h3>
          <button className={styles.modalClose} onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Batch */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Lote</label>
            <select
              className={styles.select}
              value={form.batchId}
              onChange={(e) => setForm({ ...form, batchId: e.target.value })}
            >
              <option value="">— Selecione o lote —</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Condition */}
          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Condição</label>
              <select
                className={styles.select}
                value={form.conditionType}
                onChange={(e) => setForm({ ...form, conditionType: e.target.value as ConditionType })}
              >
                {(Object.entries(CONDITION_LABELS) as [ConditionType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                {form.conditionType === 'sold_pct' ? 'Percentual (%)' : 'Horas'}
              </label>
              <input
                className={styles.input}
                type="number"
                min="1"
                max={form.conditionType === 'sold_pct' ? '100' : '720'}
                value={form.conditionValue}
                onChange={(e) => setForm({ ...form, conditionValue: e.target.value })}
              />
            </div>
          </div>

          {/* Action */}
          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Ação</label>
              <select
                className={styles.select}
                value={form.actionType}
                onChange={(e) => setForm({ ...form, actionType: e.target.value as ActionType })}
              >
                {(Object.entries(ACTION_LABELS) as [ActionType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Percentual (%)</label>
              <input
                className={styles.input}
                type="number"
                min="1"
                max="100"
                value={form.actionValue}
                onChange={(e) => setForm({ ...form, actionValue: e.target.value })}
              />
            </div>
          </div>

          {/* Preview */}
          {form.batchId && (
            <div className={styles.rulePreview}>
              <span className={styles.previewLabel}>Resumo da regra:</span>
              <p className={styles.previewText}>
                Quando{' '}
                <strong>
                  {form.conditionType === 'sold_pct'
                    ? `${form.conditionValue}% dos ingressos forem vendidos`
                    : `faltar menos de ${form.conditionValue}h para o evento`}
                </strong>
                , {form.actionType === 'increase_pct' ? 'aumentar' : 'diminuir'} o preço em{' '}
                <strong>{form.actionValue}%</strong>.
              </p>
            </div>
          )}

          {mutation.isError && (
            <p className={styles.errorMsg}>Erro ao criar regra. Tente novamente.</p>
          )}

          <div className={styles.modalActions}>
            <button className={shared.btnSecondary} onClick={onClose}>Cancelar</button>
            <button
              className={shared.btnPrimary}
              onClick={() => mutation.mutate()}
              disabled={!valid || mutation.isPending}
            >
              {mutation.isPending ? 'Salvando...' : 'Criar Regra'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────

const AdminPriceRules: React.FC = () => {
  const [selectedEventId, setSelectedEventId] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const qc = useQueryClient();

  const { data: events = [] } = useQuery<AdminEvent[]>({
    queryKey: ['admin-events-dropdown'],
    queryFn: async () => {
      const r = await api.get<{ events: AdminEvent[]; total: number }>('/v1/admin/events?limit=100');
      return r.data?.events ?? [];
    },
  });

  const { data: batches = [] } = useQuery<PriceBatch[]>({
    queryKey: ['price-rule-batches', selectedEventId],
    queryFn: async () => {
      const r = await api.get<PriceBatch[]>(`/v1/admin/box-office/batches?eventId=${selectedEventId}`);
      return r.data ?? [];
    },
    enabled: !!selectedEventId,
  });

  const { data: rules = [], isLoading } = useQuery<PriceRule[]>({
    queryKey: ['price-rules', selectedEventId],
    queryFn: async () => {
      const r = await api.get<PriceRule[]>(`/v1/admin/price-rules?eventId=${selectedEventId}`);
      return r.data ?? [];
    },
    enabled: !!selectedEventId,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ ruleId, active }: { ruleId: string; active: boolean }) =>
      api.post(`/v1/admin/price-rules/${ruleId}/toggle`, { active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['price-rules', selectedEventId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (ruleId: string) => api.post(`/v1/admin/price-rules/${ruleId}/delete`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['price-rules', selectedEventId] });
    },
  });

  return (
    <AdminLayout>
      <div className={shared.page}>
        {showAdd && selectedEventId && (
          <AddRuleModal
            eventId={selectedEventId}
            batches={batches}
            onClose={() => setShowAdd(false)}
          />
        )}

        {/* ── Header ── */}
        <div className={shared.pageHeader}>
          <div>
            <h1 className={shared.pageTitle}>Regras de Preço Dinâmico</h1>
            <p className={shared.pageSubtitle}>Configure ajustes automáticos de preço por condição</p>
          </div>
        </div>

        {/* ── Event Selector ── */}
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
          <div className={shared.card}>
            <div className={shared.cardHeader}>
              <h2 className={shared.cardTitle}>
                Regras configuradas
                <span className={styles.ruleCount}>{rules.length}</span>
              </h2>
              <button className={shared.btnPrimary} onClick={() => setShowAdd(true)}>
                + Adicionar Regra
              </button>
            </div>

            {isLoading ? (
              <div className={styles.loading}>Carregando regras...</div>
            ) : rules.length === 0 ? (
              <div className={styles.emptyRules}>
                <div className={styles.emptyIcon}>⚡</div>
                <p className={styles.emptyTitle}>Nenhuma regra configurada</p>
                <p className={styles.emptyDesc}>
                  Adicione regras para ajustar automaticamente o preço dos lotes conforme condições do evento.
                </p>
                <button className={shared.btnPrimary} onClick={() => setShowAdd(true)}>
                  + Criar primeira regra
                </button>
              </div>
            ) : (
              <div className={shared.tableWrapper}>
                <table className={shared.table}>
                  <thead>
                    <tr>
                      <th>Lote</th>
                      <th>Condição</th>
                      <th>Ação</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map((rule) => {
                      const { cond, action } = describeRule(rule);
                      return (
                        <tr key={rule.id}>
                          <td className={shared.tdBold}>{rule.batchName}</td>
                          <td>
                            <span className={styles.conditionChip}>{cond}</span>
                          </td>
                          <td>
                            <span className={`${styles.actionChip} ${rule.actionType === 'increase_pct' ? styles.actionIncrease : styles.actionDecrease}`}>
                              {action}
                            </span>
                          </td>
                          <td>
                            <button
                              className={`${styles.toggleBtn} ${rule.active ? styles.toggleActive : styles.toggleInactive}`}
                              onClick={() => toggleMutation.mutate({ ruleId: rule.id, active: !rule.active })}
                              disabled={toggleMutation.isPending}
                            >
                              <span className={styles.toggleDot} />
                              {rule.active ? 'Ativa' : 'Inativa'}
                            </button>
                          </td>
                          <td>
                            <div className={shared.actions}>
                              <button
                                className={`${shared.actionBtn} ${shared.actionBtnDanger}`}
                                title="Remover regra"
                                onClick={() => {
                                  if (window.confirm('Remover esta regra?')) {
                                    deleteMutation.mutate(rule.id);
                                  }
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6l-1 14H6L5 6" />
                                  <path d="M10 11v6M14 11v6" />
                                  <path d="M9 6V4h6v2" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPriceRules;
