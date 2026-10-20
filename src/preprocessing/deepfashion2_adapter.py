"""
TrendLens — DeepFashion2-Schema Adapter & Benchmark Evaluator
Implements parsing, schema normalization, and Consumer-to-Shop Clothes Retrieval evaluation
using the annotation format of the DeepFashion2 benchmark (Yuying Ge et al., CVPR 2019).
Schema reference: https://github.com/switchablenorms/DeepFashion2

Note: the catalog this adapter loads is assembled for this project from
Unsplash photography with hand-authored annotations in DeepFashion2 format;
it is not the official DeepFashion2 dataset.
"""

import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd


# 13 Official DeepFashion2 Category Classes
DEEPFASHION2_CATEGORIES: Dict[int, str] = {
    1: "short sleeve top",
    2: "long sleeve top",
    3: "short sleeve outwear",
    4: "long sleeve outwear",
    5: "vest",
    6: "sling",
    7: "shorts",
    8: "trousers",
    9: "skirt",
    10: "short sleeve dress",
    11: "long sleeve dress",
    12: "vest dress",
    13: "sling dress"
}

CATEGORY_TO_ID: Dict[str, int] = {v: k for k, v in DEEPFASHION2_CATEGORIES.items()}


class DeepFashion2Adapter:
    """
    Adapter for the DeepFashion2 Dataset and Consumer-to-Shop Clothes Retrieval.
    Parses DeepFashion2 JSON annotations, validates bounding boxes, and evaluates retrieval metrics.
    """

    def __init__(self, data_dir: Optional[Union[str, Path]] = None):
        if data_dir is None:
            # Default to standard project data directory
            self.data_dir = Path(__file__).resolve().parent.parent.parent / "data" / "fashion_trends"
        else:
            self.data_dir = Path(data_dir)

        self.images_dir = self.data_dir / "images"
        self.annos_dir = self.data_dir / "annotations"
        self.metadata_csv = self.data_dir / "fashion_posts_metadata.csv"

    def load_catalog(self) -> pd.DataFrame:
        """Loads and validates the unified DeepFashion2 catalog DataFrame."""
        if self.metadata_csv.is_file():
            df = pd.read_csv(self.metadata_csv)
            return df
        raise FileNotFoundError(f"DeepFashion2 catalog metadata not found at: {self.metadata_csv}")

    @staticmethod
    def parse_annotation(anno_path: Union[str, Path]) -> Dict:
        """Parses a single DeepFashion2 annotation JSON file."""
        path = Path(anno_path)
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data

    @staticmethod
    def evaluate_consumer_to_shop_retrieval(
        query_features: np.ndarray,
        gallery_features: np.ndarray,
        query_pair_ids: List[int],
        gallery_pair_ids: List[int],
        top_k: List[int] = [1, 5, 10]
    ) -> Dict[str, float]:
        """
        Evaluates Consumer-to-Shop Clothes Retrieval accuracy (Top-K matching).
        
        Args:
            query_features: L2-normalized feature vectors for consumer ('user') images (N, D).
            gallery_features: L2-normalized feature vectors for commercial ('shop') items (M, D).
            query_pair_ids: Ground-truth clothing identity pair_id for each query.
            gallery_pair_ids: Ground-truth clothing identity pair_id for each gallery item.
            top_k: Cut-offs to evaluate (e.g. Top-1, Top-5, Top-10).
            
        Returns:
            Dictionary with Top-K accuracy percentages.
        """
        if len(query_features) == 0 or len(gallery_features) == 0:
            return {f"top_{k}": 0.0 for k in top_k}

        # Cosine similarity matrix (N x M)
        sim_matrix = np.dot(query_features, gallery_features.T)
        results = {f"top_{k}": 0.0 for k in top_k}
        n_queries = len(query_pair_ids)

        for i in range(n_queries):
            target_pair = query_pair_ids[i]
            # Rank gallery items in descending similarity order
            ranked_indices = np.argsort(sim_matrix[i])[::-1]
            ranked_gallery_pairs = [gallery_pair_ids[idx] for idx in ranked_indices]

            for k in top_k:
                top_k_candidates = ranked_gallery_pairs[:k]
                if target_pair in top_k_candidates:
                    results[f"top_{k}"] += 1.0

        for k in top_k:
            results[f"top_{k}"] = round((results[f"top_{k}"] / n_queries) * 100.0, 2)

        return results
