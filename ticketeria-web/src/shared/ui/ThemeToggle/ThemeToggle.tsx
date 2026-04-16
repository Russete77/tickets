import React, { useEffect, useState } from 'react';
import { useTheme } from '@shared/hooks/useTheme';
import { Icon } from '@shared/ui/Icon/Icon';
import styles from './ThemeToggle.module.css';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  // Only render after hydration to avoid theme flash
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  const isDark = theme === 'dark';
  const ariaLabel = isDark ? 'Ativar modo claro' : 'Ativar modo escuro';

  return (
    <button
      className={styles.toggleButton}
      onClick={toggleTheme}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <div className={styles.icon}>
        <Icon name={isDark ? 'sun' : 'moon'} size={20} />
      </div>
    </button>
  );
};
