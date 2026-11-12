---
description: "Phase 3: connect the FastAPI backend to real data"
---

Do Phase 3 only. Replace the three TODO functions in api/main.py with real implementations (PostgreSQL plus ml/similarity.py). Keep mock mode behind TRENDLENS_MODE=mock and make live the default. Load CLIP once at startup. Add /health, upload validation (image type, 5 MB), and pytest tests for every endpoint in both modes. Give me curl commands to check each endpoint.

Rules for this task: follow AGENTS.md exactly (locked stack, ground rules, decisions D1 to D6). Write a short plan first and wait for my approval. Do not run commands that change the database, delete files, or install system packages without asking me. Do not start any other phase. When finished, run the "Done when" checks for this phase, show the real output, and list the exact commands I should run to verify.
