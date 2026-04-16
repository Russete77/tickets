import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@shared/layout/AdminLayout/AdminLayout';
import { api } from '@shared/lib/api';
import { formatDate } from '@shared/lib/formatters';
import styles from './admin.shared.module.css';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'user' | 'organizer' | 'admin';
  ticketsBought: number;
  totalSpent: number;
  status: 'active' | 'suspended';
  createdAt: string;
  lastLogin: string;
}

const ROLE_MAP: Record<AdminUser['role'], { label: string; cls: string }> = {
  user:      { label: 'Usuário',    cls: styles.badgeBlue   },
  organizer: { label: 'Organizador',cls: styles.badgePurple },
  admin:     { label: 'Admin',      cls: styles.badgeRed    },
};

const PAGE_SIZE = 10;

const AdminUsers: React.FC = () => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, roleFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ search, role: roleFilter, page: String(page), limit: String(PAGE_SIZE) });
      const res = await api.get<{ users: AdminUser[]; total: number }>(`/v1/admin/users?${params}`);
      return res.data!;
    },
  });

  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminLayout>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Usuários</h1>
            <p className={styles.pageSubtitle}>{total} usuários cadastrados</p>
          </div>
          <button className={styles.btnSecondary}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Exportar
          </button>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.toolbar}>
              <div className={styles.searchWrapper}>
                <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  className={styles.searchInput}
                  placeholder="Buscar por nome ou e-mail..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
              <select
                className={styles.filterSelect}
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              >
                <option value="all">Todos os perfis</option>
                <option value="user">Usuários</option>
                <option value="organizer">Organizadores</option>
                <option value="admin">Admins</option>
              </select>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Telefone</th>
                  <th>Perfil</th>
                  <th>Ingressos</th>
                  <th>Total gasto</th>
                  <th>Cadastro</th>
                  <th>Último acesso</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 9 }).map((__, j) => (
                      <td key={j}><div style={{ height: 14, background: '#F3F4F6', borderRadius: 4 }} /></td>
                    ))}</tr>
                  ))
                ) : users.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: '#9CA3AF' }}>Nenhum usuário encontrado</td></tr>
                ) : (
                  users.map((u) => {
                    const r = ROLE_MAP[u.role] ?? { label: u.role, cls: styles.badgeGray };
                    return (
                      <tr key={u.id}>
                        <td>
                          <div className={styles.avatarCell}>
                            <div className={styles.avatarInitials} style={u.role === 'admin' ? { background: '#FEE2E2', color: '#DC2626' } : u.role === 'organizer' ? { background: '#EDE9FE', color: '#7C3AED' } : undefined}>
                              {u.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                            </div>
                            <div>
                              <div className={styles.avatarName}>{u.name}</div>
                              <div className={styles.avatarEmail}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className={styles.tdMuted}>{u.phone}</td>
                        <td><span className={`${styles.badge} ${r.cls}`}>{r.label}</span></td>
                        <td className={styles.tdMuted}>{u.ticketsBought}</td>
                        <td className={styles.tdBold}>
                          {u.totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className={styles.tdMuted}>{formatDate(u.createdAt)}</td>
                        <td className={styles.tdMuted}>{formatDate(u.lastLogin)}</td>
                        <td>
                          <span className={`${styles.badge} ${u.status === 'active' ? styles.badgeGreen : styles.badgeRed}`}>
                            {u.status === 'active' ? 'Ativo' : 'Suspenso'}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actions}>
                            <button className={styles.actionBtn} title="Ver perfil">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                            <button className={`${styles.actionBtn} ${u.status === 'active' ? styles.actionBtnDanger : ''}`} title={u.status === 'active' ? 'Suspender' : 'Reativar'}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <span className={styles.paginationInfo}>
              Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} de {total}
            </span>
            <div className={styles.paginationBtns}>
              <button className={styles.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                <button key={p} className={`${styles.pageBtn} ${page === p ? styles.pageBtnActive : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className={styles.pageBtn} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
