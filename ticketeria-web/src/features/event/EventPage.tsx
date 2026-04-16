import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@shared/lib/api';
import { useDocumentHead } from '@shared/hooks/useDocumentHead';
import { PublicLayout } from '@shared/layout/PublicLayout/PublicLayout';
import { Skeleton } from '@shared/ui/Skeleton/Skeleton';
import EventHero from './EventHero';
import EventInfo from './EventInfo';
import EventTimeline from './EventTimeline';
import BatchSelector from './BatchSelector';
import EventReviews from './EventReviews';
import EventGallery from './EventGallery';
import ShareButtons from './ShareButtons';
import EventMap from './EventMap';
import styles from './EventPage.module.css';

export interface Event {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  coverImage: string;
  gallery: { url: string; alt: string }[];
  startDate: string;
  endDate: string;
  doorsOpenAt?: string;
  venue: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    coordinates?: { lat: number; lng: number };
  };
  ageRating?: string;
  dressCode?: string;
  openBar: boolean;
  lineup?: { name: string; role: string }[];
  timeline?: { time: string; activity: string; icon?: string }[];
  batches: Batch[];
  rating: number;
  reviewCount: number;
  reviews: Review[];
  isFavorite: boolean;
}

export interface Batch {
  id: string;
  name: string;
  type: 'normal' | 'vip' | 'backstage' | 'camarote';
  price: number;
  quantity: number;
  sold: number;
  endsAt?: string;
  maxTicketsPerCpf: number;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  date: string;
  rating: number;
  comment: string;
  ratings?: {
    organization?: number;
    sound?: number;
    bar?: number;
    experience?: number;
  };
}

const EventPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Slug required');
      const response = await api.get(`/v1/events/${slug}`);
      return response.data as Event;
    },
    enabled: !!slug,
  });

  // Set SEO for loaded event
  useDocumentHead(
    event
      ? {
          title: `${event.title} — Ticketeria Digital`,
          description: event.description,
          keywords: `${event.title}, ${event.category}, ingresso, evento`,
          ogTitle: event.title,
          ogDescription: event.description,
          ogImage: event.coverImage,
          ogUrl: `${window.location.origin}/event/${event.slug}`,
          ogType: 'event',
          ogSiteName: 'Ticketeria Digital',
          twitterCard: 'summary_large_image',
          twitterTitle: event.title,
          twitterDescription: event.description,
          twitterImage: event.coverImage,
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'Event',
            'name': event.title,
            'description': event.description,
            'image': event.coverImage,
            'startDate': event.startDate,
            'endDate': event.endDate,
            'location': {
              '@type': 'Place',
              'name': event.venue.name,
              'address': {
                '@type': 'PostalAddress',
                'streetAddress': event.venue.address,
                'addressLocality': event.venue.city,
                'addressRegion': event.venue.state,
              },
            },
            'offers': event.batches.map((batch) => ({
              '@type': 'Offer',
              'name': batch.name,
              'price': batch.price,
              'priceCurrency': 'BRL',
              'availability':
                batch.sold < batch.quantity
                  ? 'https://schema.org/InStock'
                  : 'https://schema.org/OutOfStock',
              'url': `${window.location.origin}/event/${event.slug}`,
            })),
            'aggregateRating': {
              '@type': 'AggregateRating',
              'ratingValue': event.rating,
              'reviewCount': event.reviewCount,
            },
          },
        }
      : {
          title: 'Carregando evento — Ticketeria Digital',
        }
  );

  if (error) {
    return (
      <PublicLayout>
        <div className={styles.error}>
          <h1>Evento não encontrado</h1>
          <p>Este evento pode não existir ou foi removido.</p>
        </div>
      </PublicLayout>
    );
  }

  if (isLoading) {
    return (
      <PublicLayout>
        <div className={styles.loadingContainer}>
          <Skeleton width="100%" height="500px" borderRadius="0" />
          <div className={styles.contentSkeleton}>
            <Skeleton width="100%" height="200px" borderRadius="12px" />
            <Skeleton width="100%" height="300px" borderRadius="12px" />
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <PublicLayout>
      <article className={styles.page}>
        <EventHero event={event} />

        <div className={styles.content}>
          <div className={styles.mainColumn}>
            <EventInfo event={event} />

            {event.timeline && event.timeline.length > 0 && (
              <EventTimeline timeline={event.timeline} />
            )}

            {event.gallery && event.gallery.length > 0 && (
              <EventGallery gallery={event.gallery} />
            )}

            <EventReviews
              rating={event.rating}
              reviewCount={event.reviewCount}
              reviews={event.reviews}
            />
          </div>

          <div className={styles.sidebar}>
            <BatchSelector batches={event.batches} />
            <ShareButtons eventTitle={event.title} eventSlug={event.slug} />
            {event.venue.coordinates && (
              <EventMap
                venueName={event.venue.name}
                address={event.venue.address}
                coordinates={event.venue.coordinates}
              />
            )}
          </div>
        </div>
      </article>
    </PublicLayout>
  );
};

export default EventPage;
