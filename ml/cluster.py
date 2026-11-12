"""
TrendLens Clustering Module (Phase 1, Tasks 4 & 5)
- K-Means with optimal k searched over 4-10 by silhouette score (Decision D5)
- ResNet-50 silhouette comparison
- DBSCAN with eps search on cosine distance (reports cluster count & noise ratio)
- Writes results to PostgreSQL 'clusters' and 'image_clusters' tables
- Generates 3x4 contact sheets for each cluster in docs/clusters/{domain}/ (Decision D3)
- Generates data/processed/{domain}_cluster_names.json for team renaming
"""

import argparse
import json
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import numpy as np
import psycopg
from PIL import Image, ImageDraw, ImageFont
from dotenv import load_dotenv
from sklearn.cluster import DBSCAN, KMeans
from sklearn.metrics import silhouette_score

from ml.config import (
    CLUSTERS_DOCS_DIR,
    CONTACT_SHEET_GRID,
    DBSCAN_METRIC,
    EMBEDDINGS_DIR,
    K_MAX,
    K_MIN,
    PROCESSED_DIR,
    PROJECT_ROOT,
    SAMPLES_PER_CLUSTER,
    SEED,
)

load_dotenv()


def get_db_connection():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL not set in environment or .env file.")
    return psycopg.connect(db_url, connect_timeout=5)


def load_domain_embeddings(domain: str, model_type: str = "clip") -> Tuple[np.ndarray, List[Dict]]:
    """Loads embeddings matrix and corresponding image IDs from data/embeddings/."""
    npy_path = EMBEDDINGS_DIR / f"{domain}_{model_type}.npy"
    ids_path = EMBEDDINGS_DIR / f"{domain}_ids.json"
    
    if not npy_path.is_file():
        raise FileNotFoundError(f"Embeddings file not found: {npy_path}. Run ml.embeddings first.")
    if not ids_path.is_file():
        raise FileNotFoundError(f"IDs file not found: {ids_path}. Run ml.embeddings first.")
        
    embeddings = np.load(npy_path)
    with open(ids_path, "r", encoding="utf-8") as f:
        ids_data = json.load(f)
        
    assert embeddings.shape[0] == len(ids_data), f"Mismatch: {embeddings.shape[0]} vectors vs {len(ids_data)} IDs"
    return embeddings, ids_data


def find_optimal_kmeans(
    embeddings: np.ndarray,
    k_min: int = K_MIN,
    k_max: int = K_MAX,
    seed: int = SEED
) -> Tuple[KMeans, int, float, Dict[int, float]]:
    """
    Evaluates K-Means clustering over k range [k_min, k_max] using silhouette score.
    Returns: (best_model, best_k, best_score, score_dict)
    """
    n_samples = embeddings.shape[0]
    # Bound k_max by n_samples - 1
    actual_k_max = min(k_max, max(k_min, n_samples - 1))
    
    scores = {}
    best_score = -1.0
    best_k = k_min
    best_model = None
    
    for k in range(k_min, actual_k_max + 1):
        km = KMeans(n_clusters=k, random_state=seed, n_init=10)
        labels = km.fit_predict(embeddings)
        
        # Calculate silhouette score with cosine distance
        score = float(silhouette_score(embeddings, labels, metric="cosine"))
        scores[k] = round(score, 4)
        print(f"  [K-Means] k={k} -> Silhouette Score (cosine): {score:.4f}")
        
        if score > best_score:
            best_score = score
            best_k = k
            best_model = km
            
    return best_model, best_k, best_score, scores


def run_dbscan_search(
    embeddings: np.ndarray,
    eps_candidates: List[float] = [0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.5],
    min_samples: int = 3
) -> Tuple[np.ndarray, float, int, float]:
    """
    Searches eps candidates for DBSCAN with cosine metric.
    Returns: (best_labels, best_eps, cluster_count, noise_ratio)
    """
    best_labels = None
    best_eps = eps_candidates[0]
    best_n_clusters = 0
    best_noise_ratio = 1.0
    
    for eps in eps_candidates:
        db = DBSCAN(eps=eps, min_samples=min_samples, metric="cosine")
        labels = db.fit_predict(embeddings)
        
        n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
        noise_count = int(np.sum(labels == -1))
        noise_ratio = noise_count / len(labels)
        
        print(f"  [DBSCAN] eps={eps:.2f} -> clusters={n_clusters}, noise={noise_count}/{len(labels)} ({noise_ratio:.1%})")
        
        # Prefer eps that discovers multiple clusters with reasonable noise (< 50%)
        if n_clusters >= 2 and noise_ratio < 0.6:
            if n_clusters > best_n_clusters or (n_clusters == best_n_clusters and noise_ratio < best_noise_ratio):
                best_n_clusters = n_clusters
                best_noise_ratio = noise_ratio
                best_eps = eps
                best_labels = labels
                
    if best_labels is None:
        # Fallback to middle candidate
        mid_eps = eps_candidates[len(eps_candidates) // 2]
        db = DBSCAN(eps=mid_eps, min_samples=min_samples, metric="cosine")
        best_labels = db.fit_predict(embeddings)
        best_eps = mid_eps
        best_n_clusters = len(set(best_labels)) - (1 if -1 in best_labels else 0)
        best_noise_ratio = float(np.sum(best_labels == -1)) / len(best_labels)
        
    return best_labels, best_eps, best_n_clusters, best_noise_ratio


def generate_contact_sheets(
    domain: str,
    ids_data: List[Dict],
    kmeans_labels: np.ndarray,
    embeddings: np.ndarray,
    kmeans_centers: np.ndarray,
    cluster_names: Dict[int, str]
) -> List[Path]:
    """
    Generates a 3x4 contact sheet (12 sample images) for each K-Means cluster.
    Images are chosen based on proximity to cluster centroid.
    Saves to docs/clusters/{domain}/cluster_{cluster_id}.jpg (Decision D3).
    """
    out_dir = CLUSTERS_DOCS_DIR / domain
    out_dir.mkdir(parents=True, exist_ok=True)
    
    rows, cols = CONTACT_SHEET_GRID
    thumb_w, thumb_h = 160, 160
    header_h = 40
    padding = 8
    
    sheet_w = cols * (thumb_w + padding) + padding
    sheet_h = rows * (thumb_h + padding) + padding + header_h
    
    generated_paths = []
    unique_clusters = sorted(list(set(kmeans_labels)))
    
    for cid in unique_clusters:
        cluster_mask = (kmeans_labels == cid)
        cluster_indices = np.where(cluster_mask)[0]
        
        # Sort cluster items by distance to centroid (closest first)
        center = kmeans_centers[cid]
        cluster_embeds = embeddings[cluster_indices]
        # Cosine distance to centroid: 1 - dot(v, center)
        dist = 1.0 - np.dot(cluster_embeds, center)
        sorted_order = np.argsort(dist)
        selected_indices = cluster_indices[sorted_order[:SAMPLES_PER_CLUSTER]]
        
        # Create canvas
        sheet = Image.new("RGB", (sheet_w, sheet_h), color=(245, 245, 248))
        draw = ImageDraw.Draw(sheet)
        
        # Title header
        name = cluster_names.get(cid, f"Style {cid}")
        title = f"{domain.capitalize()} Cluster {cid}: {name} ({len(cluster_indices)} images)"
        draw.text((padding + 4, 12), title, fill=(20, 20, 30))
        
        # Paste thumbnails in 3x4 grid
        for i, idx in enumerate(selected_indices):
            r = i // cols
            c = i % cols
            x = padding + c * (thumb_w + padding)
            y = header_h + padding + r * (thumb_h + padding)
            
            img_info = ids_data[idx]
            full_img_path = PROJECT_ROOT / "data" / img_info["path"]
            
            try:
                if full_img_path.is_file():
                    with Image.open(full_img_path) as im:
                        thumb = im.convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.BILINEAR)
                else:
                    thumb = Image.new("RGB", (thumb_w, thumb_h), color=(200, 200, 200))
            except Exception:
                thumb = Image.new("RGB", (thumb_w, thumb_h), color=(200, 200, 200))
                
            sheet.paste(thumb, (x, y))
            
        sheet_path = out_dir / f"cluster_{cid}.jpg"
        sheet.save(sheet_path, "JPEG", quality=90)
        generated_paths.append(sheet_path)
        print(f"  [Contact Sheet] Saved {sheet_path.name} with {len(selected_indices)} exemplars.")
        
    return generated_paths


def run_clustering_pipeline(
    domain: str = "fashion",
    k_min: int = K_MIN,
    k_max: int = K_MAX,
    seed: int = SEED
) -> Dict:
    """
    Executes full Phase 1c clustering pipeline:
    1. Loads CLIP ViT-B/32 & ResNet-50 embeddings.
    2. Runs silhouette search on both to compare.
    3. Fits optimal K-Means on CLIP embeddings.
    4. Runs DBSCAN for outlier/noise analysis.
    5. Saves cluster names JSON & contact sheets.
    6. Updates 'clusters' and 'image_clusters' tables in PostgreSQL.
    """
    print(f"\n=======================================================")
    print(f"Starting Clustering Pipeline for Domain: '{domain}'")
    print(f"=======================================================")
    
    # 1. Load CLIP embeddings (Primary)
    clip_embeds, ids_data = load_domain_embeddings(domain, model_type="clip")
    print(f"[DATA] Loaded CLIP ViT-B/32 matrix: {clip_embeds.shape}")
    
    # 2. Load ResNet-50 embeddings for comparison
    resnet_embeds, _ = load_domain_embeddings(domain, model_type="resnet50")
    print(f"[DATA] Loaded ResNet-50 matrix: {resnet_embeds.shape}")
    
    # 3. K-Means Silhouette Search (CLIP vs ResNet-50)
    print("\n--- Evaluating CLIP ViT-B/32 K-Means Silhouettes ---")
    clip_km, clip_best_k, clip_best_score, clip_scores = find_optimal_kmeans(
        clip_embeds, k_min=k_min, k_max=k_max, seed=seed
    )
    
    print("\n--- Evaluating ResNet-50 Baseline K-Means Silhouettes ---")
    _, resnet_best_k, resnet_best_score, resnet_scores = find_optimal_kmeans(
        resnet_embeds, k_min=k_min, k_max=k_max, seed=seed
    )
    
    print(f"\n[COMPARISON] Silhouette Comparison (Higher is better):")
    print(f"  CLIP ViT-B/32: Best k={clip_best_k} with Silhouette={clip_best_score:.4f}")
    print(f"  ResNet-50:     Best k={resnet_best_k} with Silhouette={resnet_best_score:.4f}")
    
    # 4. Fit chosen K-Means labels (Decision D5: Trends use K-Means)
    kmeans_labels = clip_km.labels_
    
    # 5. DBSCAN Clustering (Decision D5: Comparison & outlier detection)
    print("\n--- Running DBSCAN on CLIP Embeddings ---")
    dbscan_labels, best_eps, dbscan_clusters, noise_ratio = run_dbscan_search(clip_embeds)
    print(f"[DBSCAN] Best eps={best_eps:.2f} -> Discovered {dbscan_clusters} clusters with noise ratio: {noise_ratio:.1%}")
    
    # 6. Cluster Naming JSON (Decision D3)
    names_json_path = PROCESSED_DIR / f"{domain}_cluster_names.json"
    cluster_names = {}
    if names_json_path.is_file():
        try:
            with open(names_json_path, "r", encoding="utf-8") as f:
                loaded = json.load(f)
                cluster_names = {int(k): v for k, v in loaded.items()}
        except Exception:
            pass
            
    # Default names: Style 0, Style 1, ...
    for cid in range(clip_best_k):
        if cid not in cluster_names:
            cluster_names[cid] = f"Style {cid}"
            
    with open(names_json_path, "w", encoding="utf-8") as f:
        json.dump({str(k): v for k, v in cluster_names.items()}, f, indent=2)
    print(f"[NAMING] Saved cluster names to {names_json_path}")
    
    # 7. Generate Contact Sheets (Decision D3)
    print("\n--- Generating Cluster Contact Sheets ---")
    sheets = generate_contact_sheets(
        domain=domain,
        ids_data=ids_data,
        kmeans_labels=kmeans_labels,
        embeddings=clip_embeds,
        kmeans_centers=clip_km.cluster_centers_,
        cluster_names=cluster_names
    )
    
    # 8. Store results in PostgreSQL database
    print("\n--- Writing Clusters & Assignments to PostgreSQL ---")
    db_conn = get_db_connection()
    try:
        with db_conn.cursor() as cur:
            # Update 'clusters' table
            cur.execute("DELETE FROM clusters WHERE domain = %s", (domain,))
            cluster_insert_query = """
                INSERT INTO clusters (domain, cluster_id, name)
                VALUES (%s, %s, %s)
                ON CONFLICT (domain, cluster_id) DO UPDATE SET name = EXCLUDED.name
            """
            cluster_rows = [
                (domain, cid, cluster_names[cid])
                for cid in range(clip_best_k)
            ]
            cur.executemany(cluster_insert_query, cluster_rows)
            print(f"[DB] Inserted {len(cluster_rows)} clusters into 'clusters' table.")
            
            # Update 'image_clusters' table
            # Fetch current live image IDs from database ordered by embed_index to ensure FK consistency
            cur.execute("""
                SELECT id FROM images 
                WHERE domain = %s 
                ORDER BY embed_index ASC
            """, (domain,))
            db_image_ids = [r[0] for r in cur.fetchall()]
            
            if len(db_image_ids) == len(kmeans_labels):
                image_ids = db_image_ids
            else:
                image_ids = [r["image_id"] for r in ids_data]

            cur.execute("""
                DELETE FROM image_clusters 
                WHERE image_id IN (SELECT id FROM images WHERE domain = %s)
            """, (domain,))
            
            img_cluster_query = """
                INSERT INTO image_clusters (image_id, algo, cluster_id)
                VALUES (%s, %s, %s)
            """
            
            # K-Means rows
            km_rows = [
                (img_id, "kmeans", int(lbl))
                for img_id, lbl in zip(image_ids, kmeans_labels)
            ]
            cur.executemany(img_cluster_query, km_rows)
            
            # DBSCAN rows
            db_rows = [
                (img_id, "dbscan", int(lbl))
                for img_id, lbl in zip(image_ids, dbscan_labels)
            ]
            cur.executemany(img_cluster_query, db_rows)
            
            db_conn.commit()
            print(f"[DB] Inserted {len(km_rows)} K-Means & {len(db_rows)} DBSCAN records into 'image_clusters'.")
    finally:
        db_conn.close()
        
    return {
        "domain": domain,
        "best_k": clip_best_k,
        "clip_silhouette": clip_best_score,
        "clip_scores": clip_scores,
        "resnet_best_k": resnet_best_k,
        "resnet_silhouette": resnet_best_score,
        "resnet_scores": resnet_scores,
        "dbscan_clusters": dbscan_clusters,
        "dbscan_noise_ratio": noise_ratio,
        "contact_sheets": [str(s) for s in sheets]
    }


def main():
    parser = argparse.ArgumentParser(description="TrendLens Clustering Pipeline")
    parser.add_argument("--domain", choices=["fashion", "cars"], default="fashion")
    parser.add_argument("--k-min", type=int, default=K_MIN)
    parser.add_argument("--k-max", type=int, default=K_MAX)
    args = parser.parse_args()
    
    run_clustering_pipeline(domain=args.domain, k_min=args.k_min, k_max=args.k_max)


if __name__ == "__main__":
    main()

