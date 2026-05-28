import React from 'react';

interface LogoProps {
  size?: number;
  mono?: boolean;
  monoColor?: string;
}

/**
 * PulsePass glyph — anel duplo + waveform pulse no centro.
 */
export const Logo: React.FC<LogoProps> = ({ size = 64, mono = false, monoColor = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ display: 'block' }} aria-label="PulsePass">
    <defs>
      <linearGradient id={`pp-logo-grad-${size}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={mono ? monoColor : '#00FF85'} />
        <stop offset="0.6" stopColor={mono ? monoColor : '#4DFFA8'} />
        <stop offset="1" stopColor={mono ? monoColor : '#22D3EE'} />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="29" fill="none" stroke={`url(#pp-logo-grad-${size})`} strokeWidth="2.5" opacity="0.5" />
    <circle cx="32" cy="32" r="22" fill="none" stroke={`url(#pp-logo-grad-${size})`} strokeWidth="2" />
    <path
      d="M14 32 L22 32 L26 24 L30 40 L34 22 L38 38 L42 32 L50 32"
      fill="none"
      stroke={`url(#pp-logo-grad-${size})`}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface BrandLockupProps {
  tag?: string;
  logoSize?: number;
  tagline?: string;
}

export const BrandLockup: React.FC<BrandLockupProps> = ({
  tag = 'PASS',
  logoSize = 56,
  tagline = 'Sistema Operacional de Eventos',
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
    <Logo size={logoSize} />
    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
      <div
        style={{
          fontFamily: 'var(--pp-font-display)',
          fontWeight: 700,
          fontSize: 36,
          letterSpacing: '-0.03em',
          color: '#fff',
          display: 'flex',
          alignItems: 'baseline',
        }}
      >
        <span>Pulse</span>
        <span style={{ color: 'var(--pp-pulse)' }}>{tag}</span>
      </div>
      {tagline && (
        <div
          style={{
            fontFamily: 'var(--pp-font-mono)',
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--pp-fg-3)',
            marginTop: 6,
          }}
        >
          {tagline}
        </div>
      )}
    </div>
  </div>
);

export default Logo;
