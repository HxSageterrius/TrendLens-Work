---
description: "Phase 1b: CLIP and ResNet50 embeddings"
---

Do Phase 1, task 3 only: ml/embeddings.py. CLIP ViT-B/32 (Hugging Face transformers) is primary and torchvision ResNet50 is the baseline. L2-normalize, batch size 32, GPU if available, save progress so a crash does not restart from zero. Run on 50 images first, show shapes and timing, then wait for my approval before the full subset.

Rules for this task: follow AGENTS.md exactly (locked stack, ground rules, decisions D1 to D6). Write a short plan first and wait for my approval. Do not run commands that change the database, delete files, or install system packages without asking me. Do not start any other phase. When finished, run the "Done when" checks for this phase, show the real output, and list the exact commands I should run to verify.
