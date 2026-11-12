'use client';

import React, { useState } from 'react';
import { useDomain } from '@/lib/DomainContext';
import { Badge } from './ui/Badge';

export default function DataIntegrityBanner() {
  const { domain, systemStatus } = useDomain();
  const [collapsed, setCollapsed] = useState(false);

  const isSimulated = systemStatus.timeline === 'simulated' || domain === 'fashion';
  const isMock = systemStatus.mode === 'mock';

  return (
    <aside
      className="data-integrity-banner"
      aria-label="Data Integrity & Academic Methodology Disclosure"
      style={{
        backgroundColor: isMock
          ? 'rgba(245, 158, 11, 0.08)'
          : isSimulated
          ? 'rgba(255, 211, 105, 0.12)'
          : 'rgba(34, 40, 49, 0.03)',
        borderBottom: '1px solid var(--border, rgba(34, 40, 49, 0.08))',
        padding: collapsed ? '6px 24px' : '10px 24px',
        transition: 'all 0.2s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          maxWidth: '1440px',
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {isMock ? (
            <Badge variant="demo" size="sm" pulse>
              Demo Data Mode
            </Badge>
          ) : isSimulated ? (
            <Badge variant="simulated" size="sm">
              Demonstration Timeline (Rule D1)
            </Badge>
          ) : (
            <Badge variant="live" size="sm" pulse>
              Validated Historical Data
            </Badge>
          )}

          {!collapsed ? (
            <span
              style={{
                fontSize: '0.82rem',
                color: 'var(--text-secondary, #393E46)',
                lineHeight: 1.4,
              }}
            >
              {isMock ? (
                <>
                  <strong>API Offline / Demonstration Fixture:</strong> Responses are generated from mock clusters. Real ML inference activates when the FastAPI backend runs in <code>live</code> mode.
                </>
              ) : isSimulated ? (
                <>
                  <strong>DeepFashion2 Timeline Disclosure:</strong> Image dates are synthetically assigned across 2021&ndash;2025 using a reproducible seeded drift (Decision D1). Unsupervised CLIP clustering and Prophet forecasting operate on these empirical intervals.
                </>
              ) : (
                <>
                  <strong>Stanford Cars Timeline:</strong> Vehicle capture dates reflect authentic manufacturer model years (2021&ndash;2025). Future points represent 36-month Facebook Prophet projections (80% CI).
                </>
              )}
            </span>
          ) : (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #6B7280)' }}>
              {isSimulated ? 'DeepFashion2 timeline is simulated (Rule D1)' : 'Stanford Cars timeline verified'}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-muted, #6B7280)',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
          title={collapsed ? 'Expand methodology disclosure' : 'Minimize disclosure banner'}
        >
          {collapsed ? 'Details ▼' : 'Minimize ▲'}
        </button>
      </div>
    </aside>
  );
}
