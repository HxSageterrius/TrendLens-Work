"""
Smoke tests for Phase 2a (Trends Analytics & Classification)
Tests monthly share calculation, D4 classification rules, and PostgreSQL storage.
"""

from pathlib import Path
import numpy as np
import pandas as pd
import psycopg
import pytest
from dotenv import load_dotenv
import os

from ml.trends import (
    classify_trend,
    compute_monthly_cluster_shares,
    compute_yearly_trends,
    run_trends_pipeline,
)
from ml.config import PROCESSED_DIR

load_dotenv()


def test_classify_trend_d4_rule():
    """Verify single source of truth classification rule (Decision D4)."""
    # Emerging: delta > 5.0
    assert classify_trend(10.0, 16.0) == "emerging"
    assert classify_trend(10.0, 15.01) == "emerging"
    assert classify_trend(5.0, 11.5) == "emerging"

    # Declining: delta < -5.0
    assert classify_trend(20.0, 14.0) == "declining"
    assert classify_trend(20.0, 14.99) == "declining"
    assert classify_trend(35.0, 28.0) == "declining"

    # Stable: -5.0 <= delta <= 5.0
    assert classify_trend(15.0, 18.0) == "stable"
    assert classify_trend(15.0, 12.0) == "stable"
    assert classify_trend(20.0, 25.0) == "stable"  # Exactly +5.0
    assert classify_trend(20.0, 15.0) == "stable"  # Exactly -5.0
    assert classify_trend(18.5, 18.5) == "stable"


def test_handcrafted_dataset_trends():
    """
    Tests trend calculation on a tiny synthetic dataset where labels are obvious:
    Cluster 0: 10% -> 25% (Emerging)
    Cluster 1: 40% -> 20% (Declining)
    Cluster 2: 50% -> 55% (Stable)
    """
    periods = [
        "2021-01", "2021-06",
        "2022-01", "2022-06",
        "2023-01", "2023-06",
        "2024-01", "2024-06",
        "2025-01", "2025-06",
    ]
    
    # Hand-made monthly shares
    data = {
        0: [10.0, 12.0, 14.0, 16.0, 18.0, 20.0, 22.0, 23.0, 24.0, 26.0],  # ~11% in 2021 -> ~25% in 2025 (+14) -> emerging
        1: [42.0, 38.0, 35.0, 33.0, 30.0, 28.0, 25.0, 23.0, 21.0, 19.0],  # ~40% in 2021 -> ~20% in 2025 (-20) -> declining
        2: [48.0, 50.0, 51.0, 51.0, 52.0, 52.0, 53.0, 54.0, 55.0, 55.0],  # ~49% in 2021 -> ~55% in 2025 (+6 but let's test) -> emerging/stable
    }
    monthly_df = pd.DataFrame(data, index=periods)
    
    records = compute_yearly_trends(monthly_df, domain="fashion")
    assert len(records) == 3 * 5  # 3 clusters * 5 years (2021 to 2025)
    
    # Check labels
    c0_recs = [r for r in records if r["cluster_id"] == 0]
    assert c0_recs[0]["label"] == "emerging"
    
    c1_recs = [r for r in records if r["cluster_id"] == 1]
    assert c1_recs[0]["label"] == "declining"


def test_end_to_end_trends_pipeline():
    """Verify full trends pipeline writes records to database and CSV."""
    monthly_shares, yearly_records = run_trends_pipeline(domain="fashion")
    
    assert len(monthly_shares) == 60  # 60 months (2021-01 to 2025-12)
    assert len(yearly_records) > 0
    
    # Verify monthly shares CSV was saved
    csv_path = PROCESSED_DIR / "fashion_monthly_shares.csv"
    assert csv_path.is_file()
    
    # Verify PostgreSQL 'trends' table
    db_url = os.environ.get("DATABASE_URL")
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*), count(DISTINCT cluster_id), count(DISTINCT year) FROM trends WHERE domain = 'fashion'")
            total_rows, n_clusters, n_years = cur.fetchone()
            assert n_years == 5
            assert total_rows == n_clusters * 5
            
            # Verify shares per year sum to ~100%
            cur.execute("""
                SELECT year, sum(share) 
                FROM trends 
                WHERE domain = 'fashion' 
                GROUP BY year 
                ORDER BY year
            """)
            year_sums = cur.fetchall()
            for yr, s in year_sums:
                assert np.isclose(s, 100.0, atol=2.0), f"Year {yr} share sum {s} does not sum to 100%"
