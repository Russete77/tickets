import React from 'react';
import { Aurora } from './Aurora';
import { PpHeader } from './PpHeader';
import { useAuth } from '@shared/hooks/useAuth';

interface PpLayoutProps {
  children: React.ReactNode;
  hideHeader?: boolean;
  intensity?: number;
}

/**
 * Layout root pra todas as páginas consumer do PulsePass.
 * Aplica Aurora (mesh gradient signature) + PpHeader sticky glass.
 */
export const PpLayout: React.FC<PpLayoutProps> = ({ children, hideHeader, intensity = 0.7 }) => {
  const { user } = useAuth();
  return (
    <Aurora style={{ minHeight: '100vh' }} intensity={intensity}>
      {!hideHeader && <PpHeader user={user ? { name: user.name } : null} />}
      {children}
    </Aurora>
  );
};

export default PpLayout;
