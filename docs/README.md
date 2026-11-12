# TrendLens Documentation Index

This directory contains the complete technical specifications, architectural designs, product requirement documents, design system tokens, and evaluation benchmarks for the TrendLens project.

---

## 1. Directory Structure

```
docs/
├── README.md               # Documentation guide & sitemap (this file)
├── demo-script.md          # 5-minute FYP presentation walkthrough script
├── timeline.md             # Decision D1: Temporal alignment & drift calibration rules
│
├── architecture/           # System design & component models
│   ├── ARCHITECTURE.md     # Full stack architecture & dataflow specifications
│   └── UI_UX_ARCHITECTURE.md # Frontend state, routing, and telemetry contracts
│
├── design/                 # Visual design system, layouts & design audits
│   ├── MASTER.md           # Master design system tokens & editorial styling rules
│   ├── DESIGN.md           # Core visual design principles (Warm Sand / Terracotta)
│   ├── DESIGN_AUDIT.md     # Heuristic evaluations and anti-AI-slop audit
│   ├── COMPONENT_INVENTORY.md # Reusable component taxonomy
│   └── PAGE_BLUEPRINTS.md  # Screen blueprints and layout wireframes
│
├── product/                # Requirements, user journeys & execution playbooks
│   ├── PRODUCT.md          # Product requirements document (PRD) & vision
│   ├── USER_FLOWS.md       # Primary user paths (Scanner, Exploration, Forecast)
│   ├── PROJECT_AUDIT.md    # Feature audit & Phase 0–6 milestone tracking
│   └── ANTIGRAVITY_PLAYBOOK.md # Autonomous development & execution guidelines
│
├── clusters/               # Unsupervised K-Means contact sheet grids (Decision D3)
│   ├── fashion/            # 12-specimen exemplar contact sheets for fashion clusters
│   └── cars/               # 12-specimen exemplar contact sheets for car clusters
│
└── screenshots/            # Visual dashboard proofs and telemetry captures
```

---

## 2. Key References

* **Project Build Guide**: [`AGENTS.md`](file:///../AGENTS.md)
* **Setup & Quickstart**: [`README.md`](file:///../README.md)
* **Empirical Benchmarks Notebook**: [`notebooks/evaluation.ipynb`](file:///../notebooks/evaluation.ipynb)
* **Database Schema**: [`api/schema.sql`](file:///../api/schema.sql)
