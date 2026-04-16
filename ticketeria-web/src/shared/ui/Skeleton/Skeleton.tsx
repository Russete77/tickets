import React from 'react';
import styles from './Skeleton.module.css';

type SkeletonVariant = 'text' | 'circle' | 'rectangle' | 'card';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  count?: number;
  borderRadius?: string;
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      variant = 'text',
      width,
      height,
      count = 1,
      borderRadius,
      style,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyle: React.CSSProperties = {
      width: width || '100%',
      height: height,
      borderRadius: borderRadius,
      ...style,
    };

    if (variant === 'circle') {
      baseStyle.borderRadius = '50%';
      baseStyle.width = width || '40px';
      baseStyle.height = height || '40px';
    }

    if (count > 1) {
      return (
        <div className={styles.group}>
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              ref={i === 0 ? ref : undefined}
              className={`${styles.skeleton} ${styles[`variant-${variant}`]} ${className}`}
              style={baseStyle}
              {...props}
            />
          ))}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={`${styles.skeleton} ${styles[`variant-${variant}`]} ${className}`}
        style={baseStyle}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

export default Skeleton;
