import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@shared/layout/AdminLayout/AdminLayout';
import { api } from '@shared/lib/api';
import shared from './admin.shared.module.css';
import styles from './AdminGuestLists.module.css';

// ── Types ──────────────────────────────────────────────────────────────────

interface AdminEvent {
  id: string;
  title: string;
  startDate: string;
}

type ListType = 'free' | 'vip' | 'backstage' | 'press';

interface GuestList {
  id: string;
  eventId: string;
  name: string;
  type: ListType;
  maxGuests: number;
  totalEntries: number;
  checkedIn: number;
  createdAt: string;
}

type EntryStatus = 'pending' | 'checked_in';

interface GuestEntry {
  id: string;
  guestListId: string;
  name: string;
  cpf: string;
  email: string;
  phone: string;
  status: EntryStatus;
  checkedInAt: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────

const typeLabel: Record<ListType, { label: string; cls: string }> = {
  free:      { label: 'Free',      cls: shared.badgeGreen  },
  vip:       { label: 'VIP',       cls: shared.badgePurple },
  backstage: { label: 'Backstage', cls: shared.badgeYellow },
  press:     { label: 'Imprensa',  cls: shared.badgeBlue   },
};

const entryStatusLabel: Record<EntryStatus, { label: string; cls: string }> = {
  pending:    { label: 'Pendente',    cls: shared.badgeYellow },
  checked_in: { label: 'Check-in OK', cls: shared.badgeGreen  },
};

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

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

// ── Create List Form ──────────────────────────────────────────────────────

interface CreateListFormProps {
  eventId: string;
  onClose: () => void;
}

const CreateListForm: React.FC<CreateListFormProps> = ({ eventId, onClose }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', type: 'free' as ListType, maxGuests: '100' });

  const mutation = useMutation({
    mutationFn: () => api.post('/v1/guest-lists', { ...form, eventId, maxGuests: parseInt(form.maxGuests, 10) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guest-lists', eventId] });
      onClose();
    },
  });

  return (
    <div className={styles.formStack}>
      <div className={styles.formField}>
        <label className={styles.label}>Nome da lista</label>
        <input
          className={styles.input}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="ex: Lista VIP Camarote"
        />
      </div>
      <div className={styles.formField}>
        <label className={styles.label}>Tipo</label>
        <select
          className={styles.select}
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value as ListType })}
        >
          <option value="free">Free</option>
          <option value="vip">VIP</option>
          <option value="backstage">Backstage</option>
          <option value="press">Imprensa</option>
        </select>
      </div>
      <div className={styles.formField}>
        <label className={styles.label}>Limite de convidados</label>
        <input
          className={styles.input}
          type="number"
          value={form.maxGuests}
          onChange={(e) => setForm({ ...form, maxGuests: e.target.value })}
          min="1"
        />
      </div>
      <div className={styles.formActions}>
        <button className={shared.btnSecondary} onClick={onClose}>Cancelar</button>
        <button
          className={shared.btnPrimary}
          onClick={() => mutation.mutate()}
          disabled={!form.name.trim() || mutation.isPending}
        >
          {mutation.isPending ? 'Criando...' : 'Criar Lista'}
        </button>
      </div>
    </div>
  );
};

// ── Add Entry Form ────────────────────────────────────────────────────────

interface AddEntryFormProps {
  listId: string;
  onClose: () => void;
}

const AddEntryForm: React.FC<AddEntryFormProps> = ({ listId, onClose }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', cpf: '', email: '', phone: '' });

  const mutation = useMutation({
    mutationFn: () => api.post(`/v1/guest-lists/${listId}/entries`, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guest-list-entries', listId] });
      onClose();
    },
  });

  return (
    <div className={styles.formStack}>
      {(['name', 'cpf', 'email', 'phone'] as const).map((field) => (
        <div className={styles.formField} key={field}>
          <label className={styles.label}>
            {{ name: 'Nome completo', cpf: 'CPF', email: 'E-mail', phone: 'Telefone' }[field]}
          </label>
          <input
            className={styles.input}
            value={form[field]}
            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            placeholder={{ name: 'João Silva', cpf: '000.000.000-00', email: 'joao@email.com', phone: '(11) 99999-9999' }[field]}
          />
        </div>
      ))}
      <div className={styles.formActions}>
        <button className={shared.btnSecondary} onClick={onClose}>Cancelar</button>
        <button
          className={shared.btnPrimary}
          onClick={() => mutation.mutate()}
          disabled={!form.name.trim() || mutation.isPending}
        >
          {mutation.isPending ? 'Adicionando...' : 'Adicionar Convidado'}
        </button>
      </div>
    </div>
  );
};

// ── Entries Panel ─────────────────────────────────────────────────────────

interface EntriesPanelProps {
  list: GuestList;
  onBack: () => void;
}

const EntriesPanel: React.FC<EntriesPanelProps> = ({ list, onBack }) => {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');

  const { data: entries = [], isLoading } = useQuery<GuestEntry[]>({
    queryKey: ['guest-list-entries', list.id],
    queryFn: async () => {
      const r = await api.get<GuestEntry[]>(`/v1/guest-lists/${list.id}/entries`);
      return r.data ?? [];
    },
  });

  const filtered = entries.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.cpf.includes(search),
  );

  return (
    <>
      {showAdd && (
        <Modal title="Adicionar Convidado" onClose={() => setShowAdd(false)}>
          <AddEntryForm listId={list.id} onClose={() => setShowAdd(false)} />
        </Modal>
      )}

      <div className={shared.card}>
        <div className={shared.cardHeader}>
          <div className={styles.backRow}>
            <button className={shared.btnSecondary} onClick={onBack}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Voltar
            </button>
            <div>
              <h2 className={shared.cardTitle}>{list.name}</h2>
              <span className={`${shared.badge} ${typeLabel[list.type].cls}`}>
                {typeLabel[list.type].label}
              </span>
            </div>
          </div>
          <div className={shared.toolbar}>
            <div className={shared.searchWrapper}>
              <svg className={shared.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className={shared.searchInput}
                placeholder="Buscar convidado..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <label className={shared.btnSecondary} style={{ cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Importar CSV
              <input
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = async (event) => {
                    const text = event.target?.result as string;
                    const lines = text.split('\n').slice(1); // skip header
                    for (const line of lines) {
                      const [name, cpf, email, phone] = line.split(',').map(s => s.trim());
                      if (name) {
                        await api.post(`/v1/guest-lists/${list.id}/entries`, { name, cpf, email, phone });
                      }
                    }
                    qc.invalidateQueries({ queryKey: ['guest-list-entries', list.id] });
                  };
                  reader.readAsText(file);
                }}
              />
            </label>
            <button className={shared.btnPrimary} onClick={() => setShowAdd(true)}>
              + Adicionar
            </button>
          </div>
        </div>

        <div className={shared.tableWrapper}>
          {isLoading ? (
            <div className={styles.loading}>Carregando...</div>
          ) : (
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>E-mail</th>
                  <th>Status</th>
                  <th>Check-in em</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => {
                  const s = entryStatusLabel[entry.status];
                  return (
                    <tr key={entry.id}>
                      <td className={shared.tdBold}>{entry.name}</td>
                      <td className={shared.tdMono}>{entry.cpf}</td>
                      <td>{entry.email}</td>
                      <td>
                        <span className={`${shared.badge} ${s.cls}`}>{s.label}</span>
                      </td>
                      <td className={shared.tdMuted}>{fmt(entry.checkedInAt)}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--tl-text-muted)' }}>
                      Nenhum convidado encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────

const AdminGuestLists: React.FC = () => {
  const [selectedEventId, setSelectedEventId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedList, setSelectedList] = useState<GuestList | null>(null);

  const { data: events = [] } = useQuery<AdminEvent[]>({
    queryKey: ['admin-events-dropdown'],
    queryFn: async () => {
      const r = await api.get<{ events: AdminEvent[]; total: number }>('/v1/admin/events?limit=100');
      return r.data?.events ?? [];
    },
  });

  const { data: lists = [], isLoading } = useQuery<GuestList[]>({
    queryKey: ['guest-lists', selectedEventId],
    queryFn: async () => {
      const r = await api.get<GuestList[]>(`/v1/guest-lists?eventId=${selectedEventId}`);
      return r.data ?? [];
    },
    enabled: !!selectedEventId,
  });

  if (selectedList) {
    return (
      <AdminLayout>
        <div className={shared.page}>
          <div className={shared.pageHeader}>
            <div>
              <h1 className={shared.pageTitle}>Listas de Convidados</h1>
              <p className={shared.pageSubtitle}>Gerencie convidados por lista</p>
            </div>
          </div>
          <EntriesPanel list={selectedList} onBack={() => setSelectedList(null)} />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className={shared.page}>
        {showCreate && selectedEventId && (
          <Modal title="Nova Lista de Convidados" onClose={() => setShowCreate(false)}>
            <CreateListForm eventId={selectedEventId} onClose={() => setShowCreate(false)} />
          </Modal>
        )}

        {/* Header */}
        <div className={shared.pageHeader}>
          <div>
            <h1 className={shared.pageTitle}>Listas de Convidados</h1>
            <p className={shared.pageSubtitle}>Gerencie listas de convidados por evento</p>
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
              onChange={(e) => { setSelectedEventId(e.target.value); setSelectedList(null); }}
            >
              <option value="">— Selecione um evento —</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Lists Table */}
        {selectedEventId && (
          <div className={shared.card}>
            <div className={shared.cardHeader}>
              <h2 className={shared.cardTitle}>Listas do Evento</h2>
              <button className={shared.btnPrimary} onClick={() => setShowCreate(true)}>
                + Criar Lista
              </button>
            </div>

            <div className={shared.tableWrapper}>
              {isLoading ? (
                <div className={styles.loading}>Carregando listas...</div>
              ) : (
                <table className={shared.table}>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Tipo</th>
                      <th>Limite</th>
                      <th>Total</th>
                      <th>Check-ins</th>
                      <th>Conversão</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lists.map((list) => {
                      const conv = list.totalEntries > 0
                        ? ((list.checkedIn / list.totalEntries) * 100).toFixed(1)
                        : '0.0';
                      const t = typeLabel[list.type];
                      return (
                        <tr key={list.id}>
                          <td className={shared.tdBold}>{list.name}</td>
                          <td>
                            <span className={`${shared.badge} ${t.cls}`}>{t.label}</span>
                          </td>
                          <td>{list.maxGuests}</td>
                          <td>{list.totalEntries}</td>
                          <td>{list.checkedIn}</td>
                          <td>
                            <div className={styles.convRow}>
                              <div className={shared.inlineProgressTrack}>
                                <div
                                  className={shared.inlineProgressFill}
                                  style={{ width: `${conv}%` }}
                                />
                              </div>
                              <span>{conv}%</span>
                            </div>
                          </td>
                          <td>
                            <div className={shared.actions}>
                              <button
                                className={shared.actionBtn}
                                title="Ver entradas"
                                onClick={() => setSelectedList(list)}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {lists.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--tl-text-muted)' }}>
                          Nenhuma lista criada para este evento
                        </td>
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

export default AdminGuestLists;
