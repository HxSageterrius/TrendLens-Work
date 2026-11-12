# AGENTS.md: TrendLens build guide

You are building **TrendLens**, a final year project (BS Computer Science). Read this whole file before writing code. Follow it phase by phase. When this file and a later chat message disagree, ask which one wins.

## 1. What TrendLens is

TrendLens takes product images, turns them into visual embeddings, groups them into style clusters, tracks each cluster's share over time, labels it Emerging, Declining or Stable, forecasts where it is heading, and lets a user upload an image to see which trend it belongs to. Results are published through a public Next.js website.

- Primary domain: **fashion** (DeepFashion2).
- Secondary domain: **cars** (Stanford Cars / CompCars), a smaller proof-of-concept that reuses the same pipeline.
- Selling points to preserve everywhere: works across domains, transparent method, public output, free to use.

## 2. Locked tech stack

Use exactly these. Do not swap, add alternatives, or "upgrade" a tool without asking.

| Concern | Tool |
|---|---|
| Deep learning | PyTorch; CLIP ViT-B/32 (primary) and torchvision ResNet50 (baseline) |
| Clustering | scikit-learn: K-Means (primary), DBSCAN (secondary) |
| Forecasting | Prophet (`prophet` package). LSTM/GRU is a stretch goal only |
| Similarity search | Cosine similarity (NumPy) |
| Backend | FastAPI + Uvicorn |
| Database | PostgreSQL (driver: `psycopg`, plain SQL, no ORM) |
| File storage | Local folders (`data/`) for images and `.npy` embeddings |
| Website and dashboard | Next.js (App Router) + React + TypeScript, in `web/` (already built) |
| Charts | Chart.js via `react-chartjs-2` |
| SEO | Next.js Metadata API, `sitemap.ts`, `robots.ts` (replaces Yoast) |
| Datasets | DeepFashion2 (primary), Stanford Cars / CompCars (secondary) |

Notes:
- Load CLIP weights with Hugging Face `transformers` (`openai/clip-vit-base-patch32`); it runs on PyTorch and is the only extra ML library allowed.
- Do not add pgvector, Elasticsearch, FAISS, Django, WordPress, PHP, or a second backend. Embeddings live in `.npy` files; PostgreSQL holds metadata, clusters and trends.

## 3. Repository layout

The `api/` and `web/` folders already exist with working code (the API returns mock data until Phase 3). Keep their structure and extend them.

```
trendlens/
├── AGENTS.md
├── README.md                 # setup + run instructions (you write this)
├── .env.example              # DATABASE_URL, TRENDLENS_MODE, DATA_DIR
├── data/                     # gitignored
│   ├── raw/{deepfashion2,cars}/
│   ├── embeddings/           # {domain}_{model}.npy + {domain}_ids.json
│   └── processed/
├── ml/
│   ├── config.py             # paths, subset sizes, k range, thresholds
│   ├── prepare_data.py       # sample subset, resize, write images table
│   ├── timeline.py           # assigns a date to every image (see Decision D1)
│   ├── embeddings.py         # CLIP + ResNet embedding extraction
│   ├── cluster.py            # K-Means (+ silhouette k search), DBSCAN
│   ├── trends.py             # share per period + Emerging/Declining/Stable
│   ├── forecast.py           # Prophet per cluster
│   ├── similarity.py         # cosine search
│   └── run_pipeline.py       # CLI: python -m ml.run_pipeline --domain fashion
├── api/
│   ├── main.py               # FastAPI app (exists, mock data)
│   ├── db.py                 # PostgreSQL helpers
│   ├── schema.sql
│   ├── requirements.txt
│   └── tests/
├── web/                      # exists: Next.js app
│   ├── app/                  # layout, home, dashboard, [domain]/[clusterId] reports, sitemap, robots
│   ├── components/Dashboard.tsx
│   └── lib/api.ts
├── notebooks/evaluation.ipynb
└── docs/                     # evaluation results, screenshots, demo script
```

## 4. Ground rules

1. **Work one phase at a time.** For each phase: write a short plan first (Planning mode), implement, run the checks listed under "Done when", then stop and summarize what you did before starting the next phase.
2. **Never fake results.** Mock data is allowed only while `TRENDLENS_MODE=mock`. The API must default to `live` once Phase 3 is done, and the UI must show a visible "Demo data" note whenever the API reports `mode: "mock"` or `timeline: "simulated"`.
3. **Keep the API contract stable** (section 6). The dashboard already depends on it. If you must change it, update `web/lib/api.ts`, `web/components/Dashboard.tsx` and the tests in the same change.
4. **Make everything reproducible.** Fixed random seeds (`SEED = 42` in `ml/config.py`), pinned versions in `requirements.txt`, one command per stage.
5. **Do not commit** datasets, `.npy` files, model weights, `.env`, or secrets. Add them to `.gitignore`.
6. **Keep it small.** Prefer plain functions over class hierarchies. No new frameworks. Add comments only where the reason is not obvious.
7. **Test as you go.** Every ML module gets at least one smoke test on a tiny sample (about 50 images). The API gets pytest tests for each endpoint.
8. **Ask before** deleting existing files, changing the stack, or spending more than a few GB on downloads.

## 5. Decisions already made

**D1. Time axis.** DeepFashion2 has no capture dates, and Prophet needs a time series.
- **Cars:** use the real model year found in Stanford Cars class names (for example "Acura RL Sedan 2012"). Parse the trailing 4-digit year. Set `timeline = "real"`.
- **Fashion:** implement `timeline.py` with two modes, selected by `TIMELINE_MODE` in `.env`:
  - `simulated` (default): assign each image a month between 2021-01 and 2025-12 using a seeded process that is **independent of the cluster result** where possible (for example, order images by a stable random key and apply a fixed, documented drift rule). Document the rule in `docs/timeline.md`. Mark every response with `timeline: "simulated"`.
  - `dated`: read a `date` column from a CSV the team supplies (scraped or collected dated images).
- The final report must say clearly whether the fashion timeline is simulated. Do not hide this in code.

**D2. Granularity.** Compute cluster share per **month** (60 points) so Prophet has enough data. The API returns **yearly** values (mean monthly share per year) and a yearly forecast.

**D3. Cluster naming.** Clusters start as "Style N". Provide `data/processed/{domain}_cluster_names.json` where the team can rename them after inspecting sample images. The pipeline writes a contact sheet (a grid of 12 sample images per cluster) to `docs/clusters/{domain}/` to make naming easy.

**D4. Trend label rule** (single source of truth, in `ml/trends.py`, imported by the API): using yearly share, `delta = last_year - first_year` in percentage points. `delta > 5` is Emerging, `delta < -5` is Declining, otherwise Stable.

**D5. Role of DBSCAN.** Trends and forecasts are computed on K-Means clusters only. DBSCAN (cosine metric on L2-normalized embeddings) is run for comparison and to flag outlier images; report cluster counts and noise ratio in the evaluation.

**D6. Data size.** Use a configurable subset: default 5,000 fashion images and 3,000 car images (`ml/config.py`). Full datasets are too large for the timeline. Use a GPU if available, otherwise run on CPU with batch size 32.

## 6. API contract

Base URL from the dashboard setting (default `http://localhost:8000`). All responses are JSON. Add `mode` ("mock" or "live") and `timeline` ("real", "simulated" or "dated") to `/trends` and `/forecast` responses.

| Method and path | Purpose | Response shape |
|---|---|---|
| `GET /trends?domain=fashion\|cars` | All clusters with trend labels | `{domain, years, mode, timeline, clusters:[{cluster_id, name, label, share:[...]}]}` |
| `GET /forecast?domain=&cluster_id=` | History and forecast for one cluster | `{cluster_id, name, label, history:[{year, share}], forecast:[{year, yhat, lower, upper}]}` |
| `POST /similarity?domain=` | Multipart image upload (`file`) | `{matches:[{cluster_id, name, label, score}]}` (top 3 clusters) |
| `GET /health` | Liveness check | `{status:"ok", mode}` |

Stretch (only after Phase 5): `GET /images/{id}` to serve images, and add `similar_images:[{image_id, score}]` to the `/similarity` response.

Errors: 404 for an unknown domain or cluster, 400 for an empty or non-image upload. Limit uploads to 5 MB.

## 7. Database schema (`api/schema.sql`)

```sql
CREATE TABLE images (
  id SERIAL PRIMARY KEY,
  domain TEXT NOT NULL,          -- 'fashion' | 'cars'
  path TEXT NOT NULL,
  taken_on DATE NOT NULL,        -- real, dated or simulated (see D1)
  embed_index INT NOT NULL       -- row in the .npy embeddings file
);
CREATE TABLE clusters (
  domain TEXT NOT NULL,
  cluster_id INT NOT NULL,
  name TEXT NOT NULL,
  PRIMARY KEY (domain, cluster_id)
);
CREATE TABLE image_clusters (
  image_id INT REFERENCES images(id),
  algo TEXT NOT NULL,            -- 'kmeans' | 'dbscan'
  cluster_id INT NOT NULL,       -- -1 = DBSCAN noise
  PRIMARY KEY (image_id, algo)
);
CREATE TABLE trends (
  domain TEXT NOT NULL,
  cluster_id INT NOT NULL,
  year INT NOT NULL,
  share REAL NOT NULL,           -- percent of that year's images
  label TEXT NOT NULL,           -- emerging | declining | stable
  PRIMARY KEY (domain, cluster_id, year)
);
CREATE TABLE forecasts (
  domain TEXT NOT NULL,
  cluster_id INT NOT NULL,
  year INT NOT NULL,
  yhat REAL NOT NULL, lower REAL NOT NULL, upper REAL NOT NULL,
  PRIMARY KEY (domain, cluster_id, year)
);
```

## 8. Phases

### Phase 0: Setup (day 1)
1. Create a Python 3.11+ virtual environment and `api/requirements.txt` (fastapi, uvicorn, python-multipart, psycopg[binary], numpy, pandas, scikit-learn, torch, torchvision, transformers, pillow, prophet, pytest, httpx).
2. Create the PostgreSQL database `trendlens`, apply `schema.sql`, and add `.env.example`.
3. Add `.gitignore`, a `README.md` with setup steps, and `ml/config.py`.

**Done when:** `uvicorn api.main:app` still serves the mock endpoints, `psql` shows all five tables, and `README.md` has working setup commands.

### Phase 1: Data and embeddings (weeks 1–4)
1. `prepare_data.py`: sample the configured subset with the fixed seed, skip unreadable files, resize to 224x224, insert rows into `images`.
2. `timeline.py`: implement D1 and fill `taken_on`.
3. `embeddings.py`: extract L2-normalized CLIP and ResNet50 embeddings in batches, save to `data/embeddings/`, and record `embed_index`.
4. `cluster.py`: K-Means with k searched over 4–10 by silhouette score; DBSCAN with an eps search on cosine distance; write both to `image_clusters` and the chosen k to the log.
5. Generate the contact sheets (D3).

**Done when:** `python -m ml.run_pipeline --domain fashion --stage cluster` completes on the full subset, the tables are populated, contact sheets exist, and a notebook cell shows silhouette scores for CLIP vs ResNet.

### Phase 2: Trends, forecasting and similarity (weeks 5–8)
1. `trends.py`: monthly share per cluster, yearly rollup, D4 labels, write to `trends`.
2. `forecast.py`: fit Prophet on the monthly share per cluster (linear growth, no weekly seasonality), forecast 36 months, roll up to yearly `yhat/lower/upper`, write to `forecasts`. Hold out the last 6 months to compute MAPE per cluster.
3. `similarity.py`: embed a query image with CLIP, compute cosine similarity against all stored embeddings, aggregate the top 50 neighbours by cluster, return the top 3 clusters with scores.

**Done when:** `run_pipeline --domain fashion` runs all stages end to end; every cluster has a label and a forecast; a unit test shows an image from a cluster retrieves its own cluster as the top match for most sampled images.

### Phase 3: Backend (weeks 5–8, in parallel with Phase 2)
1. `db.py`: connection helper and the read queries for trends and forecasts.
2. Replace the three `TODO` functions in `api/main.py` (`get_clusters`, `make_forecast`, `find_similar`) with the real implementations. Keep the mock path behind `TRENDLENS_MODE=mock`.
3. Load the CLIP model once at startup, not per request.
4. Add `/health`, upload validation (type and 5 MB limit), and pytest tests for every endpoint in both modes.
5. Replace `allow_origins=["*"]` with the website origin from `.env` (`WEB_ORIGIN`).

**Done when:** `pytest` passes, and `curl` against `/trends`, `/forecast` and `/similarity` returns real data in `live` mode.

### Phase 4: Cars proof-of-concept (week 9)
1. Run the same pipeline with `--domain cars` using real model years (D1). No new modules; only config changes. If something needs a code change for cars, fix it generically rather than forking.
2. Confirm the dashboard's Cars tab shows real clusters.

**Done when:** `run_pipeline --domain cars` succeeds with the same code path, and both domains work from one API.

### Phase 5: Website (weeks 10-11)
1. In `web/`, run `npm install`, then `npm run dev`. Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SITE_URL` in `.env.local`.
2. The dashboard already shows a notice when the API reports `mode: "mock"` or `timeline: "simulated"`. Keep it, and make sure `/trends` returns both fields in live mode.
3. Keep the existing features: domain tabs, trend list, forecast chart with range band, image upload with similarity results. Check layouts at 375 px and 1280 px widths and keyboard navigation.
4. Public pages: Home (what TrendLens is, with links to every trend report), Dashboard, one server-rendered report per cluster at `/{domain}/{clusterId}`, and an About/Method page that explains the pipeline, datasets and the timeline decision (D1). Each page needs a unique title and description (Metadata API). Add JSON-LD if time allows.
5. Enrich reports from pipeline output: cluster sample images (via the stretch `/images/{id}` endpoint), label, forecast table.
6. Deploy: the API (Uvicorn) and website (`npm run build && npm start`) on one machine or a free-tier host; confirm `/sitemap.xml` and `/robots.txt` load.

**Done when:** `npm run build` passes with no errors, every page loads with the API running in live mode, the sitemap lists all cluster reports, Lighthouse SEO and accessibility scores are 90 or higher on Home and one report page, and the site works at desktop and mobile widths.

### Phase 6: Evaluation, testing and report (week 12)
1. In `notebooks/evaluation.ipynb`, report: silhouette (CLIP vs ResNet), K-Means k and DBSCAN cluster count and noise ratio, Prophet MAPE per cluster, and similarity top-1 and top-3 cluster accuracy on held-out images.
2. Run an end-to-end test from a clean clone using only `README.md`.
3. Write `docs/demo-script.md`: a 5-minute walkthrough (choose domain, open a cluster, read the forecast, upload an image).
4. Save screenshots of the dashboard in `docs/`.

**Done when:** all numbers above are in the notebook and `docs/`, and the demo script has been followed once without errors.

## 9. Final acceptance checklist

- [ ] Stack matches section 2; no extra frameworks added.
- [ ] `TRENDLENS_MODE=live` is the default and uses real pipeline output.
- [ ] The simulated or real timeline status is visible in the UI and documented.
- [ ] All three endpoints plus `/health` pass tests.
- [ ] Both domains work through one API and one dashboard.
- [ ] Public Next.js site has Home, Dashboard, per-cluster reports and About/Method, with unique titles, sitemap and robots.
- [ ] `README.md` lets a new person run everything from a clean clone.
- [ ] No datasets, weights or secrets are committed.

## 10. When you get stuck

State the blocker, the two most reasonable options and your recommendation, then wait for an answer. Do not silently change the stack, lower the dataset size, or replace real output with mock data.
