import React from 'react';

interface CounterProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}

/**
 * Counter (qty +/-) — usado em cart/checkout/bar.
 */
export const Counter: React.FC<CounterProps> = ({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  label,
}) => {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));
  return (
    <div className="pp-glass" style={{ padding: 14, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {label && <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{label}</span>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
        <button
          type="button"
          onClick={dec}
          disabled={value <= min}
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.14)',
            color: '#fff',
            fontSize: 16,
            cursor: value <= min ? 'not-allowed' : 'pointer',
            opacity: value <= min ? 0.4 : 1,
          }}
        >
          −
        </button>
        <span style={{ fontFamily: 'var(--pp-font-mono)', fontWeight: 600, fontSize: 16, minWidth: 22, textAlign: 'center', color: '#fff' }}>
          {value}
        </span>
        <button
          type="button"
          onClick={inc}
          disabled={value >= max}
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: '#00FF85',
            border: 'none',
            color: '#003C1F',
            fontSize: 16,
            fontWeight: 700,
            cursor: value >= max ? 'not-allowed' : 'pointer',
            opacity: value >= max ? 0.5 : 1,
          }}
        >
          +
        </button>
      </div>
    </div>
  );
};

export default Counter;
