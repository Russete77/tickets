import React from 'react';

export type BadgeTone = 'pulse' | 'violet' | 'cyan' | 'pink' | 'amber' | 'red' | 'neutral';

interface PBadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

const TONES: Record<BadgeTone, { bg: string; fg: string; edge: string }> = {
  pulse:   { bg: 'rgba(0,255,133,0.14)',   fg: '#4DFFA8', edge: 'rgba(0,255,133,0.22)' },
  violet:  { bg: 'rgba(167,139,250,0.16)', fg: '#C4B5FD', edge: 'rgba(167,139,250,0.28)' },
  cyan:    { bg: 'rgba(34,211,238,0.14)',  fg: '#67E8F9', edge: 'rgba(34,211,238,0.24)' },
  pink:    { bg: 'rgba(255,61,136,0.14)',  fg: '#FF77AA', edge: 'rgba(255,61,136,0.24)' },
  amber:   { bg: 'rgba(255,184,0,0.14)',   fg: '#FFD15C', edge: 'rgba(255,184,0,0.24)' },
  red:     { bg: 'rgba(255,59,48,0.14)',   fg: '#FF7A75', edge: 'rgba(255,59,48,0.24)' },
  neutral: { bg: 'rgba(255,255,255,0.08)', fg: 'rgba(255,255,255,0.85)', edge: 'rgba(255,255,255,0.14)' },
};

const SIZES = {
  sm: { padding: '3px 8px', fs: 10, gap: 4 },
  md: { padding: '5px 10px', fs: 11, gap: 6 },
};

export const PBadge: React.FC<PBadgeProps> = ({ children, tone = 'pulse', dot, size = 'md', style }) => {
  const t = TONES[tone];
  const s = SIZES[size];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
        padding: s.padding,
        borderRadius: 999,
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.edge}`,
        fontSize: s.fs,
        fontFamily: 'var(--pp-font-mono)',
        fontWeight: 500,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {dot && (
        <span
          className="pp-pulse-dot"
          style={{ background: t.fg, width: 6, height: 6 }}
        />
      )}
      {children}
    </span>
  );
};

export default PBadge;
