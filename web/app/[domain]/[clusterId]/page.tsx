import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { API, type Forecast } from '@/lib/api';
import ClusterForecastChart from '@/components/ClusterForecastChart';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui';
import {
  ArrowRightIcon,
  HangerIcon,
  CarIcon,
  LensIcon,
  TrendsIcon,
  SparklesIcon,
} from '@/components/Icons';

interface PageProps {
  params: Promise<{
    domain: string;
    clusterId: string;
  }>;
}

async function fetchClusterForecast(
  domain: string,
  clusterId: string
): Promise<Forecast | null> {
  try {
    const res = await fetch(
      `${API}/forecast?domain=${domain}&cluster_id=${clusterId}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { domain, clusterId } = await params;
  const data = await fetchClusterForecast(domain, clusterId);

  const domainLabel = domain === 'fashion' ? 'Fashion' : 'Automotive';
  if (!data) {
    return {
      title: `Cluster ${clusterId} — ${domainLabel} Report | TrendLens`,
      description: `Visual trend analysis and time-series forecast for cluster ${clusterId}.`,
    };
  }

  return {
    title: `${data.name} — ${domainLabel} Trend Intelligence | TrendLens`,
    description: `Multi-year adoption trajectory and 36-month Facebook Prophet forecast for ${data.name} (${data.label.toUpperCase()}) in ${domainLabel}.`,
    openGraph: {
      title: `${data.name} — ${domainLabel} Trend Analysis`,
      description: `Trajectory: ${data.label.toUpperCase()} (${data.timeline === 'real' ? 'Real Model Year' : 'Simulated Drift D1'}).`,
      type: 'article',
    },
  };
}

export default async function ClusterDetailPage({ params }: PageProps) {
  const { domain, clusterId } = await params;

  if (domain !== 'fashion' && domain !== 'cars') {
    notFound();
  }

  const data = await fetchClusterForecast(domain, clusterId);
  if (!data) {
    notFound();
  }

  const domainLabel = domain === 'fashion' ? 'Fashion' : 'Automobiles';
  const startShare = data.history.length > 0 ? data.history[0].share : 0;
  const latestShare =
    data.history.length > 0 ? data.history[data.history.length - 1].share : 0;
  const delta = (latestShare - startShare).toFixed(1);
  const isPositive = Number(delta) > 0;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `${data.name} (${domainLabel})`,
    description: `Visual cluster trajectory and 36-month Facebook Prophet forecast for ${data.name} in TrendLens.`,
    temporalCoverage: '2021/2028',
    variableMeasured: 'Cluster Share of Domain',
    creator: {
      '@type': 'Organization',
      name: 'TrendLens Research Team',
    },
  };

  return (
    <article style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 1100 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumbs" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem' }}>
        <Link href="/" style={{ color: 'var(--text-muted)' }}>
          Home
        </Link>
        <span style={{ color: 'var(--border)' }}>/</span>
        <Link href="/explore" style={{ color: 'var(--text-muted)' }}>
          Explore
        </Link>
        <span style={{ color: 'var(--border)' }}>/</span>
        <Link href="/trends" style={{ color: 'var(--text-muted)' }}>
          {domainLabel}
        </Link>
        <span style={{ color: 'var(--border)' }}>/</span>
        <span style={{ color: 'var(--primary-accent)', fontWeight: 600 }}>
          {data.name}
        </span>
      </nav>

      {/* Header Banner */}
      <header
        className="editorial-card"
        style={{
          padding: '28px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          borderLeft: '4px solid var(--primary-accent)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(255, 211, 105, 0.20)',
                  color: '#222831',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {domain === 'fashion' ? <HangerIcon size={14} /> : <CarIcon size={14} />}
                <span>{domainLabel}</span>
              </span>

              <span className={`badge-pill badge-${data.label}`}>
                {data.label.toUpperCase()}
              </span>

              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--bg-main)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                }}
              >
                Timeline: {data.timeline === 'real' ? 'Real Model Year' : 'Simulated Drift (D1)'}
              </span>
            </div>

            <h1 style={{ fontSize: '2.4rem', margin: '0 0 6px', fontWeight: 700 }}>
              {data.name}
            </h1>
            <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
              Cluster #{data.cluster_id} &bull; Unsupervised Latent K-Means with Silhouette Optimization &bull; CLIP ViT-B/32
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/lens-scan" className="btn-primary" style={{ fontSize: '0.84rem' }}>
              <LensIcon size={16} />
              <span>Match Similar in Lens Scan</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Visual Analytics & Prophet Trajectory */}
      <section
        className="grid-2col-responsive"
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: 24,
        }}
      >
        {/* Main Chart */}
        <div className="editorial-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>
                Prophet Time-Series Forecast (36 Months)
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Historical adoption share (solid) vs forward projection with 80% confidence interval band
              </p>
            </div>
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                backgroundColor: 'var(--yellow-tint)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid rgba(255, 211, 105, 0.4)',
              }}
            >
              Additive Linear Model
            </span>
          </div>

          <ClusterForecastChart
            domain={domain}
            clusterName={data.name}
            label={data.label}
            history={data.history}
            forecast={data.forecast}
          />
        </div>

        {/* Trajectory KPI Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="editorial-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Multi-Year Momentum (D4)
            </span>
            <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-sans)', color: isPositive ? 'var(--success)' : 'var(--error)' }}>
              {isPositive ? `+${delta}% ↗` : `${delta}% ↘`}
            </div>
            <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Initial Share: <strong>{startShare}%</strong> &rarr; Latest Share: <strong>{latestShare}%</strong>
            </p>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
              Threshold rule: &Delta; &gt; +5% marks Emerging; &Delta; &lt; -5% marks Declining.
            </div>
          </div>

          <div className="editorial-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Forecaster Horizon
            </span>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--primary-accent)', fontFamily: 'var(--font-sans)' }}>
              2026 – 2028
            </div>
            <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Estimated 2028 Projection: <strong>{data.forecast.length > 0 ? `${data.forecast[data.forecast.length - 1].yhat}%` : '—'}</strong>
            </p>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Range: {data.forecast.length > 0 ? `${data.forecast[data.forecast.length - 1].lower}% – ${data.forecast[data.forecast.length - 1].upper}%` : '—'} (80% CI)
            </span>
          </div>
        </div>
      </section>

      {/* Numerical Data Table */}
      <section className="editorial-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>
            Annual Share &amp; Projection Rollup
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Exact historical share percentages and forward Prophet estimates with upper and lower error bounds.
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Year</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Observed / Projected Share</TableHead>
              <TableHead>Lower Bound (80% CI)</TableHead>
              <TableHead>Upper Bound (80% CI)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.history.map((h) => (
              <TableRow key={h.year}>
                <TableCell style={{ fontWeight: 700 }}>{h.year}</TableCell>
                <TableCell>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Historical Observation
                  </span>
                </TableCell>
                <TableCell style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {h.share}%
                </TableCell>
                <TableCell style={{ color: 'var(--text-muted)' }}>—</TableCell>
                <TableCell style={{ color: 'var(--text-muted)' }}>—</TableCell>
              </TableRow>
            ))}
            {data.forecast.map((f) => (
              <TableRow key={f.year} style={{ backgroundColor: 'rgba(255, 211, 105, 0.04)' }}>
                <TableCell style={{ fontWeight: 700, color: 'var(--primary-accent)' }}>
                  {f.year}*
                </TableCell>
                <TableCell>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-accent)' }}>
                    Prophet Forward Projection
                  </span>
                </TableCell>
                <TableCell style={{ fontWeight: 700, color: 'var(--primary-accent)' }}>
                  {f.yhat}%
                </TableCell>
                <TableCell style={{ color: 'var(--text-secondary)' }}>{f.lower}%</TableCell>
                <TableCell style={{ color: 'var(--text-secondary)' }}>{f.upper}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      {/* Cluster Exemplars / Sample Images */}
      <section className="editorial-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>
              Cluster Visual Exemplars
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Representative image slices retrieved from the PostgreSQL {domain} corpus (`/images/{'{id}'}`).
            </p>
          </div>
          <Link
            href="/explore"
            style={{
              fontSize: '0.84rem',
              fontWeight: 600,
              color: 'var(--primary-accent)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>Explore All in Gallery</span>
            <ArrowRightIcon size={14} />
          </Link>
        </div>

        {data.sample_images && data.sample_images.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: 16,
            }}
          >
            {data.sample_images.map((imgId) => (
              <div
                key={imgId}
                style={{
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden',
                  backgroundColor: 'var(--bg-main)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ aspectRatio: '1/1', overflow: 'hidden' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${API}/images/${imgId}`}
                    alt={`Cluster ${data.cluster_id} Image #${imgId}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </div>
                <div
                  style={{
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.76rem',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>Image #{imgId}</span>
                  <Link
                    href={`/lens-scan?preset=${imgId}`}
                    style={{
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span>Match</span>
                    <LensIcon size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No visual exemplars cataloged for this cluster.
          </div>
        )}
      </section>
    </article>
  );
}
