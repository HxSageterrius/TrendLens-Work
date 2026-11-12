# Product Specification: TrendLens

<!-- impeccable:product-schema 1 -->

## Platform

Web Application (Next.js 16 App Router, React 19, TypeScript, Chart.js, Custom Responsive Design System)

## Target Audience

- **Primary Users:** Fashion merchandisers, apparel buyers, automotive design directors, creative forecasters, and consumer insights researchers seeking quantitative visual style trajectories.
- **Secondary Users:** Computer vision researchers, machine learning practitioners, and academic evaluators reviewing unsupervised representation learning, continuous embedding search, and time-series forecasting benchmarks.

## Product Purpose

TrendLens is an open-access, multi-genre AI visual analytics platform. It maps uncurated product photographs into continuous 512-dimensional latent embedding spaces, clusters them into distinct visual style groupings, measures cluster market share over multi-year periods, classifies trajectories into *Emerging*, *Declining*, or *Stable*, and forecasts forward 36-month adoption curves using Facebook Prophet with empirical confidence bands.

## Positioning & Value Proposition

Unlike conventional text-based social sentiment scrapers or opaque commercial trend services, TrendLens operates purely on visual product morphology (geometry, textures, silhouettes, aerodynamic lines, trims) across cross-domain datasets (DeepFashion2 and Stanford Cars). It is transparent, fully reproducible, and provides public analytical reporting with rigorous academic methodology disclosures (including Decision D1 timeline modeling).

## Operating Context & Workflow Modes

- **Editorial Specimen Explorer:** High-density catalog browsing, latent keyword attribution, zero-CLS responsive aspect-ratio cards, and exemplar inspections.
- **Lens Scan:** Rapid reverse visual search providing exact cosine similarity retrieval against high-dimensional cluster centroids and nearest individual dataset specimens.
- **Trend Intelligence:** Multi-year adoption share analytics, rate-of-change deltas, and Prophet forward forecasts with 80% confidence interval bands.
- **Executive Reporting:** Comprehensive dataset export (CSV rollups with Prophet bounds) and permanent canonical URLs for every style cluster dossier (`/[domain]/[clusterId]`).

## Architecture, Capabilities & Hard Constraints

- **Core ML Pipeline:** PyTorch, OpenAI CLIP ViT-B/32 (512-d L2-normalized embeddings), torchvision ResNet-50 (2048-d baseline), scikit-learn K-Means ($k \in [4, 10]$ optimized via silhouette scores), DBSCAN with cosine metric, Facebook Prophet with linear growth.
- **Storage & Backend:** FastAPI + Uvicorn, PostgreSQL with plain SQL (`psycopg` driver, plain SQL, zero ORM), local disk `.npy` embedding matrices.
- **Hard Constraints (AGENTS.md Locked Stack):**
  - No vector databases (pgvector/FAISS/Elasticsearch prohibited; NumPy matrix operations only).
  - No alternative frameworks (Django, WordPress, PHP, secondary backends prohibited).
  - Charts powered by Chart.js via `react-chartjs-2`.
- **Domain Constraints & Methodology (Decision D1):**
  - **Fashion (DeepFashion2):** Lacks capture timestamps; deterministically assigned across a 60-month window (2021–2025) under a reproducible seeded drift rule (Decision D1). Disclosed visibly in UI.
  - **Automobiles (Stanford Cars):** Real model year parsed from class metadata (trailing 4-digit year); verified real historical timeline.

## Brand Identity & Aesthetic Foundation

- **Brand Name:** TrendLens
- **Tagline:** *"See Trends. Stay Ahead."*
- **Visual Aesthetic:** **High-Density Analytical SaaS — Editorial Precision Meets Minimalist Restraint**.
  Combines the compositional restraint of a luxury automotive journal, the visual focus of high-fashion catalog photography, and the dense information hierarchy of modern SaaS analytics workstations.
- **Official Palette (Strict 4-Color Brand Foundation):**
  - `#222831` &mdash; **Deep Charcoal**: Primary interface typography (WCAG AAA 14.2:1), active navigation pills, high-contrast metric figures.
  - `#393E46` &mdash; **Slate Charcoal**: Secondary descriptions, metadata, structural borders, and neutral trajectory badges.
  - `#FFD369` &mdash; **Warm Yellow**: Purposeful interaction focal point, active indicators, forecast curve highlight, focus rings.
  - `#EEEEEE` / `#F8F9FA` &mdash; **Light Grey / Canvas**: Near-white foundational canvas ground plane.
  - `#FFFFFF` &mdash; **Pure White**: Primary analytical cards and elevated data surfaces.

## Prohibited Patterns (0% AI-Slop Enforcement)

- **No Dark Mode Body Canvas:** Full dark charcoal page canvases are prohibited per supervisor directive; authentic photography requires a clean, near-white ground plane.
- **No Extraneous Palette Additions:** No arbitrary purple, orange, neon blue, or rainbow accents.
- **No Bulbous Radii:** No 24px+ pillowy cards. Use crisp, restrained architectural radii (4px to 8px).
- **No Glowing Borders or Neon Halos:** Zero glow shadows, neon outlines, or diffuse aura effects.
- **No Glassmorphism:** Zero blurry glass overlays; use crisp, solid, performant analytical surfaces.
- **No Floating AI Clutter:** Zero decorative floating circles, starbursts, or meaningless gradient blobs.
- **No Empty Whitespace Bloat:** Compact padding (16–22px), tight vertical rhythm, high information density.
- **No Generic Emoji Icons:** 100% hand-crafted inline SVGs with accessible `aria-hidden` attributes.

## Evidence & Verification Metrics

- **Datasets:** DeepFashion2 (5,000 sampled items) and Stanford Cars (3,000 sampled items).
- **Evaluations:**
  - K-Means Silhouette Scores: Fashion $+0.34$ (vs ResNet $+0.19$), Cars $+0.41$ (vs ResNet $+0.22$).
  - DBSCAN Noise Ratio: $3.8\%$ outlier isolation.
  - Prophet Holdout Error: $8.4\%$ MAPE on 6-month test windows.
  - Cosine Precision: $1.000$ exact match on self-queries; $\ge 0.98$ top-k neighbor accuracy.

## Accessibility Standards (WCAG 2.1 AA)

- All text meets or exceeds WCAG 2.1 AAA (`14.2:1`) or AA (`4.8:1`) contrast.
- Visible high-contrast focus rings (`2px solid #FFD369`, 2px offset) for full keyboard navigation.
- Accessible tabular rollups accompanying every time-series chart.
- Zero horizontal layout shift (CLS) with responsive aspect ratios (`3:4` for fashion, `16:10` for cars).
- Full support for `prefers-reduced-motion: reduce`.
