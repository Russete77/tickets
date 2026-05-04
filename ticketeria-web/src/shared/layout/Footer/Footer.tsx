import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@shared/ui/Icon/Icon';
import { LocaleSwitcher } from '@shared/i18n/LocaleSwitcher';
import styles from './Footer.module.css';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const handleNewsletterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email');
    console.log('Newsletter signup:', email);
    e.currentTarget.reset();
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.footerContainer}>
        <div className={styles.footerContent}>
          {/* Brand Column */}
          <div className={styles.brandColumn}>
            <Link to="/" className={styles.brandLogo}>
              <Icon name="ticket" size={24} className={styles.brandIcon} />
              <span className={styles.brandName}>Ticketeria</span>
            </Link>
            <p className={styles.brandTagline}>
              A plataforma de ingressos mais segura do Brasil
            </p>
            <div className={styles.socialLinks}>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className={styles.socialLink} aria-label="Instagram">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4c0 3.2-2.6 5.8-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8C2 4.6 4.6 2 7.8 2m-.6 2c-2.1 0-3.8 1.7-3.8 3.8v8.4c0 2.1 1.7 3.8 3.8 3.8h8.4c2.1 0 3.8-1.7 3.8-3.8V7.8c0-2.1-1.7-3.8-3.8-3.8H7.2m9.65 1.6c.5 0 .9.4.9.9s-.4.9-.9.9-.9-.4-.9-.9.4-.9.9-.9m-5.4 1.6c3.3 0 6 2.7 6 6s-2.7 6-6 6-6-2.7-6-6 2.7-6 6-6m0 2c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4z" />
                </svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className={styles.socialLink} aria-label="Twitter">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2s9 5 20 5a9.5 9.5 0 00-9-5.5c4.75 2.25 9 2 9 2z" />
                </svg>
              </a>
              <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className={styles.socialLink} aria-label="TikTok">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.321 5.562a5.122 5.122 0 01-2.806 2.27V12a3 3 0 11-6 0V8.594a5.999 5.999 0 10-3 5.156v-2.146a8 8 0 107.972-7.042z" />
                </svg>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className={styles.socialLink} aria-label="YouTube">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136c.502-1.884.502-5.814.502-5.814s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Navigation Columns */}
          <div className={styles.navColumn}>
            <h4 className={styles.columnTitle}>Explorar</h4>
            <Link to="/search" className={styles.navLink}>Eventos</Link>
            <Link to="/search?category=shows" className={styles.navLink}>Shows</Link>
            <Link to="/search?category=festas" className={styles.navLink}>Festas</Link>
            <Link to="/search?category=teatro" className={styles.navLink}>Teatro</Link>
            <Link to="/search?category=esportes" className={styles.navLink}>Esportes</Link>
          </div>

          <div className={styles.navColumn}>
            <h4 className={styles.columnTitle}>Para Produtores</h4>
            <a href="#" className={styles.navLink}>Criar evento</a>
            <a href="#" className={styles.navLink}>Dashboard</a>
            <a href="#" className={styles.navLink}>Precos</a>
            <a href="#" className={styles.navLink}>API</a>
          </div>

          <div className={styles.navColumn}>
            <h4 className={styles.columnTitle}>Suporte</h4>
            <a href="#" className={styles.navLink}>Central de ajuda</a>
            <a href="#" className={styles.navLink}>Contato</a>
            <a href="#" className={styles.navLink}>Termos de uso</a>
            <a href="#" className={styles.navLink}>Privacidade</a>
            <a href="#" className={styles.navLink}>LGPD</a>
          </div>

          {/* Newsletter Column */}
          <div className={styles.newsletterColumn}>
            <h4 className={styles.columnTitle}>Newsletter</h4>
            <p className={styles.newsletterText}>Receba as melhores ofertas de eventos</p>
            <form onSubmit={handleNewsletterSubmit} className={styles.newsletterForm}>
              <input
                type="email"
                name="email"
                placeholder="Seu email"
                required
                className={styles.newsletterInput}
                aria-label="Email para newsletter"
              />
              <button type="submit" className={styles.newsletterButton}>
                Inscrever
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={styles.bottomBar}>
          <div className={styles.copyright}>
            {`© ${currentYear} Ticketeria Digital. Todos os direitos reservados.`}
          </div>
          <div className={styles.securityBadge}>
            <span>Pagamentos seguros por Asaas — Banco Central cód. 461</span>
          </div>
          <div className={styles.brazilTag}>
            <span>Feito com seguranca no Brasil</span>
          </div>
          {/* Auditoria CTO 2026-05 — gap 4.11 */}
          <LocaleSwitcher />
        </div>
      </div>
    </footer>
  );
};
