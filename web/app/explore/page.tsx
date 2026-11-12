'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useDomain } from '@/lib/DomainContext';
import { API, getJSON, type Cluster, type CatalogImage, type CatalogResponse } from '@/lib/api';
import {
  ExploreIcon,
  HangerIcon,
  CarIcon,
  LensIcon,
  ArrowRightIcon,
  SparklesIcon,
  FilterIcon,
  TrendingUpIcon,
} from '@/components/Icons';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function ExplorePage() {
  const { domain, setDomain, searchQuery } = useDomain();
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'emerging' | 'stable' | 'declining'>('all');
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedClusterId, setSelectedClusterId] = useState<number | 'all'>('all');
  const [catalogImages, setCatalogImages] = useState<CatalogImage[]>([]);
  const [gridCols, setGridCols] = useState<3 | 4 | 5>(4);
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');

  // 1. Fetch clusters list for target domain
  useEffect(() => {
    let isCurrent = true;
    setLoading(true);
    getJSON(`/trends?domain=${domain}`)
      .then((data) => {
        if (!isCurrent) return;
        const list: Cluster[] = data.clusters || [];
        setClusters(list);
        setLoading(false);
      })
      .catch(() => {
        if (isCurrent) setLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [domain]);

  // 2. Fetch authentic catalog images from backend database
  useEffect(() => {
    let isCurrent = true;
    setCatalogLoading(true);

    const clusterParam = selectedClusterId !== 'all' ? `&cluster_id=${selectedClusterId}` : '';
    getJSON(`/catalog?domain=${domain}${clusterParam}&limit=50`)
      .then((data: CatalogResponse) => {
        if (!isCurrent) return;
        setCatalogImages(data.images || []);
        setCatalogLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load catalog:', err);
        if (isCurrent) {
          setCatalogImages([]);
          setCatalogLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [domain, selectedClusterId]);

  // Visual keywords per cluster
  const getKeywords = (cId: number, dom: string) => {
    if (dom === 'fashion') {
      const sets: Record<number, string[]> = {
        0: ['Tailored Suiting', 'Double-breasted', 'Wool Lapel', 'Formal Silhouette'],
        1: ['Neutral Knitwear', 'Ribbed Texture', 'Crewneck', 'Relaxed Oversize'],
        2: ['Denim & Streetwear', 'Indigo Wash', 'Casual Trousers', 'Utility Cut'],
        3: ['Structured Outerwear', 'Double-Breasted Trench', 'Wool Overcoat', 'Classic Hem'],
      };
      return sets[cId] || ['Contemporary Fashion', 'Minimalist Cut', 'Curated Palette', 'Prêt-à-Porter'];
    } else {
      const sets: Record<number, string[]> = {
        0: ['Fastback Aerodynamics', 'Flush Door Handles', 'Tesla Architecture', 'Sloping Roofline'],
        1: ['Executive Luxury Sedan', 'Acura Styling', 'Alloy Wheels', 'Chrome Grille'],
        2: ['Sports Convertible Coupe', 'Mustang Silhouette', 'Twin Exhausts', 'V8 Proportions'],
        3: ['Compact Executive Sedan', 'Audi Singleframe', 'LED Daytime Running Lights', 'Athletic Stance'],
        4: ['Mid-Size Premium SUV', 'BMW X5 Proportions', 'High Ride Height', 'Split Tailgate'],
        5: ['Electric Side Profile', 'Aero Alloy Design', 'Long Wheelbase', 'Minimalist Exterior'],
      };
      return sets[cId] || ['Automotive Design', 'Aerodynamic Form', 'Sculpted Bodywork', 'Performance Trim'];
    }
  };

  const selectedCluster = clusters.find((c) => c.cluster_id === selectedClusterId);

  // Filter images by search and trajectory tab
  const effectiveFilter = filterQuery || searchQuery;
  const filteredSpecimens = useMemo(() => {
    return catalogImages.filter((specimen) => {
      // 1. Tab filter
      if (activeFilterTab !== 'all' && specimen.cluster_label !== activeFilterTab) {
        return false;
      }
      // 2. Search query filter
      if (!effectiveFilter) return true;
      const q = effectiveFilter.toLowerCase();
      const keywords = getKeywords(specimen.cluster_id, domain).join(' ').toLowerCase();
      return (
        specimen.cluster_name.toLowerCase().includes(q) ||
        specimen.cluster_label.toLowerCase().includes(q) ||
        specimen.path.toLowerCase().includes(q) ||
        String(specimen.id).includes(q) ||
        keywords.includes(q)
      );
    });
  }, [catalogImages, activeFilterTab, effectiveFilter, domain]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Page Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(255, 211, 105, 0.20)',
              color: '#222831',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ExploreIcon size={18} />
          </div>
          <h1 style={{ fontSize: '2rem', margin: 0, fontWeight: 700 }}>
            Visual Specimen Explorer
          </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.94rem', maxWidth: 740, margin: 0 }}>
          Direct catalog indexing over {catalogImages.length > 0 ? catalogImages.length : 50} authentic {domain === 'fashion' ? 'DeepFashion2' : 'Stanford Cars'} specimens embedded via CLIP ViT-B/32 and partitioned into latent style clusters.
        </p>
      </div>

      {/* Minimal Trajectory Filter Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
          paddingBottom: 12,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        {/* Rule: Max two options per operation — All vs Emerging */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Trajectories' },
            { id: 'emerging', label: 'Emerging Only (↗)' },
          ].map((tab) => {
            const active = activeFilterTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilterTab(tab.id as any)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.84rem',
                  fontWeight: active ? 700 : 500,
                  backgroundColor: active ? '#222831' : 'var(--surface)',
                  color: active ? '#FFFFFF' : 'var(--text-secondary)',
                  border: active ? '1px solid #222831' : '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Domain Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            Domain:
          </span>
          <div className="domain-toggle-pill">
            <button
              type="button"
              className={`domain-toggle-btn ${domain === 'fashion' ? 'active' : ''}`}
              onClick={() => {
                setDomain('fashion');
                setSelectedClusterId('all');
              }}
            >
              <HangerIcon size={14} />
              <span>Fashion</span>
            </button>
            <button
              type="button"
              className={`domain-toggle-btn ${domain === 'cars' ? 'active' : ''}`}
              onClick={() => {
                setDomain('cars');
                setSelectedClusterId('all');
              }}
            >
              <CarIcon size={14} />
              <span>Automobiles</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cluster Controls Toolbar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {/* Cluster Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Style Cluster:
            </span>
            <select
              value={selectedClusterId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedClusterId(val === 'all' ? 'all' : Number(val));
              }}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                fontSize: '0.84rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Clusters ({clusters.length} latent groups)</option>
              {clusters.map((c) => (
                <option key={c.cluster_id} value={c.cluster_id}>
                  {c.name} ({c.label.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Filter Search */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by attribute or ID..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border)',
                fontSize: '0.82rem',
                backgroundColor: 'var(--bg-secondary)',
                width: 240,
                fontFamily: 'var(--font-sans)',
              }}
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery('')}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                }}
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Grid Column Selector — Max two options (Standard 4 vs Dense 5) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Grid:</span>
          {([4, 5] as const).map((cols) => (
            <button
              key={cols}
              type="button"
              onClick={() => setGridCols(cols)}
              style={{
                width: 28,
                height: 28,
                borderRadius: '4px',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: '1px solid var(--border)',
                backgroundColor: gridCols === cols ? '#222831' : 'var(--surface)',
                color: gridCols === cols ? '#FFFFFF' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              {cols}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Cluster Info Summary Banner */}
      {selectedCluster && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '18px 22px',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>
                {selectedCluster.name}
              </h2>
              <Badge variant={selectedCluster.label as any} size="sm">
                {selectedCluster.label.toUpperCase()}
              </Badge>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '0 0 8px' }}>
              Domain: <strong>{domain.toUpperCase()}</strong> &bull; Latent K-Means Centroid #{selectedCluster.cluster_id} &bull; Timeline: <strong>{domain === 'fashion' ? 'Simulated Monthly (D1)' : 'Real Model Year (D1)'}</strong>
            </p>
            {/* Visual Attributes */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                KEY ATTRIBUTES:
              </span>
              {getKeywords(selectedCluster.cluster_id, domain).map((kw, i) => (
                <span
                  key={i}
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-full)',
                    padding: '2px 9px',
                    fontSize: '0.74rem',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                  }}
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>

          <Link
            href={`/${domain}/${selectedCluster.cluster_id}`}
            className="btn-secondary"
            style={{ fontSize: '0.82rem', padding: '7px 16px' }}
          >
            <span>Full Cluster Dossier</span>
            <ArrowRightIcon size={14} />
          </Link>
        </div>
      )}

      {/* Specimen Grid Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          Showing <strong>{filteredSpecimens.length}</strong> authentic {domain === 'fashion' ? 'garment' : 'automotive'} specimens
        </span>
        <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
          Encoded via PyTorch CLIP ViT-B/32 &bull; 512-dim Normalized Latent
        </span>
      </div>

      {/* Catalog Grid */}
      {catalogLoading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
            gap: 16,
          }}
          className="grid-4col-responsive"
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm, 6px)',
                overflow: 'hidden',
                aspectRatio: domain === 'fashion' ? '3/4.6' : '16/14',
                animation: 'pulse 1.5s infinite',
              }}
            />
          ))}
        </div>
      ) : filteredSpecimens.length === 0 ? (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <div style={{ color: 'var(--text-muted)', margin: '0 auto 12px', display: 'flex', justifyContent: 'center' }}>
            <FilterIcon size={32} />
          </div>
          <h3 style={{ fontSize: '1.05rem', margin: '0 0 6px', color: 'var(--text-primary)' }}>
            No specimens match current filter
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
            Try resetting your search query or selecting &quot;All Trajectories&quot;.
          </p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setActiveFilterTab('all');
              setSelectedClusterId('all');
              setFilterQuery('');
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
            gap: 16,
          }}
          className="grid-4col-responsive"
        >
          {filteredSpecimens.map((specimen) => (
            <div
              key={specimen.id}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm, 6px)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-card)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.06)';
                e.currentTarget.style.borderColor = '#222831';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-card)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              {/* Image Tile with Zero-CLS Aspect Ratio */}
              <div
                style={{
                  aspectRatio: domain === 'fashion' ? '3/4' : '16/10',
                  position: 'relative',
                  overflow: 'hidden',
                  backgroundColor: 'var(--bg-secondary)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${API}${specimen.url}`}
                  alt={`${specimen.cluster_name} #${specimen.id}`}
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                  onError={(e) => {
                    // Fallback if image fails to load
                    (e.target as HTMLImageElement).src = domain === 'fashion' 
                      ? '/editorial/hero_fashion_authentic.jpg' 
                      : '/editorial/hero_cars.jpg';
                  }}
                />
                {/* Cluster Badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    backgroundColor: 'rgba(34, 40, 49, 0.88)',
                    color: '#FFFFFF',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 4,
                  }}
                >
                  Cluster #{specimen.cluster_id}
                </div>
                {/* Trajectory Badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: '#FFFFFF',
                    color: specimen.cluster_label === 'emerging' ? '#15803D' : specimen.cluster_label === 'declining' ? '#DC2626' : '#393E46',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 4,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                    textTransform: 'uppercase',
                  }}
                >
                  {specimen.cluster_label}
                </div>
              </div>

              {/* Specimen Metadata Box */}
              <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                  {specimen.cluster_name}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>
                    ID: #{specimen.id}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {domain === 'fashion' ? `Period: ${specimen.taken_on.slice(0, 7)}` : `Model: ${specimen.taken_on.slice(0, 4)}`}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: 8,
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Link
                    href={`/lens-scan?preset=${specimen.id}`}
                    style={{
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <LensIcon size={12} />
                    <span>Scan Similar</span>
                  </Link>

                  <Link
                    href={`/${domain}/${specimen.cluster_id}`}
                    style={{ fontSize: '0.76rem', fontWeight: 600, color: '#222831' }}
                  >
                    Dossier &rarr;
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
