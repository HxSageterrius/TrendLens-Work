"""
Tests for Phase 4: Cars Proof-of-Concept (AGENTS.md Week 9)
Verifies:
1. Cars dataset preparation and real timeline parsing (Decision D1: timeline = 'real').
2. CLIP and ResNet-50 embedding extraction for cars.
3. K-Means clustering, DBSCAN, and contact sheet generation.
4. Monthly shares and yearly trend classification (Decision D4).
5. Prophet forecasting with yearly bounds and MAPE holdout.
6. Unified API endpoints serving both fashion and cars with live mode.
"""

from datetime import date
import json
import os
from pathlib import Path
import numpy as np
from PIL import Image
import psycopg
import pytest
from dotenv import load_dotenv
from fastapi.testclient import TestClient

from api.main import app
import api.main as main_module
from ml.config import (
    CARS_RAW_DIR,
    CLUSTERS_DOCS_DIR,
    DATA_DIR,
    EMBEDDINGS_DIR,
    PROCESSED_DIR,
)

load_dotenv()
client = TestClient(app)


def test_cars_images_database_records():
    """Verify that car images exist in PostgreSQL with real model years."""
    db_url = os.environ.get("DATABASE_URL")
    assert db_url is not None
    
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT count(*), min(embed_index), max(embed_index)
                FROM images
                WHERE domain = 'cars'
            """)
            count, min_idx, max_idx = cur.fetchone()
            assert count == 50, f"Expected 50 car images, found {count}"
            assert min_idx == 0
            assert max_idx == 49
            
            # Verify parsed real model years from Stanford Cars class names
            cur.execute("""
                SELECT DISTINCT extract(year from taken_on)
                FROM images
                WHERE domain = 'cars'
                ORDER BY 1
            """)
            years = [int(r[0]) for r in cur.fetchall()]
            assert len(years) >= 2, "Expected multiple model years for cars proof-of-concept"
            for y in years:
                assert 1990 <= y <= 2025


def test_cars_embeddings_exist():
    """Verify that CLIP and ResNet50 embeddings exist and are L2-normalized."""
    clip_path = EMBEDDINGS_DIR / "cars_clip.npy"
    resnet_path = EMBEDDINGS_DIR / "cars_resnet50.npy"
    ids_path = EMBEDDINGS_DIR / "cars_ids.json"
    
    assert clip_path.is_file(), "cars_clip.npy does not exist"
    assert resnet_path.is_file(), "cars_resnet50.npy does not exist"
    assert ids_path.is_file(), "cars_ids.json does not exist"
    
    clip_mat = np.load(clip_path)
    resnet_mat = np.load(resnet_path)
    
    assert clip_mat.shape == (50, 512)
    assert resnet_mat.shape == (50, 2048)
    
    # Check L2 normalization
    clip_norms = np.linalg.norm(clip_mat, axis=1)
    resnet_norms = np.linalg.norm(resnet_mat, axis=1)
    np.testing.assert_allclose(clip_norms, 1.0, atol=1e-5)
    np.testing.assert_allclose(resnet_norms, 1.0, atol=1e-5)


def test_cars_clusters_and_contact_sheets():
    """Verify clustering artifacts and database rows for cars."""
    cars_doc_dir = CLUSTERS_DOCS_DIR / "cars"
    assert cars_doc_dir.is_dir(), "docs/clusters/cars directory does not exist"
    contact_sheets = list(cars_doc_dir.glob("cluster_*.jpg"))
    assert len(contact_sheets) >= 4, f"Expected at least 4 contact sheets, found {len(contact_sheets)}"
    
    db_url = os.environ.get("DATABASE_URL")
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM clusters WHERE domain = 'cars'")
            num_clusters = cur.fetchone()[0]
            assert num_clusters >= 4
            
            cur.execute("""
                SELECT count(*) FROM image_clusters ic
                JOIN images i ON ic.image_id = i.id
                WHERE i.domain = 'cars' AND ic.algo = 'kmeans'
            """)
            clustered_count = cur.fetchone()[0]
            assert clustered_count == 50


def test_cars_trends_and_labels():
    """Verify monthly shares CSV and yearly trends table for cars."""
    csv_path = PROCESSED_DIR / "cars_monthly_shares.csv"
    assert csv_path.is_file(), "cars_monthly_shares.csv does not exist"
    
    db_url = os.environ.get("DATABASE_URL")
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT cluster_id, year, share, label FROM trends WHERE domain = 'cars'")
            rows = cur.fetchall()
            assert len(rows) > 0, "No trend rows found for domain 'cars'"
            
            for cid, yr, share, label in rows:
                assert label in {"emerging", "declining", "stable"}
                assert 0.0 <= share <= 100.0


def test_cars_forecasts_exist():
    """Verify Prophet forecast records for cars in database."""
    db_url = os.environ.get("DATABASE_URL")
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT cluster_id, year, yhat, lower, upper FROM forecasts WHERE domain = 'cars'")
            rows = cur.fetchall()
            assert len(rows) > 0, "No forecast rows found for domain 'cars'"
            for cid, yr, yhat, lower, upper in rows:
                assert lower <= yhat <= upper, f"Violated bound ordering: {lower} <= {yhat} <= {upper}"


def test_api_trends_cars_endpoint():
    """Verify GET /trends?domain=cars returns live real-timeline data."""
    main_module.MODE = "live"
    res = client.get("/trends?domain=cars")
    assert res.status_code == 200
    data = res.json()
    assert data["domain"] == "cars"
    assert data["mode"] == "live"
    assert data["timeline"] == "real"
    assert len(data["clusters"]) >= 4
    for c in data["clusters"]:
        assert "cluster_id" in c
        assert "name" in c
        assert "label" in c
        assert "share" in c
        assert len(c["share"]) == len(data["years"])


def test_api_forecast_cars_endpoint():
    """Verify GET /forecast?domain=cars&cluster_id=0 returns valid history and forecast."""
    main_module.MODE = "live"
    res = client.get("/forecast?domain=cars&cluster_id=0")
    assert res.status_code == 200
    data = res.json()
    assert data["cluster_id"] == 0
    assert "name" in data
    assert "label" in data
    assert len(data["history"]) > 0
    assert len(data["forecast"]) == 3


def test_api_similarity_cars_endpoint():
    """Verify POST /similarity?domain=cars matches an uploaded image to top 3 car clusters."""
    # Create test image in memory
    img = Image.new("RGB", (224, 224), color=(30, 60, 180))
    import io
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    
    res = client.post(
        "/similarity?domain=cars",
        files={"file": ("query_car.jpg", buf, "image/jpeg")}
    )
    assert res.status_code == 200
    data = res.json()
    assert "matches" in data
    assert len(data["matches"]) <= 3
    for m in data["matches"]:
        assert "cluster_id" in m
        assert "score" in m
        assert 0.0 <= m["score"] <= 1.0
