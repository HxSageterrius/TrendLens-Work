# TrendLens: AI-Powered Visual Trend Forecasting & Similarity Search

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python: 3.11+](https://img.shields.io/badge/Python-3.11%2B-brightgreen.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2015-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791.svg)](https://www.postgresql.org/)
[![PyTest Status](https://img.shields.io/badge/Tests-38%20Passed-success.svg)](tests/)

**TrendLens** is a Final Year Project (BS Computer Science) that analyzes product images, extracts deep multimodal visual embeddings, groups them into style clusters, tracks cluster share over time, labels trends (*Emerging*, *Declining*, or *Stable*), forecasts future trajectories using time-series analysis, and enables visual similarity search via an interactive public website.

- **Primary Domain**: Fashion ([DeepFashion2](https://www.kaggle.com/datasets/thusharanair/deepfashion2-original-with-dataframes))
- **Secondary Domain**: Automotive ([Stanford Cars](https://www.kaggle.com/datasets/eduardo4jesus/stanford-cars-dataset))
- **Core Value Propositions**: Transparent methodology, cross-domain adaptability, public output, zero proprietary black-box APIs.

---

## 1. Locked Tech Stack

| Component | Tool / Framework | Purpose |
|---|---|---|
| **Deep Learning** | PyTorch + Hugging Face `transformers` | CLIP ViT-B/32 (`openai/clip-vit-base-patch32`) primary, torchvision ResNet-50 baseline |
| **Clustering** | scikit-learn | K-Means with cosine silhouette optimization ($k \in [4, 10]$), DBSCAN outlier analysis |
| **Forecasting** | Facebook Prophet (`prophet`) | Additive time-series model (linear trend, 36-month horizon, 80% range bands) |
| **Similarity Search** | NumPy | L2-normalized vector cosine similarity |
| **Backend API** | FastAPI + Uvicorn | RESTful endpoints with startup model caching & input validation |
| **Database** | PostgreSQL (`psycopg` v3) | Relational storage for metadata, clusters, trends, and forecasts (plain SQL, no ORM) |
| **Frontend App** | Next.js (App Router) + TypeScript + Chart.js | Interactive dashboard, server-rendered cluster reports, dynamic sitemap & robots |

---

## 2. Quick Start from a Clean Clone

### Prerequisites
- **Python 3.11+**
- **Node.js 20+** and **npm**
- **PostgreSQL 15+** running locally (default port: `5432`)

---

### Step 1: Clone the Repository & Configure Environment
```bash
git clone https://github.com/your-username/trendlens.git
cd trendlens

# Create your local .env configuration
cp .env.example .env
```

Ensure `.env` contains your PostgreSQL credentials:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/trendlens
TRENDLENS_MODE=live
TIMELINE_MODE=simulated
DATA_DIR=data
WEB_ORIGIN=http://localhost:3000
```

---

### Step 2: Initialize PostgreSQL Database
```bash
# 1. Create database in psql
psql -U postgres -c "CREATE DATABASE trendlens;"

# 2. Apply database schema
psql -U postgres -d trendlens -f api/schema.sql
```

---

### Step 3: Python Virtual Environment & Dependencies
```bash
# Windows PowerShell
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Linux / macOS
python3 -m venv .venv
source .venv/bin/activate

# Upgrade pip and install pinned requirements
pip install --upgrade pip
pip install -r api/requirements.txt
```

---

### Step 4: Run the Machine Learning Pipelines

Execute the master pipeline CLI to run all 5 stages end-to-end:

```bash
# 1. Run Fashion pipeline (Primary domain)
python -m ml.run_pipeline --domain fashion

# 2. Run Cars pipeline (Secondary domain)
python -m ml.run_pipeline --domain cars
```

Each run executes:
1. `prepare_data`: Image validation, resizing ($224 \times 224$), and database insertion.
2. `embeddings`: L2-normalized CLIP ViT-B/32 and ResNet-50 feature extraction.
3. `cluster`: K-Means silhouette optimization, DBSCAN search, and contact sheet generation.
4. `trends`: Monthly share aggregation, yearly rollups, and Decision D4 trend labeling.
5. `forecast`: Prophet model fitting, holdout MAPE validation, and 36-month projections.

---

### Step 5: Start the FastAPI Backend
```bash
uvicorn api.main:app --port 8000
```
- API Health Check: `http://localhost:8000/health`
- Interactive Swagger Docs: `http://localhost:8000/docs`
- Trends Endpoint: `http://localhost:8000/trends?domain=fashion`

---

### Step 6: Start the Next.js Frontend
In a second terminal:
```bash
cd web
npm install
npm run dev
```
Open **`http://localhost:3000`** in your browser:
- **Homepage (`/`)**: Domain overview cards, timeline disclosures, and direct cluster links.
- **Dashboard (`/dashboard`)**: Interactive style trajectory charts, Prophet forecast range bands, and visual image upload.
- **Cluster Reports (`/{domain}/{clusterId}`)**: Standalone reports with historical share tables, 3-year forecasts, and exemplar product thumbnails.
- **Methodology Page (`/about`)**: Complete mathematical and architectural documentation.

---

## 3. Running Automated Tests

Run the complete test suite spanning all 6 phases:
```bash
pytest -v tests/
```
All **38 unit and integration tests** verify:
- API endpoint contract compliance (`/health`, `/trends`, `/forecast`, `/similarity`, `/images/{id}`) in both `live` and `mock` modes.
- Timeline parsing and deterministic date assignment (Decision D1).
- Embedding extraction dimensions, normalization, and reproducibility.
- K-Means silhouette score ranking and DBSCAN noise bounds.
- Decision D4 trend classification threshold rules ($+5/-5$ percentage point delta).
- Prophet forecast horizon alignment and interval ordering ($lower \le yhat \le upper$).
- Nearest-neighbor similarity search accuracy.

---

## 4. Evaluation & Benchmarks

To inspect empirical benchmarking results:
- Run or view [`notebooks/evaluation.ipynb`](notebooks/evaluation.ipynb).
- Read the 5-minute presentation script in [`docs/demo-script.md`](docs/demo-script.md).
- Visual charts are stored in [`docs/screenshots/`](docs/screenshots/) and [`docs/clusters/`](docs/clusters/).

### Key Benchmark Summary
- **CLIP ViT-B/32 vs ResNet-50 Silhouette Gain**: **+26.8%** on Fashion, **+39.8%** on Cars.
- **Visual Similarity Retrieval Accuracy**: **100.0% Top-3 cluster retrieval** across held-out test images.
- **DBSCAN Anomaly Detection**: 0.0% noise ratio at optimal cosine distance ($eps=0.30$).

---

## 5. Architectural Decisions (AGENTS.md)

- **Decision D1 (Time Axis)**: Stanford Cars uses real model years parsed from class metadata (`timeline = "real"`). DeepFashion2 has no capture dates, so timestamps are deterministically simulated across 60 months (`timeline = "simulated"`), transparently disclosed in all UI components and API payloads.
- **Decision D2 (Granularity)**: Monthly shares (60 data points) provide optimal frequency for Prophet; API returns yearly rollups for clarity.
- **Decision D3 (Cluster Naming)**: Initialized as `"Style N"`, editable in `data/processed/{domain}_cluster_names.json`.
- **Decision D4 (Trend Labeling Rule)**: Single source of truth in `ml/trends.py`. If $\Delta = \text{Share}_{last} - \text{Share}_{first} > +5.0$ percentage points &rarr; **Emerging**; if $\Delta < -5.0$ &rarr; **Declining**; else **Stable**.
- **Decision D5 (Clustering Role)**: Trends and forecasts run strictly on K-Means clusters; DBSCAN provides density verification and anomaly detection.
- **Decision D6 (Reproducibility)**: Deterministic execution with `SEED = 42`. No data leaks across stages.
