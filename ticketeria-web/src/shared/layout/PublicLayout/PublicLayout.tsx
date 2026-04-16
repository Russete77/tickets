import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@shared/hooks/useAuth';
import { useCartStore } from '@shared/stores/cartStore';
import { Button } from '@shared/ui/Button/Button';
import { Avatar } from '@shared/ui/Avatar/Avatar';
import { Icon } from '@shared/ui/Icon/Icon';
import { ThemeToggle } from '@shared/ui/ThemeToggle';
import { Footer } from '@shared/layout/Footer';
import styles from './PublicLayout.module.css';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const itemCount = useCartStore((s) => s.getItemCount());
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    navigate('/');
  };

  const navLinks = [
    { to: '/', label: 'Início' },
    { to: '/search', label: 'Eventos' },
    { to: '/search?category=shows', label: 'Shows' },
    { to: '/search?category=festas', label: 'Festas' },
  ];

  return (
    <div className={styles.layout}>
      <header className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.logo}>
            <Icon name="ticket" size={20} className={styles.logoIcon} />
            <span className={styles.logoText}>Ticketeria</span>
          </Link>

          <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`}>
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                }
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className={styles.actions}>
            <ThemeToggle />

            <Link to="/checkout" className={styles.cartButton} aria-label="Carrinho">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
              {itemCount > 0 && (
                <span className={styles.cartBadge}>{itemCount > 9 ? '9+' : itemCount}</span>
              )}
            </Link>

            {isAuthenticated ? (
              <div className={styles.userMenu}>
                <button
                  className={styles.userButton}
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-label="Menu do usuário"
                >
                  <Avatar
                    src={user?.avatar}
                    name={user?.name ?? ''}
                    size="sm"
                  />
                </button>
                {userMenuOpen && (
                  <div className={styles.dropdown}>
                    <div className={styles.dropdownHeader}>
                      <span className={styles.dropdownName}>{user?.name}</span>
                      <span className={styles.dropdownEmail}>{user?.email}</span>
                    </div>
                    <Link to="/tickets" className={styles.dropdownItem} onClick={() => setUserMenuOpen(false)}>
                      Meus Ingressos
                    </Link>
                    <Link to="/profile" className={styles.dropdownItem} onClick={() => setUserMenuOpen(false)}>
                      Meu Perfil
                    </Link>
                    {user?.role !== 'user' && (
                      <Link to="/admin" className={styles.dropdownItem} onClick={() => setUserMenuOpen(false)}>
                        Painel Admin
                      </Link>
                    )}
                    <button className={styles.dropdownLogout} onClick={handleLogout}>
                      Sair
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.authButtons}>
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  Entrar
                </Button>
                <Button variant="primary" size="sm" onClick={() => navigate('/register')}>
                  Cadastrar
                </Button>
              </div>
            )}

            <button
              className={styles.menuToggle}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menu"
            >
              <span className={`${styles.menuLine} ${menuOpen ? styles.menuLineOpen1 : ''}`} />
              <span className={`${styles.menuLine} ${menuOpen ? styles.menuLineOpen2 : ''}`} />
              <span className={`${styles.menuLine} ${menuOpen ? styles.menuLineOpen3 : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>{children}</main>

      <Footer />
    </div>
  );
};
