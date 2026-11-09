"""
TrendLens — Core Pipeline Orchestrator & Model Runner
Executes the full end-to-end ML pipeline:
1. Ingests fashion post metadata and images
2. Extracts deep visual feature embeddings (ResNet)
3. Fits visual clusters (K-Means) and computes silhouette evaluation
4. Generates time-series trend projections (Prophet / Statistical engine)
5. Validates similarity matching engine

The reusable ML steps live in src/pipeline_common.py so this runner and the
automotive runner share one implementation of embedding extraction, K-Means
+ DBSCAN clustering, and similarity smoke testing.
"""

import json
from pathlib import Path
import sys

# Ensure UTF-8 output encoding on Windows console
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import pandas as pd

from src.embeddings.extractor import FeatureExtractor
from src.forecasting.trend_forecaster import TrendForecaster
from src.pipeline_common import (
    cluster_and_save,
    ensure_output_dirs,
    extract_and_save_embeddings,
    smoke_test_similarity,
)


def run_full_pipeline(project_root: Path) -> dict:
    print("=" * 60)
    print(">> Running TrendLens Core AI Pipeline")
    print("=" * 60)

    # Paths
    trends_dir = project_root / "data" / "fashion_trends"
    meta_csv = trends_dir / "fashion_posts_metadata.csv"
    time_series_csv = trends_dir / "insta_fashion_trends.csv"
    embeddings_dir = project_root / "data" / "embeddings"
    models_dir = project_root / "models"
    forecasts_dir = project_root / "data" / "forecasts"

    ensure_output_dirs(embeddings_dir, models_dir, forecasts_dir)

    # 1. Load Catalog Metadata
    print("\n[Step 1] Loading fashion catalog metadata...")
    if not meta_csv.is_file():
        raise FileNotFoundError(f"Missing fashion metadata at: {meta_csv}")
    catalog_df = pd.read_csv(meta_csv)
    print(f"Loaded {len(catalog_df)} catalog items.")

    # 2. Extract Deep Visual Embeddings
    print("\n[Step 2] Extracting visual embeddings (ResNet)...")
    extractor = FeatureExtractor(backbone_name="resnet18")
    embeddings, valid_df, _ = extract_and_save_embeddings(
        extractor, catalog_df, project_root, embeddings_dir, "fashion"
    )

    # 3. Visual Clustering (K-Means with silhouette-selected K, plus a
    #    DBSCAN density check alongside). Fashion embeddings are sparser
    #    than automotive ones (median 5th-NN cosine distance 0.32 vs 0.14),
    #    so eps is calibrated per catalogue: the shared default (0.2) finds
    #    no core points in the fashion space.
    cluster_engine, silhouette, dbscan_summary = cluster_and_save(
        embeddings=embeddings,
        valid_df=valid_df,
        models_dir=models_dir,
        model_filename="cluster_model.joblib",
        summary_out_path=forecasts_dir / "clusters_summary.json",
        k_range=(3, 6),
        dbscan_eps=0.30,
    )

    # 4. Trend Forecasting
    print("\n[Step 4] Running Time-Series Trend Forecaster...")
    forecaster = TrendForecaster(time_series_csv)
    forecast_results = {}
    for style in forecaster.get_available_styles():
        fc = forecaster.forecast_style(style, horizon_weeks=12)
        forecast_results[style] = fc
        print(f"  • {style:<12}: {fc['trajectory']:<20} ({fc['growth_rate_pct']:+.1f}% projected growth)")

    with open(forecasts_dir / "trend_forecasts.json", "w", encoding="utf-8") as f:
        json.dump(forecast_results, f, indent=2)

    # 5. Validate Similarity Engine
    smoke_test_similarity(embeddings, valid_df, extractor)

    print("\n" + "=" * 60)
    print("[SUCCESS] Full Pipeline Completed Successfully!")
    print("=" * 60)

    return {
        "items_count": len(valid_df),
        "embedding_dim": embeddings.shape[1],
        "optimal_k": cluster_engine.n_clusters,
        "silhouette_score": silhouette,
        "dbscan_clusters": dbscan_summary["n_clusters"],
        "dbscan_noise": dbscan_summary["n_noise"],
        "forecasted_styles": list(forecast_results.keys())
    }


if __name__ == "__main__":
    project_root = Path(__file__).resolve().parent.parent
    run_full_pipeline(project_root)
