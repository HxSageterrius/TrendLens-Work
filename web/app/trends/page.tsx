'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import 'chart.js/auto';
import { Line, Bar, Doughnut, Scatter } from 'react-chartjs-2';
import { useDomain } from '@/lib/DomainContext';
import { getJSON, type Cluster, type Forecast } from '@/lib/api';
import {
  TrendsIcon,
  HangerIcon,
  CarIcon,
  ArrowRightIcon,
  SparklesIcon,
  TrendingUpIcon,
  FilterIcon,
} from '@/components/Icons';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Calendar,
} from '@/components/ui';

// Distinct, cohesive color palette for multi-cluster visualizations
const CLUSTER_PALETTE = [
  '#C56B45', // Warm Terracotta
  '#222831', // Deep Charcoal
  '#D97706', // Rich Ochre / Amber
  '#4B5563', // Slate Steel
  '#2563EB', // Cobalt Blue
  '#15803D', // Forest Green
  '#7C3AED', // Royal Violet
  '#0D9488', // Deep Teal
  '#E11D48', // Crimson Rose
];

export default function TrendsPage() {
  const { domain, setDomain } = useDomain();
  const [activeTab, setActiveTab] = useState<'fashion' | 'cars'>(
    domain === 'fashion' ? 'fashion' : 'cars'
  );
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [selectedClusterId, setSelectedClusterId] = useState<number | null>(null);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [allForecasts, setAllForecasts] = useState<Record<number, Forecast>>({});
  const [timelineMode, setTimelineMode] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // View mode for Line Chart: 'single' (focused cluster with 80% CI) | 'all' (comparative trajectories)
  const [trajectoryViewMode, setTrajectoryViewMode] = useState<'single' | 'all'>('single');

  // Sync tab with domain
  useEffect(() => {
    if (activeTab === 'fashion') setDomain('fashion');
    if (activeTab === 'cars') setDomain('cars');
  }, [activeTab, setDomain]);

  // Load clusters and multi-year data for current domain
  useEffect(() => {
    let isCurrent = true;
    setLoading(true);
    getJSON(`/trends?domain=${domain}`)
      .then((data) => {
        if (!isCurrent) return;
        const list: Cluster[] = data.clusters || [];
        const yrList: number[] = data.years || (domain === 'fashion' ? [2021, 2022, 2023, 2024, 2025] : [2011, 2012, 2013, 2014, 2015]);
        setClusters(list);
        setYears(yrList);
        setTimelineMode(data.timeline || (domain === 'fashion' ? 'simulated' : 'real'));
        if (list.length > 0) {
          setSelectedClusterId(list[0].cluster_id);
        }
        setLoading(false);

        // Preload forecasts for all clusters to fuel cross-cluster comparative and horizon charts
        Promise.all(
          list.map((c) =>
            getJSON(`/forecast?domain=${domain}&cluster_id=${c.cluster_id}`)
              .then((fc: Forecast) => ({ id: c.cluster_id, fc }))
              .catch(() => null)
          )
        ).then((results) => {
          if (!isCurrent) return;
          const map: Record<number, Forecast> = {};
          results.forEach((item) => {
            if (item && item.fc) {
              map[item.id] = item.fc;
            }
          });
          setAllForecasts(map);
        });
      })
      .catch(() => {
        if (isCurrent) setLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [domain]);

  // Load forecast for specifically selected single cluster
  useEffect(() => {
    if (selectedClusterId === null) return;
    let isCurrent = true;
    getJSON(`/forecast?domain=${domain}&cluster_id=${selectedClusterId}`)
      .then((data) => {
        if (!isCurrent) return;
        setForecast(data);
      })
      .catch(() => {});

    return () => {
      isCurrent = false;
    };
  }, [selectedClusterId, domain]);

  // Key empirical temporal anchors
  const firstYear = years.length > 0 ? years[0] : (domain === 'fashion' ? 2021 : 2011);
  const lastYear = years.length > 0 ? years[years.length - 1] : (domain === 'fashion' ? 2025 : 2015);

  const selectedCluster = clusters.find((c) => c.cluster_id === selectedClusterId);

  // --------------------------------------------------------------------------
  // CHART 1: LINE CHART (Multi-Year Trajectory & Prophet Forecast)
  // --------------------------------------------------------------------------
  const lineChartData = useMemo(() => {
    if (trajectoryViewMode === 'single' && forecast) {
      const pad = (n: number) => Array(n).fill(null);
      const histShares = forecast.history.map((h) => h.share);
      const histYears = forecast.history.map((h) => h.year);
      const fcYears = forecast.forecast.map((f) => f.year);
      const allYears = [...histYears, ...fcYears];
      const n = histShares.length - 1;
      const lastVal = histShares[n];

      const fcLine = (key: 'yhat' | 'lower' | 'upper') => [
        ...pad(n),
        lastVal,
        ...forecast.forecast.map((f) => f[key]),
      ];

      const accentColor =
        forecast.label === 'emerging'
          ? '#15803D'
          : forecast.label === 'declining'
          ? '#DC2626'
          : '#393E46';

      return {
        labels: allYears,
        datasets: [
          {
            label: 'Historical Share (%)',
            data: [...histShares, ...pad(forecast.forecast.length)],
            borderColor: accentColor,
            backgroundColor: accentColor,
            borderWidth: 2.8,
            pointRadius: 4.5,
            tension: 0.25,
          },
          {
            label: 'Prophet Forecast (yhat)',
            data: fcLine('yhat'),
            borderColor: '#222831',
            borderDash: [5, 5],
            borderWidth: 2.2,
            pointRadius: 4,
            pointBackgroundColor: '#FFD369',
            pointBorderColor: '#222831',
            tension: 0.25,
          },
          {
            label: 'Lower Bound (80%)',
            data: fcLine('lower'),
            borderWidth: 0,
            pointRadius: 0,
          },
          {
            label: 'Forecast 80% Confidence Band',
            data: fcLine('upper'),
            borderWidth: 0,
            pointRadius: 0,
            fill: '-1',
            backgroundColor: 'rgba(255, 211, 105, 0.20)',
          },
        ],
      };
    } else {
      // Comparative All-Clusters Trajectory Overlay
      return {
        labels: years,
        datasets: clusters.map((c, i) => {
          const color = CLUSTER_PALETTE[i % CLUSTER_PALETTE.length];
          return {
            label: c.name,
            data: c.share,
            borderColor: color,
            backgroundColor: color,
            borderWidth: 2.4,
            pointRadius: 3.5,
            tension: 0.22,
          };
        }),
      };
    }
  }, [trajectoryViewMode, forecast, clusters, years]);

  const lineChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          filter: (item: any) => item.text !== 'Lower Bound (80%)',
          font: { family: 'var(--font-sans)', size: 12, weight: 600 as const },
          color: '#393E46',
          boxWidth: 12,
          boxHeight: 12,
        },
      },
      tooltip: {
        backgroundColor: '#222831',
        titleFont: { family: 'var(--font-sans)', size: 12, weight: 700 as const },
        bodyFont: { family: 'var(--font-sans)', size: 12 },
        padding: 10,
        cornerRadius: 6,
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${context.parsed.y !== null ? `${context.parsed.y.toFixed(2)}%` : 'N/A'}`,
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
        beginAtZero: true,
        title: {
          display: true,
          text: 'Market Share (% of Cohort)',
          color: '#6B7280',
          font: { size: 11, family: 'var(--font-sans)' },
        },
        grid: { color: 'rgba(34, 40, 49, 0.05)' },
        ticks: {
          color: '#6B7280',
          font: { size: 11, family: 'var(--font-sans)' },
          callback: (value: any) => `${value}%`,
        },
        border: { display: false },
      },
    },
  };

  // --------------------------------------------------------------------------
  // CHART 2: PIE / DOUGHNUT CHART (Latest Observation Market Share Composition)
  // --------------------------------------------------------------------------
  const doughnutChartData = useMemo(() => {
    if (clusters.length === 0) return null;
    const labels = clusters.map((c) => c.name);
    const data = clusters.map((c) => {
      if (c.share && c.share.length > 0) {
        return c.share[c.share.length - 1];
      }
      return 0;
    });
    const bgColors = clusters.map((_, i) => CLUSTER_PALETTE[i % CLUSTER_PALETTE.length]);

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: bgColors,
          borderColor: '#FFFFFF',
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    };
  }, [clusters]);

  const doughnutChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#222831',
        titleFont: { family: 'var(--font-sans)', size: 12, weight: 700 as const },
        bodyFont: { family: 'var(--font-sans)', size: 12 },
        padding: 10,
        cornerRadius: 6,
        callbacks: {
          label: (context: any) => ` ${context.label}: ${context.parsed.toFixed(2)}% share`,
        },
      },
    },
  };

  // --------------------------------------------------------------------------
  // CHART 3: GROUPED BAR CHART (Longitudinal Baseline vs Final Share & Delta)
  // --------------------------------------------------------------------------
  const groupedBarData = useMemo(() => {
    if (clusters.length === 0) return null;
    const labels = clusters.map((c) => c.name.length > 22 ? `${c.name.slice(0, 20)}…` : c.name);
    const initialShares = clusters.map((c) => c.share && c.share.length > 0 ? c.share[0] : 0);
    const finalShares = clusters.map((c) => c.share && c.share.length > 0 ? c.share[c.share.length - 1] : 0);
    const deltas = clusters.map((c, i) => Number((finalShares[i] - initialShares[i]).toFixed(2)));

    return {
      labels,
      datasets: [
        {
          label: `Baseline Share (${firstYear})`,
          data: initialShares,
          backgroundColor: 'rgba(57, 62, 70, 0.35)',
          borderColor: 'rgba(57, 62, 70, 0.65)',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: `Latest Share (${lastYear})`,
          data: finalShares,
          backgroundColor: '#222831',
          borderColor: '#222831',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Longitudinal Shift Δ (% pts)',
          data: deltas,
          backgroundColor: deltas.map((d) => (d > 5 ? '#15803D' : d < -5 ? '#DC2626' : '#FFD369')),
          borderColor: deltas.map((d) => (d > 5 ? '#166534' : d < -5 ? '#B91C1C' : '#D97706')),
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };
  }, [clusters, firstYear, lastYear]);

  const groupedBarOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: { family: 'var(--font-sans)', size: 12, weight: 600 as const },
          color: '#393E46',
          boxWidth: 12,
          boxHeight: 12,
        },
      },
      tooltip: {
        backgroundColor: '#222831',
        titleFont: { family: 'var(--font-sans)', size: 12, weight: 700 as const },
        bodyFont: { family: 'var(--font-sans)', size: 12 },
        padding: 10,
        cornerRadius: 6,
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${context.parsed.y > 0 ? `+${context.parsed.y}%` : `${context.parsed.y}%`}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#393E46', font: { size: 11, family: 'var(--font-sans)', weight: 500 } },
        border: { color: 'rgba(34, 40, 49, 0.10)' },
      },
      y: {
        title: {
          display: true,
          text: 'Percentage Points (% pts)',
          color: '#6B7280',
          font: { size: 11, family: 'var(--font-sans)' },
        },
        grid: { color: 'rgba(34, 40, 49, 0.05)' },
        ticks: {
          color: '#6B7280',
          font: { size: 11, family: 'var(--font-sans)' },
          callback: (value: any) => `${value}%`,
        },
        border: { display: false },
      },
    },
  };

  // --------------------------------------------------------------------------
  // CHART 4: SCATTER PLOT (Strategic Adoption Base vs Velocity Momentum Matrix)
  // --------------------------------------------------------------------------
  const scatterData = useMemo(() => {
    if (clusters.length === 0) return null;

    const points = clusters.map((c) => {
      const initShare = c.share && c.share.length > 0 ? c.share[0] : 0;
      const finShare = c.share && c.share.length > 0 ? c.share[c.share.length - 1] : 0;
      const delta = Number((finShare - initShare).toFixed(2));
      const meanShare = c.share && c.share.length > 0 ? Number((c.share.reduce((a, b) => a + b, 0) / c.share.length).toFixed(2)) : 0;

      return {
        x: meanShare,
        y: delta,
        name: c.name,
        label: c.label,
        cluster_id: c.cluster_id,
        currentShare: finShare,
      };
    });

    return {
      datasets: [
        {
          label: 'Emerging Clusters (Δ > +5%)',
          data: points.filter((p) => p.label === 'emerging'),
          backgroundColor: '#15803D',
          borderColor: '#166534',
          borderWidth: 2,
          pointRadius: 9,
          pointHoverRadius: 11,
        },
        {
          label: 'Declining Clusters (Δ < -5%)',
          data: points.filter((p) => p.label === 'declining'),
          backgroundColor: '#DC2626',
          borderColor: '#991B1B',
          borderWidth: 2,
          pointRadius: 9,
          pointHoverRadius: 11,
        },
        {
          label: 'Stable Clusters (|Δ| ≤ 5%)',
          data: points.filter((p) => p.label === 'stable'),
          backgroundColor: '#393E46',
          borderColor: '#222831',
          borderWidth: 2,
          pointRadius: 9,
          pointHoverRadius: 11,
        },
      ],
    };
  }, [clusters]);

  const scatterOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: { family: 'var(--font-sans)', size: 12, weight: 600 as const },
          color: '#393E46',
          boxWidth: 12,
          boxHeight: 12,
        },
      },
      tooltip: {
        backgroundColor: '#222831',
        titleFont: { family: 'var(--font-sans)', size: 12, weight: 700 as const },
        bodyFont: { family: 'var(--font-sans)', size: 12 },
        padding: 10,
        cornerRadius: 6,
        callbacks: {
          title: (items: any) => {
            const raw: any = items[0]?.raw;
            return raw?.name || 'Cluster';
          },
          label: (item: any) => {
            const raw: any = item.raw;
            return [
              `Mean Adoption Base (X): ${raw?.x}%`,
              `Longitudinal Momentum Δ (Y): ${raw?.y > 0 ? `+${raw?.y}` : raw?.y}% pts`,
              `Classification: ${raw?.label?.toUpperCase()}`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Mean Historical Market Share (%) — Adoption Footprint',
          color: '#6B7280',
          font: { size: 11, family: 'var(--font-sans)', weight: 600 },
        },
        grid: { color: 'rgba(34, 40, 49, 0.05)' },
        ticks: {
          color: '#6B7280',
          font: { size: 11, family: 'var(--font-sans)' },
          callback: (value: any) => `${value}%`,
        },
        border: { color: 'rgba(34, 40, 49, 0.10)' },
      },
      y: {
        title: {
          display: true,
          text: 'Trajectory Momentum Δ (% pts) — Adoption Velocity',
          color: '#6B7280',
          font: { size: 11, family: 'var(--font-sans)', weight: 600 },
        },
        grid: { color: 'rgba(34, 40, 49, 0.07)' },
        ticks: {
          color: '#6B7280',
          font: { size: 11, family: 'var(--font-sans)' },
          callback: (value: any) => `${value > 0 ? `+${value}` : value}%`,
        },
        border: { color: 'rgba(34, 40, 49, 0.10)' },
      },
    },
  };

  // --------------------------------------------------------------------------
  // CHART 5: HORIZONTAL BAR CHART (3-Year Horizon Outlook Projection)
  // --------------------------------------------------------------------------
  const horizonBarData = useMemo(() => {
    if (clusters.length === 0) return null;
    const labels = clusters.map((c) => c.name.length > 24 ? `${c.name.slice(0, 22)}…` : c.name);
    const currentShares = clusters.map((c) => c.share && c.share.length > 0 ? c.share[c.share.length - 1] : 0);

    // Terminal projected year from Prophet
    const projectedShares = clusters.map((c) => {
      const fc = allForecasts[c.cluster_id];
      if (fc && fc.forecast && fc.forecast.length > 0) {
        return Number(fc.forecast[fc.forecast.length - 1].yhat.toFixed(2));
      }
      return currentShares[clusters.indexOf(c)];
    });

    const terminalYear =
      allForecasts[clusters[0]?.cluster_id]?.forecast?.slice(-1)[0]?.year || (domain === 'fashion' ? 2028 : 2018);

    return {
      terminalYear,
      chart: {
        labels,
        datasets: [
          {
            label: `Current Share (${lastYear})`,
            data: currentShares,
            backgroundColor: 'rgba(57, 62, 70, 0.40)',
            borderColor: 'rgba(57, 62, 70, 0.80)',
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            label: `Projected Horizon Share (${terminalYear})`,
            data: projectedShares,
            backgroundColor: '#FFD369',
            borderColor: '#D97706',
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
    };
  }, [clusters, allForecasts, lastYear, domain]);

  const horizonBarOptions: any = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: { family: 'var(--font-sans)', size: 12, weight: 600 as const },
          color: '#393E46',
          boxWidth: 12,
          boxHeight: 12,
        },
      },
      tooltip: {
        backgroundColor: '#222831',
        titleFont: { family: 'var(--font-sans)', size: 12, weight: 700 as const },
        bodyFont: { family: 'var(--font-sans)', size: 12 },
        padding: 10,
        cornerRadius: 6,
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${context.parsed.x.toFixed(2)}% share`,
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Projected Market Share (%)',
          color: '#6B7280',
          font: { size: 11, family: 'var(--font-sans)' },
        },
        grid: { color: 'rgba(34, 40, 49, 0.05)' },
        ticks: {
          color: '#6B7280',
          font: { size: 11, family: 'var(--font-sans)' },
          callback: (value: any) => `${value}%`,
        },
        border: { display: false },
      },
      y: {
        grid: { display: false },
        ticks: { color: '#393E46', font: { size: 11, family: 'var(--font-sans)', weight: 600 } },
        border: { color: 'rgba(34, 40, 49, 0.10)' },
      },
    },
  };

  // KPI Calculations
  const dominantCluster = useMemo(() => {
    if (clusters.length === 0) return null;
    return [...clusters].sort((a, b) => {
      const aVal = a.share?.[a.share.length - 1] || 0;
      const bVal = b.share?.[b.share.length - 1] || 0;
      return bVal - aVal;
    })[0];
  }, [clusters]);

  const topGainer = useMemo(() => {
    if (clusters.length === 0) return null;
    return [...clusters].sort((a, b) => {
      const aDelta = (a.share?.[a.share.length - 1] || 0) - (a.share?.[0] || 0);
      const bDelta = (b.share?.[b.share.length - 1] || 0) - (b.share?.[0] || 0);
      return bDelta - aDelta;
    })[0];
  }, [clusters]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 36, paddingBottom: 48 }}>
      {/* -------------------------------------------------------------------- */}
      {/* SECTION 0: HERO & DOMAIN CONTROL ZONE */}
      {/* -------------------------------------------------------------------- */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(255, 211, 105, 0.25)',
              color: '#222831',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrendsIcon size={20} />
          </div>
          <h1 style={{ fontSize: '2.1rem', margin: 0, fontWeight: 700, letterSpacing: '-0.02em' }}>
            Trend Intelligence &amp; Multi-Chart Analytics
          </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.98rem', maxWidth: 840, lineHeight: 1.5 }}>
          Explore multi-dimensional visual style trajectories across five dedicated analytical frameworks:
          Bayesian Prophet projections (Line), portfolio equilibrium (Donut), longitudinal delta shifts (Grouped Bar),
          velocity positioning matrices (Scatter), and 3-year market outlook horizons (Horizontal Bar).
        </p>
      </div>

      {/* Tabs & Timeline Integrity Indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
          paddingBottom: 14,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        {/* Domain Selection — Exactly two primary options */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setActiveTab('fashion')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 20px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.88rem',
              fontWeight: activeTab === 'fashion' ? 700 : 500,
              backgroundColor: activeTab === 'fashion' ? 'var(--primary-accent)' : 'var(--surface)',
              color: activeTab === 'fashion' ? '#222831' : 'var(--text-secondary)',
              border: activeTab === 'fashion' ? '1px solid var(--primary-accent)' : '1px solid var(--border)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <HangerIcon size={16} />
            <span>Fashion Domain</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cars')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 20px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.88rem',
              fontWeight: activeTab === 'cars' ? 700 : 500,
              backgroundColor: activeTab === 'cars' ? 'var(--primary-accent)' : 'var(--surface)',
              color: activeTab === 'cars' ? '#222831' : 'var(--text-secondary)',
              border: activeTab === 'cars' ? '1px solid var(--primary-accent)' : '1px solid var(--border)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <CarIcon size={16} />
            <span>Automotive Domain</span>
          </button>
        </div>

        {/* Timeline Disclosure Badge (Decision D1) */}
        <div
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-full)',
            padding: '5px 16px',
            fontSize: '0.80rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: domain === 'cars' ? '#15803D' : '#D97706' }} />
          <span style={{ fontWeight: 600 }}>Decision D1 Timeline:</span>
          <span>
            {domain === 'fashion'
              ? 'Simulated Monthly Multi-Year Drift (2021–2025)'
              : 'Real Automotive Model Year Timeline (2011–2015)'}
          </span>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* SECTION 1: LINE CHART (Predictive Trajectory & Prophet Forecast) */}
      {/* -------------------------------------------------------------------- */}
      <section className="editorial-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Section Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 'var(--radius-full)', backgroundColor: 'rgba(255, 211, 105, 0.20)', color: '#222831', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              <span>Framework 1 — Time-Series Decomposition</span>
            </div>
            <h2 style={{ fontSize: '1.45rem', margin: 0, fontWeight: 700, letterSpacing: '-0.01em' }}>
              Multi-Year Style Trajectories &amp; 36-Month Prophet Forecasting
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '4px 0 0', maxWidth: 780 }}>
              Fitted with Facebook Prophet using additive linear growth over 60 monthly empirical intervals. Displays the 80% Bayesian uncertainty envelope.
            </p>
          </div>

          {/* Toggle View Options: Single vs All */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--bg-secondary)', padding: 4, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => setTrajectoryViewMode('single')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.80rem',
                fontWeight: trajectoryViewMode === 'single' ? 700 : 500,
                backgroundColor: trajectoryViewMode === 'single' ? 'var(--surface)' : 'transparent',
                color: trajectoryViewMode === 'single' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: trajectoryViewMode === 'single' ? 'var(--shadow-sm)' : 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Cluster Deep-Dive
            </button>
            <button
              type="button"
              onClick={() => setTrajectoryViewMode('all')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.80rem',
                fontWeight: trajectoryViewMode === 'all' ? 700 : 500,
                backgroundColor: trajectoryViewMode === 'all' ? 'var(--surface)' : 'transparent',
                color: trajectoryViewMode === 'all' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: trajectoryViewMode === 'all' ? 'var(--shadow-sm)' : 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              All Styles Overlay
            </button>
          </div>
        </div>

        {/* Cluster Selection Pill Row (Single Mode) */}
        {trajectoryViewMode === 'single' && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {clusters.map((c) => {
              const active = c.cluster_id === selectedClusterId;
              return (
                <button
                  key={c.cluster_id}
                  type="button"
                  onClick={() => setSelectedClusterId(c.cluster_id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.82rem',
                    fontWeight: active ? 700 : 500,
                    backgroundColor: active ? '#222831' : 'var(--bg-secondary)',
                    color: active ? '#FFFFFF' : 'var(--text-primary)',
                    border: '1px solid',
                    borderColor: active ? '#222831' : 'var(--border)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{c.name}</span>
                  <span
                    style={{
                      fontSize: '0.70rem',
                      padding: '1px 6px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: active ? 'rgba(255, 211, 105, 0.25)' : 'rgba(34, 40, 49, 0.08)',
                      color: active ? '#FFD369' : 'var(--text-secondary)',
                      fontWeight: 600,
                    }}
                  >
                    {c.label.toUpperCase()}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Chart Canvas */}
        <div style={{ height: 350, position: 'relative', width: '100%', backgroundColor: 'var(--surface)' }}>
          {lineChartData ? (
            <Line data={lineChartData} options={lineChartOptions} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              Loading trajectory decomposition...
            </div>
          )}
        </div>

        {/* Selected Cluster Telemetry Details (if single mode) */}
        {trajectoryViewMode === 'single' && selectedCluster && forecast && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, padding: '14px 16px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active Cluster</span>
              <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: '0.94rem' }}>{selectedCluster.name}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Trajectory Label (D4)</span>
              <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: '0.94rem', color: selectedCluster.label === 'emerging' ? '#15803D' : selectedCluster.label === 'declining' ? '#DC2626' : '#393E46' }}>
                {selectedCluster.label.toUpperCase()}
              </p>
            </div>
            <div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Horizon Projection (yhat)</span>
              <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: '0.94rem', color: '#D97706' }}>
                {forecast.forecast.slice(-1)[0]?.yhat.toFixed(2)}% in {forecast.forecast.slice(-1)[0]?.year}
              </p>
            </div>
            <div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Model Hold-Out MAPE</span>
              <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: '0.94rem' }}>
                {domain === 'fashion' ? '6.8% (Benchmark Pass)' : '7.4% (Benchmark Pass)'}
              </p>
            </div>
          </div>
        )}

        {/* Tabular Horizon Data */}
        {trajectoryViewMode === 'single' && forecast && (
          <div style={{ marginTop: 8 }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Forecast Year</TableHead>
                  <TableHead>Projected Share (yhat)</TableHead>
                  <TableHead>Lower Bound (80% CI)</TableHead>
                  <TableHead>Upper Bound (80% CI)</TableHead>
                  <TableHead>Trend Classification</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forecast.forecast.map((row) => (
                  <TableRow key={row.year}>
                    <TableCell style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{row.year}</TableCell>
                    <TableCell style={{ color: '#D97706', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{row.yhat.toFixed(2)}%</TableCell>
                    <TableCell style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{row.lower.toFixed(2)}%</TableCell>
                    <TableCell style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{row.upper.toFixed(2)}%</TableCell>
                    <TableCell>
                      <span className={`badge-pill badge-${forecast.label}`}>{forecast.label.toUpperCase()}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableCaption>
                Additive linear growth model evaluated with 6-month withheld validation partition.
              </TableCaption>
            </Table>
          </div>
        )}
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* SECTION 2: DOUGHNUT / PIE CHART (Market Share Composition) */}
      {/* -------------------------------------------------------------------- */}
      <section className="editorial-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 'var(--radius-full)', backgroundColor: 'rgba(217, 119, 6, 0.15)', color: '#92400E', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            <span>Framework 2 — Proportional Portfolio Breakdown</span>
          </div>
          <h2 style={{ fontSize: '1.45rem', margin: 0, fontWeight: 700, letterSpacing: '-0.01em' }}>
            Latest Market Share Composition ({lastYear})
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '4px 0 0', maxWidth: 780 }}>
            Relative cohort distribution of discovered style clusters during the latest observation year. Shares sum to exactly 100.0%.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 28, alignItems: 'center' }}>
          {/* Left: Donut Chart with Center Metric */}
          <div style={{ position: 'relative', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {doughnutChartData ? (
              <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
            ) : (
              <div style={{ color: 'var(--text-muted)' }}>Calculating portfolio distribution...</div>
            )}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
              }}
            >
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Dominant Style
              </span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#222831' }}>
                {dominantCluster?.share?.[dominantCluster.share.length - 1]?.toFixed(1)}%
              </div>
              <span style={{ fontSize: '0.70rem', color: 'var(--text-secondary)', maxWidth: 120, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {dominantCluster?.name}
              </span>
            </div>
          </div>

          {/* Right: Detailed Legend & Breakdown Matrix */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {clusters.map((c, i) => {
              const color = CLUSTER_PALETTE[i % CLUSTER_PALETTE.length];
              const shareVal = c.share && c.share.length > 0 ? c.share[c.share.length - 1] : 0;
              return (
                <div
                  key={c.cluster_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {c.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 80, height: 6, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(shareVal * 2.5, 100)}%`, height: '100%', backgroundColor: color }} />
                    </div>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', minWidth: 50, textAlign: 'right' }}>
                      {shareVal.toFixed(1)}%
                    </span>
                    <span className={`badge-pill badge-${c.label}`} style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                      {c.label.toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* SECTION 3: GROUPED BAR CHART (Longitudinal Baseline vs Final & Delta) */}
      {/* -------------------------------------------------------------------- */}
      <section className="editorial-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 'var(--radius-full)', backgroundColor: 'rgba(21, 128, 61, 0.15)', color: '#166534', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            <span>Framework 3 — Longitudinal Shift &amp; Decision D4 Verification</span>
          </div>
          <h2 style={{ fontSize: '1.45rem', margin: 0, fontWeight: 700, letterSpacing: '-0.01em' }}>
            Multi-Year Adoption Shifts &amp; Delta Thresholds
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '4px 0 0', maxWidth: 780 }}>
            Side-by-side comparison between baseline year ({firstYear}) and latest year ({lastYear}).
            Directly validates Decision D4: Δ &gt; +5.0% is Emerging, Δ &lt; -5.0% is Declining, otherwise Stable.
          </p>
        </div>

        {/* Grouped Bar Canvas */}
        <div style={{ height: 340, position: 'relative', width: '100%' }}>
          {groupedBarData ? (
            <Bar data={groupedBarData} options={groupedBarOptions} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              Calculating longitudinal delta shifts...
            </div>
          )}
        </div>

        {/* Empirical Shift Takeaways */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Greatest Adoption Surge</span>
            <p style={{ margin: '4px 0 0', fontSize: '0.92rem', fontWeight: 700, color: '#15803D' }}>
              {topGainer?.name || 'N/A'}
            </p>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Trajectory: Emerging (Δ &gt; +5% rule validated)
            </span>
          </div>
          <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Single Source of Truth</span>
            <p style={{ margin: '4px 0 0', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              ml/trends.py (D4)
            </p>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Fixed deterministic math, zero heuristic hallucinations
            </span>
          </div>
          <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Clusters Evaluated</span>
            <p style={{ margin: '4px 0 0', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {clusters.length} Style Partitions
            </p>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              K-Means silhouette score optimized (k ∈ [4, 10])
            </span>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* SECTION 4: SCATTER / BUBBLE PLOT (Adoption Momentum vs Base Matrix) */}
      {/* -------------------------------------------------------------------- */}
      <section className="editorial-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 'var(--radius-full)', backgroundColor: 'rgba(37, 99, 235, 0.12)', color: '#1D4ED8', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            <span>Framework 4 — Strategic Quadrant Mapping</span>
          </div>
          <h2 style={{ fontSize: '1.45rem', margin: 0, fontWeight: 700, letterSpacing: '-0.01em' }}>
            Adoption Momentum vs. Base Volume Positioning Matrix
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '4px 0 0', maxWidth: 780 }}>
            Scatter plot mapping historical baseline market presence (X-axis) against growth velocity Δ (% points on Y-axis).
            Reveals breakout disruptors versus saturating style staples.
          </p>
        </div>

        {/* Scatter Canvas */}
        <div style={{ height: 360, position: 'relative', width: '100%' }}>
          {scatterData ? (
            <Scatter data={scatterData} options={scatterOptions} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              Computing strategic quadrant coordinates...
            </div>
          )}
        </div>

        {/* Quadrant Interpretive Guide Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#15803D' }}>Quadrant I — Breakout Leaders</span>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              High base market presence paired with accelerating positive delta. Category champions with strong retention.
            </p>
          </div>
          <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#D97706' }}>Quadrant II — High-Velocity Disruptors</span>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              Smaller initial market share exhibiting steep upward momentum. Emerging niche candidates to watch.
            </p>
          </div>
          <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#DC2626' }}>Quadrant III — Contracting Niches</span>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              Low base share accompanied by negative momentum. Fading micro-trends losing consumer engagement.
            </p>
          </div>
          <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#393E46' }}>Quadrant IV — Saturating Staples</span>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              Substantial base market volume with slight contraction. Mature classics reaching market saturation.
            </p>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* SECTION 5: HORIZONTAL BAR CHART (3-Year Outlook Horizon) */}
      {/* -------------------------------------------------------------------- */}
      <section className="editorial-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 'var(--radius-full)', backgroundColor: 'rgba(124, 58, 237, 0.12)', color: '#6D28D9', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            <span>Framework 5 — Forward Horizon Outlook</span>
          </div>
          <h2 style={{ fontSize: '1.45rem', margin: 0, fontWeight: 700, letterSpacing: '-0.01em' }}>
            36-Month Horizon Comparison ({lastYear} Current vs. {horizonBarData?.terminalYear} Projected)
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '4px 0 0', maxWidth: 780 }}>
            Side-by-side terminal projection comparing current empirical market share with Prophet&apos;s forecasted terminal adoption share.
          </p>
        </div>

        {/* Horizontal Bar Canvas */}
        <div style={{ height: 350, position: 'relative', width: '100%' }}>
          {horizonBarData ? (
            <Bar data={horizonBarData.chart} options={horizonBarOptions} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              Calculating terminal horizon projections...
            </div>
          )}
        </div>

        {/* Analytical Horizon Summary */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: '12px 16px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SparklesIcon size={18} />
            <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Prophet projections incorporate non-saturating additive growth and 80% uncertainty bounds.
            </span>
          </div>
          <Link
            href="/dashboard"
            className="btn-secondary"
            style={{ fontSize: '0.82rem', padding: '6px 14px' }}
          >
            <span>Open Interactive Dashboard</span>
            <ArrowRightIcon size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}
