"""
TrendLens — Module 6: FastAPI Application & REST API
Exposes endpoints for:
- Historical & projected trend analytics
- Visual style clusters & exemplars
- Fashion catalog explorer (genre=fashion)
- Automotive visual cluster explorer (genre=automotive)
- Real-time image upload & visual similarity search
- Serves the modern web frontend dashboard

Genre switching:
  All data endpoints accept ?genre=fashion (default) or ?genre=automotive
  The genre parameter selects the dataset, embeddings, and cluster artifacts.
"""

import io
import json
import os
from pathlib import Path
import sys
from typing import Dict, List, Optional
import numpy as np
import pandas as pd
from PIL import Image

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from src.clustering.cluster_engine import VisualClusterEngine
from src.embeddings.extractor import FeatureExtractor, load_embeddings, save_embeddings
from src.forecasting.trend_forecaster import TrendForecaster
from src.similarity.similarity_engine import SimilarityEngine

from contextlib import asynccontextmanager

# ---------------------------------------------------------------------------
# Global state – fashion (primary)
# ---------------------------------------------------------------------------
extractor: Optional[FeatureExtractor] = None
forecaster: Optional[TrendForecaster] = None
similarity_engine: Optional[SimilarityEngine] = None
cluster_summary_cache: Optional[List[Dict]] = None
catalog_df: Optional[pd.DataFrame] = None

# ---------------------------------------------------------------------------
# Global state – automotive (POC)
# ---------------------------------------------------------------------------
auto_extractor: Optional[FeatureExtractor] = None
auto_similarity_engine: Optional[SimilarityEngine] = None
auto_cluster_summary_cache: Optional[List[Dict]] = None
auto_catalog_df: Optional[pd.DataFrame] = None


def load_app_resources():
    global extractor, forecaster, similarity_engine, cluster_summary_cache, catalog_df
    global auto_extractor, auto_similarity_engine, auto_cluster_summary_cache, auto_catalog_df

    # ------------------------------------------------------------------
    # Fashion (primary pipeline)
    # ------------------------------------------------------------------
    trends_csv = PROJECT_ROOT / "data" / "fashion_trends" / "insta_fashion_trends.csv"
    meta_csv = PROJECT_ROOT / "data" / "fashion_trends" / "fashion_posts_metadata.csv"
    embeddings_dir = PROJECT_ROOT / "data" / "embeddings"
    forecasts_dir = PROJECT_ROOT / "data" / "forecasts"

    if trends_csv.is_file():
        forecaster = TrendForecaster(trends_csv)

    if meta_csv.is_file():
        catalog_df = pd.read_csv(meta_csv)

    clusters_json = forecasts_dir / "clusters_summary.json"
    if clusters_json.is_file():
        with open(clusters_json, "r", encoding="utf-8") as f:
            cluster_summary_cache = json.load(f)

    emb_file = embeddings_dir / "fashion_embeddings.npy"
    embeddings_stale = False
    if emb_file.is_file() and catalog_df is not None:
        # A stored matrix built from an older catalog (e.g. before items
        # were added) no longer matches the catalog rows — rebuild it so
        # similarity results stay aligned with the catalog.
        try:
            stored_rows = np.load(emb_file, mmap_mode="r").shape[0]
            embeddings_stale = stored_rows != len(catalog_df)
            if embeddings_stale:
                print(f"[API] Stored fashion embeddings have {stored_rows} rows "
                      f"but the catalog has {len(catalog_df)} items — rebuilding.")
        except Exception:
            embeddings_stale = False

    if catalog_df is not None and (not emb_file.is_file() or embeddings_stale):
        # Fresh clone: fashion_embeddings.npy is generated output and is not
        # committed, so build it on first startup from the catalog images
        # instead of leaving fashion similarity unavailable (503).
        # Set TRENDLENS_SKIP_EMBEDDING_BUILD=1 to opt out (e.g. in tests).
        if os.environ.get("TRENDLENS_SKIP_EMBEDDING_BUILD") == "1":
            print("[API] Fashion embeddings missing/stale and auto-build disabled "
                  "(TRENDLENS_SKIP_EMBEDDING_BUILD=1); fashion similarity unavailable.")
        else:
            try:
                print("[API] Fashion embeddings not found — building them from "
                      "the catalog on first startup (this downloads ResNet-18 "
                      "weights and may take a minute)...")
                extractor = FeatureExtractor(backbone_name="resnet18")
                embeddings, valid_df = extractor.extract_from_catalog(
                    catalog_df, project_root=PROJECT_ROOT)
                save_embeddings(
                    embeddings=embeddings,
                    metadata_df=valid_df,
                    output_dir=embeddings_dir,
                    filename_prefix="fashion"
                )
                similarity_engine = SimilarityEngine(
                    embeddings=embeddings,
                    metadata_df=valid_df,
                    feature_extractor=extractor
                )
                print(f"[API] Fashion embeddings built: {embeddings.shape} "
                      f"for {len(valid_df)} catalog items.")
            except Exception as e:
                print(f"[API] Warning: could not build fashion embeddings on "
                      f"startup: {e}. Fashion similarity will be unavailable; "
                      f"run src/pipeline_runner.py to generate them manually.")

    if emb_file.is_file() and not embeddings_stale and catalog_df is not None and similarity_engine is None:
        try:
            embeddings, meta = load_embeddings(embeddings_dir, filename_prefix="fashion")
            extractor = FeatureExtractor(backbone_name="resnet18")
            similarity_engine = SimilarityEngine(
                embeddings=embeddings,
                metadata_df=meta,
                feature_extractor=extractor
            )
        except Exception as e:
            print(f"[API] Warning during fashion similarity engine init: {e}")

    # ------------------------------------------------------------------
    # Automotive (POC – loaded only if pipeline has been run)
    # ------------------------------------------------------------------
    auto_meta_csv = (
        PROJECT_ROOT / "data" / "automotive" / "smoke_test" / "automotive_catalog.csv"
    )
    auto_embeddings_dir = PROJECT_ROOT / "data" / "automotive" / "embeddings"
    auto_forecasts_dir = PROJECT_ROOT / "data" / "automotive" / "forecasts"

    if auto_meta_csv.is_file():
        auto_catalog_df = pd.read_csv(auto_meta_csv)

    auto_clusters_json = auto_forecasts_dir / "automotive_clusters_summary.json"
    if auto_clusters_json.is_file():
        with open(auto_clusters_json, "r", encoding="utf-8") as f:
            auto_cluster_summary_cache = json.load(f)

    auto_emb_file = auto_embeddings_dir / "automotive_embeddings.npy"
    if auto_emb_file.is_file() and auto_catalog_df is not None:
        try:
            auto_embeddings, auto_meta = load_embeddings(
                auto_embeddings_dir, filename_prefix="automotive"
            )
            auto_extractor = FeatureExtractor(backbone_name="resnet18")
            auto_similarity_engine = SimilarityEngine(
                embeddings=auto_embeddings,
                metadata_df=auto_meta,
                feature_extractor=auto_extractor
            )
            print(f"[API] Automotive engine loaded: {len(auto_meta)} vehicles")
        except Exception as e:
            print(f"[API] Warning during automotive similarity engine init: {e}")


def ensure_resources_loaded():
    if forecaster is None or catalog_df is None or auto_similarity_engine is None:
        load_app_resources()


def _resolve_genre_resources(genre: str):
    """
    Returns (active_catalog_df, active_similarity_engine, active_cluster_cache)
    for the requested genre.
    """
    ensure_resources_loaded()
    if genre == "automotive":
        return auto_catalog_df, auto_similarity_engine, auto_cluster_summary_cache
    # Default: fashion
    return catalog_df, similarity_engine, cluster_summary_cache


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    load_app_resources()
    yield


app = FastAPI(
    title="TrendLens AI Visual Trend & Forecasting API",
    description="Multimodal Fashion Trend Forecasting, Clustering, and Visual Search Engine",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for local web development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Static files mount – fashion images
images_dir = PROJECT_ROOT / "data" / "fashion_trends" / "images"
if images_dir.is_dir():
    app.mount("/images", StaticFiles(directory=str(images_dir)), name="images")

# Static files mount – automotive smoke-test images
auto_images_dir = PROJECT_ROOT / "data" / "automotive" / "smoke_test" / "images"
if auto_images_dir.is_dir():
    app.mount("/automotive-images", StaticFiles(directory=str(auto_images_dir)), name="automotive-images")

# Static files mount – data directory (for direct catalog path resolution)
data_dir = PROJECT_ROOT / "data"
if data_dir.is_dir():
    app.mount("/data", StaticFiles(directory=str(data_dir)), name="data")

web_dir = PROJECT_ROOT / "web"
if web_dir.is_dir():
    app.mount("/web", StaticFiles(directory=str(web_dir)), name="web")

# Static files mount – reference scraped & segmented images
ref_orig_dir = PROJECT_ROOT / "fashion_trend_analyzer-main" / "images" / "original_images"
if ref_orig_dir.is_dir():
    app.mount("/reference-images/original", StaticFiles(directory=str(ref_orig_dir)), name="ref-orig")

ref_seg_dir = PROJECT_ROOT / "fashion_trend_analyzer-main" / "images" / "segmented_images"
if ref_seg_dir.is_dir():
    app.mount("/reference-images/segmented", StaticFiles(directory=str(ref_seg_dir)), name="ref-seg")


@app.get("/")
def serve_home():
    """Serves the main website dashboard."""
    index_file = PROJECT_ROOT / "web" / "index.html"
    if index_file.is_file():
        return FileResponse(index_file)
    return {"message": "TrendLens API is running. Web directory not yet initialized."}


@app.get("/api/health")
def health_check():
    ensure_resources_loaded()
    return {
        "status": "healthy",
        "forecaster_ready": forecaster is not None,
        "similarity_ready": similarity_engine is not None,
        "catalog_size": len(catalog_df) if catalog_df is not None else 0,
        # Automotive POC status
        "automotive_ready": auto_similarity_engine is not None,
        "automotive_catalog_size": len(auto_catalog_df) if auto_catalog_df is not None else 0,
    }


@app.get("/api/trends/summary")
def get_trends_summary(
    genre: str = Query("fashion", description="Dataset genre: fashion | automotive")
):
    """Returns top trend momentum across all monitored fashion styles."""
    ensure_resources_loaded()
    if genre == "automotive":
        return [
            {
                "status": "forecasting_disabled",
                "forecasting_disabled": True,
                "message": (
                    "Automotive forecasting is awaiting temporal sales / "
                    "search-volume data. The Stanford Cars model_year labels "
                    "encode production year only and are not a trend signal."
                )
            }
        ]
    if forecaster is None:
        raise HTTPException(status_code=503, detail="Trend forecasting engine initializing.")
    return forecaster.get_all_trends_summary()


@app.get("/api/trends/forecast")
def get_style_forecast(
    style: str = Query("Streetwear", description="Fashion style name"),
    horizon: int = Query(12, ge=4, le=26, description="Forecast horizon in weeks"),
    genre: str = Query("fashion", description="Dataset genre: fashion | automotive")
):
    """Returns time-series historical points and future projections with confidence bands."""
    if genre == "automotive":
        # Automotive forecasting is disabled - return a structured placeholder
        return {
            "style": style,
            "genre": "automotive",
            "forecasting_disabled": True,
            "trajectory": "Awaiting Automotive Sales / Search Data",
            "badge_color": "sky",
            "growth_rate_pct": 0.0,
            "current_score": None,
            "projected_score": None,
            "historical_points": [],
            "forecast_points": [],
            "message": (
                "Automotive trend forecasting requires real sales, search-volume, "
                "or registration data with temporal coverage. "
                "Stanford Cars model_year labels are production years, "
                "not popularity or market-adoption signals."
            )
        }
    if forecaster is None:
        raise HTTPException(status_code=503, detail="Forecasting engine not ready.")
    try:
        return forecaster.forecast_style(style=style, horizon_weeks=horizon)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/api/clusters")
def get_clusters(
    genre: str = Query("fashion", description="Dataset genre: fashion | automotive")
):
    """Returns visual style clusters and representative exemplar items."""
    if genre == "automotive":
        if auto_cluster_summary_cache is not None:
            return auto_cluster_summary_cache
        auto_clusters_json = (
            PROJECT_ROOT / "data" / "automotive" / "forecasts"
            / "automotive_clusters_summary.json"
        )
        if auto_clusters_json.is_file():
            with open(auto_clusters_json, "r", encoding="utf-8") as f:
                return json.load(f)
        raise HTTPException(
            status_code=503,
            detail="Automotive clustering artifacts not found. Run automotive_pipeline_runner.py first."
        )

    # Default: fashion
    if cluster_summary_cache is not None:
        return cluster_summary_cache

    forecasts_dir = PROJECT_ROOT / "data" / "forecasts"
    clusters_json = forecasts_dir / "clusters_summary.json"
    if clusters_json.is_file():
        with open(clusters_json, "r", encoding="utf-8") as f:
            return json.load(f)

    raise HTTPException(
        status_code=503,
        detail="Clustering pipeline output not found. Run pipeline_runner.py first."
    )


@app.get("/api/runs")
def get_available_runs():
    """Returns all available ML pipeline & scraped cluster runs."""
    runs = []
    ref_runs_dir = PROJECT_ROOT / "fashion_trend_analyzer-main" / "data" / "runs"
    if ref_runs_dir.is_dir():
        for d in sorted(ref_runs_dir.iterdir(), reverse=True):
            if d.is_dir() and (d / "cluster_labels.json").is_file():
                runs.append({
                    "run_id": d.name,
                    "title": f"Run {d.name} (Scraped & YOLO+SAM Segmented)",
                    "type": "scraped_lineage"
                })
    runs.append({
        "run_id": "fashion-benchmark",
        "title": "Fashion ResNet-18 Benchmark — DeepFashion2-schema catalog (43 clustered assets, K=8)",
        "type": "benchmark"
    })
    runs.append({
        "run_id": "automotive-benchmark",
        "title": "Stanford Cars CVPR Benchmark (45 Vehicles, K=3)",
        "type": "benchmark"
    })
    return runs


@app.get("/api/runs/{run_id}/clusters")
def get_run_clusters(run_id: str):
    """
    Returns clusters for the specified run, matching the reference cluster layout:
    cluster_id, cluster_name, size, keywords, summary, and original vs segmented images.
    """
    ref_runs_dir = PROJECT_ROOT / "fashion_trend_analyzer-main" / "data" / "runs"
    orig_images_dir = PROJECT_ROOT / "fashion_trend_analyzer-main" / "images" / "original_images" / run_id
    seg_images_dir = PROJECT_ROOT / "fashion_trend_analyzer-main" / "images" / "segmented_images" / run_id

    # Reference Scraped Run
    if ref_runs_dir.is_dir() and (ref_runs_dir / run_id).is_dir():
        run_path = ref_runs_dir / run_id
        labels_file = run_path / "cluster_labels.json"
        clusters_csv = run_path / "clusters.csv"

        cluster_items_map: Dict[int, List[str]] = {}
        if clusters_csv.is_file():
            cdf = pd.read_csv(clusters_csv)
            for _, row in cdf.iterrows():
                cid = int(row.get("cluster", 0))
                fn = str(row.get("filename", ""))
                cluster_items_map.setdefault(cid, []).append(fn)

        labels_list = []
        if labels_file.is_file():
            with open(labels_file, "r", encoding="utf-8") as f:
                labels_list = json.load(f)

        clusters_result = []
        for cinfo in labels_list:
            cid = cinfo.get("cluster", 0)
            filenames = cluster_items_map.get(cid, cinfo.get("examples", []))

            image_list = []
            for seg_name in filenames:
                stem = seg_name.split("_segmented")[0]
                orig_name = f"{stem}.jpg"
                for ext in (".jpg", ".jpeg", ".png", ".webp"):
                    if (orig_images_dir / f"{stem}{ext}").is_file():
                        orig_name = f"{stem}{ext}"
                        break

                orig_url = f"/reference-images/original/{run_id}/{orig_name}"
                seg_url = f"/reference-images/segmented/{run_id}/{seg_name}" if (seg_images_dir / seg_name).is_file() else None
                image_list.append({
                    "filename": orig_name,
                    "segmented_filename": seg_name,
                    "original_url": orig_url,
                    "segmented_url": seg_url,
                    "caption": orig_name
                })

            clusters_result.append({
                "cluster_id": cid,
                "cluster_name": cinfo.get("cluster_name") or f"Cluster {cid}",
                "size": len(image_list),
                "keywords": cinfo.get("keywords", []),
                "summary": cinfo.get("summary", ""),
                "images": image_list
            })
        return clusters_result

    # DeepFashion2 Benchmark Run
    if run_id in ("fashion-benchmark", "fashion"):
        ensure_resources_loaded()
        cache = cluster_summary_cache
        if cache is None:
            cpath = PROJECT_ROOT / "data" / "forecasts" / "clusters_summary.json"
            if cpath.is_file():
                with open(cpath, "r", encoding="utf-8") as f:
                    cache = json.load(f)
        if not cache:
            raise HTTPException(status_code=404, detail="Fashion clusters not available.")

        style_keywords = {
            "Streetwear": ["streetwear", "oversized", "hoodies", "casual", "graphic", "urban", "utilitarian"],
            "Y2K": ["y2k", "retro", "denim", "statement", "playful", "metallic", "low-rise"],
            "Minimalist": ["minimalist", "clean silhouette", "neutral tones", "tailored", "quiet luxury", "timeless"],
            "Denim": ["denim", "raw wash", "jackets", "trousers", "indigo", "durable", "structured"],
            "Cottagecore": ["cottagecore", "floral", "puff sleeve", "vintage", "romantic", "earthy"],
            "Athleisure": ["athleisure", "performance", "comfort", "sporty", "breathable", "activewear"],
            "Sneakers": ["sneakers", "athletic footwear", "chunky soles", "streetwear kicks", "running shoes", "lifestyle sneakers"],
            "Bags": ["bags", "crossbody", "handbags", "leather accessories", "tote", "luxury goods", "structured silhouette"]
        }

        result = []
        for c in cache:
            cid = c.get("cluster_id", 0)
            items = c.get("items", [])
            dom_styles = list(c.get("dominant_styles", {}).keys())
            main_style = dom_styles[0] if dom_styles else "Fashion"
            kws = style_keywords.get(main_style, [main_style.lower(), "garment", "aesthetic", "silhouette"])

            image_list = []
            for it in items:
                fpath = str(it.get("file_path", "")).replace("\\", "/")
                fn = Path(fpath).name
                orig_url = f"/{fpath}"
                pair_id = it.get("pair_id")
                source = it.get("source", "shop")
                comp_url = None
                if pair_id is not None:
                    comp_source = "user" if source == "shop" else "shop"
                    comp_fn = f"{it.get('item_id', '')}_{it.get('category', '').replace(' ', '_')}_{comp_source}.jpg"
                    if (PROJECT_ROOT / "data" / "fashion_trends" / "images" / comp_fn).is_file():
                        comp_url = f"/images/{comp_fn}"
                image_list.append({
                    "filename": fn,
                    "segmented_filename": f"paired_{fn}" if comp_url else None,
                    "original_url": orig_url,
                    "segmented_url": comp_url,
                    "caption": it.get("title", fn),
                    "pair_label": "Consumer / User Pair" if comp_url else "Single Ingestion"
                })

            result.append({
                "cluster_id": cid,
                "cluster_name": f"Cluster {cid + 1} • {main_style}",
                "size": len(image_list),
                "keywords": kws,
                "summary": f"Visual cluster of {len(image_list)} garments characterized by {main_style} aesthetics and cohesive silhouette features extracted by ResNet-18.",
                "images": image_list
            })
        return result

    # Automotive Benchmark Run
    if run_id in ("automotive-benchmark", "automotive"):
        ensure_resources_loaded()
        cache = auto_cluster_summary_cache
        if cache is None:
            cpath = PROJECT_ROOT / "data" / "automotive" / "forecasts" / "automotive_clusters_summary.json"
            if cpath.is_file():
                with open(cpath, "r", encoding="utf-8") as f:
                    cache = json.load(f)
        if not cache:
            raise HTTPException(status_code=404, detail="Automotive clusters not available.")

        body_keywords = {
            "sedan": ["sedan", "aerodynamic", "four-door", "executive", "streamlined", "comfort"],
            "suv": ["suv", "high-clearance", "off-road", "spacious", "rugged", "crossover"],
            "coupe": ["coupe", "sport", "two-door", "fastback", "performance", "sleek"],
            "truck": ["truck", "pickup", "utility", "payload", "towing", "heavy-duty"],
            "convertible": ["convertible", "open-top", "roadster", "cabriolet", "lifestyle"]
        }

        result = []
        for c in cache:
            cid = c.get("cluster_id", 0)
            items = c.get("items", [])
            dom_cats = list(c.get("dominant_categories", {}).keys())
            main_cat = dom_cats[0] if dom_cats else "sedan"
            kws = body_keywords.get(main_cat, [main_cat, "vehicle", "automotive", "stanford cars"])

            image_list = []
            for it in items:
                fpath = str(it.get("file_path", "")).replace("\\", "/")
                fn = Path(fpath).name
                orig_url = f"/{fpath}"
                image_list.append({
                    "filename": fn,
                    "segmented_filename": None,
                    "original_url": orig_url,
                    "segmented_url": None,
                    "caption": f"{it.get('make', '')} {it.get('model', '')} ({it.get('model_year', '')})"
                })

            result.append({
                "cluster_id": cid,
                "cluster_name": f"Cluster {cid + 1} • {main_cat.capitalize()} Silhouette",
                "size": len(image_list),
                "keywords": kws,
                "summary": f"Automotive visual cluster containing {len(image_list)} models emphasizing {main_cat.upper()} body geometry and structural lines.",
                "images": image_list
            })
        return result

    raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found.")


@app.get("/api/items")
def get_catalog_items(
    style: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 50,
    genre: str = Query("fashion", description="Dataset genre: fashion | automotive")
):
    """Returns catalog items for the requested genre with optional filtering."""
    active_df, _, _ = _resolve_genre_resources(genre)

    if active_df is None:
        if genre == "automotive":
            raise HTTPException(
                status_code=503,
                detail=(
                    "Automotive catalog not loaded. "
                    "Run automotive_pipeline_runner.py and restart the server."
                )
            )
        raise HTTPException(status_code=503, detail="Catalog metadata not loaded.")

    df = active_df.copy()
    if style:
        df = df[df["style"].str.lower() == style.lower()]
    if category:
        df = df[df["category"].str.lower() == category.lower()]

    return df.head(limit).to_dict(orient="records")


@app.get("/api/catalog")
def get_catalog_alias(
    style: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 50,
    genre: str = Query("fashion", description="Dataset genre: fashion | automotive")
):
    """Alias for /api/items to support standard catalog route conventions."""
    return get_catalog_items(style=style, category=category, limit=limit, genre=genre)


@app.get("/api/items/{item_id}")
def get_item_details(
    item_id: str,
    genre: str = Query("fashion", description="Dataset genre: fashion | automotive")
):
    """
    Returns full details for a single product or vehicle item,
    including its cluster assignment and top visual matches.
    """
    active_df, active_sim_engine, _ = _resolve_genre_resources(genre)

    item_row = None
    if active_df is not None:
        matches = active_df[active_df["item_id"].astype(str).str.lower() == item_id.lower()]
        if not matches.empty:
            item_row = matches.iloc[0].to_dict()

    # Fallback to the other genre if not found
    if item_row is None:
        other_genre = "automotive" if genre == "fashion" else "fashion"
        other_df, other_sim_engine, _ = _resolve_genre_resources(other_genre)
        if other_df is not None:
            matches = other_df[other_df["item_id"].astype(str).str.lower() == item_id.lower()]
            if not matches.empty:
                item_row = matches.iloc[0].to_dict()
                active_sim_engine = other_sim_engine
                genre = other_genre

    if item_row is None:
        raise HTTPException(status_code=404, detail=f"Item '{item_id}' not found in catalog.")

    # Retrieve top 4 similar visual matches
    similar_items = []
    if active_sim_engine is not None:
        try:
            similar_items = active_sim_engine.find_similar_by_item_id(item_id=item_row["item_id"], top_k=4)
        except Exception:
            similar_items = []

    return {
        "item": item_row,
        "genre": genre,
        "similar_items": similar_items,
        "methodology": "ResNet-18 512-dim Normalized Vector Cosine Similarity"
    }


@app.get("/api/data-sources")
def get_data_sources_metadata():
    """
    Returns documentation of datasets, provenance, licensing,
    vision backbones, and forecasting models.

    Provenance note: the fashion catalog is NOT the official DeepFashion2
    dataset. It is a project-assembled catalog that follows the DeepFashion2
    annotation schema (13 categories, shop/user pairs, bounding boxes), built
    from Unsplash stock photography with hand-authored annotations — see
    scripts/build_deepfashion2_dataset.py. Counts below are computed from the
    loaded catalogs, not hard-coded.
    """
    ensure_resources_loaded()

    fashion_categories = []
    fashion_styles = []
    fashion_pairs = 0
    if catalog_df is not None:
        if "category" in catalog_df.columns:
            fashion_categories = sorted(catalog_df["category"].dropna().unique().tolist())
        if "style" in catalog_df.columns:
            fashion_styles = sorted(catalog_df["style"].dropna().unique().tolist())
        if "pair_id" in catalog_df.columns:
            fashion_pairs = int(catalog_df["pair_id"].nunique())

    fashion_cluster_count = None
    if cluster_summary_cache is not None:
        fashion_cluster_count = len(cluster_summary_cache)
    else:
        clusters_json = PROJECT_ROOT / "data" / "forecasts" / "clusters_summary.json"
        if clusters_json.is_file():
            with open(clusters_json, "r", encoding="utf-8") as f:
                fashion_cluster_count = len(json.load(f))

    auto_makes = []
    auto_body_types = []
    if auto_catalog_df is not None:
        if "make" in auto_catalog_df.columns:
            auto_makes = sorted(auto_catalog_df["make"].dropna().unique().tolist())
        if "category" in auto_catalog_df.columns:
            auto_body_types = sorted(auto_catalog_df["category"].dropna().unique().tolist())

    auto_cluster_count = None
    if auto_cluster_summary_cache is not None:
        auto_cluster_count = len(auto_cluster_summary_cache)

    def _dbscan_block(rel_path):
        """Compact DBSCAN density-analysis summary, if the pipeline has run."""
        p = PROJECT_ROOT / rel_path
        if not p.is_file():
            return None
        try:
            with open(p, "r", encoding="utf-8") as f:
                d = json.load(f)
            return {
                "algorithm": d.get("algorithm", "DBSCAN"),
                "metric": d.get("metric", "cosine"),
                "eps": d.get("eps"),
                "min_samples": d.get("min_samples"),
                "n_clusters": d.get("n_clusters"),
                "n_noise": d.get("n_noise"),
                "note": ("DBSCAN is run as a density/outlier check alongside "
                         "K-Means; on these embeddings it finds a single "
                         "density mass, so its useful output is the outlier "
                         "(noise) items."),
            }
        except Exception:
            return None

    fashion_dbscan = _dbscan_block("data/forecasts/dbscan_summary.json")
    auto_dbscan = _dbscan_block("data/automotive/forecasts/automotive_dbscan_summary.json")

    return {
        "fashion": {
            "name": "TrendLens Fashion Catalog (DeepFashion2 schema)",
            "description": "Project-assembled clothing catalog using the DeepFashion2 annotation format: the 13 schema categories plus two project-extension categories (sneakers, bags), commercial-consumer (shop/user) retrieval pairs and bounding boxes. The photographs are Unsplash stock images and the annotations were hand-authored for this project; this is not the official DeepFashion2 dataset.",
            "schema_reference_url": "https://github.com/switchablenorms/DeepFashion2",
            "total_assets": len(catalog_df) if catalog_df is not None else 0,
            "categories": fashion_categories,
            "pairs_count": fashion_pairs,
            "styles": fashion_styles,
            "vision_backbone": "PyTorch ResNet-18 (512-dim L2-normalized vectors)",
            "clustering_algorithm": f"Scikit-Learn K-Means (K={fashion_cluster_count}, Silhouette evaluated)" if fashion_cluster_count else "Scikit-Learn K-Means (Silhouette evaluated)",
            **({"dbscan_analysis": fashion_dbscan} if fashion_dbscan else {}),
            "forecasting_model": "Facebook Prophet (Weekly seasonality, 90% confidence bands), with a statistical fallback",
            "trend_series_note": "The weekly trend series (data/fashion_trends/insta_fashion_trends.csv) is a simulated series generated by src/preprocessing/trendverse_data_builder.py; forecasts demonstrate the pipeline and are not measured market data.",
            "provenance": "Photography: Unsplash (see scripts/build_deepfashion2_dataset.py and scripts/download_real_fashion_images.py). Annotations: hand-authored for this project in DeepFashion2 format. Not affiliated with, or sourced from, the Chinese University of Hong Kong (CUHK) DeepFashion2 dataset."
        },
        "automotive": {
            "name": "Stanford Cars Research Dataset (Krause et al., IEEE CVPR 2013) — 45-image subset",
            "description": "Fine-grained automotive subset categorized by Make, Model, Year, and Body Type.",
            "total_assets": len(auto_catalog_df) if auto_catalog_df is not None else 0,
            "body_types": auto_body_types,
            "makes": auto_makes,
            "vision_backbone": "PyTorch ResNet-18 (512-dim L2-normalized vectors)",
            "clustering_algorithm": f"Scikit-Learn K-Means (K={auto_cluster_count}, Silhouette evaluated)" if auto_cluster_count else "Scikit-Learn K-Means (K=3, Silhouette evaluated)",
            **({"dbscan_analysis": auto_dbscan} if auto_dbscan else {}),
            "forecasting_status": "Unavailable / Awaiting Temporal Data",
            "forecasting_rationale": "Stanford Cars model_year labels indicate vehicle manufacturing dates rather than consumer adoption or market velocity. Temporal forecasting requires real sales, DMV registrations, or search volume data.",
            "licensing": "Non-commercial educational and research evaluation only."
        }
    }


@app.get("/api/dashboard/summary")
def get_dashboard_summary():
    """
    Returns unified cross-domain dashboard telemetry computed from the
    loaded catalogs, cluster summaries, forecast outputs and the trend
    time-series file. No values are hard-coded: where a metric cannot be
    derived from project data (e.g. automotive trend growth, for which no
    temporal data exists), the field says so explicitly instead of
    presenting invented numbers.
    """
    ensure_resources_loaded()

    f_count = len(catalog_df) if catalog_df is not None else 0
    a_count = len(auto_catalog_df) if auto_catalog_df is not None else 0

    # ---- Forecasts (style-level momentum + in-sample error metrics) ----
    forecasts = {}
    forecasts_path = PROJECT_ROOT / "data" / "forecasts" / "trend_forecasts.json"
    if forecasts_path.is_file():
        try:
            with open(forecasts_path, "r", encoding="utf-8") as f:
                forecasts = json.load(f)
        except Exception:
            forecasts = {}

    style_growth = {}
    style_trajectory = {}
    mape_values = []
    for style_name, entry in forecasts.items():
        if not isinstance(entry, dict):
            continue
        if entry.get("growth_rate_pct") is not None:
            style_growth[style_name] = float(entry["growth_rate_pct"])
        if entry.get("trajectory"):
            style_trajectory[style_name] = str(entry["trajectory"])
        metrics = entry.get("metrics") or {}
        if metrics.get("mape") is not None:
            mape_values.append(float(metrics["mape"]))
    forecast_mape_pct = round(sum(mape_values) / len(mape_values), 1) if mape_values else None

    # ---- Cluster counts ----
    def _cluster_count(cache, rel_path):
        if cache is not None:
            return len(cache)
        p = PROJECT_ROOT / rel_path
        if p.is_file():
            try:
                with open(p, "r", encoding="utf-8") as fh:
                    return len(json.load(fh))
            except Exception:
                return 0
        return 0

    fashion_clusters = _cluster_count(
        cluster_summary_cache, "data/forecasts/clusters_summary.json")
    automative_clusters = _cluster_count(
        auto_cluster_summary_cache,
        "data/automotive/forecasts/automotive_clusters_summary.json")

    # ---- Trending now: highest-engagement catalog items ----
    # Fashion growth is the forecast growth of the item's style (from
    # trend_forecasts.json). Automotive has no temporal data, so growth is
    # reported as "N/A" rather than invented.
    trending_now = []
    if catalog_df is not None and "likes" in catalog_df.columns:
        top_fashion = catalog_df.sort_values("likes", ascending=False).head(3)
        for _, row in top_fashion.iterrows():
            style = str(row.get("style", ""))
            growth_pct = style_growth.get(style)
            fname = Path(str(row.get("file_path", ""))).name
            trending_now.append({
                "id": str(row.get("item_id", "")),
                "title": str(row.get("title", "")),
                "category": str(row.get("category", "")),
                "genre": "fashion",
                "growth": f"{growth_pct:+.1f}%" if growth_pct is not None else "N/A",
                "growth_basis": "Forecast growth of the item's style" if growth_pct is not None else "No forecast for this style",
                "trend_direction": style_trajectory.get(style, "—"),
                "image_url": f"/images/{fname}" if fname else "",
                "badge": str(row.get("source", ""))
            })
    if auto_catalog_df is not None:
        # Feature one item from each of the two largest body-type groups.
        top_body_types = []
        if "category" in auto_catalog_df.columns:
            top_body_types = auto_catalog_df["category"].value_counts().head(2).index.tolist()
        for body in top_body_types:
            row = auto_catalog_df[auto_catalog_df["category"] == body].iloc[0]
            fname = Path(str(row.get("file_path", "")).replace("\\", "/")).name
            trending_now.append({
                "id": str(row.get("item_id", "")),
                "title": str(row.get("title", "")),
                "category": str(row.get("category", "")),
                "genre": "automotive",
                "growth": "N/A",
                "growth_basis": "No temporal data for automotive trends",
                "trend_direction": "Not forecast",
                "image_url": f"/automotive-images/{fname}" if fname else "",
                "badge": str(row.get("make", ""))
            })

    # ---- Trend activity: monthly mean trend_score from the series file ----
    # The series is simulated (see /api/data-sources) — it is the project's
    # own data file, aggregated here rather than invented per-request.
    # Automotive has no time series, so its series is an explicit empty list.
    trend_activity = {"months": [], "fashion": [], "automotive": []}
    series_path = PROJECT_ROOT / "data" / "fashion_trends" / "insta_fashion_trends.csv"
    if series_path.is_file():
        try:
            series = pd.read_csv(series_path, parse_dates=["date"])
            series["month"] = series["date"].dt.to_period("M")
            monthly = series.groupby("month")["trend_score"].mean().tail(6)
            trend_activity = {
                "months": [str(p) for p in monthly.index],
                "fashion": [round(float(v), 1) for v in monthly.values],
                "automotive": []
            }
        except Exception:
            pass

    # ---- Top categories / makes: real catalog counts ----
    def _top_counts(df, column, limit=5):
        if df is None or column not in df.columns:
            return []
        counts = df[column].value_counts().head(limit)
        return [
            {"rank": i + 1, "name": str(name), "item_count": int(count)}
            for i, (name, count) in enumerate(counts.items())
        ]

    top_fashion_categories = _top_counts(catalog_df, "category")
    top_automotive_makes = _top_counts(auto_catalog_df, "make")

    # ---- Recent catalog items (there is no scan/query log in this
    # project, so this lists the most recent items by catalog timestamp
    # instead of fabricated "recent scans") ----
    recent_catalog_items = []
    if catalog_df is not None and "timestamp" in catalog_df.columns:
        recent = catalog_df.sort_values("timestamp", ascending=False).head(4)
        for _, row in recent.iterrows():
            fname = Path(str(row.get("file_path", ""))).name
            recent_catalog_items.append({
                "id": str(row.get("item_id", "")),
                "title": str(row.get("title", "")),
                "genre": "fashion",
                "timestamp": str(row.get("timestamp", "")),
                "image_url": f"/images/{fname}" if fname else ""
            })

    return {
        "total_catalog_items": f_count + a_count,
        "fashion_items": f_count,
        "automotive_items": a_count,
        "fashion_clusters": fashion_clusters,
        "automotive_clusters": automative_clusters,
        "active_trends_count": len(forecasts),
        "forecast_mape_pct": forecast_mape_pct,
        "data_notes": (
            "All values are computed from the loaded catalogs, cluster "
            "summaries, forecast outputs and trend series at request time. "
            "The fashion trend series is simulated (see /api/data-sources); "
            "automotive trend growth is unavailable because no temporal "
            "automotive data exists in this project."
        ),
        "trending_now": trending_now,
        "trend_activity": trend_activity,
        "top_fashion_categories": top_fashion_categories,
        "top_automotive_makes": top_automotive_makes,
        "recent_catalog_items": recent_catalog_items
    }


def _extract_dominant_color_name(pil_img):
    """
    Extracts dominant garment color via K-Means (k=4) on non-background pixels,
    then classifies the dominant cluster centroid using HSV hue ranges.
    """
    try:
        import colorsys, random
        w, h = pil_img.size
        margin = max(5, min(w, h) // 8)
        cropped = pil_img.crop((margin, margin, w - margin, h - margin))
        small = cropped.resize((100, 100)).convert("RGB")
        pixels = list(small.getdata())

        garment_pixels = []
        for r, g, b in pixels:
            brightness = (r + g + b) / 3.0
            if brightness > 228 or brightness < 18:
                continue
            mx = max(r, g, b)
            sat = (mx - min(r, g, b)) / mx if mx > 0 else 0
            if sat < 0.08 and brightness > 80:
                continue
            garment_pixels.append((r, g, b))

        if len(garment_pixels) < 50:
            garment_pixels = [(r, g, b) for r, g, b in pixels
                              if (r + g + b) / 3.0 < 235]
        if not garment_pixels:
            return "Neutral"

        k = min(4, len(garment_pixels))
        random.seed(42)
        centroids = random.sample(garment_pixels, k)
        clusters = [[] for _ in range(k)]

        for _ in range(8):
            clusters = [[] for _ in range(k)]
            for px in garment_pixels:
                best = min(
                    range(k),
                    key=lambda i: sum((px[c] - centroids[i][c]) ** 2 for c in range(3))
                )
                clusters[best].append(px)
            centroids = [
                tuple(sum(p[c] for p in cl) // len(cl) for c in range(3))
                if cl else centroids[j]
                for j, cl in enumerate(clusters)
            ]

        largest = max(range(k), key=lambda i: len(clusters[i]))
        r, g, b = centroids[largest]

        h_val, s_val, v_val = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
        hue = h_val * 360.0

        if v_val < 0.15:
            return "Black"
        if v_val > 0.85 and s_val < 0.12:
            return "White / Ivory"
        if s_val < 0.15:
            return "Charcoal" if v_val < 0.45 else "Grey / Silver"
        if hue < 15 or hue >= 345:
            return "Red"
        if hue < 35:
            return "Orange / Rust"
        if hue < 65:
            return "Yellow / Gold"
        if hue < 165:
            return "Green" if s_val > 0.35 else "Olive / Khaki"
        if hue < 195:
            return "Teal / Cyan"
        if hue < 260:
            return "Navy / Indigo" if v_val < 0.40 else "Blue / Denim"
        if hue < 295:
            return "Purple / Violet"
        if hue < 345:
            return "Pink / Rose"
        return "Multicolor"
    except Exception:
        return "Standard"


@app.post("/api/similarity/match")
async def match_image_similarity(
    file: Optional[UploadFile] = File(None),
    item_id: Optional[str] = Query(None),
    top_k: int = Query(6, ge=1, le=12),
    genre: str = Query("fashion", description="Dataset genre: fashion | automotive")
):
    """
    Finds visually similar items via deep cosine similarity.
    Accepts either an uploaded image or an existing item_id.
    Returns matched catalog items along with visual attributes (dominant color, category, style, confidence).
    """
    active_df, active_sim_engine, _ = _resolve_genre_resources(genre)

    if active_sim_engine is None:
        if genre == "automotive":
            raise HTTPException(
                status_code=503,
                detail="Automotive similarity engine not ready. Run automotive_pipeline_runner.py and restart the server."
            )
        raise HTTPException(
            status_code=503,
            detail="Visual similarity engine not ready. Run pipeline_runner.py first."
        )

    pil_img: Optional[Image.Image] = None
    query_source = "image_upload"
    filename = None

    if file is not None:
        try:
            contents = await file.read()
            pil_img = Image.open(io.BytesIO(contents)).convert("RGB")
            filename = file.filename
            matches = active_sim_engine.find_similar_by_image(pil_img, top_k=top_k)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")

    elif item_id:
        query_source = "catalog_item"
        try:
            matches = active_sim_engine.find_similar_by_item_id(item_id, top_k=top_k)
            if active_df is not None:
                item_rows = active_df[active_df["item_id"].astype(str).str.lower() == item_id.lower()]
                if not item_rows.empty:
                    rel_path = item_rows.iloc[0].get("file_path", "")
                    img_path = PROJECT_ROOT / str(rel_path).lstrip("/\\")
                    if img_path.is_file():
                        try:
                            pil_img = Image.open(img_path).convert("RGB")
                        except Exception:
                            pass
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))

    else:
        raise HTTPException(
            status_code=400,
            detail="Must provide either an uploaded image file or item_id parameter."
        )

    dominant_color = _extract_dominant_color_name(pil_img) if pil_img is not None else "Neutral"

    if matches:
        top_match = matches[0]
        category = top_match.get("category", "General")
        style = top_match.get("style", top_match.get("body_style", "Classic"))
        source = top_match.get("source", "shop")
        pair_id = top_match.get("pair_id", None)
        category_id = top_match.get("category_id", None)
        top_score = top_match.get("similarity_score", 0.0)
        confidence = f"{round(top_score * 100, 1)}%" if top_score > 0 else "High"
    else:
        category = "General"
        style = "Classic"
        source = "shop"
        pair_id = None
        category_id = None
        confidence = "N/A"

    predicted_attributes = {
        "category": category,
        "dominant_color": dominant_color,
        "style": style,
        "source": source,
        "pair_id": pair_id,
        "category_id": category_id,
        "match_confidence": confidence
    }

    return {
        "query_source": query_source,
        "genre": genre,
        "filename": filename,
        "item_id": item_id,
        "matches": matches,
        "predicted_attributes": predicted_attributes
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.api.main:app", host="127.0.0.1", port=8000, reload=True)




