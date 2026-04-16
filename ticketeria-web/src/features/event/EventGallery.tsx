import React, { useState } from 'react';
import { Icon } from '@shared/ui/Icon/Icon';
import styles from './EventGallery.module.css';

interface GalleryItem {
  url: string;
  alt: string;
}

interface EventGalleryProps {
  gallery: GalleryItem[];
}

const EventGallery: React.FC<EventGalleryProps> = ({ gallery }) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const prevImage = () =>
    setLightboxIndex((i) => (i !== null ? (i - 1 + gallery.length) % gallery.length : null));
  const nextImage = () =>
    setLightboxIndex((i) => (i !== null ? (i + 1) % gallery.length : null));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') prevImage();
    if (e.key === 'ArrowRight') nextImage();
  };

  return (
    <section className={styles.container}>
      <h2 className={styles.title}>Galeria</h2>

      <div className={styles.grid}>
        {gallery.map((item, index) => (
          <button
            key={index}
            className={styles.thumb}
            onClick={() => openLightbox(index)}
            aria-label={`Abrir imagem: ${item.alt}`}
          >
            <img
              src={item.url}
              alt={item.alt}
              loading="lazy"
              className={styles.thumbImg}
            />
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <div
          className={styles.lightbox}
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          tabIndex={0}
        >
          <button className={styles.closeBtn} onClick={closeLightbox} aria-label="Fechar">
            <Icon name="x" size={24} />
          </button>

          <button
            className={`${styles.navBtn} ${styles.navPrev}`}
            onClick={(e) => { e.stopPropagation(); prevImage(); }}
            aria-label="Imagem anterior"
          >
            ‹
          </button>

          <img
            src={gallery[lightboxIndex].url}
            alt={gallery[lightboxIndex].alt}
            className={styles.lightboxImg}
            onClick={(e) => e.stopPropagation()}
          />

          <button
            className={`${styles.navBtn} ${styles.navNext}`}
            onClick={(e) => { e.stopPropagation(); nextImage(); }}
            aria-label="Próxima imagem"
          >
            ›
          </button>

          <span className={styles.counter}>
            {lightboxIndex + 1} / {gallery.length}
          </span>
        </div>
      )}
    </section>
  );
};

export default EventGallery;
