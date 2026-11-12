# TrendLens Project Audit & Functionality Inventory

> **Document Version:** 1.0.0  
> **Target System:** TrendLens Visual Analytics Platform (BSCS Final Year Project)  
> **Evaluation Date:** November 8, 2026  
> **Audit Status:** Phase 1 Complete — Pre-Redesign Baseline  

---

## 1. Executive Summary

TrendLens is a multi-genre visual trend analysis and time-series forecasting platform designed for two primary domains: **Fashion** (DeepFashion2) and **Automobiles** (Stanford Cars). The core machine learning pipeline extracts 512-dimensional visual embeddings using OpenAI CLIP ViT-B/32, clusters images via scikit-learn K-Means ($k \in [4, 10]$ with silhouette score search) alongside DBSCAN noise detection, computes temporal share distributions across 60 monthly intervals, assigns trajectory classifications (*Emerging*, *Declining*, *Stable* under Decision D4), and projects forward 36-month adoption curves using Facebook Prophet.

The architecture comprises a Next.js (App Router) frontend, a FastAPI backend, a PostgreSQL relational metadata store (using plain SQL with the `psycopg` driver without ORM), and local disk storage for image assets and `.npy` embedding matrices.

This audit evaluates the codebase across architecture, UI/UX consistency, backend connectivity, component reusability, and interactive element functionality prior to any redesign.

---

## 2. Comprehensive Functionality Inventory

Every visible button, filter, chart, dropdown, and navigation element across all existing application surfaces has been evaluated and classified into one of four states:
- **Fully Functional:** Completely wired to live backend endpoints or operational client-side state with full data handling and error boundaries.
- **Partially Functional:** Interacts with state or partial APIs, but relies on static fallbacks, hardcoded parameters, or lacks complete edge-case handling.
- **Visual Placeholder:** Renders interactive styling and triggers state changes, but operates entirely on mock data, hardcoded sample sets, or stubbed responses without backend persistence.
- **Not Implemented:** Rendered as clickable or visual chrome, but dead-ended, unlinked, or navigates to 404 routes.

### 2.1 Navigation & Global Chrome

| Surface / Component | Element Name | Type | Current Classification | Backend Connectivity | Operational Behavior & Deficiencies |
|---|---|---|---|---|---|
| **Sidebar** | Brand Logo / Title | Link (`/`) | **Fully Functional** | None (Client Route) | Correctly routes to root `/`. Preserves domain context. |
| **Sidebar** | Collapse Toggle (`Ctrl+B`) | Button | **Fully Functional** | LocalStorage | Toggles between `250px` and `76px` width with smooth CSS transitions and keyboard shortcut. |
| **Sidebar** | Nav Links (Home, Explore, Lens Scan, Trends, Reports, Settings) | Links | **Fully Functional** | Next.js Router | All six standard pages navigate correctly. Active state highlights appropriately. |
| **Sidebar** | Domain Toggle (Fashion vs Cars) | Button Pill | **Fully Functional** | `DomainContext` + LocalStorage | Switches active domain globally, persists in LocalStorage, updates active data in current view. |
| **Sidebar** | System Status Badge | Indicator | **Fully Functional** | `GET /health` | Polls backend health on mount; displays "System Online" (live) or "Demo Mode" (mock). |
| **Sidebar** | User Profile Footer Card | Button / Dropdown | **Partially Functional** | Local State | Toggles profile popover with links to `/settings` and `/about`. Hardcoded to "Hamza Khalid". |
| **Header** | Search Input | Form Input (`input`) | **Partially Functional** | Client State | Updates `searchQuery` in `DomainContext` and redirects to `/explore`. Does not query a backend full-text search API. |
| **Header** | Search Keyboard Cue (`⌘K` / `Ctrl+K`) | Keyboard Listener | **Fully Functional** | DOM Focus | Key combination accurately captures focus on search input. |
| **Header** | Quick Suggestions Popover | Buttons | **Visual Placeholder** | Hardcoded Client Array | Suggests static keywords (e.g., "Oversized Coat", "Fastback Coupe"). Injects keyword into search query, but not dynamically generated from cluster taxonomy. |
| **Header** | Notifications Bell | Button / Popover | **Visual Placeholder** | Hardcoded Client Array | Shows static badge ("2") and hardcoded mock signals ("Cluster 0 Classified Emerging", "Prophet 36-Month Forecast Active"). Not connected to live event alerts. |
| **Header** | Top-Right User Pill | Button / Dropdown | **Partially Functional** | Local State | Duplicates the sidebar profile menu. Hardcoded user name and links. |

---

### 2.2 Home Page (`/`)

| Surface / Component | Element Name | Type | Current Classification | Backend Connectivity | Operational Behavior & Deficiencies |
|---|---|---|---|---|---|
| **Hero Section** | "Explore Trends &rarr;" CTA | Link (`/trends`) | **Fully Functional** | Next.js Router | Routes directly to interactive Trends page. |
| **Hero Section** | "Watch Demo" CTA | Button | **Visual Placeholder** | Local State (`showDemoModal`) | Opens a modal overlay containing a static video placeholder and academic demo walkthrough text. No real video player or media stream. |
| **Hero Section** | Domain Badge Pill ("Stanford Cars Visuals" / "DeepFashion2") | Badge | **Partially Functional** | `DomainContext` | Dynamically updates text based on domain; static informative pill. |
| **Quick Nav Grid** | 4 Category Cards (Visual Explorer, Lens Scan, Trend Intelligence, Executive Reports) | Links | **Fully Functional** | Next.js Router | Seamlessly link to `/explore`, `/lens-scan`, `/trends`, and `/reports`. |
| **Trending Visuals** | "View All &rarr;" Link | Link (`/explore`) | **Fully Functional** | Next.js Router | Correctly navigates to the visual explore gallery. |
| **Trending Visuals** | Status Pill Bar (All Styles, Top Growth, K-Means, Confidence) | Badges | **Visual Placeholder** | Static Values | Displays static values (`All Styles (5)`, `Top Growth: +31%`, `Confidence: 94.2%`) rather than aggregating real database statistics. |
| **Trending Visuals** | 5 Style Cards (Outerwear, Knitwear, Leatherwear, Footwear, Suiting / Car equivalents) | Cards / Links | **Partially Functional** | Local Public Assets | Renders local static images with category titles and growth tags. Links to `/explore`, but cards are statically defined rather than fetched dynamically from cluster centroids. |
| **Trend Analytics** | Time-Series Chart | Chart.js Line | **Fully Functional** | `GET /forecast?domain=&cluster_id=` | Renders live historical trend trajectory with smooth cubic interpolation and gradient fill. |
| **Trend Analytics** | Time Range Selector (`1m`, `3m`, `6m`, `1y`) | Button Group | **Visual Placeholder** | Local State (`activeRange`) | Switches button active styling, but does not alter chart query parameters or recalculate share rollups. |
| **Trend Analytics** | "Explore Trajectory &rarr;" Link | Link (`/trends`) | **Fully Functional** | Next.js Router | Routes to `/trends`. |
| **Quick Stats Bar** | 4 Metric Cards (Emerging Clusters, Forecaster, L2 Embeddings, Dataset Distribution) | Cards | **Partially Functional** | Partially Live | Reads cluster length dynamically, but hardcodes secondary descriptive text. |

---

### 2.3 Explore Page (`/explore`)

| Surface / Component | Element Name | Type | Current Classification | Backend Connectivity | Operational Behavior & Deficiencies |
|---|---|---|---|---|---|
| **Toolbar** | Domain Switcher Pills (Fashion, Automobiles) | Buttons | **Fully Functional** | `DomainContext` | Updates domain state, re-triggers queries for clusters and forecasts. |
| **Toolbar** | View Tabs (`Clusters`, `Trends`, `Similarity`, `Runs`) | Button Tabs | **Partially Functional** | Local State | - `Clusters`: Fully functional live gallery.<br>- `Trends`: Fully functional tabular summary.<br>- `Similarity`: Visual CTA linking to `/lens-scan`.<br>- `Runs`: Static configuration display. |
| **Clusters View** | Cluster Dropdown (`<select>`) | Dropdown | **Fully Functional** | `GET /forecast?domain=&cluster_id=` | Dynamically populated from `GET /trends`. Selecting an option re-queries forecast and sample images. |
| **Clusters View** | Item Filter Input | Text Input | **Partially Functional** | Client-Side Filtering | Filters displayed clusters by name, label, or generated keyword attributes. |
| **Clusters View** | Grid Column Selector (`3`, `4`, `5`) | Button Group | **Fully Functional** | CSS Grid State | Adjusts layout grid dynamically between 3, 4, and 5 columns. |
| **Cluster Info Panel**| "Full Forecast Report &rarr;" CTA | Link | **Not Implemented** | Target: `/[domain]/[clusterId]` | Generates link to `/${domain}/${selectedCluster.cluster_id}`. **Fails with 404** because `web/app/[domain]` contains no route files. |
| **Clusters Gallery**| Sample Image Cards | Image Grid | **Fully Functional** | `GET /images/{id}` | Fetches real image slices from the PostgreSQL database and backend image endpoint. |
| **Clusters Gallery**| "Match" Link on Image Card | Link (`/lens-scan`) | **Fully Functional** | Next.js Router | Routes to Lens Scan for similarity benchmarking. |
| **Trends Tab** | Cluster Comparison Table | Table | **Fully Functional** | `GET /trends` | Calculates delta percentage points between initial and final years, applies D4 label styling. |
| **Trends Tab** | "Report" Table Action | Link | **Not Implemented** | Target: `/[domain]/[clusterId]` | Target route `/${domain}/${c.cluster_id}` gives 404. |
| **Runs Tab** | Pipeline Parameter Cards | Cards | **Visual Placeholder** | Hardcoded Display | Displays CLIP ViT-B/32, K-Means (k=4), Prophet specs statically. |

---

### 2.4 Lens Scan Page (`/lens-scan`)

| Surface / Component | Element Name | Type | Current Classification | Backend Connectivity | Operational Behavior & Deficiencies |
|---|---|---|---|---|---|
| **Domain Switcher** | Fashion / Cars Toggle Pills | Buttons | **Fully Functional** | `DomainContext` | Changes active target domain for cosine similarity. |
| **Upload Dropzone** | Drag & Drop Zone | Drop Target | **Fully Functional** | Browser File API | Handles `dragenter`, `dragover`, `dragleave`, `drop`. Validates MIME type and 5 MB size limit. |
| **Upload Dropzone** | "Browse Computer" CTA | File Input Trigger | **Fully Functional** | `<input type="file">` | Triggers OS native file picker; automatically dispatches similarity search. |
| **Upload Dropzone** | Camera Capture CTA | Button | **Visual Placeholder** | Simulated | Alerts user that webcam capture requires HTTPS/hardware permission; does not open `MediaStream`. |
| **Benchmark Presets**| Sample Preset Buttons (4 Fashion, 4 Cars) | Buttons | **Partially Functional** | Local Static Files | Fetches local `/editorial/` image blob and submits it to `POST /similarity`. Fully functional for demo images. |
| **Similarity Engine**| Similarity Search Execution | API Call | **Fully Functional** | `POST /similarity?domain=` | Sends multipart image bytes to FastAPI. Extracts CLIP embeddings, returns top-3 cluster matches with cosine scores. |
| **Results View** | Match Cards (Rank 1, 2, 3) | Cards | **Fully Functional** | Similarity Results API | Displays cluster name, trajectory badge, similarity percentage, confidence progress bar. |
| **Results View** | "Scan Another Image" Button | Button | **Fully Functional** | Local State Reset | Clears image preview, matches, and error states. |
| **Results View** | "View Cluster Forecast &rarr;" CTA | Link | **Not Implemented** | Target: `/[domain]/[clusterId]` | Links to `/${domain}/${match.cluster_id}` which 404s. |

---

### 2.5 Trends Page (`/trends`)

| Surface / Component | Element Name | Type | Current Classification | Backend Connectivity | Operational Behavior & Deficiencies |
|---|---|---|---|---|---|
| **Domain Switcher** | Fashion / Cars Toggle Pills | Buttons | **Fully Functional** | `DomainContext` | Updates domain, refreshes cluster list and active forecast. |
| **Cluster Selector** | Cluster Tab Bar / Buttons | Button Group | **Fully Functional** | `GET /trends` | Allows user to switch between discovered style clusters. |
| **Timeline Notice** | Simulation / Real Disclosure Pill | Banner | **Fully Functional** | API Response | Correctly identifies and discloses "Simulated Timeline (Decision D1)" for fashion vs "Real Model Year" for cars. |
| **Interactive Chart**| Historical + Prophet Forecast Curve | Chart.js Line | **Fully Functional** | `GET /forecast` | Visualizes historical share points, dashed Prophet projection (`yhat`), and 80% confidence bound area (`lower` to `upper`). |
| **Interactive Chart**| Period Picker Popover | Custom Popover | **Partially Functional** | Custom UI Component | Opens calendar component; clicking a month updates local state but does not filter the annual API rollup. |
| **Analytical Table** | Accessible Data Table | Custom `Table` UI | **Fully Functional** | `GET /forecast` | Renders year-by-year historical shares and future projection bounds with tabular numbers. |
| **Summary Sidebar** | Trajectory Classification Card | Metric Card | **Fully Functional** | Trend Calculation (D4) | Renders trajectory status, delta points, and explanation. |
| **Summary Sidebar** | "View Full Cluster Intelligence &rarr;" | Link | **Not Implemented** | Target: `/[domain]/[clusterId]` | Leads to 404 route. |

---

### 2.6 Reports Page (`/reports`)

| Surface / Component | Element Name | Type | Current Classification | Backend Connectivity | Operational Behavior & Deficiencies |
|---|---|---|---|---|---|
| **Overview Metrics** | 4 Executive Metric Cards | Cards | **Partially Functional** | Live Cluster Counts | Counts active clusters dynamically; hardcodes delta momentum and horizon descriptions. |
| **Fashion Reports** | "Export CSV" CTA | Button | **Fully Functional** | Client-Side CSV Generator | Formats active fashion cluster shares into CSV string and triggers browser download. |
| **Cars Reports** | "Export CSV" CTA | Button | **Fully Functional** | Client-Side CSV Generator | Formats active automotive cluster shares into CSV string and triggers browser download. |
| **Directory Rows** | Fashion & Car Cluster Rows | List Items | **Fully Functional** | Live Cluster Queries | Displays cluster names, IDs, trajectory badges, and latest share values. |
| **Directory Rows** | "View &rarr;" Action Buttons | Links | **Not Implemented** | Target: `/[domain]/[clusterId]` | Routes to `/${domain}/${c.cluster_id}`, triggering 404. |

---

### 2.7 Settings Page (`/settings`)

| Surface / Component | Element Name | Type | Current Classification | Backend Connectivity | Operational Behavior & Deficiencies |
|---|---|---|---|---|---|
| **Palette Card** | Visual Identity & Palette Preview | Static Display | **Fully Functional** | Informative | Displays Dark Luxury Slate & Gold swatch circles (`#222831`, `#393E46`, `#FFD369`, `#EEEEEE`). |
| **Domain Preference**| Default Working Domain Radio Pills | Buttons | **Fully Functional** | `DomainContext` + LocalStorage | Allows user to select default domain (Fashion vs Cars). |
| **System Health** | Infrastructure Status (FastAPI, Postgres, CLIP, Prophet) | Cards | **Partially Functional** | `GET /health` | Displays active API URL and health connection. Relies on hardcoded notes for database driver and model versions. |
| **Form Submission** | "Save Settings" CTA | Form Submit Button | **Fully Functional** | LocalStorage | Persists preferences to LocalStorage and triggers confirmation banner. |

---

### 2.8 Legacy / Out-of-Scope Pages

| Surface / Component | Route | Current Classification | Deficiencies & Findings |
|---|---|---|---|
| **Legacy Dashboard**| `/dashboard` | **Partially Functional** | Contains the original Phase 3 prototype component (`web/components/Dashboard.tsx`). Not linked from the main navigation sidebar. Contains duplicated functionality. |
| **Cluster Report** | `/[domain]/[clusterId]` | **Not Implemented** | Directory exists at `web/app/[domain]` but is empty. Missing page component causes 5 distinct application buttons to 404. |

---

## 3. Reusable Components Analysis

The following components and modules are well-engineered, adhere to the locked tech stack, and should be preserved and leveraged:

1. **`web/lib/DomainContext.tsx`**:
   - Clean, lightweight React context provider.
   - Robustly manages `domain` ('fashion' | 'cars'), `systemStatus`, `searchQuery`.
   - Persists cleanly to `localStorage` with fallback handling for SSR / private browsing.
2. **`web/lib/api.ts`**:
   - Clean typed API contract conforming strictly to AGENTS.md Section 6.
   - Standardized fetch helper `getJSON` with `cache: 'no-store'`.
3. **`web/components/Sidebar.tsx`**:
   - Retractable navigation with smooth CSS transitions (`250px` &harr; `76px`).
   - Keyboard shortcut support (`Ctrl+B` / `Cmd+B`).
   - Floating tooltips on collapsed state.
4. **`web/components/Icons.tsx`**:
   - Zero-dependency inline SVG icon library matching all domain requirements (`HangerIcon`, `CarIcon`, `LensIcon`, `TrendsIcon`, `SparklesIcon`, etc.).
5. **`web/components/ui/Table.tsx`**:
   - Modular, accessible, styled table primitive (`Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`).
6. **`web/components/ui/Popover.tsx` & `Calendar.tsx`**:
   - Zero-dependency portal-less popover and period selector.
7. **`api/main.py` & `api/db.py`**:
   - High-performance FastAPI server with clean lifespan startup caching for CLIP ViT-B/32.
   - Plain SQL database queries using `psycopg` connection pools.

---

## 4. Incomplete & Placeholder Features

1. **Missing Dynamic Cluster Report Route (`/[domain]/[clusterId]`):**
   - Specified in AGENTS.md Phase 5, referenced by `sitemap.ts`, and linked from Explore, Reports, Lens Scan, and Home. The directory `web/app/[domain]` is completely empty.
2. **Hardcoded Home Page Visuals:**
   - The "Trending Visuals" gallery uses a static array of 5 hardcoded items rather than dynamically fetching real cluster centroids and exemplar images from `/trends` and `/images/{id}`.
3. **Hardcoded Header Features:**
   - Notification menu contains static text.
   - Quick search suggestions are hardcoded strings rather than dynamic cluster style names.
4. **Camera Capture in Lens Scan:**
   - Button renders but displays an alert rather than accessing `navigator.mediaDevices.getUserMedia`.
5. **Calendar Period Picker in Trends Page:**
   - Allows month selection visually, but does not slice the monthly time series from the database.

---

## 5. Acceptance Criteria Checklist (AGENTS.md Section 9)

| Requirement | Audit Status | Evidence / Notes |
|---|---|---|
| **Locked Tech Stack preserved** | **Pass (100%)** | Next.js, FastAPI, PostgreSQL (`psycopg`), PyTorch CLIP ViT-B/32, Prophet, Chart.js. No forbidden libraries (no ORM, no pgvector, no FAISS, no Tailwind). |
| **`TRENDLENS_MODE=live` default** | **Pass (100%)** | Backend defaults to `live`, reads from PostgreSQL `trendlens` database. |
| **Timeline status visible in UI** | **Pass (100%)** | Both Fashion (`simulated`) and Cars (`real`) disclose timeline status visibly in badges and notes. |
| **All endpoints + `/health` functional** | **Pass (100%)** | `/health`, `/trends`, `/forecast`, `/similarity`, and `/images/{id}` active and operational. |
| **Both domains work through one API** | **Pass (100%)** | Fashion and Cars toggled seamlessly across all views. |
| **Next.js site has Home, Dashboard, Reports, About** | **Partial (85%)** | Home, Explore, Lens Scan, Trends, Reports, Settings, About exist. `/[domain]/[clusterId]` report page is missing. |
| **Clean reproducibility** | **Pass (100%)** | `SEED = 42`, deterministic pipeline runs, requirements pinned. |
| **No secrets or datasets committed** | **Pass (100%)** | `.env` and `data/` excluded in `.gitignore`. |
