"""
Smoke tests for Phase 2c (Similarity Search Engine)
Tests cosine similarity search and top-1 / top-3 cluster retrieval accuracy on sampled images.
"""

from pathlib import Path
import numpy as np
from PIL import Image
import pytest
from dotenv import load_dotenv

from ml.config import PROJECT_ROOT
from ml.similarity import SimilaritySearchEngine, find_similar_clusters

load_dotenv()


def test_similarity_engine_structure():
    """Verify similarity engine returns top-3 clusters with expected schema."""
    engine = SimilaritySearchEngine(domain="fashion")
    
    # Query with a synthetic image
    query_img = Image.new("RGB", (224, 224), color=(100, 150, 200))
    matches = engine.find_similar_from_pil(query_img, top_k_neighbors=20, top_n_clusters=3)
    
    assert len(matches) <= 3
    for m in matches:
        assert "cluster_id" in m
        assert "name" in m
        assert "label" in m
        assert "score" in m
        assert 0.0 <= m["score"] <= 1.0
        assert m["label"] in ["emerging", "declining", "stable"]


def test_top_k_cluster_retrieval_accuracy():
    """
    Evaluates retrieval accuracy: for 30 sampled images from the dataset,
    tests how often the image's own assigned cluster is returned as Top-1 and in Top-3.
    """
    engine = SimilaritySearchEngine(domain="fashion")
    
    # Sample up to 30 images from stored ids
    n_samples = min(30, len(engine.ids_data))
    sample_records = engine.ids_data[:n_samples]
    
    top1_correct = 0
    top3_correct = 0
    tested_count = 0
    
    for rec in sample_records:
        img_id = rec["image_id"]
        true_cid = engine.image_to_cluster.get(img_id)
        if true_cid is None:
            continue
            
        img_path = PROJECT_ROOT / "data" / rec["path"]
        if not img_path.is_file():
            continue
            
        with Image.open(img_path) as im:
            matches = engine.find_similar_from_pil(im.convert("RGB"), top_k_neighbors=30, top_n_clusters=3)
            
        tested_count += 1
        top_cids = [m["cluster_id"] for m in matches]
        
        if top_cids and top_cids[0] == true_cid:
            top1_correct += 1
        if true_cid in top_cids:
            top3_correct += 1
            
    assert tested_count > 0, "No sample images found on disk to evaluate."
    top1_acc = (top1_correct / tested_count) * 100.0
    top3_acc = (top3_correct / tested_count) * 100.0
    
    print(f"\n[EVALUATION] Similarity Search on {tested_count} sampled images:")
    print(f"  Top-1 Cluster Accuracy: {top1_acc:.1f}% ({top1_correct}/{tested_count})")
    print(f"  Top-3 Cluster Accuracy: {top3_acc:.1f}% ({top3_correct}/{tested_count})")
    
    # Expect high top-3 accuracy since nearest neighbors naturally belong to own cluster
    assert top3_acc >= 70.0, f"Top-3 accuracy below 70%: {top3_acc:.1f}%"
