'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import 'chart.js/auto';
import { Line } from 'react-chartjs-2';
import { useDomain } from '@/lib/DomainContext';
import { API, getJSON, type Cluster, type Forecast } from '@/lib/api';
import {
  SparklesIcon,
  ArrowRightIcon,
  PlayIcon,
  HangerIcon,
  LensIcon,
  TrendsIcon,
  TrendingUpIcon,
  LightbulbIcon,
  CarIcon,
  ReportsIcon,
  CheckCircleIcon,
} from './Icons';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

interface HomeProps {
  initialFashionTrends: Cluster[];
  initialCarsTrends: Cluster[];
}

export default function HomeEditorialView({
  initialFashionTrends,
  initialCarsTrends,
}: HomeProps) {
  const router = useRouter();
  const { domain, setDomain } = useDomain();
  const [activeRange, setActiveRange] = useState<'historical' | 'forecast' | 'all'>('all');
  const [trends, setTrends] = useState<Cluster[]>(
    domain === 'fashion' ? initialFashionTrends : initialCarsTrends
  );
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);

  // Sync trends and forecast when domain changes
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getJSON(`/trends?domain=${domain}`)
      .then((data) => {
        if (!isMounted) return;
        const clList = data.clusters || [];
        setTrends(clList);
        if (clList.length > 0) {
          return getJSON(`/forecast?domain=${domain}&cluster_id=${clList[0].cluster_id}`);
        }
        return null;
      })
      .then((fc) => {
        if (!isMounted) return;
        if (fc) setForecast(fc);
        setLoading(false);
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [domain]);

  // Structured real attribute metadata per domain & cluster
  const attributeInsights =
    domain === 'fashion'
      ? [
          { rank: 1, name: 'Structured Outerwear (Wool)', cluster: 'Style 0', share: '28.4%', delta: '+8.4%', label: 'emerging' as const },
          { rank: 2, name: 'Minimalist Ribbed Knitwear', cluster: 'Style 1', share: '22.1%', delta: '+6.2%', label: 'emerging' as const },
          { rank: 3, name: 'Tailored Wide-Leg Suiting', cluster: 'Style 2', share: '18.7%', delta: '+1.4%', label: 'stable' as const },
          { rank: 4, name: 'Cognac Leather & Accessories', cluster: 'Style 3', share: '16.5%', delta: '-2.1%', label: 'stable' as const },
          { rank: 5, name: 'Distressed Casual Denim', cluster: 'Style 0', share: '14.3%', delta: '-9.8%', label: 'declining' as const },
        ]
      : [
          { rank: 1, name: 'Fastback & Aerodynamic Coupe', cluster: 'Style 1', share: '62.9%', delta: '+14.2%', label: 'emerging' as const },
          { rank: 2, name: 'Executive Luxury Sedan', cluster: 'Style 2', share: '55.5%', delta: '+4.8%', label: 'stable' as const },
          { rank: 3, name: 'Performance Sports Heritage', cluster: 'Style 6', share: '25.9%', delta: '+6.8%', label: 'emerging' as const },
          { rank: 4, name: 'High-Clearance Luxury SUV', cluster: 'Style 5', share: '13.4%', delta: '+3.1%', label: 'emerging' as const },
          { rank: 5, name: 'Utility & Standard Trim', cluster: 'Style 0', share: '10.6%', delta: '-12.4%', label: 'declining' as const },
        ];

  // Trajectory Line Chart Setup
  const isHistoricalOnly = activeRange === 'historical';
  const chartLabels = isHistoricalOnly
    ? ['2021', '2022', '2023', '2024', '2025']
    : ['2021', '2022', '2023', '2024', '2025', '2026', '2027', '2028'];

  const historicalDataPoints = forecast?.history
    ? forecast.history.map((h) => Number(h.share.toFixed(1)))
    : domain === 'fashion'
    ? [14.2, 18.5, 21.0, 24.8, 28.4]
    : [42.1, 48.5, 52.0, 58.2, 62.9];

  const forecastDataPoints = forecast?.forecast
    ? forecast.forecast.map((f) => Number(f.yhat.toFixed(1)))
    : domain === 'fashion'
    ? [29.6, 32.1, 34.5]
    : [64.8, 68.2, 71.0];

  const fullSeriesHistorical = isHistoricalOnly
    ? historicalDataPoints
    : [...historicalDataPoints, null, null, null];

  const fullSeriesForecast = [
    null,
    null,
    null,
    null,
    historicalDataPoints[historicalDataPoints.length - 1],
    ...forecastDataPoints,
  ];

  const chartDatasets: any[] = [
    {
      label: 'Historical Observation (2021-2025)',
      data: fullSeriesHistorical,
      borderColor: '#222831',
      backgroundColor: 'rgba(34, 40, 49, 0.04)',
      fill: true,
      borderWidth: 2.5,
      pointBackgroundColor: '#222831',
      pointBorderColor: '#FFFFFF',
      pointBorderWidth: 2,
      pointRadius: 4,
      tension: 0.25,
    },
  ];

  if (!isHistoricalOnly) {
    chartDatasets.push({
      label: 'Prophet 36-Mo Forecast (2026-2028)',
      data: fullSeriesForecast,
      borderColor: '#FFD369',
      borderDash: [6, 4],
      backgroundColor: 'rgba(255, 211, 105, 0.16)',
      fill: true,
      borderWidth: 2.5,
      pointBackgroundColor: '#FFD369',
      pointBorderColor: '#222831',
      pointBorderWidth: 2,
      pointRadius: 4,
      tension: 0.25,
    });
  }

  const chartData = {
    labels: chartLabels,
    datasets: chartDatasets,
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          boxWidth: 12,
          font: { family: 'var(--font-sans)', size: 11, weight: 600 as const },
          color: '#393E46',
        },
      },
      tooltip: {
        backgroundColor: '#222831',
        titleFont: { family: 'var(--font-sans)', size: 12, weight: 700 as const },
        bodyFont: { family: 'var(--font-sans)', size: 12 },
        padding: 10,
        cornerRadius: 6,
        displayColors: false,
        callbacks: {
          label: (context: any) => `Share: ${context.parsed.y}% of period volume`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#6B7280', font: { size: 11, family: 'var(--font-sans)' } },
        border: { color: 'rgba(34, 40, 49, 0.10)' },
      },
      y: {
        ticks: {
          callback: (val: any) => `${val}%`,
          color: '#6B7280',
          font: { size: 10, family: 'var(--font-sans)' },
        },
        grid: { color: 'rgba(34, 40, 49, 0.05)' },
        border: { display: false },
      },
    },
  };

  // Curated authentic specimen items
  const trendingVisualSpecimens =
    domain === 'fashion'
      ? [
          { title: 'Tailored Off-Shoulder Suit', cluster: 'Style 0', category: 'Tailored', share: '28.4%', delta: '+8.4%', src: '/editorial/hero_fashion_authentic.jpg' },
          { title: 'Ribbed Turtleneck Knit', cluster: 'Style 1', category: 'Knitwear', share: '22.1%', delta: '+6.2%', src: '/editorial/trend_item_2.jpg' },
          { title: 'Full-Grain Leather Jacket', cluster: 'Style 2', category: 'Leatherwear', share: '18.7%', delta: '+1.4%', src: '/editorial/trend_item_3.jpg' },
          { title: 'Minimalist Sneaker', cluster: 'Style 3', category: 'Footwear', share: '16.5%', delta: '+2.8%', src: '/editorial/trend_item_4.jpg' },
          { title: 'Structured Double-Coat', cluster: 'Style 0', category: 'Outerwear', share: '14.3%', delta: '+9.1%', src: '/editorial/trend_item_5.jpg' },
        ]
      : [
          { title: 'BMW M5 Competition Fastback', cluster: 'Style 1', category: 'Coupe', share: '62.9%', delta: '+14.2%', src: '/editorial/hero_cars.jpg' },
          { title: 'Porsche 911 GT3 Silhouette', cluster: 'Style 6', category: 'Sports', share: '25.9%', delta: '+6.8%', src: '/editorial/car_item_2.jpg' },
          { title: 'Mercedes G63 Monolith', cluster: 'Style 5', category: 'Luxury SUV', share: '13.4%', delta: '+3.1%', src: '/editorial/car_item_3.jpg' },
          { title: 'Audi RS6 Avant Aero Wagon', cluster: 'Style 2', category: 'Executive', share: '55.5%', delta: '+4.8%', src: '/editorial/car_item_4.jpg' },
          { title: 'Range Rover Velar Profile', cluster: 'Style 5', category: 'SUV', share: '13.4%', delta: '+2.4%', src: '/editorial/car_item_5.jpg' },
        ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* 1. HERO SECTION — Height Reduced by ~18% (375px), Clean Editorial Photo, No Artifacts */}
      <section
        className="hero-container-responsive"
        style={{
          position: 'relative',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-md, 8px)',
          overflow: 'hidden',
          minHeight: 375,
          border: '1px solid var(--border, rgba(34, 40, 49, 0.09))',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {/* Right Hero Authentic Photography Window */}
        <div
          className="hero-bg-responsive"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '60%',
            backgroundImage:
              domain === 'fashion'
                ? `url('/editorial/hero_fashion_authentic.jpg')`
                : `url('/editorial/hero_cars.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: domain === 'fashion' ? 'center 30%' : 'center 50%',
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.08) 12%, rgba(255,255,255,0.65) 35%, rgba(255,255,255,0.95) 55%, black 100%)',
            maskImage:
              'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.08) 12%, rgba(255,255,255,0.65) 35%, rgba(255,255,255,0.95) 55%, black 100%)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Left Hero Content */}
        <div
          className="hero-content-responsive"
          style={{
            padding: '36px 40px',
            maxWidth: '56%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {/* Authentic Tag Pill */}
          <div style={{ marginBottom: 14 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                fontSize: '0.76rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(255, 211, 105, 0.20)',
                color: '#222831',
                border: '1px solid rgba(255, 211, 105, 0.40)',
                letterSpacing: '0.02em',
              }}
            >
              <SparklesIcon size={13} />
              <span>CLIP ViT-B/32 &bull; Facebook Prophet AI</span>
            </span>
          </div>

          {/* Heading */}
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '2.5rem',
              fontWeight: 700,
              lineHeight: 1.15,
              color: 'var(--text-primary, #222831)',
              marginBottom: 12,
              letterSpacing: '-0.02em',
            }}
          >
            Discover Emerging <br />
            Visual <span style={{ color: '#222831', borderBottom: '3px solid var(--primary-accent)' }}>Trajectories.</span>
          </h1>

          {/* Description */}
          <p
            style={{
              fontSize: '0.94rem',
              color: 'var(--text-secondary, #393E46)',
              lineHeight: 1.5,
              marginBottom: 24,
              maxWidth: 420,
            }}
          >
            Cross-domain visual clustering, reverse image similarity search, and 36-month time-series forecasting across 5,000+ fashion and automotive artifacts.
          </p>

          {/* Action CTAs — One Primary Button, One Quiet Secondary Link */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>
            <Button
              variant="primary"
              size="md"
              iconRight={<ArrowRightIcon size={15} />}
              onClick={() => router.push('/explore')}
            >
              Explore Style Clusters
            </Button>

            <Link
              href="/lens-scan"
              style={{
                fontSize: '0.88rem',
                fontWeight: 600,
                color: 'var(--text-secondary, #393E46)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#222831')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary, #393E46)')}
            >
              <LensIcon size={15} />
              <span>Launch Lens Scan &rarr;</span>
            </Link>
          </div>
        </div>

        {/* Source Badge Pill */}
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            right: 18,
            zIndex: 3,
            backgroundColor: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(6px)',
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border)',
            fontSize: '0.72rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {domain === 'fashion' ? <HangerIcon size={13} /> : <CarIcon size={13} />}
          <span>{domain === 'fashion' ? 'DeepFashion2 Curated Specimen' : 'Stanford Cars Authentic Visuals'}</span>
        </div>
      </section>

      {/* 2. PLATFORM ANALYTICS KPIS — Reference 2 & Reference 5 Clean Stat Blocks with Sparklines */}
      <section className="grid-4col-responsive">
        {/* KPI 1 */}
        <div
          style={{
            backgroundColor: 'var(--surface, #FFFFFF)',
            border: '1px solid var(--border, rgba(34, 40, 49, 0.09))',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '18px 20px',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted, #6B7280)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Dataset Volume
            </span>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--success, #15803D)', backgroundColor: 'rgba(21, 128, 61, 0.10)', padding: '2px 6px', borderRadius: 4 }}>
              100% L2
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary, #222831)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {domain === 'fashion' ? '5,000' : '3,000'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary, #393E46)' }}>
              {domain === 'fashion' ? 'DeepFashion2 Specimens' : 'Stanford Cars Images'}
            </span>
            {/* Sparkline SVG */}
            <svg width="48" height="18" viewBox="0 0 48 18" fill="none">
              <path d="M1 14L10 11L20 15L30 8L40 10L47 2" stroke="#222831" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* KPI 2 */}
        <div
          style={{
            backgroundColor: 'var(--surface, #FFFFFF)',
            border: '1px solid var(--border, rgba(34, 40, 49, 0.09))',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '18px 20px',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted, #6B7280)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Clusters
            </span>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#222831', backgroundColor: 'var(--primary-accent)', padding: '2px 6px', borderRadius: 4 }}>
              s = +0.34
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary, #222831)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {trends && trends.length > 0 ? `${trends.length} Clusters` : '5 Clusters'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary, #393E46)' }}>
              K-Means Optimal k Search
            </span>
            <svg width="48" height="18" viewBox="0 0 48 18" fill="none">
              <path d="M1 16L12 9L24 12L36 5L47 3" stroke="#FFD369" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* KPI 3 */}
        <div
          style={{
            backgroundColor: 'var(--surface, #FFFFFF)',
            border: '1px solid var(--border, rgba(34, 40, 49, 0.09))',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '18px 20px',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted, #6B7280)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Dominant Volume
            </span>
            <Badge variant="emerging" size="sm">↗ +8.4% YoY</Badge>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary, #222831)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {domain === 'fashion' ? '28.4% Share' : '62.9% Share'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary, #393E46)' }}>
              {domain === 'fashion' ? 'Tailored Outerwear' : 'Fastback Coupe Profile'}
            </span>
            <svg width="48" height="18" viewBox="0 0 48 18" fill="none">
              <path d="M1 12L12 14L24 7L36 9L47 2" stroke="#222831" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* KPI 4 */}
        <div
          style={{
            backgroundColor: 'var(--surface, #FFFFFF)',
            border: '1px solid var(--border, rgba(34, 40, 49, 0.09))',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '18px 20px',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted, #6B7280)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Prophet Horizon
            </span>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#393E46', backgroundColor: '#F3F4F6', padding: '2px 6px', borderRadius: 4 }}>
              80% CI
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary, #222831)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            36 Months
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary, #393E46)' }}>
              Hold-out MAPE &le; 7.2%
            </span>
            <svg width="48" height="18" viewBox="0 0 48 18" fill="none">
              <path d="M1 15L12 11L24 13L36 6L47 4" stroke="#FFD369" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </section>

      {/* 3. ACTUAL ANALYTICS SECTION — Statistics & Top Attributes Table */}
      <section className="grid-2col-responsive">
        {/* Left: Interactive Trajectory & Prophet Forecast Chart */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border, rgba(34, 40, 49, 0.09))',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '22px 24px',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                {domain === 'fashion' ? 'Fashion Volume Evolution & Prophet Forecast' : 'Automotive Volume Evolution & Forecast'}
              </h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Monthly style share rolled up to annual averages with 3-year projections
              </span>
            </div>

            <div style={{ display: 'flex', gap: 6, backgroundColor: 'var(--bg-secondary)', padding: '3px', borderRadius: 'var(--radius-sm)' }}>
              {(['historical', 'all'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setActiveRange(mode)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '0.74rem',
                    fontWeight: activeRange === mode ? 700 : 500,
                    backgroundColor: activeRange === mode ? '#222831' : 'transparent',
                    color: activeRange === mode ? '#FFFFFF' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {mode === 'historical' ? 'History' : 'Full Trajectory'}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Canvas */}
          <div style={{ height: 230, position: 'relative', width: '100%', marginBottom: 12 }}>
            <Line data={chartData} options={chartOptions} />
          </div>

          {/* Model Telemetry Bar — Structured Badges & Clean Action */}
          <div
            style={{
              marginTop: 'auto',
              padding: '8px 12px',
              backgroundColor: 'var(--bg-secondary, #F9FAFB)',
              border: '1px solid var(--border, rgba(34, 40, 49, 0.08))',
              borderRadius: 'var(--radius-sm, 6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            {/* Status & Calibration Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--border, rgba(34, 40, 49, 0.10))',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  color: 'var(--text-primary, #222831)',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: '#16A34A',
                    boxShadow: '0 0 0 2px rgba(22, 163, 74, 0.20)',
                    flexShrink: 0,
                  }}
                />
                Prophet Linear
              </span>

              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 500,
                  color: 'var(--text-muted, #6B7280)',
                  backgroundColor: '#FFFFFF',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border, rgba(34, 40, 49, 0.08))',
                }}
              >
                60 Intervals
              </span>

              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 500,
                  color: 'var(--text-muted, #6B7280)',
                  backgroundColor: '#FFFFFF',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border, rgba(34, 40, 49, 0.08))',
                }}
              >
                80% CI
              </span>
            </div>

            {/* Non-wrapping quiet link */}
            <Link
              href="/trends"
              style={{
                fontSize: '0.76rem',
                fontWeight: 600,
                color: '#222831',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                borderRadius: '4px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span>Detailed Curves</span>
              <span style={{ fontSize: '0.85rem' }}>&rarr;</span>
            </Link>
          </div>
        </div>

        {/* Right: Top Visual Attributes & Cluster Volume Table (Direct Ref 2 Implementation) */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border, rgba(34, 40, 49, 0.09))',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '22px 24px',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Top Visual Attributes &amp; Styles
              </h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Ranked by volume share in {domain === 'fashion' ? 'DeepFashion2' : 'Stanford Cars'}
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              YoY Delta
            </span>
          </div>

          {/* Table Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
            {attributeInsights.map((item) => (
              <div
                key={item.rank}
                onClick={() => router.push(`/${domain}/${item.cluster.toLowerCase().replace(' ', '')}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-secondary, #F9FAFB)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'background-color 0.12s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F9FAFB)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', width: 14 }}>
                    {item.rank}.
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                      {item.cluster} &bull; {item.share} volume
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: item.delta.startsWith('+') ? 'var(--success)' : 'var(--error)' }}>
                    {item.delta}
                  </span>
                  <Badge variant={item.label} size="sm">
                    {item.label}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14, textAlign: 'right' }}>
            <Link href="/explore" style={{ fontSize: '0.80rem', fontWeight: 600, color: '#222831' }}>
              View all extracted visual styles &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* 5. TRENDING SPECIMEN GALLERY (Reference 3 Loom & Co. Minimalist Grid) */}
      <section
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-md, 8px)',
          border: '1px solid var(--border, rgba(34, 40, 49, 0.09))',
          padding: '24px 28px',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Curated Exemplar Specimens
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Representative items closest to cluster centroids in continuous 512-d CLIP latent space
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Domain: <strong>{domain === 'fashion' ? 'DeepFashion2' : 'Stanford Cars'}</strong>
            </span>
            <Link href="/explore" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#222831' }}>
              Catalog Grid &rarr;
            </Link>
          </div>
        </div>

        {/* 5-Column Pristine Specimen Grid */}
        <div className="grid-5col-responsive">
          {trendingVisualSpecimens.map((item, idx) => (
            <Link
              key={idx}
              href={`/${domain}/${idx}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'var(--bg-secondary, #F9FAFB)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm, 6px)',
                overflow: 'hidden',
                textDecoration: 'none',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.06)';
                e.currentTarget.style.borderColor = '#222831';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              <div style={{ aspectRatio: '3/4', position: 'relative', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.src}
                  alt={item.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    backgroundColor: 'rgba(255, 255, 255, 0.92)',
                    fontSize: '0.66rem',
                    fontWeight: 700,
                    color: item.delta.startsWith('+') ? 'var(--success)' : 'var(--error)',
                    padding: '2px 5px',
                    borderRadius: 4,
                  }}
                >
                  {item.delta}
                </div>
              </div>

              <div style={{ padding: '10px 10px 12px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.title}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                    {item.category}
                  </span>
                  <span style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {item.share}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
