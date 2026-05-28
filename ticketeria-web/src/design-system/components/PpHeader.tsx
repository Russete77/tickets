import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandLockup } from './Logo';
import { GInput } from './GInput';
import { PButton } from './PButton';

interface PpHeaderProps {
  user?: { name: string; avatarUrl?: string | null } | null;
  onLoginClick?: () => void;
  searchPlaceholder?: string;
}

/**
 * Header do PulsePass — sticky, glassmorphism, logo + search + CTA.
 * Usado em todas as páginas públicas do consumer.
 */
export const PpHeader: React.FC<PpHeaderProps> = ({ user, onLoginClick, searchPlaceholder = 'Buscar evento, artista, casa…' }) => {
  const navigate = useNavigate();
  const [q, setQ] = React.useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(6, 7, 10, 0.72)',
        backdropFilter: 'blur(24px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.8)' as never,
        borderBottom: '1px solid var(--pp-edge-1)',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 24,
        }}
      >
        <Link
          to="/"
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', flexShrink: 0 }}
        >
          <BrandLockup tag="PASS" logoSize={36} tagline="" />
        </Link>

        <form onSubmit={submit} style={{ flex: 1, maxWidth: 520 }}>
          <GInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder}
            full
            iconRight={
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: 'var(--pp-fg-4)',
                  fontFamily: 'var(--pp-font-mono)',
                  fontSize: 11,
                }}
              >
                <kbd
                  style={{
                    padding: '3px 6px',
                    border: '1px solid var(--pp-edge-2)',
                    borderRadius: 6,
                    fontFamily: 'inherit',
                  }}
                >
                  ⌘K
                </kbd>
              </div>
            }
          />
        </form>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 'auto' }}>
          {user ? (
            <Link
              to="/profile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                textDecoration: 'none',
                color: 'var(--pp-fg)',
                padding: '6px 14px 6px 6px',
                borderRadius: 999,
                background: 'var(--pp-glass-2)',
                border: '1px solid var(--pp-edge-2)',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--pp-violet), var(--pp-pink))',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 700,
                  fontSize: 13,
                  color: '#fff',
                }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{user.name.split(' ')[0]}</span>
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--pp-fg-2)',
                  textDecoration: 'none',
                }}
                onClick={onLoginClick}
              >
                Entrar
              </Link>
              <PButton variant="primary" size="sm" onClick={() => navigate('/register')}>
                Cadastrar
              </PButton>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default PpHeader;
