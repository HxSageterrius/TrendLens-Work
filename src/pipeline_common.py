"""
TrendLens — Shared Pipeline Steps
Common building blocks used by both pipeline runners (fashion and
automotive). Extracted from the two runners, which previously duplicated
~70% of their logic: embedding extraction + saving, K-Means clustering with
silhouette-selected K + summary export, DBSCAN density analysis, and the
similarity-engine smoke test.
"""

import json
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd

from src.embeddings.extractor import FeatureExtractor, save_embeddings
from src.clustering.cluster_engine import VisualClusterEngine, build_dbscan_summary
from src.similarity.similarity_engine import SimilarityEngine


def ensure_output_dirs(*dirs: Path) -> None:
    """Creates every output directory used by the pipelines."""
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)


def extract_and_save_embeddings(
    extractor: FeatureExtractor,
    catalog_df: pd.DataFrame,
    project_root: Path,
    embeddings_dir: Path,
    filename_prefix: str,
) -> Tuple[np.ndarray, pd.DataFrame, Path]:
    """
    Extracts L2-normalized embeddings for a catalog and saves the .npy/.csv
    pair. Returns (embeddings, valid_df, saved_embeddings_path).
    """
    embeddings, valid_df = extractor.extract_from_catalog(catalog_df, project_root=project_root)
    emb_file, _ = save_embeddings(
        embeddings=embeddings,
        metadata_df=valid_df,
        output_dir=embeddings_dir,
        filename_prefix=filename_prefix,
    )
    print(f"Extracted feature matrix shape: {embeddings.shape} (L2-normalized)")
    print(f"Saved embeddings to: {emb_file}")
    return embeddings, valid_df, emb_file


def cluster_and_save(
    embeddings: np.ndarray,
    valid_df: pd.DataFrame,
    models_dir: Path,
    model_filename: str,
    summary_out_path: Path,
    k_range: Tuple[int, int],
    dbscan_eps: float,
    find_optimal_k: bool = True,
    item_noun: str = "items",
) -> Tuple[VisualClusterEngine, float, Dict]:
    """
    Fits K-Means (silhouette-selected K within k_range), saves the model and
    cluster summary JSON, then runs the DBSCAN density check alongside and
    saves its summary JSON.

    Returns (cluster_engine, silhouette_score, dbscan_summary).
    """
    print(f"\n[Step] Running Visual Clustering (K-Means, k_range={k_range[0]}-{k_range[1]})...")
    min_k = min(k_range)
    cluster_engine = VisualClusterEngine(n_clusters=min_k)
    labels, silhouette = cluster_engine.fit_kmeans(
        embeddings, find_optimal_k=find_optimal_k, k_range=k_range)
    print(f"Optimal clusters: K={cluster_engine.n_clusters}, Silhouette Score: {silhouette:.4f}")

    cluster_summary = cluster_engine.get_cluster_summary(embeddings, valid_df)
    for c in cluster_summary:
        print(f"  • {c['cluster_name']}: {c['item_count']} {item_noun} | "
              f"Top styles: {list(c['dominant_styles'].keys())}")

    cluster_engine.save(models_dir / model_filename)

    with open(summary_out_path, "w", encoding="utf-8") as f:
        json.dump(cluster_summary, f, indent=2)
    print(f"Saved cluster summary -> {summary_out_path}")

    # DBSCAN density / outlier analysis (alongside K-Means). eps is
    # calibrated per catalogue — see cluster_engine.build_dbscan_summary.
    dbscan_summary = build_dbscan_summary(embeddings, valid_df, eps=dbscan_eps)
    dbscan_path = summary_out_path.parent / summary_out_path.name.replace(
        "clusters_summary", "dbscan_summary")
    with open(dbscan_path, "w", encoding="utf-8") as f:
        json.dump(dbscan_summary, f, indent=2)
    print(f"  DBSCAN: {dbscan_summary['n_clusters']} density cluster(s), "
          f"{dbscan_summary['n_noise']} outlier {item_noun} "
          f"(eps={dbscan_summary['eps']}, min_samples={dbscan_summary['min_samples']})")

    return cluster_engine, silhouette, dbscan_summary


def smoke_test_similarity(
    embeddings: np.ndarray,
    valid_df: pd.DataFrame,
    extractor: FeatureExtractor,
    item_noun: str = "items",
) -> List[Dict]:
    """
    Validates the similarity engine with a top-3 self-query against the first
    catalog item. Returns the match list.
    """
    print(f"\n[Step] Validating Similarity Matching Engine...")
    similarity_engine = SimilarityEngine(
        embeddings=embeddings,
        metadata_df=valid_df,
        feature_extractor=extractor
    )

    test_item = valid_df.iloc[0]
    sim_matches = similarity_engine.find_similar_by_item_id(test_item["item_id"], top_k=3)
    print(f"Top 3 visual matches for '{test_item['title']}' ({test_item['item_id']}):")
    for m in sim_matches:
        print(f"  -> #{m['rank']} {m['title']} ({m.get('style', '')} {m['category']}) "
              f"- Match: {m['match_percentage']}%")
    return sim_matches


def require_minimum_items(catalog_df: pd.DataFrame, minimum: int = 4, subject: str = "images", extra: str = "") -> None:
    """Raises if the catalog is too small to cluster."""
    if len(catalog_df) < minimum:
        raise RuntimeError(
            f"Only {len(catalog_df)} {subject} found. Need >= {minimum} for clustering.{extra}"
        )
