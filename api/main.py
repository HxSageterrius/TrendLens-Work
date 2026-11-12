"""
TrendLens API (FastAPI)
REST backend for visual trend analytics, forecasting, and similarity search.
Supports both 'live' (PostgreSQL + ML models) and 'mock' modes.
Adheres strictly to AGENTS.md Section 6 API contract.
"""

from contextlib import asynccontextmanager
import io
import os
import random
from typing import Dict, List, Optional
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from PIL import Image
from dotenv import load_dotenv

from api.db import (
    get_catalog_from_db,
    get_db_connection,
    get_forecast_from_db,
    get_trends_from_db,
)
from ml.config import PROJECT_ROOT, TIMELINE_MODE
from ml.embeddings import FeatureExtractor
from ml.similarity import SimilaritySearchEngine
from ml.trends import classify_trend

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
MODE = os.environ.get("TRENDLENS_MODE", "live").lower()
WEB_ORIGIN = os.environ.get("WEB_ORIGIN", "http://localhost:3000")
MAX_UPLOAD_SIZE = 5 * 1024 * 1024  # 5 MB limit (Section 6)
VALID_DOMAINS = {"fashion", "cars"}
YEARS = [2021, 2022, 2023, 2024, 2025]

# Global similarity engines (loaded once at startup)
similarity_engines: Dict[str, Optional[SimilaritySearchEngine]] = {
    "fashion": None,
    "cars": None
}
shared_feature_extractor: Optional[FeatureExtractor] = None


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    """Loads CLIP model and similarity search engines once at startup."""
    global shared_feature_extractor, similarity_engines
    print(f"[API] Initializing TrendLens API in '{MODE}' mode...")
    
    if MODE == "live":
        try:
            print("[API] Preloading CLIP ViT-B/32 feature extractor into memory...")
            shared_feature_extractor = FeatureExtractor(model_type="clip")
            
            # Load fashion similarity engine
            try:
                similarity_engines["fashion"] = SimilaritySearchEngine(
                    domain="fashion", extractor=shared_feature_extractor
                )
                print("[API] Fashion similarity search engine preloaded successfully.")
            except Exception as e:
                print(f"[API] Notice: Could not initialize fashion similarity engine: {e}")
                
            # Load cars similarity engine if artifacts exist
            try:
                similarity_engines["cars"] = SimilaritySearchEngine(
                    domain="cars", extractor=shared_feature_extractor
                )
                print("[API] Cars similarity search engine preloaded successfully.")
            except Exception as e:
                print(f"[API] Notice: Cars similarity engine not initialized (POC stage): {e}")
                
        except Exception as e:
            print(f"[API] Warning: Failed to preload ML models: {e}")
            
    yield
    print("[API] Shutting down TrendLens API...")


app = FastAPI(
    title="TrendLens API",
    description="Visual style clustering, trend forecasting, and similarity search API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware (Section 8 Phase 3: uses website origin from .env)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[WEB_ORIGIN, "http://localhost:3000", "http://127.0.0.1:3000", "*"] if MODE == "mock" else [WEB_ORIGIN, "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------- MOCK DATA
MOCK = {
    "fashion": [
        (1, "Oversized streetwear", [10, 15, 24, 33, 42]),
        (2, "Classic tailoring", [48, 40, 31, 22, 14]),
        (3, "Casual denim", [27, 29, 28, 30, 29]),
        (4, "Athleisure sets", [8, 12, 17, 21, 26]),
    ],
    "cars": [
        (1, "Compact SUV", [12, 18, 26, 34, 40]),
        (2, "Sedan", [45, 38, 30, 24, 18]),
        (3, "Hatchback", [20, 21, 20, 22, 21]),
    ],
}


def get_mock_clusters(domain: str) -> List[Dict]:
    if domain not in MOCK:
        raise HTTPException(404, f"Unknown domain: '{domain}'")
    return [
        {
            "cluster_id": cid,
            "name": name,
            "share": share,
            "label": classify_trend(share[0], share[-1])
        }
        for cid, name, share in MOCK[domain]
    ]


def make_mock_forecast(share: List[float], steps: int = 3) -> List[Dict]:
    slope = (share[-1] - share[0]) / (len(share) - 1)
    out = []
    for i in range(1, steps + 1):
        yhat = max(0.0, share[-1] + slope * i)
        band = 1.5 * i
        out.append({
            "year": YEARS[-1] + i,
            "yhat": round(yhat, 1),
            "lower": round(max(0.0, yhat - band), 1),
            "upper": round(yhat + band, 1),
        })
    return out


def find_mock_similar(domain: str, image_bytes: bytes, k: int = 3) -> Dict:
    rng = random.Random(len(image_bytes))
    clusters = get_mock_clusters(domain)
    picks = rng.sample(clusters, k=min(k, len(clusters)))
    scores = sorted((round(rng.uniform(0.62, 0.95), 2) for _ in picks), reverse=True)
    matches = [
        {
            "cluster_id": c["cluster_id"],
            "name": c["name"],
            "label": c["label"],
            "score": s,
            "sample_images": [c["cluster_id"] * 10 + 1, c["cluster_id"] * 10 + 2]
        }
        for c, s in zip(picks, scores)
    ]
    similar_images = [
        {
            "image_id": 451 if domain == "fashion" else 301,
            "score": scores[0],
            "cluster_id": matches[0]["cluster_id"],
            "cluster_name": matches[0]["name"],
            "cluster_label": matches[0]["label"],
            "url": f"/images/{451 if domain == 'fashion' else 301}"
        }
    ]
    return {"matches": matches, "similar_images": similar_images}


# ---------------------------------------------------------------- CORE HANDLERS
def get_clusters(domain: str) -> Dict:
    """Reads clusters and trend shares from PostgreSQL (live) or MOCK."""
    if domain not in VALID_DOMAINS:
        raise HTTPException(404, f"Unknown domain: '{domain}'. Must be 'fashion' or 'cars'.")
        
    if MODE == "mock":
        timeline_str = "real" if domain == "cars" else TIMELINE_MODE
        return {
            "domain": domain,
            "years": YEARS,
            "mode": "mock",
            "timeline": timeline_str,
            "clusters": get_mock_clusters(domain)
        }
    return get_trends_from_db(domain)


def make_forecast(domain: str, cluster_id: int) -> Dict:
    """Fetches Prophet forecast from PostgreSQL (live) or mock projection."""
    if domain not in VALID_DOMAINS:
        raise HTTPException(404, f"Unknown domain: '{domain}'. Must be 'fashion' or 'cars'.")
        
    if MODE == "mock":
        clusters = get_mock_clusters(domain)
        cluster = next((c for c in clusters if c["cluster_id"] == cluster_id), None)
        if not cluster:
            raise HTTPException(404, f"Unknown cluster {cluster_id}")
        return {
            "cluster_id": cluster_id,
            "name": cluster["name"],
            "label": cluster["label"],
            "history": [{"year": y, "share": s} for y, s in zip(YEARS, cluster["share"])],
            "forecast": make_mock_forecast(cluster["share"]),
        }
    return get_forecast_from_db(domain, cluster_id)


def find_similar(domain: str, image_bytes: bytes, k: int = 3) -> Dict:
    """Cosine similarity search over stored CLIP embeddings (live) or mock."""
    if domain not in VALID_DOMAINS:
        raise HTTPException(404, f"Unknown domain: '{domain}'. Must be 'fashion' or 'cars'.")
        
    if MODE == "mock":
        return find_mock_similar(domain, image_bytes, k=k)
        
    engine = similarity_engines.get(domain)
    if engine is None:
        # Fallback to dynamically instantiating if not yet loaded
        engine = SimilaritySearchEngine(domain=domain, extractor=shared_feature_extractor)
        similarity_engines[domain] = engine
        
    return engine.find_similar_from_bytes(image_bytes, top_n_clusters=k, return_dict=True)


# ---------------------------------------------------------------- ENDPOINTS
@app.get("/health")
def health():
    """Liveness check endpoint."""
    return {"status": "ok", "mode": MODE}


@app.get("/trends")
def trends(domain: str = Query("fashion", description="Target domain: 'fashion' or 'cars'")):
    """Returns all clusters with trend labels and historical shares."""
    return get_clusters(domain)


@app.get("/forecast")
def forecast(
    domain: str = Query("fashion", description="Target domain: 'fashion' or 'cars'"),
    cluster_id: int = Query(..., description="Cluster ID")
):
    """Returns history and forecast for a single cluster."""
    return make_forecast(domain, cluster_id)


@app.post("/similarity")
async def similarity(
    domain: str = Query("fashion", description="Target domain: 'fashion' or 'cars'"),
    file: UploadFile = File(...)
):
    """Visual similarity search: matches uploaded image to top 3 clusters."""
    if domain not in VALID_DOMAINS:
        raise HTTPException(404, f"Unknown domain: '{domain}'. Must be 'fashion' or 'cars'.")
        
    data = await file.read()
    if not data or len(data) == 0:
        raise HTTPException(400, "Empty file uploaded.")
    if len(data) > MAX_UPLOAD_SIZE:
        raise HTTPException(400, f"File size exceeds {MAX_UPLOAD_SIZE // (1024*1024)} MB limit.")
        
    # Validate image data format
    try:
        with Image.open(io.BytesIO(data)) as img:
            img.verify()
    except Exception:
        raise HTTPException(400, "Invalid image file format.")
        
    res = find_similar(domain, data)
    if isinstance(res, dict):
        return res
    return {"matches": res}


@app.get("/images/{image_id}")
def serve_image(image_id: int):
    """Serves a stored image by its database ID (AGENTS.md Section 6 Stretch)."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT path FROM images WHERE id = %s", (image_id,))
            row = cur.fetchone()
            
    if not row:
        raise HTTPException(404, f"Image with ID {image_id} not found.")
        
    img_path = PROJECT_ROOT / "data" / row[0]
    if not img_path.is_file():
        raise HTTPException(404, f"Image file not found on disk at {img_path}.")
        
    return FileResponse(str(img_path), media_type="image/jpeg")


@app.get("/catalog")
def catalog(
    domain: str = Query("fashion", description="Target domain: 'fashion' or 'cars'"),
    cluster_id: Optional[int] = Query(None, description="Optional cluster ID filter"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
):
    """Returns authentic dataset images with cluster associations and metadata."""
    if domain not in VALID_DOMAINS:
        raise HTTPException(404, f"Unknown domain: '{domain}'. Must be 'fashion' or 'cars'.")
    return get_catalog_from_db(domain=domain, cluster_id=cluster_id, limit=limit, offset=offset)
