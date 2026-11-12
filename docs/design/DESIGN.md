# TrendLens Design System Specification

> **System Name:** TrendLens Visual Analytics Design System  
> **Aesthetic Profile:** High-Density Data Analytics & Editorial Precision &mdash; Light Minimalist Architecture  
> **Official Brand Palette:** Deep Charcoal (`#222831`), Slate Charcoal (`#393E46`), Warm Yellow (`#FFD369`), Light Grey (`#EEEEEE`), Pure White (`#FFFFFF`)  
> **Theme Mode:** Light Minimalist Workstation (Near-white canvas `#F8F9FA`, pure white analytical surfaces `#FFFFFF`, deep charcoal typography `#222831`)  
> **Version:** 2.2.0 (High-Density SaaS Architecture & Hallmark Alignment)  

---

## 1. Design Direction & High-Density SaaS Philosophy

TrendLens combines the compositional restraint of a luxury automotive journal with the high-contrast presentation of a fashion lookbook, bound within the functional precision of a dense, modern SaaS analytics workstation (inspired by Linear, Stripe, and Beast Insights).

### 1.1 Core Tenets
1. **Light Minimalist Canvas:** Foundational canvas is light grey (`#F8F9FA` / `#EEEEEE`); all analytical cards are solid white (`#FFFFFF`) framed by crisp 1px hairline borders (`rgba(34, 40, 49, 0.09)`). Full dark-mode canvas backgrounds are strictly prohibited.
2. **High Information Density:** Eliminate fluffy whitespace bloat. Analytical cards use compact 16–22px padding, tightly formatted tabular metrics, and dense 8pt vertical rhythm.
3. **Content Over Chrome:** Authentic fashion garments, textile weaves, vehicle profiles, and bodywork command the visual plane. Interface elements (borders, dividers, pills) remain quiet, crisp, and structural.
4. **Architectural Restraint:** Crisp, purposeful corner radii (4px to 8px) replace bulbous curves. Glow effects, neon auras, floating decorative shapes, and glassmorphism blur filters are strictly prohibited.
5. **Deep Charcoal Typography with Intentional Yellow Accent:** Typography is set in deep charcoal (`#222831`) for maximum contrast (WCAG AAA 14.2:1). Warm yellow (`#FFD369`) is used with extreme intentionality for primary interactive focal points, active state indicators, trajectory forecast highlights, and focus rings.
6. **Hallmark Data Rigor:** Every visual element has three verified states: **Active/Loaded**, **Loading Skeleton (zero CLS)**, and **Empty Fallback**. Visual similarity scores are never presented as identification probabilities.

---

## 2. Color System & Semantic Tokens

The design system enforces the approved 4-color foundation across a high-clarity light theme:

### 2.1 Core Palette Tokens

| Token Name | Hex Code | Visual Swatch | Semantic Role & Architectural Purpose |
|---|---|---|---|
| `--bg-main` | `#F8F9FA` / `#EEEEEE` | `■ Light Grey Canvas` | Primary page canvas, foundational ambient backdrop. |
| `--bg-secondary`| `#F3F4F6` | `■ Off-White Inset` | Secondary compartments, inset panels, dropdown tracks, segmented controls. |
| `--surface` | `#FFFFFF` | `□ Pure White` | Primary card surfaces, elevated containers, toolbar bars, and table backgrounds. |
| `--sidebar-bg` | `#FFFFFF` | `□ Clean White` | Pinned navigation sidebar with subtle hairline border (`rgba(34, 40, 49, 0.08)`). |
| `--sidebar-active`| `#222831` | `■ Deep Charcoal Active`| Active sidebar pill background with crisp white icon and text. |
| `--primary-accent`| `#FFD369` | `■ Warm Yellow` | Primary interaction accent, active indicators, forecast curve highlight, focus rings. |
| `--primary-hover` | `#F5C754` | `■ Rich Yellow` | Hover state for primary interactive elements. |
| `--text-primary` | `#222831` | `■ Deep Charcoal` | High-contrast body text, headings, prominent table values, active labels (WCAG AAA 14.2:1). |
| `--text-secondary`| `#393E46` | `■ Slate Charcoal` | Subtitles, secondary descriptions, metadata, inactive tab text (WCAG AAA 8.8:1). |
| `--text-muted` | `#6B7280` | `■ Accessible Grey` | Captions, timestamps, helper text, and table column headers (WCAG AA 4.8:1). |
| `--border` | `rgba(34, 40, 49, 0.09)` | `— Crisp Hairline` | Standard structural borders, card perimeters, input field outlines. |
| `--border-subtle`| `rgba(34, 40, 49, 0.04)` | `— Fine Divider` | Table row dividers, inner compartmental borders. |

### 2.2 Semantic Trajectory & Data Integrity Status System

| Semantic State | Color Token | Indicator Presentation | Usage Context |
|---|---|---|---|
| **Emerging (Growth)** | `#15803D` / `#FFD369` | Warm Yellow pill or high-contrast green text, `↗` glyph | Style trajectory $\Delta > +5.0\%$ YoY |
| **Stable (Neutral)** | `#393E46` | Slate charcoal pill, `→` glyph | Style trajectory $-5.0\% \le \Delta \le +5.0\%$ |
| **Declining (Contraction)**| `#DC2626` / `#6B7280` | Red or cool grey pill, `↘` glyph | Style trajectory $\Delta < -5.0\%$ YoY |
| **Real Historical Data** | `#222831` (Deep Charcoal) | Solid line in charts, unadorned numeric values | Stanford Cars real model years (2021–2025) |
| **Simulated Timeline** | `#FFD369` (Warm Yellow) | Documented badge indicator (Decision D1) | DeepFashion2 synthetic drift |
| **Prophet Forecast** | `#FFD369` with shaded band | Dashed line with 16% opacity confidence interval band | 36-month future projection (2026–2028) |

---

## 3. Typography & Hierarchy System

TrendLens establishes a rigorous two-tier typography system: a clean, geometric sans-serif for analytical data and dense metrics, and an editorial serif reserved strictly for primary display titles.

### 3.1 Font Families
- **Interface & Analytics (Primary):** `Plus Jakarta Sans`, `Inter`, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif.
- **Editorial Display (Selective):** `Playfair Display`, Georgia, serif (restricted strictly to major display titles `h1`).
- **Tabular Figures:** `font-variant-numeric: tabular-nums` enforced globally on body and metrics.
- **Reading Measure:** Text paragraphs constrained to `60ch` &ndash; `75ch` for optimal analytical reading speed.

### 3.2 Modular Type Scale & Role-Based Line Heights

| Level / Role | Font Family | Size | Weight | Tracking | Line Height | Usage Scope |
|---|---|---|---|---|---|---|
| **Display Hero** | `Playfair Display` | `2.40rem` (36px) | 700 (Bold) | `-0.02em` | `1.15` (tight) | Hero title statements on Home and About. |
| **Page Header `h1`** | `Plus Jakarta Sans` | `1.75rem` (26px) | 700 (Bold) | `-0.015em` | `1.20` (compact) | Primary page titles (Explore, Lens Scan, Trends). |
| **Section Header `h2`**| `Plus Jakarta Sans` | `1.15rem` (17px) | 700 (Bold) | `-0.01em` | `1.25` (dense) | Analytical card headers, chart titles. |
| **Subheader `h3`** | `Plus Jakarta Sans` | `0.96rem` (14.5px) | 600 (SemiBold) | `0em` | `1.30` | Group titles, popover headers, table section headers. |
| **Body Regular** | `Plus Jakarta Sans` | `0.88rem` (13.5px) | 400 (Regular) | `0em` | `1.55` (readable) | Narrative descriptions, methodology notes. |
| **Interface / Button** | `Plus Jakarta Sans` | `0.82rem` (12.5px) | 600 (SemiBold) | `+0.01em` | `1.25` | Button labels, navigation links, tabs. |
| **Metric / Number** | `Plus Jakarta Sans` | `1.65rem` (25px) | 700 (Bold) | `-0.02em` | `1.10` (tabular) | KPI shares, delta percentages (`tabular-nums`). |
| **Caption / Label** | `Plus Jakarta Sans` | `0.74rem` (11px) | 600 (SemiBold) | `+0.04em` | `1.25` | Table headers, badge labels, metadata pills. |

---

## 4. Spacing, Elevation & Architectural Layout

### 4.1 8-Point Spatial Grid
- `--space-1`: `4px` (badge padding, micro-offsets)
- `--space-2`: `8px` (button icon offsets, pill padding, table vertical cell padding)
- `--space-3`: `12px` (standard input padding, card gap on compact grids)
- `--space-4`: `16px` (card internal padding, metric grid gaps)
- `--space-6`: `24px` (major section gaps, toolbar margins)
- `--space-8`: `32px` (page header bottom margin)

### 4.2 Elevation & Borders
- **Standard Border:** `1px solid rgba(34, 40, 49, 0.09)` &mdash; Crisp, razor-thin structural line.
- **Card Shadow:** `0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02)` &mdash; Ultra-restrained depth without fuzzy blur halos.
- **Elevated Popovers:** `0 8px 24px rgba(0, 0, 0, 0.08)` &mdash; Clean floating shadow for dropdowns and flyout menus.

---

## 5. Main Dashboard Architecture (SaaS Standard)

The TrendLens dashboard follows high-density data standards:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Pinned Top Header: Global Search [⌘K] | Genre Toggle [Fashion / Cars] | User │
├──────────────┬──────────────────────────────────────────────────────────────┤
│ Pinned       │ 1. Editorial Hero: 360px Compact Height + Authentic Visual   │
│ Sidebar:     │    - Category badges, trajectory summary, quick action CTA   │
│ - Brand Logo ├──────────────────────────────────────────────────────────────┤
│ - Home       │ 2. Dense Metric Summary Bar (4-Column Fluid Grid):           │
│ - Explore    │    [Dataset Volume: 5,000 (100% L2) + Sparkline]             │
│ - Lens Scan  │    [Active Clusters: 4-9 (s = +0.34/+0.41) + Sparkline]      │
│ - Trends     │    [Dominant Volume: 28.4% (↗ +8.4% YoY) + Sparkline]        │
│ - Reports    │    [Prophet Horizon: 36 Months (80% CI, MAPE ≤ 8.4%)]        │
│ - Settings   ├──────────────────────────────────────────────────────────────┤
│              │ 3. Analytics Split View (1.2fr / 0.8fr):                     │
│ [System:     │    - Left: Prophet Time-Series Chart (History vs Full View)  │
│  CLIP/Prophet│    - Right: Top Visual Attributes & Cluster Volume Table     │
│  Online]     ├──────────────────────────────────────────────────────────────┤
│              │ 4. Curated Specimen Gallery (5-Column Fluid Grid):           │
│ [Profile]    │    - Zero-CLS aspect ratio tiles with centroid proximity     │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

---

## 6. Hallmark Quality Checklist (0% AI-Slop Enforcement)

| Criterion | Implementation Rule | Status |
|---|---|---|
| **Zero Horizontal Overflow** | Root `html`, `body`, and container have `overflow-x: hidden; max-width: 100vw`. Fluid grids use `minmax(0, 1fr)`. | **VERIFIED** |
| **No Generic Card Borders** | Fine `1px solid rgba(34, 40, 49, 0.09)` replaces heavy opaque borders. | **VERIFIED** |
| **No Empty Whitespace Bloat**| Compact card padding (`18–22px`), tight section spacing (`24–28px`). | **VERIFIED** |
| **Active States** | Segmented controls (History vs Full Trajectory, Fashion vs Cars) have distinct filled deep-charcoal active pills. | **VERIFIED** |
| **Loading Skeletons** | Pulsing placeholder cards matching exact container aspect ratios prevent Cumulative Layout Shift (CLS). | **VERIFIED** |
| **Zero-Data Fallback** | Clean dashed container with descriptive filter-reset button when queries return 0 items. | **VERIFIED** |
| **Icon Integrity** | 100% pure SVG icons with stroke-width `1.75` and accessible dimensions. No generic emojis. | **VERIFIED** |
| **Pinned Navigation** | 100vh sidebar and sticky top header remain accessible as the user scrolls up and down. | **VERIFIED** |
