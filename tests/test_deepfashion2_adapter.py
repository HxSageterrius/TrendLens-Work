"""
Unit tests for DeepFashion2 Dataset Adapter & Retrieval Metrics
"""

import json
from pathlib import Path
import numpy as np
import pytest

from src.preprocessing.deepfashion2_adapter import (
    DEEPFASHION2_CATEGORIES,
    DeepFashion2Adapter
)


def test_deepfashion2_13_categories():
    assert len(DEEPFASHION2_CATEGORIES) == 13
    assert DEEPFASHION2_CATEGORIES[1] == "short sleeve top"
    assert DEEPFASHION2_CATEGORIES[8] == "trousers"
    assert DEEPFASHION2_CATEGORIES[13] == "sling dress"


def test_parse_annotation(tmp_path):
    anno_file = tmp_path / "000001.json"
    sample_data = {
        "source": "shop",
        "pair_id": 42,
        "item1": {
            "category_name": "trousers",
            "category_id": 8,
            "bounding_box": [10, 20, 200, 300]
        }
    }
    anno_file.write_text(json.dumps(sample_data), encoding="utf-8")

    parsed = DeepFashion2Adapter.parse_annotation(anno_file)
    assert parsed["source"] == "shop"
    assert parsed["pair_id"] == 42
    assert parsed["item1"]["category_id"] == 8


def test_consumer_to_shop_retrieval_evaluation():
    # 2 query vectors and 2 gallery vectors
    # Query 0 matches gallery 0 (pair_id 101)
    # Query 1 matches gallery 1 (pair_id 102)
    q_feats = np.array([
        [1.0, 0.0, 0.0],
        [0.0, 1.0, 0.0]
    ], dtype=np.float32)

    g_feats = np.array([
        [0.95, 0.05, 0.0],
        [0.05, 0.95, 0.0]
    ], dtype=np.float32)

    q_pairs = [101, 102]
    g_pairs = [101, 102]

    metrics = DeepFashion2Adapter.evaluate_consumer_to_shop_retrieval(
        query_features=q_feats,
        gallery_features=g_feats,
        query_pair_ids=q_pairs,
        gallery_pair_ids=g_pairs,
        top_k=[1, 2]
    )

    assert metrics["top_1"] == 100.0
    assert metrics["top_2"] == 100.0


def test_load_catalog():
    adapter = DeepFashion2Adapter()
    df = adapter.load_catalog()
    assert len(df) >= 39
    assert "category_id" in df.columns
    assert "source" in df.columns
    assert "pair_id" in df.columns
    assert "short sleeve top" in df["category"].values
    assert "sling dress" in df["category"].values
