"""
Test suite for Phase 3 (FastAPI Backend Endpoints & Validation)
Tests all endpoints in both 'live' and 'mock' modes with error handling.
"""

import io
import os
from PIL import Image
import pytest
from fastapi.testclient import TestClient

from api.main import app
import api.main as main_module


@pytest.fixture
def client():
    orig_mode = main_module.MODE
    with TestClient(app) as test_client:
        yield test_client
    main_module.MODE = orig_mode


@pytest.fixture
def sample_jpeg_bytes():
    buf = io.BytesIO()
    img = Image.new("RGB", (100, 100), color=(200, 100, 50))
    img.save(buf, format="JPEG")
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Health endpoint tests
# ---------------------------------------------------------------------------
def test_health_endpoint(client):
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert "mode" in data


# ---------------------------------------------------------------------------
# Trends endpoint tests
# ---------------------------------------------------------------------------
def test_trends_endpoint_live(client):
    main_module.MODE = "live"
    r = client.get("/trends?domain=fashion")
    assert r.status_code == 200
    data = r.json()
    assert data["domain"] == "fashion"
    assert data["mode"] == "live"
    assert "timeline" in data
    assert isinstance(data["years"], list)
    assert len(data["clusters"]) > 0
    
    first_c = data["clusters"][0]
    assert "cluster_id" in first_c
    assert "name" in first_c
    assert "label" in first_c
    assert "share" in first_c
    assert len(first_c["share"]) == len(data["years"])


def test_trends_endpoint_mock(client):
    main_module.MODE = "mock"
    r = client.get("/trends?domain=fashion")
    assert r.status_code == 200
    data = r.json()
    assert data["mode"] == "mock"
    assert len(data["clusters"]) == 4


def test_trends_unknown_domain(client):
    r = client.get("/trends?domain=unknown")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Forecast endpoint tests
# ---------------------------------------------------------------------------
def test_forecast_endpoint_live(client):
    main_module.MODE = "live"
    r = client.get("/forecast?domain=fashion&cluster_id=0")
    assert r.status_code == 200
    data = r.json()
    assert data["cluster_id"] == 0
    assert "name" in data
    assert "label" in data
    assert len(data["history"]) > 0
    assert len(data["forecast"]) == 3
    
    first_fc = data["forecast"][0]
    assert "year" in first_fc
    assert "yhat" in first_fc
    assert "lower" in first_fc
    assert "upper" in first_fc
    assert first_fc["lower"] <= first_fc["yhat"] <= first_fc["upper"]


def test_forecast_endpoint_mock(client):
    main_module.MODE = "mock"
    r = client.get("/forecast?domain=fashion&cluster_id=1")
    assert r.status_code == 200
    data = r.json()
    assert len(data["history"]) == 5
    assert len(data["forecast"]) == 3


def test_forecast_unknown_cluster(client):
    main_module.MODE = "live"
    r = client.get("/forecast?domain=fashion&cluster_id=9999")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Similarity endpoint & upload validation tests
# ---------------------------------------------------------------------------
def test_similarity_valid_upload_live(client, sample_jpeg_bytes):
    main_module.MODE = "live"
    files = {"file": ("query.jpg", sample_jpeg_bytes, "image/jpeg")}
    r = client.post("/similarity?domain=fashion", files=files)
    assert r.status_code == 200
    data = r.json()
    assert "matches" in data
    assert len(data["matches"]) <= 3
    
    match = data["matches"][0]
    assert "cluster_id" in match
    assert "name" in match
    assert "label" in match
    assert "score" in match
    assert 0.0 <= match["score"] <= 1.0


def test_similarity_valid_upload_mock(client, sample_jpeg_bytes):
    main_module.MODE = "mock"
    files = {"file": ("query.jpg", sample_jpeg_bytes, "image/jpeg")}
    r = client.post("/similarity?domain=fashion", files=files)
    assert r.status_code == 200
    data = r.json()
    assert len(data["matches"]) == 3


def test_similarity_empty_file_rejected(client):
    files = {"file": ("empty.jpg", b"", "image/jpeg")}
    r = client.post("/similarity?domain=fashion", files=files)
    assert r.status_code == 400


def test_similarity_invalid_image_rejected(client):
    files = {"file": ("corrupt.jpg", b"This is plain text, not an image", "image/jpeg")}
    r = client.post("/similarity?domain=fashion", files=files)
    assert r.status_code == 400


def test_similarity_oversized_file_rejected(client):
    # 5 MB + 1 byte
    oversized = b"0" * (5 * 1024 * 1024 + 1)
    files = {"file": ("huge.jpg", oversized, "image/jpeg")}
    r = client.post("/similarity?domain=fashion", files=files)
    assert r.status_code == 400


def test_similarity_unknown_domain(client, sample_jpeg_bytes):
    files = {"file": ("query.jpg", sample_jpeg_bytes, "image/jpeg")}
    r = client.post("/similarity?domain=unknown", files=files)
    assert r.status_code == 404


def test_get_image_endpoint(client):
    """Verify GET /images/{id} serves existing image and 404s for invalid ID."""
    # 1. Fetch valid image ID from database
    import psycopg
    db_url = os.environ.get("DATABASE_URL")
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM images LIMIT 1")
            row = cur.fetchone()
            
    assert row is not None, "At least one image must exist in database"
    img_id = row[0]
    
    r_valid = client.get(f"/images/{img_id}")
    assert r_valid.status_code == 200
    assert r_valid.headers["content-type"].startswith("image/")
    assert len(r_valid.content) > 0
    
    # 2. Invalid image ID
    r_invalid = client.get("/images/9999999")
    assert r_invalid.status_code == 404
