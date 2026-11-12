"""
TrendLens Similarity Search Module (Phase 2, Task 3)
- Extracts L2-normalized CLIP embedding for a query image
- Computes cosine similarity against stored embeddings with NumPy
- Aggregates top-50 nearest neighbors by cluster
- Returns top 3 matching clusters with similarity scores, names, and trend labels
"""

import argparse
import io
import json
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
import numpy as np
import psycopg
import torch
from PIL import Image
from dotenv import load_dotenv

from ml.config import EMBEDDINGS_DIR, PROJECT_ROOT
from ml.embeddings import FeatureExtractor

load_dotenv()


def get_db_connection():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL not set in environment or .env file.")
    return psycopg.connect(db_url, connect_timeout=5)


class SimilaritySearchEngine:
    """
    In-memory cosine similarity search engine for style cluster retrieval.
    Caches stored embeddings, cluster mapping, and CLIP extractor.
    """
    
    def __init__(self, domain: str = "fashion", extractor: Optional[FeatureExtractor] = None):
        self.domain = domain
        self.extractor = extractor or FeatureExtractor(model_type="clip")
        
        # Load stored embeddings and IDs
        npy_path = EMBEDDINGS_DIR / f"{domain}_clip.npy"
        ids_path = EMBEDDINGS_DIR / f"{domain}_ids.json"
        
        if not npy_path.is_file() or not ids_path.is_file():
            raise FileNotFoundError(f"Embeddings artifacts missing for domain '{domain}'. Run ml.embeddings first.")
            
        self.embeddings = np.load(npy_path)
        with open(ids_path, "r", encoding="utf-8") as f:
            self.ids_data = json.load(f)
            
        assert self.embeddings.shape[0] == len(self.ids_data), "Embeddings row count does not match IDs count."
        
        # Load cluster assignments and labels from database
        self.image_to_cluster = {}
        self.cluster_meta = {}
        self._load_cluster_metadata()

    def _load_cluster_metadata(self):
        """Loads cluster IDs, names, and latest trend labels from PostgreSQL."""
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    # 1. Map each image_id to its K-Means cluster
                    cur.execute("""
                        SELECT image_id, cluster_id 
                        FROM image_clusters 
                        WHERE algo = 'kmeans'
                    """)
                    for img_id, cid in cur.fetchall():
                        self.image_to_cluster[img_id] = cid
                        
                    # 2. Get cluster names
                    cur.execute("SELECT cluster_id, name FROM clusters WHERE domain = %s", (self.domain,))
                    cluster_names = {cid: name for cid, name in cur.fetchall()}
                    
                    # 3. Get cluster latest trend labels
                    cur.execute("""
                        SELECT DISTINCT ON (cluster_id) cluster_id, label 
                        FROM trends 
                        WHERE domain = %s 
                        ORDER BY cluster_id, year DESC
                    """, (self.domain,))
                    cluster_labels = {cid: lbl for cid, lbl in cur.fetchall()}
                    
                    for cid, name in cluster_names.items():
                        self.cluster_meta[cid] = {
                            "name": name,
                            "label": cluster_labels.get(cid, "stable")
                        }
        except Exception as e:
            print(f"[SIMILARITY] Notice: DB metadata lookup failed ({e}). Using fallback naming.")
            # Fallback metadata if DB offline
            unique_clusters = {r.get("cluster_id", 0) for r in self.ids_data}
            for cid in unique_clusters:
                self.cluster_meta[cid] = {"name": f"Style {cid}", "label": "stable"}

    def find_similar_from_pil(
        self,
        query_image: Image.Image,
        top_k_neighbors: int = 50,
        top_n_clusters: int = 3,
        return_dict: bool = False
    ) -> Union[List[Dict], Dict]:
        """
        Embeds a PIL Image and returns top matching clusters by cosine similarity.
        Optionally returns detailed nearest neighbor images when return_dict=True.
        """
        # Extract L2-normalized 512-dim embedding
        q_emb = self.extractor.extract_batch([query_image])[0]
        
        # Cosine similarity via NumPy dot product: dot(stored, q)
        sim_scores = np.dot(self.embeddings, q_emb)
        
        # Get top-k nearest neighbors
        k = min(top_k_neighbors, len(sim_scores))
        top_indices = np.argpartition(sim_scores, -k)[-k:]
        # Sort descending by score
        top_indices = top_indices[np.argsort(-sim_scores[top_indices])]
        
        # 1. Collect individual top matching images (nearest neighbors)
        similar_images = []
        for idx in top_indices[:6]:
            img_id = int(self.ids_data[idx]["image_id"])
            cid = int(self.image_to_cluster.get(img_id, idx % max(1, len(self.cluster_meta))))
            meta = self.cluster_meta.get(cid, {"name": f"Style {cid}", "label": "stable"})
            score = float(sim_scores[idx])
            similar_images.append({
                "image_id": img_id,
                "score": round(score, 3),
                "cluster_id": cid,
                "cluster_name": meta["name"],
                "cluster_label": meta["label"],
                "url": f"/images/{img_id}"
            })

        # 2. Collect sample images per cluster from top neighbors
        cluster_samples: Dict[int, List[int]] = {}
        cluster_scores = {}
        cluster_counts = {}
        
        for idx in top_indices:
            score = float(sim_scores[idx])
            img_id = int(self.ids_data[idx]["image_id"])
            # Fallback cluster from embed_index if not in map
            cid = int(self.image_to_cluster.get(img_id, idx % max(1, len(self.cluster_meta))))
            
            cluster_scores[cid] = cluster_scores.get(cid, 0.0) + score
            cluster_counts[cid] = cluster_counts.get(cid, 0) + 1
            
            if cid not in cluster_samples:
                cluster_samples[cid] = []
            if len(cluster_samples[cid]) < 4:
                cluster_samples[cid].append(img_id)
            
        # Weighted cluster score: (mean similarity) * 0.7 + (frequency in top-k neighbors) * 0.3
        ranked_clusters = []
        for cid, total_sim in cluster_scores.items():
            count = cluster_counts[cid]
            mean_sim = total_sim / count
            weight = count / k
            blended_score = float(mean_sim * 0.7 + weight * 0.3)
            
            meta = self.cluster_meta.get(cid, {"name": f"Style {cid}", "label": "stable"})
            ranked_clusters.append({
                "cluster_id": int(cid),
                "name": meta["name"],
                "label": meta["label"],
                "score": round(blended_score, 3),
                "sample_images": cluster_samples.get(cid, [])
            })
            
        # Sort descending by score
        ranked_clusters.sort(key=lambda x: x["score"], reverse=True)
        top_matches = ranked_clusters[:top_n_clusters]

        if return_dict:
            return {
                "matches": top_matches,
                "similar_images": similar_images
            }
        return top_matches

    def find_similar_from_bytes(
        self,
        image_bytes: bytes,
        top_k_neighbors: int = 50,
        top_n_clusters: int = 3,
        return_dict: bool = False
    ) -> Union[List[Dict], Dict]:
        """Loads image bytes and returns top clusters and nearest images."""
        with Image.open(io.BytesIO(image_bytes)) as img:
            rgb_img = img.convert("RGB")
            return self.find_similar_from_pil(
                rgb_img,
                top_k_neighbors=top_k_neighbors,
                top_n_clusters=top_n_clusters,
                return_dict=return_dict
            )


def find_similar_clusters(
    domain: str,
    image_input: Union[bytes, Path, str, Image.Image],
    top_n: int = 3
) -> List[Dict]:
    """Convenience helper for API and CLI querying."""
    engine = SimilaritySearchEngine(domain=domain)
    if isinstance(image_input, Image.Image):
        return engine.find_similar_from_pil(image_input, top_n_clusters=top_n)
    elif isinstance(image_input, bytes):
        return engine.find_similar_from_bytes(image_input, top_n_clusters=top_n)
    else:
        path = Path(image_input)
        with Image.open(path) as img:
            rgb_img = img.convert("RGB")
            return engine.find_similar_from_pil(rgb_img, top_n_clusters=top_n)


def main():
    parser = argparse.ArgumentParser(description="TrendLens Visual Similarity Search")
    parser.add_argument("--domain", choices=["fashion", "cars"], default="fashion")
    parser.add_argument("--image", type=str, required=True, help="Path to query image")
    parser.add_argument("--top-n", type=int, default=3, help="Number of clusters to return")
    args = parser.parse_args()
    
    matches = find_similar_clusters(domain=args.domain, image_input=args.image, top_n=args.top_n)
    print(f"\nTop {len(matches)} Style Matches for: {args.image}")
    for i, m in enumerate(matches, 1):
        print(f"  {i}. [{m['score']:.3f}] Cluster {m['cluster_id']}: {m['name']} ({m['label'].upper()})")


if __name__ == "__main__":
    main()
