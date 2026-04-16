import { useEffect } from 'react';

export interface DocumentHeadConfig {
  title: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  ogType?: string;
  ogSiteName?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  jsonLd?: Record<string, any>;
}

/**
 * Custom hook to manage document head meta tags, title, and structured data
 * without external dependencies like react-helmet-async
 */
export function useDocumentHead(config: DocumentHeadConfig): void {
  useEffect(() => {
    // Set document title
    if (config.title) {
      document.title = config.title;
    }

    // Helper function to get or create meta tag
    const setMetaTag = (name: string, content: string, attribute: 'name' | 'property' = 'name') => {
      let meta = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    // Set standard meta tags
    if (config.description) {
      setMetaTag('description', config.description);
    }

    if (config.keywords) {
      setMetaTag('keywords', config.keywords);
    }

    // Set Open Graph tags
    if (config.ogTitle) {
      setMetaTag('og:title', config.ogTitle, 'property');
    }

    if (config.ogDescription) {
      setMetaTag('og:description', config.ogDescription, 'property');
    }

    if (config.ogImage) {
      setMetaTag('og:image', config.ogImage, 'property');
    }

    if (config.ogUrl) {
      setMetaTag('og:url', config.ogUrl, 'property');
    }

    if (config.ogType) {
      setMetaTag('og:type', config.ogType, 'property');
    }

    if (config.ogSiteName) {
      setMetaTag('og:site_name', config.ogSiteName, 'property');
    }

    // Set Twitter Card tags
    if (config.twitterCard) {
      setMetaTag('twitter:card', config.twitterCard);
    }

    if (config.twitterTitle) {
      setMetaTag('twitter:title', config.twitterTitle);
    }

    if (config.twitterDescription) {
      setMetaTag('twitter:description', config.twitterDescription);
    }

    if (config.twitterImage) {
      setMetaTag('twitter:image', config.twitterImage);
    }

    // Set JSON-LD structured data
    if (config.jsonLd) {
      let script = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement;
      if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(config.jsonLd);
    }

    // Cleanup function: remove meta tags and JSON-LD on unmount
    return () => {
      // We intentionally keep the title and main meta tags set, as they should persist
      // Only clean up JSON-LD as it's typically specific to a page
      const scriptTag = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement;
      if (scriptTag && config.jsonLd) {
        scriptTag.remove();
      }
    };
  }, [config]);
}
