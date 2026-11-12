"""
TrendLens Master Pipeline CLI (ml/run_pipeline.py)
Orchestrates end-to-end execution of all pipeline stages:
1. prepare_data (Phase 1a)
2. embeddings (Phase 1b)
3. cluster (Phase 1c)
4. trends (Phase 2a)
5. forecast (Phase 2b)

Usage:
  python -m ml.run_pipeline --domain fashion
  python -m ml.run_pipeline --domain cars
  python -m ml.run_pipeline --domain fashion --stage cluster
"""

import argparse
import sys
import time

from ml.cluster import run_clustering_pipeline
from ml.config import CARS_RAW_DIR, CARS_SUBSET_SIZE, FASHION_RAW_DIR, FASHION_SUBSET_SIZE
from ml.embeddings import run_embedding_extraction
from ml.forecast import run_forecasting_pipeline
from ml.prepare_data import prepare_dataset
from ml.trends import run_trends_pipeline


def execute_pipeline(domain: str = "fashion", stage: str = "all", subset: int = None):
    start_total = time.time()
    print(f"\n=================================================================")
    print(f"      TRENDLENS PIPELINE EXECUTION: domain='{domain}' stage='{stage}'")
    print(f"=================================================================")
    
    stages_to_run = (
        ["prepare", "embeddings", "cluster", "trends", "forecast"]
        if stage == "all"
        else [stage]
    )
    
    # 1. Prepare Data
    if "prepare" in stages_to_run:
        print("\n>>> STAGE 1: Data Preparation & Timeline Assignment")
        raw_dir = FASHION_RAW_DIR if domain == "fashion" else CARS_RAW_DIR
        default_size = FASHION_SUBSET_SIZE if domain == "fashion" else CARS_SUBSET_SIZE
        target_size = subset if subset is not None else default_size
        prepare_dataset(domain=domain, raw_dir=raw_dir, subset_size=target_size)
        
    # 2. Embeddings
    if "embeddings" in stages_to_run:
        print("\n>>> STAGE 2: Embedding Extraction (CLIP ViT-B/32 & ResNet-50)")
        run_embedding_extraction(domain=domain, model_type="clip")
        run_embedding_extraction(domain=domain, model_type="resnet50")
        
    # 3. Clustering
    if "cluster" in stages_to_run:
        print("\n>>> STAGE 3: Clustering & Contact Sheets")
        run_clustering_pipeline(domain=domain)
        
    # 4. Trends
    if "trends" in stages_to_run:
        print("\n>>> STAGE 4: Monthly & Yearly Trend Analysis (Decision D4)")
        run_trends_pipeline(domain=domain)
        
    # 5. Forecast
    if "forecast" in stages_to_run:
        print("\n>>> STAGE 5: Prophet Forecasting (36 Months & MAPE)")
        run_forecasting_pipeline(domain=domain)
        
    elapsed = time.time() - start_total
    print(f"\n=================================================================")
    print(f"      PIPELINE COMPLETE: {domain.upper()} (Elapsed: {elapsed:.2f}s)")
    print(f"=================================================================\n")


def main():
    parser = argparse.ArgumentParser(description="TrendLens Master Pipeline CLI")
    parser.add_argument("--domain", choices=["fashion", "cars"], default="fashion", help="Target domain")
    parser.add_argument(
        "--stage",
        choices=["all", "prepare", "embeddings", "cluster", "trends", "forecast"],
        default="all",
        help="Pipeline stage to execute"
    )
    parser.add_argument("--subset", type=int, default=None, help="Custom subset limit")
    args = parser.parse_args()
    
    execute_pipeline(domain=args.domain, stage=args.stage, subset=args.subset)


if __name__ == "__main__":
    main()
