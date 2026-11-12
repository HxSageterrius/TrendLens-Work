# Timeline Assignment Methodology (Decision D1)

This document details the timeline assignment strategy used in **TrendLens** to establish temporal sequences for time-series trend analysis and Prophet forecasting.

---

## 1. Fashion Domain (`deepfashion2`)

### Background & Constraint
The DeepFashion2 dataset contains rich spatial annotations (clothing categories, bounding boxes, landmarks, segmentations) but does **not** include original capture timestamps. Facebook Prophet requires temporal observations to estimate trends and seasonal effects.

### Methodology Modes
As defined in **AGENTS.md Decision D1**, `ml/timeline.py` supports two modes configured via `TIMELINE_MODE` in `.env`:

1. **`simulated` (Default):**
   - **Target Window:** 60 consecutive months from January 2021 (`2021-01`) through December 2025 (`2025-12`).
   - **Independence Principle:** The assignment is strictly independent of image features, embeddings, and clustering outcomes.
   - **Deterministic Seeded Distribution:**
     - Each sampled image receives a stable pseudo-random key derived from `SEED = 42` and its deterministic sorting index.
     - Dates are uniformly assigned across the 60-month grid, placing an approximately equal number of images in each month.
     - Within each month, the day is assigned deterministically (e.g. 1st or 15th) to ensure valid `DATE` records in PostgreSQL.
   - **Transparency & Disclosure:**
     - The API contract mandates returning `timeline: "simulated"` in all `/trends` and `/forecast` responses.
     - The web dashboard renders an explicit notice stating that fashion timelines are simulated for benchmark validation.

2. **`dated`:**
   - Reads exact image timestamps from an external metadata CSV (e.g. scraped Instagram posts or catalog collections with a `date` column).
   - If configured, dates are parsed directly from the CSV and mapped to the respective image IDs.

---

## 2. Automotive Domain (`cars`)

### Methodology: Real Model Years
- **Target Source:** Stanford Cars dataset classes encode vehicle make, model, and production year in the label (e.g., `"Acura RL Sedan 2012"`, `"Audi S5 Coupe 2010"`).
- **Year Parsing:** A regular expression extracts the trailing 4-digit integer (`1990`–`2025`) from the class folder or filename.
- **Date Formatting:** Model years are mapped to mid-year dates (`{year}-06-15`) to provide concrete timestamps for PostgreSQL `taken_on DATE`.
- **Status Reporting:** Marked with `timeline: "real"` in API responses.

