"""
TrendLens Machine Learning Configuration
Constants, paths, subset sizes, thresholds, and random seed.
Adheres strictly to AGENTS.md Decisions D1 to D6.
"""

from pathlib import Path
import os
import torch

# ---------------------------------------------------------------------------
# Ground Rule 4: Fixed random seed for reproducibility
# ---------------------------------------------------------------------------
SEED = 42

# ---------------------------------------------------------------------------
# Project directories & paths
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent

DATA_DIR = PROJECT_ROOT / os.environ.get("DATA_DIR", "data")
RAW_DATA_DIR = DATA_DIR / "raw"
FASHION_RAW_DIR = RAW_DATA_DIR / "deepfashion2"
CARS_RAW_DIR = RAW_DATA_DIR / "cars"

EMBEDDINGS_DIR = DATA_DIR / "embeddings"
PROCESSED_DIR = DATA_DIR / "processed"
DOCS_DIR = PROJECT_ROOT / "docs"
CLUSTERS_DOCS_DIR = DOCS_DIR / "clusters"

# Ensure essential output directories exist
EMBEDDINGS_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
CLUSTERS_DOCS_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Decision D6: Configurable subset sizes
# ---------------------------------------------------------------------------
FASHION_SUBSET_SIZE = int(os.environ.get("FASHION_SUBSET_SIZE", 5000))
CARS_SUBSET_SIZE = int(os.environ.get("CARS_SUBSET_SIZE", 3000))
IMAGE_SIZE = (224, 224)

# Batch size and computation device
BATCH_SIZE = int(os.environ.get("BATCH_SIZE", 32))
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# ---------------------------------------------------------------------------
# Decision D1 & D2: Timeline settings
# ---------------------------------------------------------------------------
TIMELINE_MODE = os.environ.get("TIMELINE_MODE", "simulated")
TIMELINE_START_DATE = "2021-01-01"
TIMELINE_END_DATE = "2025-12-31"

# ---------------------------------------------------------------------------
# Clustering hyperparameters
# ---------------------------------------------------------------------------
K_MIN = 4
K_MAX = 10
DBSCAN_METRIC = "cosine"

# ---------------------------------------------------------------------------
# Decision D4: Trend label rule thresholds (in percentage points)
# ---------------------------------------------------------------------------
EMERGING_THRESHOLD = 5.0
DECLINING_THRESHOLD = -5.0

# ---------------------------------------------------------------------------
# Decision D3: Cluster naming & contact sheets
# ---------------------------------------------------------------------------
CONTACT_SHEET_GRID = (3, 4)  # 12 sample images per cluster
SAMPLES_PER_CLUSTER = 12

# ---------------------------------------------------------------------------
# Model identifiers (Locked Tech Stack)
# ---------------------------------------------------------------------------
CLIP_MODEL_NAME = "openai/clip-vit-base-patch32"
RESNET_MODEL_NAME = "resnet50"

