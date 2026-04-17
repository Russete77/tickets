import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@shared/layout/AdminLayout/AdminLayout';
import { api } from '@shared/lib/api';
import shared from './admin.shared.module.css';
import styles from './AdminStaff.module.css';

// ── Types ──────────────────────────────────────────────────────────────────

interface AdminEvent {
  id: string;
  title: string;
  startDate: string;
}

type StaffRole = 'hostess' | 'security' | 'bar' | 'coordinator' | 'custom';

interface StaffMember {
  id: string;
  eventId: string;
  name: string;
  role: StaffRole;
  phone: string;
  shiftStart: string;
  shiftEnd: string;
  checkedIn: boolean;
  checkInsPerformed: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const roleLabel: Record<StaffRole, { label: string; cls: string }> = {
  hostess:     { label: 'Hostess',      cls: shared.badgePurple },
  security:    { label: 'Segurança',    cls: shared.badgeRed    },
  bar:         { label: 'Bar',          cls: shared.badgeBlue   },
  coordinator: { label: 'Coordenador',  cls: shared.badgeYellow },
  custom:      { label: 'Outro',        cls: shared.badgeGray   },
};

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

// ── Add Staff Form ─────────────────────────────────────────────────────────

interface AddStaffFormProps {
  eventId: string;
  onClose: () => void;
}

const AddStaffForm: React.FC<AddStaffFormProps> = ({ eventId, onClose }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    role: 'hostess' as StaffRole,
    phone: '',
    shiftStart: '18:00',
    shiftEnd: '02:00',
  });

  const mutation = useMutation({
    mutationFn: () => api.post('/v1/staff', { ...form, eventId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff', eventId] });
      onClose();
    },
  });

  return (
    <div className={styles.formStack}>
      <div className={styles.formField}>
        <label className={styles.label}>Nome completo</label>
        <input
          className={styles.input}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="ex: Ana Lima"
        />
      </div>
      <div className={styles.formField}>
        <label className={styles.label}>Função</label>
        <select
          className={styles.select}
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}
        >
          <option value="hostess">Hostess</option>
          <option value="security">Segurança</option>
          <option value="bar">Bar</option>
          <option value="coordinator">Coordenador</option>
          <option value="custom">Outro</option>
        </select>
      </div>
      <div className={styles.formField}>
        <label className={styles.label}>Telefone</label>
        <input
          className={styles.input}
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="(11) 99999-9999"
        />
      </div>
      <div className={styles.formRow}>
        <div className={styles.formField}>
          <label className={styles.label}>Início do turno</label>
          <input
            className={styles.input}
            type="time"
            value={form.shiftStart}
            onChange={(e) => setForm({ ...form, shiftStart: e.target.value })}
          />
        </div>
        <div className={styles.formField}>
          <label className={styles.label}>Fim do turno</label>
          <input
            className={styles.input}
            type="time"
            value={form.shiftEnd}
            onChange={(e) => setForm({ ...form, shiftEnd: e.target.value })}
          />
        </div>
      </div>
      <div className={styles.formActions}>
        <button className={shared.btnSecondary} onClick={onClose}>Cancelar</button>
        <button
          className={shared.btnPrimary}
          onClick={() => mutation.mutate()}
          disabled={!form.name.trim() || mutation.isPending}
        >
          {mutation.isPending ? 'Adicionando...' : 'Adicionar Staff'}
        </button>
      </div>
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────

const AdminStaff: React.FC = () => {
  const [selectedEventId, setSelectedEventId] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const { data: events = [] } = useQuery<AdminEvent[]>({
    queryKey: ['admin-events-dropdown'],
    queryFn: async () => {
      const r = await api.get<{ events: AdminEvent[]; total: number }>('/v1/admin/events?limit=100');
      return r.data?.events ?? [];
    },
  });

  const { data: staff = [], isLoading } = useQuery<StaffMember[]>({
    queryKey: ['staff', selectedEventId],
    queryFn: async () => {
      const r = await api.get<StaffMember[]>(`/v1/staff?eventId=${selectedEventId}`);
      return r.data ?? [];
    },
    enabled: !!selectedEventId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/v1/staff/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff', selectedEventId] }),
  });

  const filtered = staff.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search),
  );

  return (
    <AdminLayout>
      <div className={shared.page}>
        {showAdd && selectedEventId && (
          <Modal title="Adicionar Staff" onClose={() => setShowAdd(false)}>
            <AddStaffForm eventId={selectedEventId} onClose={() => setShowAdd(false)} />
          </Modal>
        )}

        {/* Header */}
        <div className={shared.pageHeader}>
          <div>
            <h1 className={shared.pageTitle}>Equipe (Staff)</h1>
            <p className={shared.pageSubtitle}>Gerencie a equipe de trabalho por evento</p>
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

        {/* Staff Table */}
        {selectedEventId && (
          <div className={shared.card}>
            <div className={shared.cardHeader}>
              <h2 className={shared.cardTitle}>Staff do Evento</h2>
              <div className={shared.toolbar}>
                <div className={shared.searchWrapper}>
                  <svg className={shared.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    className={shared.searchInput}
                    placeholder="Buscar colaborador..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <button className={shared.btnPrimary} onClick={() => setShowAdd(true)}>
                  + Adicionar Staff
                </button>
              </div>
            </div>

            <div className={shared.tableWrapper}>
              {isLoading ? (
                <div className={styles.loading}>Carregando equipe...</div>
              ) : (
                <table className={shared.table}>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Função</th>
                      <th>Telefone</th>
                      <th>Turno</th>
                      <th>Check-in</th>
                      <th>Check-ins feitos</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((member) => {
                      const r = roleLabel[member.role];
                      return (
                        <tr key={member.id}>
                          <td className={shared.tdBold}>{member.name}</td>
                          <td>
                            <span className={`${shared.badge} ${r.cls}`}>{r.label}</span>
                          </td>
                          <td className={shared.tdMono}>{member.phone}</td>
                          <td className={shared.tdMuted}>{member.shiftStart} – {member.shiftEnd}</td>
                          <td>
                            <span className={`${shared.badge} ${member.checkedIn ? shared.badgeGreen : shared.badgeGray}`}>
                              {member.checkedIn ? 'Presente' : 'Ausente'}
                            </span>
                          </td>
                          <td>{member.checkInsPerformed}</td>
                          <td>
                            <div className={shared.actions}>
                              <button
                                className={`${shared.actionBtn} ${shared.actionBtnDanger}`}
                                title="Remover"
                                onClick={() => deleteMutation.mutate(member.id)}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                                  <path d="M10 11v6M14 11v6" />
                                  <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr className={shared.emptyRow}>
                        <td colSpan={7}>Nenhum colaborador encontrado</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminStaff;
