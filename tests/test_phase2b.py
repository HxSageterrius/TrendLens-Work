"""
Smoke tests for Phase 2b (Prophet Forecasting & MAPE Evaluation)
Tests Prophet fitting, MAPE calculation, yearly rollup, and PostgreSQL insertion.
"""

from pathlib import Path
import numpy as np
import pandas as pd
import psycopg
import pytest
from dotenv import load_dotenv
import os

from ml.forecast import (
    calculate_mape,
    forecast_cluster_36_months,
    run_forecasting_pipeline,
)

load_dotenv()


def test_calculate_mape():
    """Verify MAPE calculation with predictable numbers."""
    y_true = np.array([10.0, 20.0, 30.0])
    y_pred = np.array([11.0, 18.0, 33.0])  # errors: 10%, 10%, 10%
    mape = calculate_mape(y_true, y_pred)
    assert np.isclose(mape, 10.0, atol=1e-3)


def test_forecast_cluster_synthetic():
    """Verify Prophet forecast generates 3 yearly projections for 2026-2028."""
    # 60 monthly periods
    dates = pd.date_range("2021-01-01", "2025-12-01", freq="MS")
    # Linear trend + slight noise
    values = 10.0 + np.linspace(0, 15, len(dates))
    series = pd.Series(values, index=dates.strftime("%Y-%m"))
    
    yearly_recs, mape = forecast_cluster_36_months(
        series=series,
        cluster_id=0,
        domain="fashion",
        forecast_months=36
    )
    
    assert len(yearly_recs) == 3
    years = [r["year"] for r in yearly_recs]
    assert years == [2026, 2027, 2028]
    assert mape >= 0.0
    
    for r in yearly_recs:
        assert r["yhat"] >= 0.0
        assert r["lower"] >= 0.0
        assert r["upper"] >= 0.0
        assert r["lower"] <= r["yhat"] <= r["upper"]


def test_end_to_end_forecasting_pipeline():
    """Verify full forecasting pipeline writes records to database."""
    result = run_forecasting_pipeline(domain="fashion")
    
    assert len(result["forecasts"]) > 0
    assert len(result["mapes"]) > 0
    
    # Check PostgreSQL 'forecasts' table
    db_url = os.environ.get("DATABASE_URL")
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT count(*), count(DISTINCT cluster_id), count(DISTINCT year) 
                FROM forecasts 
                WHERE domain = 'fashion'
            """)
            total_rows, n_clusters, n_years = cur.fetchone()
            assert n_years == 3  # 2026, 2027, 2028
            assert total_rows == n_clusters * 3
            
            # Check values are valid non-negative numbers
            cur.execute("SELECT min(yhat), min(lower), max(upper) FROM forecasts WHERE domain = 'fashion'")
            min_yhat, min_lower, max_upper = cur.fetchone()
            assert min_yhat >= 0.0
            assert min_lower >= 0.0
            assert max_upper > 0.0
