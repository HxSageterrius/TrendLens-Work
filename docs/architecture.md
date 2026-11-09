# TrendLens — Architecture

## High-Level Pipeline

```text
Product Images
      │
      ▼
1. Preprocessing        src/preprocessing/    image loading/validation, dataset adapters
      │
      ▼
2. Feature Extraction   src/embeddings/       ResNet-18 (ImageNet), 512-d L2-normalized
      │
      ▼
3. Visual Clustering    src/clustering/       K-Means (silhouette-selected K)
      │                                       + DBSCAN density/outlier check alongside
      ▼
4. Trend Forecasting    src/forecasting/      Prophet (90% CI, weekly) with a
      │                                       statistical seasonal fallback
      ▼
5. Similarity Engine    src/similarity/       brute-force cosine Top-K matching
      │
      ▼
6. API Layer            src/api/main.py       FastAPI; CSV/JSON storage (no DB server)
      │
      ▼
7. Web Dashboard        web/                  vanilla JS SPA + Chart.js
```

## Module Map

| Module | Key files | Responsibility |
|---|---|---|
| Preprocessing | `image_loader.py`, `metadata.py`, `deepfashion2_adapter.py`, `automotive_adapter.py`, `dataset.py` | EXIF-safe loading, 224px ImageNet-normalized transforms, DeepFashion2-schema parsing, Stanford Cars adapter, canonical `DEEPFASHION2_CATEGORIES` map |
| Embeddings | `extractor.py` | `FeatureExtractor` (ResNet-18 default, ResNet-50 optional), batched catalog extraction, `.npy`/`.csv` persistence |
| Clustering | `cluster_engine.py` | `VisualClusterEngine` (KMeans with silhouette K-search, DBSCAN, per-cluster exemplars), `build_dbscan_summary` |
| Forecasting | `trend_forecaster.py` | `TrendForecaster` (Prophet + quadratic/sinusoidal fallback, per-(style, horizon) cache invalidated on CSV mtime) |
| Similarity | `similarity_engine.py` | Cosine Top-K by image / vector / item_id with self-exclusion |
| Pipelines | `pipeline_runner.py`, `automotive_pipeline_runner.py`, `pipeline_common.py` | Genre runners over shared steps in `pipeline_common.py` |
| API | `api/main.py` | FastAPI app, genre-aware endpoints, lazy thread-safe resource loading, static mounts |
| Web | `web/app.js`, `web/index.html`, `web/style.css` | Dashboard SPA; all data via same-origin `/api/*` |

## Data Flow & Artifacts

**Fashion** (`src/pipeline_runner.py`):
- reads `data/fashion_trends/fashion_posts_metadata.csv`, `data/fashion_trends/insta_fashion_trends.csv`
- writes `data/embeddings/fashion_embeddings.npy` + `fashion_metadata.csv`,
  `models/cluster_model.joblib`,
  `data/forecasts/clusters_summary.json`, `dbscan_summary.json` (eps=0.30), `trend_forecasts.json`

**Automotive** (`src/automotive_pipeline_runner.py`):
- builds catalog from the hardcoded 45-image Stanford Cars manifest (`data/automotive/smoke_test/`)
- writes `data/automotive/embeddings/`, `models/automotive_cluster_model.joblib`,
  `data/automotive/forecasts/automotive_clusters_summary.json`, `automotive_dbscan_summary.json` (eps=0.2),
  `automotive_forecast_status.json` (forecasting disabled by design)

**API startup** (`src/api/main.py`): `load_app_resources()` loads both genres once per process
(thread-safe, guarded by `_resources_lock`); if fashion embeddings are missing or row-mismatched
with the catalog, they are rebuilt automatically (opt out with `TRENDLENS_SKIP_EMBEDDING_BUILD=1`).

## Key Design Decisions

1. **ResNet-18 over heavier backbones** — 512-d embeddings are sufficient for 43–45 item catalogs
   and keep CPU inference fast. ResNet-50 (2048-d) is supported via `backbone_name="resnet50"`.
2. **DBSCAN alongside K-Means, not instead of it** — K-Means gives the taxonomy; DBSCAN (cosine
   metric, per-catalogue `eps`) reports density mass and outliers as a sanity check.
3. **Forecasting disabled for automobiles** — `model_year` is production year, not a trend signal;
   the API serves a structured `forecasting_disabled` placeholder instead of a fabricated chart.
4. **File-based storage (CSV/JSON/numpy)** — no database server for the demo scale (N ≤ 45);
   all artifacts are regenerable by the runners.
5. **Cached forecasts** — Prophet fits are memoized per `(style, horizon)` and invalidated when
   the source CSV changes, so API calls don't refit models per request.

## Running

```powershell
# optional rebuild of fashion outputs
.\.venv\Scripts\python.exe src/pipeline_runner.py

# tests
.\.venv\Scripts\pytest.exe tests/ -v

# diagnostics (exit code 1 on failure)
.\.venv\Scripts\python.exe health_check.py

# server + dashboard
.\.venv\Scripts\python.exe -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000
```
