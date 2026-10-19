"""
TrendLens Health Check - checks data files, JSON/CSV, images,
API routes, frontend keywords, and live module connectivity.
"""
import os, sys, json, csv, importlib
sys.path.insert(0, ".")

errors = []
warnings = []

def ok(m):   print(f"  [OK]   {m}")
def fail(m): print(f"  [FAIL] {m}"); errors.append(m)
def warn(m): print(f"  [WARN] {m}"); warnings.append(m)
def miss(m): print(f"  [MISS] {m}"); errors.append(m)

print("\n=== 1. MODULE IMPORTS ===")
mods = {
    "AutomotiveAdapter":   ("src.preprocessing.automotive_adapter","AutomotiveAdapter"),
    "FeatureExtractor":    ("src.embeddings.extractor","FeatureExtractor"),
    "VisualClusterEngine": ("src.clustering.cluster_engine","VisualClusterEngine"),
    "SimilarityEngine":    ("src.similarity.similarity_engine","SimilarityEngine"),
    "TrendForecaster":     ("src.forecasting.trend_forecaster","TrendForecaster"),
    "FashionDataset":      ("src.preprocessing.dataset","FashionDataset"),
}
imported = {}
for name,(mp,cn) in mods.items():
    try:
        m=importlib.import_module(mp); imported[name]=getattr(m,cn); ok(name)
    except Exception as e: fail(f"{name}: {e}")

print("\n=== 2. DATA FILES ===")
req = {
    "Automotive catalog CSV":    "data/automotive/smoke_test/automotive_catalog.csv",
    "Automotive embeddings NPY": "data/automotive/embeddings/automotive_embeddings.npy",
    "Automotive metadata CSV":   "data/automotive/embeddings/automotive_metadata.csv",
    "Cluster summary JSON":      "data/automotive/forecasts/automotive_clusters_summary.json",
    "Forecast status JSON":      "data/automotive/forecasts/automotive_forecast_status.json",
    "Cluster model joblib":      "models/automotive_cluster_model.joblib",
    "Attribution MD":            "data/automotive/smoke_test/ATTRIBUTION.md",
    "License TXT":               "data/automotive/smoke_test/LICENSE.txt",
}
for lbl,path in req.items():
    if os.path.exists(path):
        sz=os.path.getsize(path)
        if sz==0: warn(f"{lbl} empty")
        else: ok(f"{lbl} ({sz:,} bytes)")
    else: miss(f"{lbl} -> {path}")

print("\n=== 3. SMOKE TEST IMAGES ===")
img_dir="data/automotive/smoke_test/images"
if os.path.isdir(img_dir):
    imgs=[f for f in os.listdir(img_dir) if f.endswith(".jpg")]
    ok(f"{len(imgs)} JPEGs found")
    if len(imgs)!=45: warn(f"Expected 45 images, found {len(imgs)}")
    bad=[f for f in imgs if os.path.getsize(os.path.join(img_dir,f))<1024]
    if bad: [warn(f"Tiny file: {f}") for f in bad]
    else: ok("All images are non-trivial size")
else: miss(img_dir)

print("\n=== 4. JSON FORMAT ===")
for lbl,path in {"Cluster summary":"data/automotive/forecasts/automotive_clusters_summary.json","Forecast status":"data/automotive/forecasts/automotive_forecast_status.json"}.items():
    if os.path.exists(path):
        try: json.load(open(path,encoding="utf-8")); ok(f"{lbl} valid JSON")
        except Exception as e: fail(f"{lbl}: {e}")

print("\n=== 5. CSV FORMAT ===")
for lbl,path in {"Automotive catalog":"data/automotive/smoke_test/automotive_catalog.csv","Automotive metadata":"data/automotive/embeddings/automotive_metadata.csv"}.items():
    if os.path.exists(path):
        try:
            rows=list(csv.DictReader(open(path,newline="",encoding="utf-8")))
            ok(f"{lbl}: {len(rows)} rows | cols={list(rows[0].keys()) if rows else []}")
        except Exception as e: fail(f"{lbl}: {e}")

print("\n=== 6. API ROUTES & GENRE SWITCH ===")
try:
    src=open("src/api/main.py",encoding="utf-8").read()
    # Actual routes defined in API
    for route in ["/api/health","/api/items","/api/clusters","/api/trends/summary","/api/trends/forecast","/api/similarity/match"]:
        (ok(f"Route '{route}'") if route in src else fail(f"Route '{route}' MISSING"))
    (ok("_resolve_genre_resources present") if "_resolve_genre_resources" in src else fail("_resolve_genre_resources MISSING"))
    for g in ["fashion","automotive"]:
        (ok(f"Genre '{g}' referenced") if g in src else fail(f"Genre '{g}' MISSING"))
except Exception as e: fail(f"API read: {e}")

print("\n=== 7. FRONTEND FILES ===")
# Check actual function/keyword names that exist in the frontend
checks={
    "web/index.html": ["genre-btn","genre-switcher","automotive","fashion"],
    "web/app.js":     ["currentGenre","genre=","loadCatalog","loadClusters"],
    "web/style.css":  [".genre-btn",".genre-switcher"]
}
for path,keys in checks.items():
    if os.path.exists(path):
        ok(f"{path} ({os.path.getsize(path):,} bytes)")
        txt=open(path,encoding="utf-8").read()
        for k in keys:
            (ok(f"  '{k}'") if k in txt else warn(f"  '{k}' NOT FOUND in {path}"))
    else: miss(path)

print("\n=== 8. LIVE CROSS-MODULE CHECK ===")
# 8a. Embeddings & metadata alignment
try:
    import numpy as np
    emb=np.load("data/automotive/embeddings/automotive_embeddings.npy")
    ok(f"Embeddings shape={emb.shape} dtype={emb.dtype}")
    meta=list(csv.DictReader(open("data/automotive/embeddings/automotive_metadata.csv",newline="",encoding="utf-8")))
    ok(f"Metadata rows={len(meta)}")
    (ok(f"Emb<->Meta aligned ({emb.shape[0]})") if emb.shape[0]==len(meta) else fail(f"Mismatch: {emb.shape[0]} emb vs {len(meta)} meta"))
except Exception as e: fail(f"Emb/meta: {e}")

# 8b. Cluster model
try:
    import joblib
    m=joblib.load("models/automotive_cluster_model.joblib")
    ok(f"Cluster model: {type(m).__name__} k={getattr(m,'n_clusters','?')}")
except Exception as e: fail(f"Cluster model: {e}")

# 8c. AutomotiveAdapter - pass project root (cwd) not the subdirectory
try:
    A=imported.get("AutomotiveAdapter")
    if A:
        from pathlib import Path
        adapter=A(Path(".").resolve())  # project root
        cat=adapter.build_catalog()
        ok(f"AutomotiveAdapter catalog: {len(cat)} rows")
        required_cols={"item_id","make","model","model_year","file_path","category"}
        missing_cols=required_cols-set(cat.columns)
        (ok(f"Schema valid: {list(cat.columns)}") if not missing_cols else fail(f"Missing cols: {missing_cols}"))
except Exception as e: fail(f"Adapter: {e}")

# 8d. SimilarityEngine - use set_catalog() (no .fit() method)
try:
    SE=imported.get("SimilarityEngine")
    if SE and "emb" in dir():
        import pandas as pd
        meta_df=pd.read_csv("data/automotive/embeddings/automotive_metadata.csv")
        FE=imported.get("FeatureExtractor")
        engine=SE(embeddings=emb, metadata_df=meta_df, feature_extractor=FE())
        results=engine.find_similar_by_vector(emb[0], top_k=3)
        ok(f"SimilarityEngine.find_similar_by_vector() -> {len(results)} results")
        ok(f"  top match: {results[0].get('item_id','?')} sim={results[0].get('similarity_score',0):.4f}")
except Exception as e: fail(f"SimilarityEngine: {e}")

print("\n=== SUMMARY ===")
if not errors and not warnings:
    print("  ALL CHECKS PASSED - System fully healthy")
elif errors:
    print(f"  {len(errors)} ERROR(S):")
    for e in errors: print(f"    * {e}")
    if warnings:
        print(f"  {len(warnings)} WARNING(S):")
        for w in warnings: print(f"    * {w}")
else:
    print(f"  No errors. {len(warnings)} WARNING(S):")
    for w in warnings: print(f"    * {w}")
