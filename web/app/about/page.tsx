import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRightIcon, SparklesIcon } from '@/components/Icons';

export const metadata: Metadata = {
  title: 'Methodology & Architecture',
  description:
    'Detailed documentation of TrendLens: visual style clustering with CLIP and ResNet-50, Facebook Prophet time-series forecasting, and the timeline rationale (Decision D1).',
};

export default function AboutPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: 'TrendLens Methodology & Architecture',
    description:
      'Unsupervised visual style clustering and time-series forecasting across fashion and automotive domains.',
    about: ['Computer Vision', 'Deep Learning', 'Trend Forecasting', 'Time-Series Analysis'],
    author: {
      '@type': 'Organization',
      name: 'TrendLens Project Team',
    },
  };

  return (
    <article style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 960 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span className="badge-pill badge-ai">
            <SparklesIcon size={14} />
            <span>Academic Final Year Project</span>
          </span>
        </div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: 12 }}>
          Methodology &amp; System Architecture
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          TrendLens is an open, transparent, and reproducible AI platform that extracts visual style clusters from product images, tracks their adoption share across temporal axes, labels trajectories (Emerging, Declining, Stable), and projects 36-month time-series forecasts.
        </p>
      </header>

      {/* Section 1 */}
      <section className="editorial-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 style={{ fontSize: '1.4rem', margin: 0 }}>1. End-to-End Pipeline Overview</h2>
        <p style={{ margin: 0 }}>
          TrendLens decouples feature extraction, unsupervised clustering, temporal aggregation, and forecasting to guarantee reproducible results:
        </p>
        <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
          <li>
            <strong style={{ color: 'var(--text-primary)' }}>Visual Latent Representation:</strong> Images are normalized and embedded using OpenAI CLIP ViT-B/32 (512-dimensional multimodal vision-language representations) as the primary encoder, with torchvision ResNet-50 (2048-dimensional features) providing a classical deep learning benchmark.
          </li>
          <li>
            <strong style={{ color: 'var(--text-primary)' }}>Unsupervised Style Clustering:</strong> L2-normalized embeddings are clustered via scikit-learn K-Means with silhouette score optimization across <em>k</em> &isin; [4, 10]. Cosine-metric DBSCAN is executed in parallel to identify outlier images and noise ratios.
          </li>
          <li>
            <strong style={{ color: 'var(--text-primary)' }}>Temporal Share Aggregation:</strong> Each image is linked to a capture date or parsed model year. Cluster density is computed across monthly periods to generate granular adoption trajectories.
          </li>
          <li>
            <strong style={{ color: 'var(--text-primary)' }}>Trajectory Classification (Decision D4):</strong> Using annual share rollups, the multi-year percentage point delta (&Delta; = Last Year &minus; First Year) is computed. A delta &gt; +5.0% marks a trend as <em>Emerging</em>, &lt; &minus;5.0% as <em>Declining</em>, and within [&minus;5.0%, +5.0%] as <em>Stable</em>.
          </li>
          <li>
            <strong style={{ color: 'var(--text-primary)' }}>Time-Series Forecasting:</strong> Additive Facebook Prophet models with linear growth are fitted per cluster, evaluated on a 6-month holdout Mean Absolute Percentage Error (MAPE), and projected 36 months forward with 80% confidence bands.
          </li>
        </ol>
      </section>

      {/* Section 2 */}
      <section className="editorial-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 style={{ fontSize: '1.4rem', margin: 0 }}>2. Datasets &amp; Time-Axis Rationale (Decision D1)</h2>
        <p style={{ margin: 0 }}>
          Public benchmark image datasets typically lack explicit capture dates. TrendLens resolves this transparently:
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '8px 12px' }}>Domain</th>
                <th style={{ padding: '8px 12px' }}>Dataset</th>
                <th style={{ padding: '8px 12px' }}>Timeline Mode</th>
                <th style={{ padding: '8px 12px' }}>Methodology &amp; Disclosure</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>Cars</td>
                <td style={{ padding: '10px 12px' }}>Stanford Cars</td>
                <td style={{ padding: '10px 12px' }}>
                  <span className="badge-pill badge-emerging">Real</span>
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                  Model year is parsed directly from class folder names (e.g., <em>&quot;Acura RL Sedan 2012&quot;</em> &rarr; 2012).
                </td>
              </tr>
              <tr>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>Fashion</td>
                <td style={{ padding: '10px 12px' }}>DeepFashion2</td>
                <td style={{ padding: '10px 12px' }}>
                  <span className="badge-pill badge-declining">Simulated</span>
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                  Assigned across a 60-month window (2021&ndash;2025) via a seeded uniform distribution independent of cluster results. Clearly tagged as simulated in all API responses and UI headers.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 3 */}
      <section className="editorial-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 style={{ fontSize: '1.4rem', margin: 0 }}>3. Similarity Search &amp; Lens Scan</h2>
        <p style={{ margin: 0 }}>
          When a user uploads a query image to <strong>Lens Scan</strong>, it is passed through the preloaded CLIP ViT-B/32 encoder to extract a 512-dimensional vector. Vector cosine similarity is computed in NumPy against all stored dataset embeddings. The top 50 nearest neighbors are aggregated by style cluster to retrieve the top 3 matching styles with confidence scores.
        </p>
      </section>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 14 }}>
        <Link href="/explore" className="btn-primary">
          <span>Explore Live Clusters</span>
          <ArrowRightIcon size={16} />
        </Link>
        <Link href="/trends" className="btn-secondary">
          <span>View Forecast Curves</span>
        </Link>
      </div>
    </article>
  );
}
