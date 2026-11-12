# TrendLens Master Design System

<!-- ui-ux-pro-max:design-system-master 1.0 -->

## Project Profile
- **Project Name:** TrendLens
- **Domain:** AI Visual Trend Intelligence, Fashion & Automotive Analytics
- **Primary Aesthetic:** Warm Sand, Terracotta & Luxury Editorial Analytics
- **Target Stack:** Next.js 16 (App Router), React 19, TypeScript, Chart.js, FastAPI, PostgreSQL

---

## 1. Color Palette Tokens

```css
:root {
  /* Warm Sand & Terracotta Design Tokens */
  --bg-main: #F5F0E7;
  --bg-secondary: #EEE6D9;
  --surface: #FFFFFF;
  --sidebar-bg: #F1EBE1;
  --sidebar-active: #EBD1C2;
  
  --primary-accent: #C56B45;       /* Warm Terracotta */
  --secondary-accent: #A95535;     /* Deep Terracotta */
  --light-terracotta: #EBD1C2;     /* Tinted Rose Sand */
  --terracotta-tint: rgba(197, 107, 69, 0.08);
  --terracotta-glow: rgba(197, 107, 69, 0.18);

  --text-primary: #34312D;         /* Charcoal Ink */
  --text-secondary: #77716A;       /* Muted Earth */
  --text-muted: #A19A91;           /* Warm Gray */
  --border: #E5DDD1;               /* Sand Border */
  --border-subtle: #EDE5D8;

  /* Semantic Status & Trajectory */
  --success: #4D795E;              /* Emerging Trend (+5%) */
  --warning: #C28A43;              /* Stable Trend (+-5%) */
  --error: #B64E43;                /* Declining Trend (-5%) */
  --chart-neutral: #B9AFA1;        /* Baseline Curve */
}
```

---

## 2. Typography Hierarchy

```css
:root {
  --font-serif: 'Playfair Display', Georgia, Cambria, 'Times New Roman', serif;
  --font-sans: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Headings */
h1 {
  font-family: var(--font-serif);
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.015em;
  color: var(--text-primary);
}

h2 {
  font-family: var(--font-serif);
  font-size: 1.75rem;
  font-weight: 600;
  line-height: 1.25;
  color: var(--text-primary);
}

h3 {
  font-family: var(--font-sans);
  font-size: 1.15rem;
  font-weight: 600;
  line-height: 1.35;
  color: var(--text-primary);
}

body, p {
  font-family: var(--font-sans);
  font-size: 0.98rem;
  line-height: 1.55;
  color: var(--text-secondary);
}
```

---

## 3. Chart & Time-Series Data Visualization Standards

- **Chart Library:** Chart.js 4.x via `react-chartjs-2`
- **Data Series Treatment:**
  - **Historical Observations:** Solid line (`#C56B45` or status color, width `2.8px`, tension `0.25`, point radius `4.5px`).
  - **Prophet Forecast Projections:** Dashed line (`#C56B45`, `borderDash: [6, 5]`, width `2.2px`, point radius `4px`).
  - **80% Confidence Interval Band:** Semi-transparent area fill (`rgba(197, 107, 69, 0.16)`).
  - **Grid & Axes:** Warm sand horizontal gridlines (`rgba(229, 221, 209, 0.5)`), vertical grid disabled, muted charcoal tick labels.
  - **Accessibility Requirement:** Every time-series visualization must be paired with an accessible HTML data table and narrative summary (conveying meaning through both line style and text, never color alone).

---

## 4. UI Layout & Elevation Principles

- **Sidebar Width:** 250px on desktop (`#F1EBE1`), responsive stack on mobile (< 768px).
- **Surface Elevation:**
  - Standard card: `background: #FFFFFF`, `border: 1px solid #E5DDD1`, `box-shadow: 0 4px 18px rgba(52, 49, 45, 0.05)`, `border-radius: 14px`.
  - Hero banner: `background: #EEE6D9`, `border-radius: 20px`.
  - Action pills: `border-radius: 9999px`.
- **Focus States:** `outline: 2px solid #C56B45`, `outline-offset: 2px`.
- **Transitions:** `all 0.2s cubic-bezier(0.16, 1, 0.3, 1)`.
