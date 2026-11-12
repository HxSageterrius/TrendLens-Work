"""
Smoke tests for Phase 1b (Embeddings Extraction)
Tests CLIP ViT-B/32 and ResNet50 feature extraction on sample images.
"""

from pathlib import Path
import numpy as np
from PIL import Image
import pytest
from dotenv import load_dotenv

from ml.embeddings import FeatureExtractor, run_embedding_extraction

load_dotenv()


def test_feature_extractor_clip():
    """Verify CLIP feature extractor returns normalized (N, 512) vectors."""
    extractor = FeatureExtractor(model_type="clip")
    assert extractor.dim == 512
    
    # Create 3 synthetic sample images
    images = [
        Image.new("RGB", (224, 224), color=(255, 0, 0)),
        Image.new("RGB", (224, 224), color=(0, 255, 0)),
        Image.new("RGB", (224, 224), color=(0, 0, 255)),
    ]
    
    features = extractor.extract_batch(images)
    assert features.shape == (3, 512)
    assert features.dtype == np.float32
    
    # Check L2 normalization: norm of each vector should be approx 1.0
    norms = np.linalg.norm(features, axis=1)
    assert np.allclose(norms, 1.0, atol=1e-5), f"CLIP embeddings not L2 normalized: {norms}"


def test_feature_extractor_resnet50():
    """Verify ResNet50 feature extractor returns normalized (N, 2048) vectors."""
    extractor = FeatureExtractor(model_type="resnet50")
    assert extractor.dim == 2048
    
    images = [
        Image.new("RGB", (224, 224), color=(128, 128, 128)),
        Image.new("RGB", (224, 224), color=(64, 64, 64)),
    ]
    
    features = extractor.extract_batch(images)
    assert features.shape == (2, 2048)
    assert features.dtype == np.float32
    
    # Check L2 normalization
    norms = np.linalg.norm(features, axis=1)
    assert np.allclose(norms, 1.0, atol=1e-5), f"ResNet50 embeddings not L2 normalized: {norms}"


def test_end_to_end_embeddings_smoke_test():
    """
    Runs embedding extraction on the 50 images in the database from Phase 1a
    for both CLIP and ResNet50.
    """
    # 1. CLIP ViT-B/32
    clip_matrix, clip_npy, ids_json = run_embedding_extraction(
        domain="fashion",
        model_type="clip",
        limit=50,
        batch_size=32
    )
    assert clip_matrix.shape == (50, 512)
    assert clip_npy.is_file()
    assert ids_json.is_file()
    
    # 2. ResNet50
    resnet_matrix, resnet_npy, _ = run_embedding_extraction(
        domain="fashion",
        model_type="resnet50",
        limit=50,
        batch_size=32
    )
    assert resnet_matrix.shape == (50, 2048)
    assert resnet_npy.is_file()

