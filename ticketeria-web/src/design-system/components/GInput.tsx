import React, { useState } from 'react';

interface GInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  variant?: 'pill' | 'box';
  full?: boolean;
}

/**
 * Glass input — pill (search, email) ou box (forms longos).
 * Sempre dark mode, glass background com blur.
 */
export const GInput: React.FC<GInputProps> = ({
  icon,
  iconRight,
  variant = 'pill',
  full,
  style,
  onFocus,
  onBlur,
  ...rest
}) => {
  const [focused, setFocused] = useState(false);
  const radius = variant === 'pill' ? 999 : 14;
  const height = variant === 'pill' ? 50 : 48;

  return (
    <div
      style={{
        height,
        padding: '0 18px',
        borderRadius: radius,
        background: focused ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.06)',
        border: focused
          ? '1px solid rgba(0,255,133,0.4)'
          : '1px solid rgba(255,255,255,0.10)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)' as never,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: focused
          ? 'inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 3px rgba(0,255,133,0.12)'
          : 'inset 0 1px 0 rgba(255,255,255,0.08)',
        width: full ? '100%' : undefined,
        transition: 'all var(--pp-dur-1) var(--pp-ease)',
        ...style,
      }}
    >
      {icon ?? (
        <SearchIcon />
      )}
      <input
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: '#fff',
          fontSize: 14,
          fontFamily: 'var(--pp-font-body)',
        }}
      />
      {iconRight}
    </div>
  );
};

const SearchIcon: React.FC = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="rgba(255,255,255,0.45)"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export default GInput;
