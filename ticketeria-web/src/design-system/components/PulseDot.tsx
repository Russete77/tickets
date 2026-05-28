import React from 'react';

interface PulseDotProps {
  color?: string;
  size?: number;
}

export const PulseDot: React.FC<PulseDotProps> = ({ color = 'var(--pp-pulse)', size = 8 }) => (
  <span
    className="pp-pulse-dot"
    style={{
      background: color,
      width: size,
      height: size,
    }}
  />
);

export default PulseDot;
