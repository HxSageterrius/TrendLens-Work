"""
Smoke tests for Phase 1c (Clustering & Contact Sheets)
Tests K-Means silhouette search, DBSCAN, database insertion, and contact sheets.
"""

import json
from pathlib import Path
import psycopg
import pytest
from dotenv import load_dotenv
import os

from ml.cluster import (
    find_optimal_kmeans,
    load_domain_embeddings,
    run_clustering_pipeline,
    run_dbscan_search,
)
from ml.config import CLUSTERS_DOCS_DIR, PROCESSED_DIR

load_dotenv()


def test_kmeans_silhouette_search():
    """Verify K-Means selects optimal k between 4 and 10 with silhouette score."""
    embeddings, _ = load_domain_embeddings(domain="fashion", model_type="clip")
    best_model, best_k, best_score, scores = find_optimal_kmeans(embeddings, k_min=4, k_max=8)
    
    assert 4 <= best_k <= 8
    assert -1.0 <= best_score <= 1.0
    assert len(scores) == 5  # 4, 5, 6, 7, 8


def test_dbscan_search():
    """Verify DBSCAN discovers clusters and flags noise."""
    embeddings, _ = load_domain_embeddings(domain="fashion", model_type="clip")
    labels, best_eps, n_clusters, noise_ratio = run_dbscan_search(embeddings)
    
    assert len(labels) == embeddings.shape[0]
    assert 0.0 <= noise_ratio <= 1.0


def test_end_to_end_clustering_pipeline():
    """Verify full clustering pipeline populates database and creates contact sheets."""
    results = run_clustering_pipeline(domain="fashion", k_min=4, k_max=8)
    
    assert results["best_k"] >= 4
    assert len(results["contact_sheets"]) == results["best_k"]
    
    # Check that contact sheets exist on disk
    for sheet_path in results["contact_sheets"]:
        assert Path(sheet_path).is_file()
        
    # Check cluster names JSON exists
    names_json = PROCESSED_DIR / "fashion_cluster_names.json"
    assert names_json.is_file()
    
    # Check PostgreSQL database tables
    db_url = os.environ.get("DATABASE_URL")
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            # Check 'clusters' table
            cur.execute("SELECT count(*) FROM clusters WHERE domain = 'fashion'")
            c_count = cur.fetchone()[0]
            assert c_count == results["best_k"]
            
            # Check 'image_clusters' table for fashion domain
            cur.execute("""
                SELECT count(*) FROM image_clusters ic
                JOIN images i ON ic.image_id = i.id
                WHERE i.domain = 'fashion' AND ic.algo = 'kmeans'
            """)
            km_count = cur.fetchone()[0]
            assert km_count == 50
            
            cur.execute("""
                SELECT count(*) FROM image_clusters ic
                JOIN images i ON ic.image_id = i.id
                WHERE i.domain = 'fashion' AND ic.algo = 'dbscan'
            """)
            db_count = cur.fetchone()[0]
            assert db_count == 50

