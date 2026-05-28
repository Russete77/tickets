import React from 'react';

type FlyerLayout = 'a' | 'b' | 'c' | 'd';

interface FlyerProps {
  hue?: string;
  hue2?: string;
  title?: string;
  tag?: string;
  height?: number | string;
  layout?: FlyerLayout;
  imageUrl?: string;
  onClick?: () => void;
  badge?: React.ReactNode;
  footer?: React.ReactNode;
}

const PALETTE = {
  green: '#00FF85',
  violet: '#A78BFA',
  cyan: '#22D3EE',
  pink: '#FF3D88',
  amber: '#FFB800',
};

const LAYOUTS: Record<FlyerLayout, (h: string, h2: string) => string> = {
  a: (h, h2) =>
    `radial-gradient(80% 80% at 20% 20%, ${h}, transparent 60%), radial-gradient(80% 80% at 80% 80%, ${h2}, transparent 60%), #0a0a0c`,
  b: (h, h2) => `linear-gradient(135deg, ${h} 0%, ${h2} 100%)`,
  c: (h, h2) =>
    `radial-gradient(circle at 50% 100%, ${h}, transparent 70%), linear-gradient(180deg, #0a0a0c, ${h2}40)`,
  d: (h) => `radial-gradient(120% 60% at 50% 0%, ${h}, transparent 60%), #0a0a0c`,
};

/**
 * Flyer placeholder visual — gradient (até backend ter banner real).
 * Aceita imageUrl pra trocar pelo banner real.
 */
export const Flyer: React.FC<FlyerProps> = ({
  hue = PALETTE.green,
  hue2 = PALETTE.violet,
  title,
  tag,
  height = 200,
  layout = 'a',
  imageUrl,
  onClick,
  badge,
  footer,
}) => {
  const background = imageUrl
    ? `linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.7)), url(${imageUrl}) center/cover`
    : LAYOUTS[layout](hue, hue2);

  return (
    <div
      onClick={onClick}
      style={{
        height,
        borderRadius: 18,
        background,
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
        isolation: 'isolate',
        cursor: onClick ? 'pointer' : undefined,
        transition: 'transform var(--pp-dur-2) var(--pp-ease), box-shadow var(--pp-dur-2) var(--pp-ease)',
      }}
      onMouseEnter={(e) => {
        if (onClick) (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = '';
      }}
    >
      {!imageUrl && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.7))',
          }}
        />
      )}
      {(tag || badge) && (
        <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 2 }}>
          {badge ?? (
            <div
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)' as never,
                fontSize: 10,
                fontFamily: 'var(--pp-font-mono)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#fff',
              }}
            >
              {tag}
            </div>
          )}
        </div>
      )}
      {title && (
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            right: 12,
            fontFamily: 'var(--pp-font-display)',
            fontWeight: 700,
            fontSize: 18,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            color: '#fff',
            textShadow: '0 2px 12px rgba(0,0,0,0.6)',
            zIndex: 2,
          }}
        >
          {title}
        </div>
      )}
      {footer}
    </div>
  );
};

export const flyerPalette = PALETTE;

export default Flyer;
