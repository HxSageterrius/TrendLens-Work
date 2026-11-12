# TrendLens User Flows & Interaction Workflows

> **Status:** Phase 3.1 Architecture Validation & Refinement  
> **Theme:** Light Minimalist Editorial & Visual Analytics  

---

## 1. Flow 1: Visual Trend Discovery & Forecasting Exploration

```mermaid
flowchart TD
    A[User lands on Home Page] --> B{Choose Domain}
    B -->|Fashion| C1[Set domain = 'fashion']
    B -->|Automobiles| C2[Set domain = 'cars']
    C1 --> D[Fetch /trends?domain=fashion]
    C2 --> D[Fetch /trends?domain=cars]
    D --> E[Display KPI Cards & Trending Lookbook]
    E --> F[User clicks 'Explore Trends']
    F --> G[Navigate to /trends]
    G --> H[Render HistoryForecastChart with solid historical & dashed Prophet curve]
    H --> I[User clicks specific cluster e.g., Style 1]
    I --> J[Navigate to /[domain]/[clusterId]]
    J --> K[Render 12-image contact sheet & single-cluster MAPE / 36-mo forecast]
```

---

## 2. Flow 2: Google Lens-Style Visual Similarity Search (`/scan`)

```mermaid
flowchart TD
    A[User opens /scan] --> B[User selects domain: Fashion or Cars]
    B --> C{Input Method}
    C -->|File Upload| D1[Drag & drop or select image file <= 5MB]
    C -->|Image URL| D2[Paste external image URL]
    D1 --> E[Client-side preview & MIME validation]
    D2 --> E
    E --> F[User clicks 'Run Visual Scan']
    F --> G[POST /similarity with multipart/form-data]
    G --> H[FastAPI embeds image with CLIP ViT-B/32]
    H --> I[Compute cosine similarity matrix dot-product]
    I --> J[Aggregate top-50 neighbors by cluster]
    J --> K[Return top 3 cluster matches with Visual Similarity Scores]
    K --> L[Render SimilarityResultCard with percentage score & non-guarantee disclaimer]
    L --> M[User clicks matched cluster to open cluster dossier]
```

---

## 3. Flow 3: Academic Evaluation & Report Export (`/reports`)

```mermaid
flowchart TD
    A[User navigates to /reports] --> B[Display Model Telemetry & Hyperparameters]
    B --> C[Display Silhouette comparison: CLIP ViT-B/32 vs ResNet-50]
    C --> D[Display K-Means k-search and DBSCAN noise ratio]
    D --> E[Display Prophet Hold-out MAPE metrics per cluster]
    E --> F[User selects 'Export JSON Data' or 'Print PDF Report']
```
