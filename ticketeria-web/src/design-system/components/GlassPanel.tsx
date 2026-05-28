import React from 'react';

type GlassVariant = 'faint' | 'medium' | 'strong';

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: GlassVariant;
  glow?: 'pulse' | 'violet' | 'cyan' | 'none';
  radius?: number | string;
  padding?: number | string;
  children?: React.ReactNode;
}

const VARIANTS: Record<GlassVariant, React.CSSProperties> = {
  faint: {
    background: 'var(--pp-glass-1)',
    backdropFilter: 'var(--pp-blur-sm)',
    WebkitBackdropFilter: 'var(--pp-blur-sm)' as never,
    border: '1px solid var(--pp-edge-1)',
  },
  medium: {
    background: 'var(--pp-glass-2)',
    backdropFilter: 'var(--pp-blur-md)',
    WebkitBackdropFilter: 'var(--pp-blur-md)' as never,
    border: '1px solid var(--pp-edge-2)',
    boxShadow: 'var(--pp-shine), var(--pp-shadow-2)',
  },
  strong: {
    background: 'var(--pp-glass-3)',
    backdropFilter: 'var(--pp-blur-lg)',
    WebkitBackdropFilter: 'var(--pp-blur-lg)' as never,
    border: '1px solid var(--pp-edge-3)',
    boxShadow: 'var(--pp-shine-strong), var(--pp-shadow-3)',
  },
};

const GLOWS: Record<NonNullable<GlassPanelProps['glow']>, string> = {
  pulse: 'var(--pp-glow-pulse-soft)',
  violet: 'var(--pp-glow-violet)',
  cyan: 'var(--pp-glow-cyan)',
  none: '',
};

export const GlassPanel: React.FC<GlassPanelProps> = ({
  variant = 'medium',
  glow = 'none',
  radius = 'var(--pp-r-lg)',
  padding,
  style,
  children,
  ...rest
}) => {
  const base = VARIANTS[variant];
  const shadow = [base.boxShadow, glow !== 'none' ? GLOWS[glow] : '']
    .filter(Boolean)
    .join(', ');
  return (
    <div
      {...rest}
      style={{
        ...base,
        borderRadius: radius,
        padding,
        boxShadow: shadow || undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default GlassPanel;
