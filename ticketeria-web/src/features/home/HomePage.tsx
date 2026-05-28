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
import { useTranslation } from '@shared/i18n';
import styles from './HomePage.module.css';

const HomePage: React.FC = () => {
  useTranslation();
  const { isAuthenticated } = useAuth();

  useDocumentHead({
    title: 'PulsePass — sinta o pulso do evento',
    description:
      'Sistema operacional de eventos. Descubra rolês, compre ingressos, recarregue cashless e pede no bar pelo app.',
    keywords:
      'ingressos, eventos, shows, festas, teatro, esportes, comprar ingressos online, eventos digitais, cashless',
    ogTitle: 'PulsePass — sinta o pulso do evento',
    ogDescription:
      'Sistema operacional de eventos. Ticketeria, guest list e cashless num único produto.',
    ogUrl: window.location.href,
    ogType: 'website',
    ogSiteName: 'PulsePass',
    twitterCard: 'summary_large_image',
    twitterTitle: 'PulsePass',
    twitterDescription:
      'Sistema operacional de eventos.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'name': 'PulsePass',
      'url': window.location.origin,
      'description': 'Sistema operacional de eventos',
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
