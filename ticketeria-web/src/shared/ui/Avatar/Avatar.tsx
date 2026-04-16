import React, { useState } from 'react';
import styles from './Avatar.module.css';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
  initials?: string;
  name?: string;
  size?: AvatarSize;
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, alt, initials, name, size = 'md', className = '', ...props }, ref) => {
    const [imageError, setImageError] = useState(false);
    const showInitials = !src || imageError;
    const displayInitials = initials || (name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '');

    return (
      <div ref={ref} className={`${styles.avatar} ${styles[`size-${size}`]} ${className}`}>
        {!showInitials && (
          <img
            src={src}
            alt={alt}
            onError={() => setImageError(true)}
            className={styles.image}
            {...props}
          />
        )}
        {showInitials && displayInitials && (
          <span className={styles.initials}>{displayInitials}</span>
        )}
        {showInitials && !initials && (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

export default Avatar;
