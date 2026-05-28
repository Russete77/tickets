import React from 'react';

interface AuroraProps {
  intensity?: number;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Aurora background — signature gradient mesh do PulsePass.
 * Verde / violet / cyan / pink em radial gradients borrados.
 * Use como wrapper de tela inteira ou seção hero.
 */
export const Aurora: React.FC<AuroraProps> = ({ intensity = 1, children, className = '', style }) => (
  <div
    className={`pp-aurora-wrap ${className}`}
    style={{
      position: 'relative',
      background: '#06070A',
      overflow: 'hidden',
      isolation: 'isolate',
      ...style,
    }}
  >
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: '-15%',
        zIndex: 0,
        pointerEvents: 'none',
        background: `
          radial-gradient(45% 30% at 18% 12%, rgba(0,255,133,${0.35 * intensity}), transparent 65%),
          radial-gradient(40% 30% at 82% 8%, rgba(167,139,250,${0.32 * intensity}), transparent 65%),
          radial-gradient(50% 40% at 60% 90%, rgba(34,211,238,${0.22 * intensity}), transparent 65%),
          radial-gradient(30% 30% at 8% 75%, rgba(255,61,136,${0.18 * intensity}), transparent 65%)
        `,
        filter: 'blur(40px) saturate(160%)',
      }}
    />
    <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>{children}</div>
  </div>
);

export default Aurora;
