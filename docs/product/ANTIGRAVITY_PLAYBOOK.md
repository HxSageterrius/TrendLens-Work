# Antigravity playbook for TrendLens

How to drive Antigravity through the build using `AGENTS.md`. Paste the prompts in order. Menu names can differ slightly between Antigravity versions.

## Part 1: One-time setup (before the agent writes anything)

**Install on your machine**
- Python 3.11+, Node.js 20+, PostgreSQL 15+, Git.
- A Kaggle account (to download the datasets yourself).

**Get the datasets (you do this, not the agent)**
- DeepFashion2: https://www.kaggle.com/datasets/thusharanair/deepfashion2-original-with-dataframes
- Stanford Cars: https://www.kaggle.com/datasets/eduardo4jesus/stanford-cars-dataset
- Unzip into `trendlens/data/raw/deepfashion2/` and `trendlens/data/raw/cars/`. Never give the agent your Kaggle password or token.

**Set up the workspace**
1. Put the whole `trendlens/` folder somewhere permanent, for example `Documents/trendlens`.
2. Run `git init` inside it, then `git add . && git commit -m "Initial scaffold"`.
3. Open that folder as a workspace in Antigravity.
4. Check the rules loaded. Start a new task and ask: *"List the 8 ground rules and the locked tech stack from AGENTS.md."* If it cannot, confirm `AGENTS.md` is in the workspace root and start a fresh task.

**Agent settings (safe defaults)**
- Use **Planning mode**, so it writes a plan you can read before it codes.
- Keep terminal commands on **ask for approval** (not auto-run) until you trust it. Always read commands that delete files, install system packages, or touch the database.
- Run one task at a time. Parallel agents editing the same files cause conflicts.

## Part 2: The loop for every phase

1. Paste the phase prompt.
2. Read the **plan** it produces. Reject or correct it if it breaks the stack, skips a "Done when" check, or invents extra features.
3. Approve, let it work, and answer its questions.
4. Run the "Done when" checks **yourself** in a terminal. Do not rely only on its summary.
5. If it works, run `git add . && git commit -m "Phase N done"`.
6. Only then start the next phase.

## Part 3: Prompts

### Phase 0: Setup
```
Read AGENTS.md fully. Do Phase 0 only.
First write a short plan. Then: create the Python virtual environment, api/requirements.txt, api/schema.sql, .env.example, .gitignore, ml/config.py and README.md setup steps. Tell me the exact commands to create the PostgreSQL database and apply schema.sql; do not run commands that change the database until I approve them.
When done, run the "Done when" checks for Phase 0 and report results. Do not start Phase 1.
```
Check: `uvicorn api.main:app` serves the mock data; `psql` shows the five tables.

### Phase 1a: Data preparation
```
Do Phase 1, tasks 1 and 2 only (prepare_data.py and timeline.py). Follow Decision D1 and D6 in AGENTS.md. Use the dataset folders under data/raw/. First inspect the folder structure and tell me what you found before writing code. Add a smoke test on 50 images. Do not touch embeddings or clustering yet.
```
Check: the `images` table has rows; fashion shows a simulated timeline; cars years are parsed from class names.

### Phase 1b: Embeddings
```
Do Phase 1, task 3 only (embeddings.py). CLIP ViT-B/32 through Hugging Face transformers is primary and torchvision ResNet50 is the baseline. L2-normalize all vectors, process in batches of 32, use the GPU if available, and save progress so a crash does not restart from zero. Run it on 50 images first, show me the output shapes and timing, then wait for my approval before running on the full subset.
```
Check: shapes are (N, 512) for CLIP and (N, 2048) for ResNet50; the time estimate for the full subset is reasonable. If it is too slow, lower the subset size in `ml/config.py` instead of changing the model.

### Phase 1c: Clustering
```
Do Phase 1, tasks 4 and 5 (cluster.py and the contact sheets). K-Means with k from 4 to 10 chosen by silhouette score, DBSCAN with a cosine eps search. Write results to image_clusters. Create the contact sheets in docs/clusters/. Show me the silhouette scores for CLIP vs ResNet50 and the chosen k.
```
Check: open the contact sheets, then **rename clusters** in `data/processed/fashion_cluster_names.json` based on what you see.

### Phase 2a: Trends
```
Do Phase 2, task 1 (trends.py). Follow Decisions D2 and D4 exactly: monthly share, yearly rollup, the +5 / -5 point rule. Write to the trends table and add tests with a tiny hand-made dataset where the expected labels are obvious.
```

### Phase 2b: Forecasting
```
Do Phase 2, task 2 (forecast.py) with Prophet. Linear growth, no weekly seasonality, 36-month forecast rolled up to yearly values, with a 6-month holdout to compute MAPE per cluster. Print a table of MAPE per cluster and write forecasts to the forecasts table.
```
Check: the forecast values are plausible (not negative or exploding); MAPE is reported honestly even if it is high.

### Phase 2c: Similarity
```
Do Phase 2, task 3 (similarity.py). Cosine similarity with NumPy against stored CLIP embeddings; aggregate the top 50 neighbours by cluster and return the top 3 clusters with scores. Add a test: for 30 sampled images, report how often their own cluster is the top match.
```

### Phase 3: Backend
```
Do Phase 3. Replace the three TODO functions in api/main.py with real implementations that read from PostgreSQL and use ml/similarity.py. Keep mock mode behind TRENDLENS_MODE=mock and make live the default. Load CLIP once at startup. Add /health, upload validation (image type, 5 MB), and pytest tests for every endpoint in both modes. Show me curl commands I can run to check each endpoint.
```
Check: run the `curl` commands; `pytest` passes; the dashboard shows real clusters.

### Phase 4: Cars
```
Do Phase 4. Run the same pipeline for cars using real model years. Do not fork the code; if something needs changing, fix it generically and tell me what changed. Confirm both domains work through one API.
```

### Phase 5: Website
```
Do Phase 5. The Next.js app already exists in web/. Install dependencies, run npm run build, then complete the About/Method page, make sure /trends returns mode and timeline in live mode, and polish the layout at 375px and 1280px. Use the browser to verify the dashboard works: switch domains, select a cluster, upload an image. Report anything broken. Then run Lighthouse on Home and one report page and show me the scores.
```

### Phase 6: Evaluation and report
```
Do Phase 6. Create notebooks/evaluation.ipynb with: silhouette scores (CLIP vs ResNet50), K-Means k and DBSCAN cluster count and noise ratio, Prophet MAPE per cluster, and similarity top-1 and top-3 accuracy on held-out images. Then write docs/demo-script.md (5 minutes) and test the whole project from a clean clone using only README.md. List every problem you find.
```

## Part 4: When things go wrong

| Problem | Say this |
|---|---|
| It changed the stack or added a library | "Stop. Re-read AGENTS.md section 2. Undo that change and use the locked stack." |
| It used mock data and said it works | "AGENTS.md rule 2 says never fake results. Show me the real output, or explain what is blocking you." |
| It went beyond the phase | "Revert everything outside Phase N and wait for my approval." |
| A run is too slow | "Lower the subset sizes in ml/config.py and tell me the new numbers. Do not change the models." |
| It is stuck in a loop on an error | "Stop. Summarize the error, list two possible causes and what you tried, then wait for me." |
| Results look wrong (strange clusters, odd forecasts) | "Explain why this might be happening and show me the evidence before changing any code." |
| New session forgot context | "Read AGENTS.md and git log, tell me which phase is done, and continue with the next unfinished task." |

## Part 5: Checkpoints with your supervisors

- **After Phase 1c:** show the cluster contact sheets and silhouette comparison.
- **After Phase 2b:** show forecasts and MAPE, and explain the simulated fashion timeline openly.
- **After Phase 5:** demo the live site.
- **Before the final report:** the notebook, screenshots and demo script are already in `docs/`.
