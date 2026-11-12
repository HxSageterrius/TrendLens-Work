import type { Metadata } from 'next';
import { DOMAINS, getJSON, type Cluster } from '@/lib/api';
import HomeEditorialView from '@/components/HomeEditorialView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'TrendLens - AI-Powered Visual Trend Analysis & Forecasting',
  description:
    'Discover what is next. Explore emerging visual trends in fashion and automobiles through intelligent image analysis and predictive insights.',
};

export default async function HomePage() {
  let fashionClusters: Cluster[] = [];
  let carsClusters: Cluster[] = [];

  try {
    const fRes = await getJSON('/trends?domain=fashion');
    fashionClusters = fRes.clusters || [];
  } catch {}

  try {
    const cRes = await getJSON('/trends?domain=cars');
    carsClusters = cRes.clusters || [];
  } catch {}

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'TrendLens',
    applicationCategory: 'DataAnalyticsApplication',
    description:
      'AI-Powered visual trend detection, unsupervised clustering, and Prophet time-series forecasting across fashion and automotive domains.',
    operatingSystem: 'All',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeEditorialView
        initialFashionTrends={fashionClusters}
        initialCarsTrends={carsClusters}
      />
    </>
  );
}
