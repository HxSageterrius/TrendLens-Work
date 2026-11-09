"""
TrendLens - Automotive Pipeline Runner
Executes the automotive POC pipeline using the existing TrendLens
ML components (FeatureExtractor, VisualClusterEngine, SimilarityEngine).

Steps:
  1. Load and validate the automotive smoke-test catalog (AutomotiveAdapter)
  2. Extract deep visual embeddings (FeatureExtractor / ResNet-18)
  3. Fit visual clusters (VisualClusterEngine / K-Means)
  4. Validate similarity search (SimilarityEngine)
  5. Save all artifacts to data/automotive/ and models/

NOTE: Trend forecasting is INTENTIONALLY DISABLED.
  model_year labels encode production year, not sales/popularity.
  The API returns a static placeholder instead of a forecast chart.

The reusable ML steps live in src/pipeline_common.py so this runner and the
fashion runner share one implementation of embedding extraction, K-Means
+ DBSCAN clustering, and similarity smoke testing.
"""

import json
from pathlib import Path
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.embeddings.extractor import FeatureExtractor
from src.preprocessing.automotive_adapter import AutomotiveAdapter
from src.pipeline_common import (
    cluster_and_save,
    ensure_output_dirs,
    extract_and_save_embeddings,
    require_minimum_items,
    smoke_test_similarity,
)


def run_automotive_pipeline(project_root: Path) -> dict:
    print("=" * 60)
    print(">> Running TrendLens Automotive POC Pipeline")
    print("=" * 60)

    # Directories
    embeddings_dir = project_root / "data" / "automotive" / "embeddings"
    models_dir = project_root / "models"
    forecasts_dir = project_root / "data" / "automotive" / "forecasts"

    ensure_output_dirs(embeddings_dir, models_dir, forecasts_dir)

    # 1. Load automotive catalog
    print("\n[Step 1] Loading automotive catalog (AutomotiveAdapter)...")
    adapter = AutomotiveAdapter(project_root)
    catalog_df = adapter.build_catalog(skip_missing=True)
    adapter.save_catalog(catalog_df)

    dist = adapter.get_body_type_distribution(catalog_df)
    print(f"  Body-type distribution: {dist}")

    require_minimum_items(
        catalog_df,
        minimum=4,
        subject="images",
        extra="\nPopulate data/automotive/smoke_test/images/ with Stanford Cars images.",
    )

    # 2. Extract visual embeddings
    print(f"\n[Step 2] Extracting visual embeddings for {len(catalog_df)} vehicles...")
    extractor = FeatureExtractor(backbone_name="resnet18")
    embeddings, valid_df, _ = extract_and_save_embeddings(
        extractor, catalog_df, project_root, embeddings_dir, "automotive"
    )

    # 3. Visual clustering (K-Means + DBSCAN alongside). K search only
    #    makes sense with a handful of samples; below 8 the fixed lower
    #    bound is used.
    n_samples = len(embeddings)
    max_k = min(6, n_samples - 1)
    min_k = min(3, max_k)
    cluster_engine, silhouette, dbscan_summary = cluster_and_save(
        embeddings=embeddings,
        valid_df=valid_df,
        models_dir=models_dir,
        model_filename="automotive_cluster_model.joblib",
        summary_out_path=forecasts_dir / "automotive_clusters_summary.json",
        k_range=(min_k, max_k),
        dbscan_eps=0.2,
        find_optimal_k=(n_samples >= 8),
        item_noun="vehicles",
    )

    # 4. Forecasting placeholder
    print("\n[Step 4] Trend Forecasting: DISABLED (no temporal sales data)")
    forecasting_status = {
        "status": "disabled",
        "reason": (
            "Automotive forecasting requires real sales, search-volume, or "
            "registration data with temporal coverage. The Stanford Cars "
            "model_year labels encode production year only and must NOT be "
            "treated as a popularity or trend signal."
        ),
        "data_needed": [
            "Monthly/weekly sales figures by model (e.g. BLS / OEM reports)",
            "Google Trends search volumes by model name",
            "Vehicle registration statistics (e.g. DVLA / DMV open data)",
        ]
    }
    with open(forecasts_dir / "automotive_forecast_status.json", "w", encoding="utf-8") as f:
        json.dump(forecasting_status, f, indent=2)

    # 5. Validate similarity engine
    smoke_test_similarity(embeddings, valid_df, extractor, item_noun="vehicles")

    print("\n" + "=" * 60)
    print("[SUCCESS] Automotive POC Pipeline Completed!")
    print("=" * 60)

    return {
        "items_count": len(valid_df),
        "embedding_dim": embeddings.shape[1],
        "optimal_k": cluster_engine.n_clusters,
        "silhouette_score": round(silhouette, 4),
        "body_type_distribution": dist,
        "forecasting_status": "disabled"
    }


if __name__ == "__main__":
    project_root = Path(__file__).resolve().parent.parent
    result = run_automotive_pipeline(project_root)
    print("\nPipeline Result:")
    for k, v in result.items():
        print(f"  {k}: {v}")
