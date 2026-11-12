'use client';
import 'chart.js/auto';
import { Line } from 'react-chartjs-2';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { API, getJSON, type Cluster, type Forecast, type Match } from '@/lib/api';

const COLORS: Record<string, string> = { emerging: '#0f8b8d', declining: '#b0306a', stable: '#6b7a89' };
const Badge = ({ label }: { label: string }) => <span className={`tl-badge tl-${label}`}>{label}</span>;

export default function Dashboard() {
  const [domain, setDomain] = useState('fashion');
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [fc, setFc] = useState<Forecast | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [preview, setPreview] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    getJSON(`/trends?domain=${domain}`).then((d) => {
      setClusters(d.clusters); setErr(''); setMatches([]);
      setNote(d.mode === 'mock' ? 'Demo data' : d.timeline === 'simulated' ? 'Simulated timeline' : '');
      setSel(d.clusters[0]?.cluster_id ?? null);
    }).catch((e) => setErr(e.message));
  }, [domain]);

  useEffect(() => {
    if (sel == null) return;
    getJSON(`/forecast?domain=${domain}&cluster_id=${sel}`).then(setFc).catch((e) => setErr(e.message));
  }, [sel, domain]);

  const switchDomain = (d: string) => { setDomain(d); setSel(null); setFc(null); };

  async function upload(file?: File) {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    const fd = new FormData(); fd.append('file', file);
    try {
      const r = await fetch(`${API}/similarity?domain=${domain}`, { method: 'POST', body: fd });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      setMatches((await r.json()).matches); setErr('');
    } catch (e) { setErr((e as Error).message); }
  }

  let chart = null;
  if (fc) {
    const pad = (n: number) => Array(n).fill(null);
    const hist = fc.history.map((p) => p.share), n = hist.length - 1, last = hist[n];
    const color = COLORS[fc.label] ?? COLORS.stable;
    const years = [...fc.history.map((p) => p.year), ...fc.forecast.map((p) => p.year)];
    const line = (k: 'yhat' | 'lower' | 'upper') => [...pad(n), last, ...fc.forecast.map((p) => p[k])];
    chart = (
      <Line
        data={{ labels: years, datasets: [
          { label: 'Actual', data: [...hist, ...pad(fc.forecast.length)], borderColor: color, backgroundColor: color, borderWidth: 3, tension: 0.2 },
          { label: 'Forecast', data: line('yhat'), borderColor: color, borderDash: [6, 6], borderWidth: 2, tension: 0.2 },
          { label: 'Lower bound', data: line('lower'), borderWidth: 0, pointRadius: 0 },
          { label: 'Forecast range', data: line('upper'), borderWidth: 0, pointRadius: 0, fill: '-1', backgroundColor: color + '26' },
        ] }}
        options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true, title: { display: true, text: 'Share of dataset (%)' } } },
          plugins: { legend: { labels: { filter: (i) => i.text !== 'Lower bound' } } } }}
      />
    );
  }

  return (
    <div id="trendlens-app">
      <div className="tl-head">
        <h2>Trend dashboard</h2>
        <div className="tl-tabs" role="tablist" aria-label="Product domain">
          {['fashion', 'cars'].map((d) => (
            <button key={d} role="tab" aria-selected={d === domain} onClick={() => switchDomain(d)}>{d === 'cars' ? 'Cars' : 'Fashion'}</button>
          ))}
        </div>
      </div>
      {note && <div className="tl-msg" role="status">{note}: results are not from real dated images.</div>}
      {err && <div className="tl-msg" role="alert">Cannot reach the TrendLens API at {API}. Start the backend and check NEXT_PUBLIC_API_URL. ({err})</div>}
      <div className="tl-body">
        <ol className="tl-list" aria-label="Style clusters">
          {clusters.map((c) => {
            const rawDelta = c.share[c.share.length - 1] - c.share[0];
            const d = Math.round(rawDelta * 10) / 10;
            return (
              <li key={c.cluster_id}>
                <button className="tl-row" aria-current={c.cluster_id === sel || undefined} onClick={() => setSel(c.cluster_id)}>
                  <span className="tl-name">{c.name}</span><Badge label={c.label} />
                  <span className="tl-delta">{d > 0 ? '+' : ''}{d} pts</span>
                </button>
              </li>
            );
          })}
        </ol>
        <section className="tl-main">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <h3>{fc?.name ?? 'Pick a style'}</h3>
            {fc && (
              <Link
                href={`/${domain}/${fc.cluster_id}`}
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--tl-accent)',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                View standalone report &rarr;
              </Link>
            )}
          </div>
          {fc && (
            <p className="tl-muted">
              <Badge label={fc.label} /> Forecast to {fc.forecast.at(-1)?.year}: {fc.forecast.at(-1)?.yhat}% of the dataset
            </p>
          )}
          <div className="tl-chart">{chart}</div>
        </section>
      </div>
      <section className="tl-sim">
        <h3>Which trend does this product belong to?</h3>
        <label className="tl-drop" htmlFor="tl-file" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files[0]); }}>
          Choose or drop a product image
        </label>
        <input id="tl-file" type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
        {matches.length > 0 && (
          <div className="tl-found">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Uploaded product" />
            <ol className="tl-matches">
              {matches.map((m) => (
                <li key={m.cluster_id}>
                  <button className="tl-match" onClick={() => setSel(m.cluster_id)}>
                    <span className="tl-name">{m.name}</span><Badge label={m.label} />
                    <span className="tl-delta">{Math.round(m.score * 100)}% similar</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
    </div>
  );
}
