import React from 'react';
import { Link, useParams } from 'react-router-dom';

const cards = [
  { key: 'pos', label: 'Pontos de venda', desc: 'Bares, food trucks, totens.' },
  { key: 'categories', label: 'Categorias', desc: 'Organize produtos por categoria.' },
  { key: 'products', label: 'Produtos', desc: 'Cardápio, preços, fotos, estoque.' },
  { key: 'operators', label: 'Operadores', desc: 'Bartenders e seus PINs.' },
  { key: 'stock', label: 'Estoque', desc: 'Visão geral e movimentações.' },
  { key: 'orders', label: 'Pedidos pelo app', desc: 'Fila em tempo real dos pedidos feitos pelos clientes.' },
];

const AdminCashlessHubPage: React.FC = () => {
  const { organizationId = '', eventId = '' } = useParams<{ organizationId: string; eventId: string }>();
  const base = `/admin/orgs/${organizationId}/events/${eventId}/cashless`;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <h1>Cashless</h1>
      <p style={{ color: '#666' }}>Gerencie pontos de venda, cardápio, operadores e estoque deste evento.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginTop: 24 }}>
        {cards.map((c) => (
          <Link
            key={c.key}
            to={`${base}/${c.key}`}
            style={{
              display: 'block',
              padding: 20,
              border: '1px solid #ddd',
              borderRadius: 8,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <h3 style={{ margin: 0 }}>{c.label}</h3>
            <p style={{ marginTop: 8, marginBottom: 0, color: '#666', fontSize: 14 }}>{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AdminCashlessHubPage;
