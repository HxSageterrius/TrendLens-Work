# TrendLens UI/UX Architecture & System Blueprint

> **Product:** TrendLens &mdash; Multi-Domain Visual Trend Intelligence & Forecasting  
> **Status:** Phase 3.1 Architecture Validation & Refinement  
> **Theme:** Light Minimalist Editorial Workstation (Near-white `#F8F9FA` canvas, pure white `#FFFFFF` analytical surfaces, deep charcoal `#222831` typography, warm yellow `#FFD369` accents)  
> **Visual Reference Standard:** High-contrast automotive editorial + fashion lookbook layout + clean SaaS data cards (*Beyond UI*, *Beast Insights*, *The Row*)  

---

## 1. Verified Machine Learning & Computer Vision Foundations

Every visual and interaction element in TrendLens directly reflects the verified mathematical and data pipeline implemented in the backend:

### 1.1 Embedding Engine (`ml/embeddings.py`)
- **Primary Model:** OpenAI CLIP ViT-B/32 (`openai/clip-vit-base-patch32`) loaded via Hugging Face `transformers` on PyTorch.
- **Dimensionality:** 512-dimensional continuous latent space.
- **Normalization:** Strict L2-normalization ($v_{\text{norm}} = \frac{v}{\|v\|_2}$).
- **Baseline Comparative Model:** `torchvision.models.resnet50` producing 2048-dimensional vectors for academic evaluation comparisons.

### 1.2 Clustering Architecture (`ml/cluster.py`)
- **Primary Algorithm:** `sklearn.cluster.KMeans` (searching cluster count $k \in [4, 10]$ with fixed seed `SEED = 42`).
- **Cluster Selection Metric:** Silhouette score ($s \in [-1.0, 1.0]$) computed on L2-normalized embeddings. The $k$ that maximizes the mean silhouette score is selected for live production.
- **Secondary Outlier Detector:** `sklearn.cluster.DBSCAN(metric="cosine")` configured to isolate anomalous aesthetic styles (assigned to `cluster_id = -1`).

### 1.3 Similarity Search Engine (`ml/similarity.py`)
- **Metric:** Cosine similarity via matrix dot product ($S = X \cdot q^T$) on L2-normalized 512-d CLIP vectors.
- **Search Pipeline:** Query image is preprocessed (resized to $224 \times 224$), embedded with CLIP, compared against all stored embeddings in `data/embeddings/`, and filtered to the top-50 nearest neighbors.
- **Aggregation:** Neighbor scores are grouped by cluster ID to calculate the top-3 visual style matches with normalized mean similarity scores in $[0.0, 1.0]$ ($0\% \text{ to } 100\%$).
- **Computer Vision Presentation Protocol:** Scores are strictly labeled **"Visual Similarity Score"** rather than "Confidence Score" or "Prediction Probability". The UI explicitly clarifies that scores reflect distance in the visual embedding space, not item identity.

### 1.4 Time-Series Forecasting (`ml/forecast.py`)
- **Model:** Facebook Prophet (`prophet.Prophet(growth='linear', weekly_seasonality=False, daily_seasonality=False)`).
- **Temporal Resolution:** Monthly cluster share (60 observations: 2021-01 to 2025-12).
- **Forecast Horizon:** 36 future months (2026-01 to 2028-12).
- **Rollup:** Aggregated to annual mean `yhat`, `yhat_lower`, and `yhat_upper` (80% confidence interval).
- **Validation Metric:** Mean Absolute Percentage Error (MAPE) computed on a 6-month hold-out set.

---

## 2. Three-Tier Data Integrity Architecture

To prevent academic ambiguity and guarantee complete research integrity, TrendLens enforces a three-state data presentation contract across every view, table, and chart:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DATA INTEGRITY STATES                          │
├─────────────────────────┬──────────────────────┬───────────────────────┤
│ State A: Historical     │ State B: Simulated   │ State C: Forecast     │
│ Real Observations       │ / Demonstration      │ Machine Projection    │
├─────────────────────────┼──────────────────────┼───────────────────────┤
│ • Stanford Cars real    │ • DeepFashion2       │ • Facebook Prophet    │
│   model years           │   synthetic temporal │   36-month projection │
│ • Solid charcoal line   │   drift (D1)         │ • Dashed yellow curve │
│ • Standard metric cards │ • Striped alert pill │ • Shaded confidence   │
│ • "Historical Data"     │ • "Simulated Timeline│   interval band       │
│   annotation            │   Notice" banner     │ • "Prophet Forecast"  │
└─────────────────────────┴──────────────────────┴───────────────────────┘
```

1. **State A: Real Historical Data (`timeline: "real"`)**
   - Validated real-world capture years (Stanford Cars 2021–2025). Rendered with solid dark lines (`#222831`) and standard tabular metrics.
2. **State B: Simulated / Demonstration Data (`timeline: "simulated"` or `mode: "mock"`)**
   - Explicitly surfaced in the UI header and dashboard via a persistent warm yellow alert banner: *"Demonstration Timeline: DeepFashion2 capture dates are synthetically assigned according to rule D1."*
3. **State C: Machine Forecast (`yhat`, `lower`, `upper`)**
   - Future data (2026–2028) rendered as dashed curves (`#FFD369`) surrounded by a translucent confidence band (`rgba(255, 211, 105, 0.20)`). Never plotted as solid historical points.

---

## 3. Light Minimalist Color & Surface Architecture

Following user validation and reference dashboard benchmarks (*Beyond UI*, *Beast Insights*, and luxury editorial lookbooks):

```
+-------------------------------------------------------------------------+
| LIGHT MINIMALIST COLOR TOKENS                                           |
|                                                                         |
| [#F8F9FA] --bg-canvas       : Ambient page ground plane                 |
| [#FFFFFF] --surface         : Pure white analytical cards & tables      |
| [#222831] --text-primary    : Deep Charcoal body & headers (14.2:1 AAA) |
| [#393E46] --text-secondary  : Slate Charcoal metadata & captions (8.8:1)|
| [#FFD369] --primary-accent  : Warm Yellow focal points, buttons, curves |
| [rgba(34,40,49,0.08)]       : Crisp structural border lines             |
+-------------------------------------------------------------------------+
```

### Visual Surface Rules:
- **No Heavy Dark Full-Page Backgrounds:** The full page canvas uses `#F8F9FA` or `#EEEEEE`.
- **Pure White Cards:** Analytical cards, tables, charts, and image upload dropzones are rendered on `#FFFFFF` surfaces with 1px subtle borders (`rgba(34, 40, 49, 0.08)`).
- **Hairline Dividers:** In table headers and section splits, borders use `rgba(34, 40, 49, 0.05)`.
- **Restrained Shadows:** Minimalist ambient blur (`0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)`).

---

## 4. Validated Application Navigation & Routing

The application navigation is streamlined to six active, validated routes plus a dynamic cluster intelligence route:

| Route Path | View Name | Functional Capabilities | Data Source |
|---|---|---|---|
| `/` | **Home** | Editorial hero, visual collections, platform KPIs, recent clusters, emerging trends | Static metadata + `/trends` |
| `/explore` | **Explore** | Cluster grid, visual catalog, original vs segmented comparison, attribute tags | `/trends` + `/images/{id}` |
| `/scan` | **Lens Scan** | Drag-and-drop image dropzone, URL search, Visual Similarity Score, top-3 clusters | `POST /similarity` |
| `/trends` | **Trends** | Interactive multi-cluster share trajectories, historical vs forecast toggle | `GET /trends`, `/forecast` |
| `/reports` | **Reports** | Printable executive summaries, methodology documentation, export data tables | `/trends` aggregated |
| `/[domain]/[clusterId]` | **Cluster Report** | In-depth cluster dossier: 12-image contact grid, Prophet forecast curve, MAPE | `GET /forecast?domain=&cluster_id=` |
| `/settings` | **Settings** | API endpoint configuration, model telemetry, theme settings, cache reset | Client local storage |

### Domain Context Switching:
- Persistent Domain Selector in the sidebar: **Fashion (DeepFashion2)** and **Automobiles (Stanford Cars)**.
- Selecting a domain updates global state and dynamically refetches `/trends?domain={domain}` and `/forecast`.

---

## 5. Component Hierarchy & UX Layout Standards

```
┌────────────────────────────────────────────────────────────────────────┐
│ AppLayout                                                              │
│ ┌───────────────┬────────────────────────────────────────────────────┐ │
│ │ Sidebar       │ Header: Domain Toggle [Fashion|Cars] | Search      │ │
│ │ • Brand Logo  ├────────────────────────────────────────────────────┤ │
│ │ • Home        │ Timeline Alert Banner (State B disclosure)         │ │
│ │ • Explore     ├────────────────────────────────────────────────────┤ │
│ │ • Lens Scan   │ Page Content (Light Canvas: #F8F9FA)               │ │
│ │ • Trends      │ ┌────────────────────────────────────────────────┐ │ │
│ │ • Reports     │ │ Analytical Card (#FFFFFF, 1px border)          │ │ │
│ │ • Settings    │ │ ┌──────────────────┐ ┌───────────────────────┐ │ │ │
│ │               │ │ │ Chart / Visual   │ │ KPIs / Meta Table     │ │ │ │
│ │ Status Pill   │ │ └──────────────────┘ └───────────────────────┘ │ │ │
│ │ User Profile  │ └────────────────────────────────────────────────┘ │ │ │
│ └───────────────┴────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```
