# TrendLens — A Multi-Genre AI-Powered Visual Trend Analysis & Forecasting Platform

**BSCS Final Year Project (FYP)**

---

## 📌 Project Overview

**TrendLens** is an AI-powered visual trend analysis and forecasting platform. The platform analyzes product images across different domains (starting with **Fashion** and later demonstrating a proof-of-concept in **Automobiles**), extracts deep visual features, groups visually similar products into clusters, tracks how clusters evolve over time, forecasts trend trajectory, and allows users to match new images against active trends.

> **Data provenance:** The fashion catalog is *not* the official DeepFashion2 dataset. It is a catalog assembled for this project in the DeepFashion2 annotation format (13 categories, shop/user pairs, bounding boxes), using Unsplash stock photography with hand-authored annotations (see `scripts/build_deepfashion2_dataset.py`). The weekly fashion trend series is simulated. The automobile side uses a 45-image subset of the real Stanford Cars dataset. Dashboard figures are computed from these catalogs and outputs at request time; no benchmark accuracy figures are reported, because no measured Top-K retrieval results are committed in this repository yet.

---

## 🚀 Core Pipeline

```text
Product Images
      │
      ▼
1. Preprocessing (Resize, Normalize, Data Validation)
      │
      ▼
2. Visual Feature Extraction (ResNet embeddings)
      │
      ▼
3. Visual Clustering (K-Means; DBSCAN is implemented in the cluster
   engine but not yet wired into the pipeline)
      │
      ▼
4. Trend Identification & Temporal Aggregation
      │
      ▼
5. Time-Series Forecasting (Prophet, with a statistical fallback)
      │
      ▼
6. Similarity Engine (Cosine Similarity matching)
      │
      ▼
7. Application Layer (FastAPI Backend + Web Dashboard,
   with data stored in CSV / JSON files)
```

---

## 🛠️ Technology Stack

- **Languages:** Python (Core Engine & Backend), JavaScript (Web Presentation)
- **Deep Learning / Vision:** PyTorch, torchvision (ResNet-18 / ResNet-50)
- **Machine Learning & Analytics:** scikit-learn (K-Means, Cosine Similarity, silhouette evaluation; DBSCAN available in the cluster engine), Prophet (Time-series, with a statistical fallback)
- **Backend API:** FastAPI, Uvicorn, Pydantic
- **Data Storage:** CSV and JSON files, read with pandas (no database server is used)
- **Web Dashboard:** HTML, CSS and JavaScript in `web/`, with Chart.js loaded from a CDN
- **Testing & Code Quality:** pytest (API tests use FastAPI's `TestClient`, which requires `httpx`)

**Planned / not yet implemented:** CLIP embeddings, a PostgreSQL database, WordPress/PHP reporting, and the CompCars dataset. These are not part of the current codebase.

---

## 📂 Project Structure

```text
trendlens/
├── data/
│   ├── raw/                 # Reserved for original dataset downloads (currently empty)
│   ├── processed/           # Reserved for resized and cleaned images (currently empty)
│   ├── fashion_trends/      # Fashion catalog: images, annotations, metadata, trend series
│   ├── automotive/          # Automobile POC data (45 Stanford Cars images, embeddings, forecasts)
│   ├── embeddings/          # Fashion feature vectors (.npy, generated on first API startup
│   │                        # if missing) + metadata CSV
│   ├── forecasts/           # Cluster summaries and trend forecast outputs (JSON)
│   └── samples/             # Small test images for unit testing
├── models/                  # Trained K-Means cluster models (.joblib);
│                            # ResNet weights are downloaded by torchvision at runtime
├── src/
│   ├── preprocessing/       # Module 1: Image loading, metadata parsing, dataset adapters
│   ├── embeddings/          # Module 2: ResNet feature extraction
│   ├── clustering/          # Module 3: K-Means clustering (DBSCAN method included)
│   ├── forecasting/         # Module 4: Time-series trend forecasting (Prophet + fallback)
│   ├── similarity/          # Module 5: Image search and cosine similarity matching
│   ├── api/                 # Module 6: FastAPI endpoints and schemas
│   ├── pipeline_runner.py   # Fashion pipeline: embeddings → clustering → forecasting
│   └── automotive_pipeline_runner.py  # Automobile POC pipeline runner
├── web/                     # Module 7: Web dashboard (index.html, app.js, style.css, assets/)
├── scripts/                 # Dataset builder / download scripts (see Data provenance)
├── tests/                   # Automated unit & integration tests per module
├── health_check.py          # Repository / data diagnostic script
├── .gitignore               # Ignore rules for large data and generated embeddings
├── requirements.txt         # Project dependencies
└── README.md                # Project documentation
```

---

## 📋 Module Development Roadmap

| Module | Name | Focus / Deliverable | Status |
| :---: | :--- | :--- | :---: |
| **0** | **Environment & Foundation** | Git setup, virtual env, folder layout, dependency verification | 🟢 *Completed* |
| **1** | **Dataset & Preprocessing** | DeepFashion2-schema fashion catalog (Unsplash photography, hand-authored annotations) & TrendVerse-aligned sample builder | 🟢 *Completed* |
| **2** | **Visual Feature Extraction** | ResNet-18 / CNN feature extractor & L2-normalized 512-dim embedding export | 🟢 *Completed* |
| **3** | **Visual Clustering** | K-Means clustering, silhouette evaluation, centroid exemplars; DBSCAN implemented in the cluster engine but not yet integrated into the pipeline | 🟢 *Completed (K-Means)* |
| **4** | **Trend Identification & Forecasting** | Time-series engagement trajectory on the simulated fashion series, Prophet & seasonal statistical forecasting; forecasting is disabled for automobiles because production year is not a valid time axis | 🟢 *Completed* |
| **5** | **Similarity Matching Engine** | Cosine similarity ranking, image-to-item & item-to-item visual recommendation | 🟢 *Completed* |
| **6** | **FastAPI Backend & REST API** | REST API endpoints for trends, forecasts, clusters, and image upload search | 🟢 *Completed* |
| **7** | **Interactive Web Dashboard** | Modern glassmorphic web dashboard (Chart.js, cluster explorer, visual matcher) | 🟢 *Completed* |
| **8** | **Automobile POC (Secondary)** | Validated pipeline applied to a 45-image Stanford Cars smoke-test subset, with embeddings, clustering and similarity search. A full Stanford Cars run and CompCars are not included | 🟢 *Completed (POC)* |

---

## 🚀 Running the Project

### 1. (Optional) Rebuild the Fashion Pipeline Outputs

```powershell
.\.venv\Scripts\python.exe src/preprocessing/trendverse_data_builder.py
.\.venv\Scripts\python.exe src/pipeline_runner.py
```

> This is no longer required before starting the server: `data/embeddings/fashion_embeddings.npy` is generated output and is not committed, so on first startup the API now builds the fashion embeddings from the catalog automatically (it downloads the ResNet-18 weights and may take a minute). Set `TRENDLENS_SKIP_EMBEDDING_BUILD=1` to disable that auto-build.

### 2. Run Test Suite

```powershell
.\.venv\Scripts\pytest.exe tests/ -v
```

### 3. Start the Web Dashboard & API Server

```powershell
.\.venv\Scripts\python.exe -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000
```

Open **[http://127.0.0.1:8000](http://127.0.0.1:8000)** in your browser to access the live dashboard!
