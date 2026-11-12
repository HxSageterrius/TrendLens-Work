'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useDomain } from '@/lib/DomainContext';
import { API, type Match, type SimilarImage, type SimilarityResponse } from '@/lib/api';
import {
  LensIcon,
  UploadIcon,
  HangerIcon,
  CarIcon,
  SparklesIcon,
  ArrowRightIcon,
  SearchIcon,
  CheckCircleIcon,
  XIcon,
} from '@/components/Icons';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

function LensScanContent() {
  const searchParams = useSearchParams();
  const { domain, setDomain } = useDomain();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanStep, setScanStep] = useState<number>(0);
  const [matches, setMatches] = useState<Match[]>([]);
  const [similarImages, setSimilarImages] = useState<SimilarImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check URL params for presets
  useEffect(() => {
    const presetName = searchParams.get('preset');
    const urlParam = searchParams.get('url');

    if (presetName) {
      // Auto-load preset: if numeric ID, load exact image; otherwise default preset
      const isNumeric = /^\d+$/.test(presetName.trim());
      const presetSrc = isNumeric
        ? `${API}/images/${presetName.trim()}`
        : domain === 'fashion'
        ? `${API}/images/456`
        : `${API}/images/301`;

      fetch(presetSrc)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.blob();
        })
        .then((b) => {
          const sampleFile = new File([b], isNumeric ? `specimen_${presetName}.jpg` : presetName, {
            type: 'image/jpeg',
          });
          handleFileSelected(sampleFile);
        })
        .catch((err) => {
          console.warn('Preset load failed:', err);
        });
    } else if (urlParam) {
      setUrlInput(urlParam);
    }
  }, [searchParams, domain]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, WEBP).');
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size exceeds the 5 MB limit.');
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setError(null);
    performSimilaritySearch(selectedFile);
  };

  const handleUrlSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(urlInput.trim());
      const blob = await res.blob();
      const fetchedFile = new File([blob], 'url_search_specimen.jpg', { type: blob.type || 'image/jpeg' });
      handleFileSelected(fetchedFile);
    } catch {
      setError('Unable to fetch external image from URL. CORS restrictions may apply. Please upload directly.');
      setLoading(false);
    }
  };

  const performSimilaritySearch = async (imageFile: File) => {
    setLoading(true);
    setScanStep(1);
    setError(null);
    const formData = new FormData();
    formData.append('file', imageFile);

    // Staged feedback timers
    const timer1 = setTimeout(() => setScanStep(2), 250);
    const timer2 = setTimeout(() => setScanStep(3), 500);

    try {
      const res = await fetch(`${API}/similarity?domain=${domain}`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`API error HTTP ${res.status}`);
      }

      const data: SimilarityResponse = await res.json();
      setMatches(data.matches || []);
      setSimilarImages(data.similar_images || []);
    } catch (err: any) {
      setError(err.message || 'Failed to scan image. Please verify backend connection.');
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setLoading(false);
      setScanStep(0);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl(null);
    setMatches([]);
    setSimilarImages([]);
    setError(null);
    setUrlInput('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Rule: Max two options per operation — two primary benchmark specimens
  const benchmarkPresets =
    domain === 'fashion'
      ? [
          { label: 'Tailored Formal Suit', imageId: 456, src: `${API}/images/456` },
          { label: 'Casual Denim Streetwear', imageId: 453, src: `${API}/images/453` },
        ]
      : [
          { label: 'Acura RL Luxury Sedan', imageId: 301, src: `${API}/images/301` },
          { label: 'Ford Mustang Sports Convertible', imageId: 331, src: `${API}/images/331` },
        ];

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
            <LensIcon size={18} />
          </div>
          <h1 style={{ fontSize: '2rem', margin: 0, fontWeight: 700 }}>
            Lens Scan &mdash; Intelligent Visual Search
          </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.94rem', maxWidth: 680, margin: 0 }}>
          Extract 512-dimensional continuous CLIP embeddings, compute cosine distance against all stored specimens, and identify nearest latent style clusters.
        </p>
      </div>

      {/* Domain Context Selector */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
          paddingBottom: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.80rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Domain:
          </span>
          <div className="domain-toggle-pill">
            <button
              type="button"
              className={`domain-toggle-btn ${domain === 'fashion' ? 'active' : ''}`}
              onClick={() => {
                setDomain('fashion');
                if (file) performSimilaritySearch(file);
              }}
            >
              <HangerIcon size={14} />
              <span>Fashion (DeepFashion2)</span>
            </button>
            <button
              type="button"
              className={`domain-toggle-btn ${domain === 'cars' ? 'active' : ''}`}
              onClick={() => {
                setDomain('cars');
                if (file) performSimilaritySearch(file);
              }}
            >
              <CarIcon size={14} />
              <span>Automobiles (Stanford Cars)</span>
            </button>
          </div>
        </div>

        {file && (
          <Button variant="secondary" size="sm" onClick={handleReset} iconRight={<XIcon size={14} />}>
            Scan New Image
          </Button>
        )}
      </div>

      {/* Main Google Lens Card Layout (Reference 4) */}
      {!previewUrl ? (
        <div
          style={{
            maxWidth: 680,
            width: '100%',
            margin: '12px auto 0',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border, rgba(34, 40, 49, 0.10))',
            borderRadius: 'var(--radius-lg, 12px)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.06)',
            padding: '32px 32px 28px',
            textAlign: 'left',
          }}
        >
          {/* Header Title — One Clean Headline */}
          <h2
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '1.25rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: 16,
              textAlign: 'left',
            }}
          >
            Search any image with Lens Scan
          </h2>

          {/* Dashed Dropzone Box (Ref 4) */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragActive ? 'var(--primary-accent)' : 'var(--border, rgba(34, 40, 49, 0.16))'}`,
              backgroundColor: dragActive ? 'rgba(255, 211, 105, 0.08)' : 'var(--bg-secondary, #F9FAFB)',
              borderRadius: 'var(--radius-md, 8px)',
              padding: '44px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelected(e.target.files[0]);
                }
              }}
            />

            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-primary)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              }}
            >
              <UploadIcon size={24} />
            </div>

            <div>
              <span style={{ fontSize: '0.94rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Drag an image here
              </span>
              <span style={{ fontSize: '0.94rem', color: 'var(--text-secondary)' }}> or </span>
              <span style={{ fontSize: '0.94rem', fontWeight: 600, color: '#222831', textDecoration: 'underline' }}>
                upload a file
              </span>
            </div>

            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0 }}>
              Supports JPG, PNG, WebP up to 5 MB &bull; Evaluated on continuous L2-normalized CLIP ViT-B/32
            </p>
          </div>

          {/* OR Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '22px 0 16px' }}>
            <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border-subtle)' }} />
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              OR
            </span>
            <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border-subtle)' }} />
          </div>

          {/* Paste Image URL Input with Search Button */}
          <form onSubmit={handleUrlSearch} style={{ display: 'flex', gap: 10 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
                <SearchIcon size={16} />
              </span>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste image link from Vogue, Unsplash, or manufacturer catalog..."
                style={{
                  width: '100%',
                  height: 40,
                  padding: '0 16px 0 38px',
                  backgroundColor: 'var(--bg-secondary, #F9FAFB)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.86rem',
                  fontFamily: 'var(--font-sans)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <Button variant="primary" size="md" type="submit">
              Search
            </Button>
          </form>

          {/* Benchmark Preset Samples — Left Aligned */}
          <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border-subtle)', textAlign: 'left' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 10 }}>
              Or test instant similarity with a benchmark sample:
            </span>
            <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
              {benchmarkPresets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const res = await fetch(preset.src);
                      const blob = await res.blob();
                      const sampleFile = new File([blob], `${preset.label.toLowerCase().replace(/\s+/g, '_')}.jpg`, { type: 'image/jpeg' });
                      handleFileSelected(sampleFile);
                    } catch {
                      setError('Failed to load sample image.');
                      setLoading(false);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.borderColor = '#222831';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  <SparklesIcon size={12} />
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Preview + Results Layout */
        <div className="split-sidebar-view">
          {/* Left: Uploaded Specimen Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '0.90rem', color: 'var(--text-primary)' }}>
                Query Specimen
              </strong>
              <Badge variant="live" size="sm">Active Scan</Badge>
            </div>

            <div
              style={{
                aspectRatio: '1/1',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Query specimen"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              <div>File: <strong>{file?.name}</strong></div>
              <div>Size: <strong>{((file?.size || 0) / 1024).toFixed(1)} KB</strong></div>
              <div>Latent Vector: <strong>512-dim continuous L2-norm</strong></div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              style={{ width: '100%' }}
            >
              Upload Different Image
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelected(e.target.files[0]);
                }
              }}
            />
          </div>

          {/* Right: Ranked Matches with Visual Similarity Score */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <SparklesIcon size={18} />
                <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Nearest Visual Style Clusters
                </h2>
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0 }}>
                Top nearest-neighbor clusters aggregated over 50 closest specimens via continuous cosine similarity.
              </p>
            </div>

            {loading && (
              <div
                role="status"
                aria-live="polite"
                style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-secondary, #F9FAFB)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    border: '3px solid var(--border)',
                    borderTopColor: '#222831',
                    borderRadius: '50%',
                    animation: 'tl-spin 0.8s linear infinite',
                  }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--text-primary)', marginBottom: 4 }}>
                    {scanStep === 1
                      ? 'Validating input & preprocessing to 224×224 RGB...'
                      : scanStep === 2
                      ? 'Extracting 512-dim continuous CLIP ViT-B/32 embedding...'
                      : 'Computing cosine similarity against indexed dataset vectors...'}
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Continuous latent projection &bull; L2-normalization ||v||₂ = 1.000 &bull; Aggregating k=50 neighbors
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 16px',
                  color: '#DC2626',
                  fontSize: '0.85rem',
                }}
              >
                {error}
              </div>
            )}

            {!loading && matches.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* 1. Top Style Clusters */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Ranked Style Clusters
                  </span>
                  {matches.map((match, idx) => {
                    const similarityScore = (match.score * 100).toFixed(1);
                    return (
                      <div
                        key={match.cluster_id}
                        style={{
                          border: idx === 0 ? '1px solid #222831' : '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '14px 18px',
                          backgroundColor: idx === 0 ? 'rgba(255, 211, 105, 0.06)' : 'var(--bg-secondary, #F9FAFB)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 16,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              backgroundColor: idx === 0 ? '#222831' : 'var(--surface)',
                              color: idx === 0 ? '#FFD369' : 'var(--text-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.78rem',
                              border: '1px solid var(--border)',
                              flexShrink: 0,
                            }}
                          >
                            #{idx + 1}
                          </div>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                              <strong style={{ fontSize: '0.94rem', color: 'var(--text-primary)' }}>
                                {match.name}
                              </strong>
                              <Badge variant={match.label as any} size="sm">
                                {match.label.toUpperCase()}
                              </Badge>
                            </div>
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              Cluster #{match.cluster_id} &bull; Domain: {domain.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <div style={{ textAlign: 'right', minWidth: 110 }}>
                            <div style={{ fontSize: '1.20rem', fontWeight: 700, color: '#222831', fontFamily: 'var(--font-sans)', letterSpacing: '-0.02em' }}>
                              {similarityScore}%
                            </div>
                            <div style={{ width: 90, height: 4, backgroundColor: 'var(--border)', borderRadius: 2, overflow: 'hidden', margin: '3px 0 2px auto' }}>
                              <div style={{ width: `${Math.min(Number(similarityScore), 100)}%`, height: '100%', backgroundColor: '#222831', borderRadius: 2 }} />
                            </div>
                            <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                              Visual Similarity Score
                            </span>
                          </div>

                          <Link
                            href={`/${domain}/${match.cluster_id}`}
                            className="btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                          >
                            <span>Dossier</span>
                            <ArrowRightIcon size={12} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 2. Direct Nearest Matching Images Grid (Google Lens Style) */}
                {similarImages.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
                    <div>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Closest Specimen Matches (Indexed Corpus)
                      </span>
                      <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Top individual dataset photographs ranked by pure continuous cosine similarity
                      </p>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                        gap: 12,
                      }}
                    >
                      {similarImages.map((img, idx) => (
                        <div
                          key={img.image_id}
                          style={{
                            border: idx === 0 ? '1px solid #222831' : '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            overflow: 'hidden',
                            backgroundColor: '#FFFFFF',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: 'var(--shadow-sm)',
                          }}
                        >
                          <div style={{ aspectRatio: '1/1', position: 'relative', overflow: 'hidden', backgroundColor: 'var(--bg-secondary)' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`${API}${img.url}`}
                              alt={`Match #${img.image_id}`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <div
                              style={{
                                position: 'absolute',
                                top: 6,
                                right: 6,
                                backgroundColor: 'rgba(34, 40, 49, 0.88)',
                                color: '#FFFFFF',
                                fontSize: '0.66rem',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: 'var(--radius-xs)',
                                backdropFilter: 'blur(4px)',
                              }}
                            >
                              {(img.score * 100).toFixed(1)}%
                            </div>
                          </div>
                          <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <strong style={{ fontSize: '0.74rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {img.cluster_name}
                            </strong>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                #{img.image_id}
                              </span>
                              <Link
                                href={`/${domain}/${img.cluster_id}`}
                                style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  color: '#222831',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 2,
                                }}
                              >
                                <span>Dossier</span>
                                <ArrowRightIcon size={10} />
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Explicit Computer Vision Disclaimer */}
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(34, 40, 49, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.74rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.45,
                  }}
                >
                  <strong>Academic Methodology Note:</strong> Visual similarity scores represent continuous cosine proximity in the 512-dimensional CLIP ViT-B/32 embedding space. Scores evaluate stylistic resonance against nearest neighbors, not deterministic product or vehicle classification.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LensScanPage() {
  return (
    <Suspense fallback={<div style={{ padding: '36px 32px', color: 'var(--text-muted)' }}>Loading Lens Scan...</div>}>
      <LensScanContent />
    </Suspense>
  );
}
