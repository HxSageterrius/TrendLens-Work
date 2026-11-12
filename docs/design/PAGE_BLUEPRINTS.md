# TrendLens Page Blueprints & Wireframe Specifications

> **Theme:** Light Minimalist Editorial & Visual Analytics  
> **Canvas:** `#F8F9FA` / `#EEEEEE` | **Surfaces:** Pure White `#FFFFFF` | **Text:** Deep Charcoal `#222831` | **Accent:** Warm Yellow `#FFD369`  
> **Reference Standards:** *Beyond UI* (Clean SaaS KPIs), *The Row* (Minimalist Editorial Catalog), *Google Lens* (Intelligent Visual Search), *Prophet Forecast* (Solid Historical + Dashed Projections).  

---

## 1. Global Navigation & Sidebar Blueprint

The navigation sidebar is anchored to the left, collapsible, rendered on a clean white surface (`#FFFFFF`) with a subtle 1px border (`rgba(34, 40, 49, 0.08)`):

```
+--------------------------------------------------------------------------+
| SIDEBAR (Width: 260px desktop, collapsible to 72px icon rail)            |
|                                                                          |
| [Logo] TrendLens                                             [< Collapse]|
|        Visual Trend Intelligence                                         |
|                                                                          |
| NAVIGATION                                                               |
| [icon] Home               (/)               [Active: Charcoal pill]      |
| [icon] Explore            (/explore)                                     |
| [icon] Lens Scan          (/scan)                                        |
| [icon] Trends             (/trends)                                      |
| [icon] Reports            (/reports)                                     |
| [icon] Settings           (/settings)                                    |
|                                                                          |
| DOMAIN SELECTOR                                                          |
| +----------------------------------------------------------------------+ |
| |  (•) Fashion (DeepFashion2)       ( ) Automobiles (Stanford Cars)    | |
| +----------------------------------------------------------------------+ |
|                                                                          |
| SYSTEM INTEGRITY & TELEMETRY                                             |
| [•] System Online  (live mode, port 8000)                                |
|                                                                          |
| USER PROFILE & SESSION                                                   |
| [Avatar] Hamza Khalid / BSCS FYP                              [v Options]|
+--------------------------------------------------------------------------+
```

---

## 2. Page 1: Home Dashboard (`/`)

An executive visual analytics cockpit combining editorial photography with live clustering telemetry.

```
+--------------------------------------------------------------------------+
| HEADER: Domain Toggle | Search Clusters... | API Status: Live            |
+--------------------------------------------------------------------------+
| [ALERT BANNER if State B: DeepFashion2 timeline assigned via Rule D1]    |
+--------------------------------------------------------------------------+
| HERO SECTION (Light Editorial Banner)                                    |
| +------------------------------------+---------------------------------+ |
| | [✦ AI-Powered Visual Intelligence] | [Hero Photography Window]       | |
| | Discover Emerging Visual           | Clean high-res vehicle/garment  | |
| | Trajectories & Latent Clusters.    | photograph seamlessly embedded  | |
| |                                    | with zero color banding.        | |
| | Unsupervised clustering on 5,000+  |                                 | |
| | fashion & automotive artifacts.    |                                 | |
| |                                    |                                 | |
| | [Explore Clusters ->] [Run Scan]   | Source: Stanford Cars / DF2     | |
| +------------------------------------+---------------------------------+ |
|                                                                          |
| PLATFORM TELEMETRY KPIS (Clean White Cards with Hairline Borders)        |
| +------------------+------------------+------------------+-------------+ |
| | Total Images     | Active Clusters  | Silhouette Score | Trend Leader| |
| | 5,000            | 5 Clusters       | +0.34 (Optimal)  | Style 2 (↗) | |
| | Real observations| K-Means (k=4..10)| Latent CLIP-512  | +14.2% YoY  | |
| +------------------+------------------+------------------+-------------+ |
|                                                                          |
| TRENDING VISUALS / EDITORIAL LOOKBOOK (Ref 2 Aesthetic)                  |
| +----------------------------------------------------------------------+ |
| | Section Title: Emerging Style Clusters              [View All ->]    | |
| | +-----------+ +-----------+ +-----------+ +-----------+ +----------+ | |
| | | Garment 1 | | Garment 2 | | Garment 3 | | Vehicle 1 | | Vehicle 2| | |
| | | Outerwear | | Knitwear  | | Tailoring | | Fastback  | | GT Coupe | | |
| | | Share: 28%| | Share: 22%| | Share: 18%| | Share: 19%| | Share:13%| | |
| | +-----------+ +-----------+ +-----------+ +-----------+ +----------+ | |
| +----------------------------------------------------------------------+ |
+--------------------------------------------------------------------------+
```

---

## 3. Page 2: Explore (`/explore`)

Visual cluster browser providing deep catalog analysis, segmentations, and latent vector distributions.

```
+--------------------------------------------------------------------------+
| EXPLORE: Visual Cluster Browser                                          |
| Filter by Style: [All Clusters v] | Sort: [Highest Share v] | View: Grid |
+--------------------------------------------------------------------------+
| CLUSTER DOSSIER (Selected: Cluster 1 - Tailored Outerwear)               |
| +----------------------------------------------------------------------+ |
| | Name: Style 1 (Tailored Outerwear)       Label: Emerging (↗ +8.4%)   | |
| | Total Items: 1,420                      Mean Silhouette: +0.36       | |
| | Primary Visual Attributes: Structured lapels, wool weave, dark palette |
| +----------------------------------------------------------------------+ |
|                                                                          |
| VISUAL SPECIMEN CATALOG (Pristine White Background, Ref 2 Style)         |
| +----------------+ +----------------+ +----------------+ +------------+ |
| | [Specimen 1]   | | [Specimen 2]   | | [Specimen 3]   | | [Specimen 4]| |
| | ID: df2_00412  | | ID: df2_00892  | | ID: df2_01204  | | ID: df2_0294| |
| | Sim to Center: | | Sim to Center: | | Sim to Center: | | Sim to Ctr: | |
| | 0.94           | | 0.91           | | 0.89           | | 0.88        | |
| | [Inspect Dossier ->]                                                 | |
| +----------------+ +----------------+ +----------------+ +------------+ |
+--------------------------------------------------------------------------+
```

---

## 4. Page 3: Lens Scan (`/scan`)

Intelligent reverse image similarity search inspired by Google Lens (Ref 3).

```
+--------------------------------------------------------------------------+
| LENS SCAN: Intelligent Visual Similarity Search                          |
| Domain: [ (•) Fashion   ( ) Automobiles ]                                |
+--------------------------------------------------------------------------+
| SEARCH CARD (Pure White Surface #FFFFFF, Subtle Border)                  |
| +----------------------------------------------------------------------+ |
| | [Tab: Search by Image]              [Tab: Search by Image URL]       | |
| |----------------------------------------------------------------------| |
| |                                                                      | |
| |   + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -+   | |
| |   |                     [ ↑ Upload Icon ]                        |   | |
| |   |          Click to upload or drag and drop an image           |   | |
| |   |             PNG, JPG or WEBP (Max upload size: 5 MB)         |   | |
| |   + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -+   | |
| |                                                                      | |
| |   OR                                                                 | |
| |   [ Paste image URL https://...                  ]  [ Search -> ]    | |
| +----------------------------------------------------------------------+ |
|                                                                          |
| SIMILARITY SEARCH RESULTS (Displayed Post-Inference)                     |
| +----------------------------------------------------------------------+ |
| | [Uploaded Image Preview]  | VISUAL SIMILARITY MATCHES (Top 3 Clusters)|
| |                           |                                          |
| | 224x224 RGB Normalized    | 1. Style 1 (Tailored Outerwear)          |
| | 512-d CLIP ViT-B/32       |    Visual Similarity Score: 87.4%        |
| | Latent Vector Extracted   |    Cluster Trajectory: Emerging (↗)      |
| |                           |    Key Attributes: Wool, structured lapel|
| |                           |                                          |
| |                           | 2. Style 3 (Minimalist Knitwear)         |
| |                           |    Visual Similarity Score: 64.2%        |
| |                           |    Cluster Trajectory: Stable (→)        |
| |                           |                                          |
| |                           | 3. Style 0 (Casual Streetwear)           |
| |                           |    Visual Similarity Score: 41.0%        |
| |                           |                                          |
| | DISCLAIMER: Visual similarity scores represent cosine proximity in    |
| | continuous CLIP embedding space. They do not constitute deterministic  |
| | item identification or classification guarantees.                      |
| +----------------------------------------------------------------------+ |
+--------------------------------------------------------------------------+
```

---

## 5. Page 4: Trends & Forecast (`/trends`)

Historical cluster evolution and 36-month Facebook Prophet trajectory projections (Ref 4 & Ref 5).

```
+--------------------------------------------------------------------------+
| TRENDS: Longitudinal Style Trajectories & Forecasting                    |
| Controls: [Domain: Fashion v] | [Metric: Cluster Share % v] | [2021-2028]|
+--------------------------------------------------------------------------+
| HISTORY & FORECAST CHART (Pure White Canvas #FFFFFF, Ref 4 Layout)       |
| +----------------------------------------------------------------------+ |
| | Chart Title: Cluster Volume Share (%) Over Time        [Export CSV]  | |
| |                                                                      | |
| | 40%|                                                                 | |
| |    |                                     / - - - - - -               | |
| | 30%|                   /-------------\  /  (Prophet     \            | |
| |    |                  /               \/    Forecast)    \           | |
| | 20%|   /-------------\                                    \          | |
| |    |  / (Historical Observations)                                    | |
| | 10%| /                                                               | |
| |    +--------------------------------------+------------------------+ |
| |      2021    2022    2023    2024    2025 | 2026    2027    2028     | |
| |       [ --- State A: Real History --- ]   | [ - - State C: Forecast] | |
| |                                                                      | |
| | Legend:                                                              | |
| | —— Solid Charcoal (#222831): Historical Share (2021-2025)            | |
| | -- Dashed Warm Yellow (#FFD369): Prophet Forecast yhat (2026-2028)   | |
| | ░░ Shaded Band (rgba(255,211,105,0.18)): 80% Confidence Interval     | |
| +----------------------------------------------------------------------+ |
|                                                                          |
| TRAJECTORY CLASSIFICATION BREAKDOWN                                      |
| +-------------------+-------------------+------------------------------+ |
| | Cluster Name      | Historical Delta  | Status Label & Trajectory    | |
| +-------------------+-------------------+------------------------------+ |
| | Style 1           | +8.4%             | [ Emerging ↗ ] (+8.4% YoY)   | |
| | Style 2           | +6.2%             | [ Emerging ↗ ] (+6.2% YoY)   | |
| | Style 3           | -1.1%             | [ Stable → ]   (-1.1% YoY)   | |
| | Style 4           | -7.8%             | [ Declining ↘ ] (-7.8% YoY)  | |
| +-------------------+-------------------+------------------------------+ |
+--------------------------------------------------------------------------+
```

---

## 6. Page 5: Reports (`/reports`)

Executive summary view consolidating methodology, cluster statistics, and export options.

```
+--------------------------------------------------------------------------+
| REPORTS: Visual Intelligence Dossiers & Methodology                      |
+--------------------------------------------------------------------------+
| REPORT SUMMARY CARD                                                      |
| +----------------------------------------------------------------------+ |
| | FYP Evaluation Report: Multi-Domain Visual Trend Forecasting          |
| | Model: CLIP ViT-B/32 | Clustering: K-Means (k=5) | Time-Series: Prophet|
| | Datasets: DeepFashion2 (5,000 items), Stanford Cars (3,000 items)      |
| | [ Download PDF Report ]         [ Export Raw JSON / CSV ]              |
| +----------------------------------------------------------------------+ |
|                                                                          |
| METHODOLOGY & DATA DISCLOSURE (Academic Transparency)                    |
| • Fashion Domain: Timeline is simulated per Decision D1 (seeded drift).  |
| • Automotive Domain: Real model years parsed from Stanford Cars.         |
| • Prophet Forecast: 36-month horizon with 80% confidence interval.       |
| • DBSCAN Comparison: 12 outliers identified (noise ratio 0.24%).         |
+--------------------------------------------------------------------------+
```

---

## 7. Dynamic Cluster Detail Page (`/[domain]/[clusterId]`)

Detailed single-cluster report with 12-image contact sheet and single-series forecast.

```
+--------------------------------------------------------------------------+
| BREADCRUMB: Trends / Fashion / Style 1 (Tailored Outerwear)              |
+--------------------------------------------------------------------------+
| CLUSTER OVERVIEW CARD                                                    |
| +----------------------------------------------------------------------+ |
| | Title: Style 1 — Tailored Outerwear               [ Emerging ↗ ]     | |
| | 2025 Share: 28.4%  |  Forecasted 2028 Share: 34.2%  |  MAPE: 6.8%     | |
| +----------------------------------------------------------------------+ |
|                                                                          |
| 12-IMAGE CONTACT SHEET (docs/clusters/{domain}/contact_sheet_{id}.jpg)   |
| +----------------------------------------------------------------------+ |
| | [IMG 1] [IMG 2] [IMG 3] [IMG 4] [IMG 5] [IMG 6]                      | |
| | [IMG 7] [IMG 8] [IMG 9] [IMG 10] [IMG 11] [IMG 12]                   | |
| +----------------------------------------------------------------------+ |
|                                                                          |
| CLUSTER PROPHET FORECAST (Chart with Shaded 80% Confidence Band)         |
| +----------------------------------------------------------------------+ |
| | [ Interactive ClusterForecastChart Component ]                       | |
| +----------------------------------------------------------------------+ |
+--------------------------------------------------------------------------+
```
