import React from 'react';
import styles from './Spinner.module.css';

type SpinnerSize = 'sm' | 'md' | 'lg';

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: SpinnerSize;
  color?: string;
  centered?: boolean;
}

export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ size = 'md', color, centered = false, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${styles.spinner} ${styles[`size-${size}`]} ${
          centered ? styles.centered : ''
        } ${className}`}
        style={color ? { color } : undefined}
        {...props}
      />
    );
  }
);

Spinner.displayName = 'Spinner';

export default Spinner;
