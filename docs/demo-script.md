# TrendLens: 5-Minute Live Demo Script

**Project Title:** TrendLens &mdash; Visual Style Clustering, Trend Forecasting & Similarity Search  
**Target Audience:** FYP Evaluation Committee, Faculty Examiners, Industry Evaluators  
**Total Duration:** 5 Minutes  
**Live Services Required:**
- FastAPI Backend: `http://localhost:8000` (`TRENDLENS_MODE=live`)
- Next.js Frontend: `http://localhost:3000`

---

## Script Breakdown

```
[00:00 - 01:00] Introduction & Problem Formulation
[01:00 - 02:15] Interactive Dashboard: Style Clusters & Prophet Forecasting
[02:15 - 03:15] Domain Switching & Decision D1 (Automotive vs Fashion Timeline)
[03:15 - 04:15] Visual Similarity Search: Zero-Shot Product Matching
[04:15 - 05:00] Standalone Cluster Reports, Methodology & Technical Wrap-up
```

---

### Step 1: Introduction & Homepage (Minute 0:00 &ndash; 1:00)

1. **Action:** Navigate to `http://localhost:3000/`.
2. **Talking Points:**
   - *"Good morning, respected committee members. Welcome to **TrendLens**, an end-to-end AI system that discovers visual style trends, tracks their market adoption over time, classifies their trajectory as Emerging, Declining, or Stable, and projects where they are heading using time-series forecasting."*
   - *"Unlike traditional trend forecasting services that rely on opaque proprietary methods, TrendLens is completely transparent, open, and reproducible."*
   - Point to the domain cards on the homepage:
     - **Fashion (DeepFashion2):** 4 style clusters with simulated temporal distribution (Decision D1).
     - **Automotive (Stanford Cars):** 9 style clusters utilizing real historical model years (2011&ndash;2015).
3. **Transition:** Click **"Open Interactive Dashboard &rarr;"** (`/dashboard`).

---

### Step 2: The Interactive Dashboard & Prophet Forecast (Minute 1:00 &ndash; 2:15)

1. **Action:** On the `/dashboard` page, ensure the **Fashion** tab is active.
2. **Talking Points:**
   - *"Here on the dashboard, the left sidebar lists all discovered style clusters extracted via OpenAI CLIP ViT-B/32 multimodal embeddings and grouped using silhouette-optimized K-Means."*
   - Click through **Style 0** (Declining) and **Style 1** (Emerging):
     - Notice the annual percentage point delta computed via Decision D4 (+5.0% threshold).
   - Point to the interactive **Chart.js Line Graph**:
     - Solid line: Historical annual adoption share.
     - Dashed line: Facebook Prophet 3-year forward forecast ($yhat$).
     - Shaded band: 80% confidence interval uncertainty bounds.
   - *"Notice the transparent badge at the top: 'Simulated timeline: results are not from real dated images'. Because DeepFashion2 lacks capture dates, TrendLens never hides this fact &mdash; we explicitly disclose simulated time axes."*

---

### Step 3: Domain Switch to Cars & Real Timeline (Minute 2:15 &ndash; 3:15)

1. **Action:** Click the **Cars** tab in the top domain selector.
2. **Talking Points:**
   - *"Now, let us switch to our secondary domain: Automotive, based on Stanford Cars."*
   - *"Notice what immediately changed: the 'Simulated timeline' banner disappears because cars utilize real parsed model years from 2011 to 2015."*
   - Select **Style 0** (Emerging) or **Style 6** (Emerging):
     - Show the forecast extending into 2016, 2017, and 2018.
     - Explain that the exact same generic machine learning pipeline powers both domains with zero code forking.

---

### Step 4: Visual Similarity Search Demo (Minute 3:15 &ndash; 4:15)

1. **Action:** Scroll down to the **"Which trend does this product belong to?"** section.
2. **Action:** Click the upload area and upload a sample car image (e.g. from `data/processed/cars/cars_000000.jpg`) or fashion image (when in Fashion mode).
3. **Talking Points:**
   - *"A key capability of TrendLens is real-time visual trend association. A brand, designer, or buyer can upload any unlabelled product image."*
   - *"The backend extracts a 512-dimensional CLIP embedding in real-time, computes vector cosine similarity across our indexed dataset, aggregates the nearest neighbors, and identifies the Top-3 matching style clusters."*
   - Point out the confidence score (e.g., 95% similarity) and the trend label of the predicted style.
   - Click on the matched style to instantly load its forecast curve above.

---

### Step 5: Standalone Report & Methodology Wrap-Up (Minute 4:15 &ndash; 5:00)

1. **Action:** Click **"View standalone report &rarr;"** (takes you to `/{domain}/{clusterId}`).
2. **Talking Points:**
   - *"Every discovered style cluster has its own public, server-rendered report page with complete historical market share tables, Prophet projection bounds, and visual exemplar thumbnails."*
   - *"Each page includes dynamic OpenGraph metadata, JSON-LD structured schemas, and is automatically indexed in `sitemap.xml` for maximum discoverability."*
3. **Action:** Open `/about` via the top navigation bar.
4. **Closing Summary:**
   - *"To summarize, TrendLens proves that multimodal vision-language embeddings significantly outperform classical CNN baselines (+26.8% silhouette gain), achieves 100% Top-3 cluster retrieval accuracy, and provides an end-to-end, production-ready full-stack application."*
   - *"Thank you. We welcome any questions from the committee."*
