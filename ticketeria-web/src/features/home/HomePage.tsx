import React from 'react';
import { useAuth } from '@shared/hooks/useAuth';
import { useDocumentHead } from '@shared/hooks/useDocumentHead';
import { PublicLayout } from '@shared/layout/PublicLayout/PublicLayout';
import HeroSection from './HeroSection';
import WeekendSection from './WeekendSection';
import TrendingSection from './TrendingSection';
import CategorySection from './CategorySection';
import RecommendedSection from './RecommendedSection';
import SocialProofBar from './SocialProofBar';
import styles from './HomePage.module.css';

const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  useDocumentHead({
    title: 'Ticketeria Digital — Ingressos para os melhores eventos',
    description:
      'Descubra e compre ingressos para shows, festas, teatro, esportes e eventos culturais. A plataforma número 1 para ingressos digitais no Brasil.',
    keywords:
      'ingressos, eventos, shows, festas, teatro, esportes, comprar ingressos online, eventos digitais',
    ogTitle: 'Ticketeria Digital — Ingressos para os melhores eventos',
    ogDescription:
      'Descubra e compre ingressos para shows, festas, teatro, esportes e eventos culturais.',
    ogUrl: window.location.href,
    ogType: 'website',
    ogSiteName: 'Ticketeria Digital',
    twitterCard: 'summary_large_image',
    twitterTitle: 'Ticketeria Digital',
    twitterDescription:
      'Descubra e compre ingressos para shows, festas, teatro, esportes e eventos culturais.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'name': 'Ticketeria Digital',
      'url': window.location.origin,
      'description': 'Plataforma de ingressos para eventos digitais',
      'potentialAction': {
        '@type': 'SearchAction',
        'target': {
          '@type': 'EntryPoint',
          'urlTemplate': `${window.location.origin}/search?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
  });

  return (
    <PublicLayout>
      <div className={styles.container}>
        <HeroSection />
        <WeekendSection />
        <TrendingSection />
        <CategorySection />
        {isAuthenticated && <RecommendedSection />}
        <SocialProofBar />
      </div>
    </PublicLayout>
  );
};

export default HomePage;
