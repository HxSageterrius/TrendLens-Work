'use client';

import React, { useState } from 'react';
import { useDomain } from '@/lib/DomainContext';
import { API } from '@/lib/api';
import {
  SettingsIcon,
  CheckCircleIcon,
  SparklesIcon,
  HangerIcon,
  CarIcon,
} from '@/components/Icons';

export default function SettingsPage() {
  const { domain, setDomain, systemStatus } = useDomain();
  const [defaultDomain, setDefaultDomain] = useState(domain);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setDomain(defaultDomain);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 900 }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--terracotta-tint)',
              color: 'var(--primary-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SettingsIcon size={18} />
          </div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>System Settings &amp; Preferences</h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.98rem' }}>
          Configure analysis parameters, visual presentation preferences, and review system infrastructure health.
        </p>
      </div>

      {savedSuccess && (
        <div
          style={{
            backgroundColor: 'rgba(77, 121, 94, 0.12)',
            border: '1px solid rgba(77, 121, 94, 0.25)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 18px',
            color: 'var(--success)',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <CheckCircleIcon size={18} />
          <span>Preferences updated successfully!</span>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Section 1: Appearance & Design Direction */}
        <div className="editorial-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Visual Identity &amp; Palette</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            TrendLens features the high-contrast <strong>Dark Luxury Slate &amp; Gold</strong> visual analytics theme.
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              backgroundColor: 'var(--bg-main)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: '#222831', border: '1px solid rgba(255,255,255,0.2)' }} title="#222831" />
              <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: '#393E46' }} title="#393E46" />
              <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: '#FFD369' }} title="#FFD369" />
              <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: '#EEEEEE' }} title="#EEEEEE" />
            </div>
            <div style={{ fontSize: '0.86rem' }}>
              <strong>Dark Luxury Slate &amp; Gold (Active)</strong>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                Base: #222831 &bull; Surface: #393E46 &bull; Accent: #FFD369 &bull; Text: #EEEEEE
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Analysis Preferences */}
        <div className="editorial-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Analysis &amp; Default Domain</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Default Working Domain
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => setDefaultDomain('fashion')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid',
                  borderColor: defaultDomain === 'fashion' ? 'var(--primary-accent)' : 'var(--border)',
                  backgroundColor: defaultDomain === 'fashion' ? 'rgba(255, 211, 105, 0.14)' : 'var(--surface)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                <HangerIcon size={18} className="text-terracotta" />
                <span>Fashion (DeepFashion2)</span>
              </button>

              <button
                type="button"
                onClick={() => setDefaultDomain('cars')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid',
                  borderColor: defaultDomain === 'cars' ? 'var(--primary-accent)' : 'var(--border)',
                  backgroundColor: defaultDomain === 'cars' ? 'rgba(255, 211, 105, 0.14)' : 'var(--surface)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                <CarIcon size={18} className="text-terracotta" />
                <span>Automobiles (Stanford Cars)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: System Infrastructure & Health */}
        <div className="editorial-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>System Architecture &amp; Health</h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              fontSize: '0.84rem',
            }}
          >
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'var(--bg-main)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
              }}
            >
              <span style={{ color: 'var(--text-muted)', display: 'block' }}>FastAPI Backend</span>
              <strong>{API}</strong>
              <div style={{ color: systemStatus.online ? 'var(--success)' : 'var(--error)', fontSize: '0.78rem', marginTop: 2 }}>
                ● {systemStatus.online ? 'Connected & Live' : 'Offline'}
              </div>
            </div>

            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'var(--bg-main)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
              }}
            >
              <span style={{ color: 'var(--text-muted)', display: 'block' }}>Database Driver</span>
              <strong>PostgreSQL (`psycopg` plain SQL)</strong>
              <div style={{ color: 'var(--success)', fontSize: '0.78rem', marginTop: 2 }}>
                ● 5 relational tables verified
              </div>
            </div>

            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'var(--bg-main)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
              }}
            >
              <span style={{ color: 'var(--text-muted)', display: 'block' }}>Primary Encoder</span>
              <strong>OpenAI CLIP ViT-B/32</strong>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: 2 }}>
                512-dimensional L2-normalized embeddings
              </div>
            </div>

            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'var(--bg-main)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
              }}
            >
              <span style={{ color: 'var(--text-muted)', display: 'block' }}>Forecasting Framework</span>
              <strong>Facebook Prophet</strong>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: 2 }}>
                36-month projections with 80% range bands
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Account & Project Credits */}
        <div className="editorial-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Research &amp; Project Info</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="avatar-circle" style={{ width: 44, height: 44, fontSize: '1rem' }}>
              HK
            </div>
            <div>
              <strong style={{ fontSize: '0.98rem', display: 'block' }}>Hamza Khalid</strong>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Final Year Project (BSCS) &bull; TrendLens: Multi-Genre AI Visual Trend Analysis
              </span>
            </div>
          </div>
        </div>

        <div>
          <button type="submit" className="btn-primary">
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
