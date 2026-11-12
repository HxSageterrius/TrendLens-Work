# TrendLens Component Inventory & Specifications

> **Theme:** Light Minimalist Editorial Workstation  
> **Canvas:** `#F8F9FA` | **Surfaces:** `#FFFFFF` | **Text:** `#222831` | **Accent:** `#FFD369`  
> **Version:** 2.1.0 (Phase 3.1 Architecture Validation & Refinement)  

---

## 1. Core Visual & Layout Components

### 1.1 `AppSidebar`
- **Location:** `web/components/AppSidebar.tsx` (replaces legacy static nav).
- **Theme:** Clean white background (`#FFFFFF`), subtle right border (`rgba(34, 40, 49, 0.08)`).
- **Collapsible State:** 260px expanded (full labels + status), 72px collapsed (icon rail with tooltips).
- **Items:** Home, Explore, Lens Scan, Trends, Reports, Settings.
- **Active State:** Deep charcoal pill (`#222831`) with warm yellow or white icon.
- **Controls:** Embedded Domain Switcher (`Fashion` / `Automobiles`), System Status indicator (`live` vs `mock`).

### 1.2 `DataIntegrityBanner`
- **Location:** `web/components/DataIntegrityBanner.tsx`
- **Purpose:** Enforce the 3-state data integrity model across all pages.
- **States:**
  - *State A (Real):* Hidden or subtle green/charcoal indicator ("Validated historical observations").
  - *State B (Simulated Timeline / Mock Mode):* Prominent warm yellow banner (`#FFD369` background or yellow accent border) stating: *"Demonstration Timeline: DeepFashion2 images are assigned dates using synthetic drift rule D1."*
  - *State C (Prophet Forecast):* Rendered directly on charts as a dashed line with an explicit disclaimer.

### 1.3 `KPICard`
- **Location:** `web/components/KPICard.tsx`
- **Theme:** Pure white surface (`#FFFFFF`), 1px border (`rgba(34, 40, 49, 0.08)`), restrained shadow (`0 1px 3px rgba(0,0,0,0.04)`).
- **Typography:** Deep charcoal metric (`#222831`, `tabular-nums`, 1.6rem bold), slate description (`#393E46`, 0.88rem).
- **Badge:** Trajectory pill (`Emerging` with yellow accent, `Stable` with off-white, `Declining` with cool grey).

### 1.4 `LensScanDropzone` (Ref 3 Google Lens Pattern)
- **Location:** `web/components/LensScanDropzone.tsx`
- **Theme:** Pure white card (`#FFFFFF`) with dashed inner dropzone (`2px dashed rgba(34, 40, 49, 0.15)`).
- **Tabs:** "Search by Image" (drag & drop / file picker) and "Search by Image URL".
- **Validation:** Enforces 5 MB limit, allowed MIME types (`image/jpeg`, `image/png`, `image/webp`).
- **Feedback:** Progress state with spinner during CLIP inference; displays cropped 224x224 preview.

### 1.5 `SimilarityResultCard`
- **Location:** `web/components/SimilarityResultCard.tsx`
- **Metrics:** Displays **"Visual Similarity Score"** (percentage formatted from cosine similarity $[0.0, 1.0]$).
- **Disclosures:** Explicit card footer: *"Scores reflect cosine proximity in CLIP continuous embedding space. This is not an identity classification."*
- **Contents:** Top-3 clusters, associated trajectory label, key visual attributes, and link to cluster dossier.

### 1.6 `HistoryForecastChart` (Ref 4 Pattern)
- **Location:** `web/components/HistoryForecastChart.tsx`
- **Canvas:** Pure white background (`#FFFFFF`) with light grey gridlines (`rgba(34, 40, 49, 0.06)`).
- **Historical Curve:** Solid Deep Charcoal line (`#222831`, width 2.5px) for 2021–2025 data points.
- **Forecast Curve:** Dashed Warm Yellow line (`#FFD369`, width 2.5px, dash `[6, 4]`) for 2026–2028 projections.
- **Confidence Area:** Translucent fill (`rgba(255, 211, 105, 0.18)`) spanning `yhat_lower` to `yhat_upper`.

---

## 2. Component State & Interaction Specifications

| Component | Default State | Hover / Focus State | Active / Selected | Loading State | Error State |
|---|---|---|---|---|---|
| **Primary Button** | Background `#FFD369`, Text `#222831`, 6px radius | Background `#F5C754`, shadow lift | Opacity 0.9 | Disabled with spinner | Disabled with error border |
| **Secondary Button** | Surface `#FFFFFF`, Border `1px solid rgba(34,40,49,0.12)` | Border `#222831`, background `#F8F9FA` | Inset shadow | Disabled | Red border `#D32F2F` |
| **Dropzone** | `#FFFFFF` with dashed border | Border `#222831`, background `#F8F9FA` | Upload active | Pulsing border | Red dashed border with error message |
| **Navigation Tab** | Text `#393E46`, transparent background | Text `#222831`, background `#F3F4F6` | Deep Charcoal pill `#222831` | Skeleton placeholder | Retry link |
