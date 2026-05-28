import React from 'react';

type Variant = 'primary' | 'glass' | 'ghost' | 'violet' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface PButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  full?: boolean;
  loading?: boolean;
}

const SIZES: Record<Size, { h: number; px: number; fs: number; gap: number }> = {
  sm: { h: 36, px: 16, fs: 13, gap: 8 },
  md: { h: 46, px: 22, fs: 14, gap: 10 },
  lg: { h: 56, px: 28, fs: 16, gap: 12 },
};

const VARIANTS: Record<Variant, React.CSSProperties> = {
  primary: {
    background: 'linear-gradient(180deg, #4DFFA8 0%, #00FF85 60%, #00CC6A 100%)',
    color: '#003C1F',
    boxShadow:
      '0 1px 0 rgba(255,255,255,0.4) inset, 0 0 0 1px rgba(0,255,133,0.4), 0 8px 24px rgba(0,255,133,0.32), 0 1px 2px rgba(0,0,0,0.4)',
    fontWeight: 700,
    border: 'none',
  },
  glass: {
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)' as never,
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.16)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16)',
    fontWeight: 600,
  },
  ghost: {
    background: 'transparent',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.16)',
    fontWeight: 600,
  },
  violet: {
    background: 'linear-gradient(180deg, #C4B5FD 0%, #A78BFA 60%, #7C3AED 100%)',
    color: '#1A0040',
    boxShadow:
      '0 1px 0 rgba(255,255,255,0.4) inset, 0 0 0 1px rgba(167,139,250,0.4), 0 8px 24px rgba(167,139,250,0.32)',
    fontWeight: 700,
    border: 'none',
  },
  danger: {
    background: '#FF3B30',
    color: '#fff',
    fontWeight: 600,
    border: 'none',
  },
};

export const PButton: React.FC<PButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  full,
  loading,
  disabled,
  style,
  children,
  ...rest
}) => {
  const s = SIZES[size];
  return (
    <button
      type={rest.type ?? 'button'}
      disabled={disabled || loading}
      {...rest}
      style={{
        height: s.h,
        padding: `0 ${s.px}px`,
        borderRadius: 999,
        fontSize: s.fs,
        fontFamily: 'var(--pp-font-body)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        letterSpacing: '-0.005em',
        width: full ? '100%' : 'auto',
        justifyContent: 'center',
        transition: 'transform var(--pp-dur-1) var(--pp-ease), filter var(--pp-dur-1) var(--pp-ease), opacity var(--pp-dur-1) var(--pp-ease)',
        opacity: disabled ? 0.5 : 1,
        ...VARIANTS[variant],
        ...style,
      }}
      onMouseDown={(e) => {
        if (!disabled && !loading) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)';
      }}
      onMouseUp={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = '';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = '';
      }}
    >
      {loading ? (
        <Spinner />
      ) : (
        <>
          {icon}
          {children}
          {iconRight}
        </>
      )}
    </button>
  );
};

const Spinner: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: 'pp-rotate-border 0.8s linear infinite' }}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export default PButton;
