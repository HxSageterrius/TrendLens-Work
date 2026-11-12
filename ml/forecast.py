"""
TrendLens Forecasting Module (Phase 2, Task 2)
- Fits Facebook Prophet on 60-month cluster shares (Decision D2)
- Evaluates MAPE per cluster on a 6-month holdout
- Forecasts 36 months ahead (2026, 2027, 2028)
- Rolls up monthly forecasts into yearly yhat, lower, and upper bounds
- Writes forecasts to PostgreSQL 'forecasts' table
"""

import argparse
import os
from pathlib import Path
from typing import Dict, List, Tuple
import numpy as np
import pandas as pd
import psycopg
from dotenv import load_dotenv
from prophet import Prophet

from ml.config import PROCESSED_DIR

load_dotenv()


def get_db_connection():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL not set in environment or .env file.")
    return psycopg.connect(db_url, connect_timeout=5)


def load_monthly_shares(domain: str) -> pd.DataFrame:
    """Loads 60-month cluster share series from CSV."""
    csv_path = PROCESSED_DIR / f"{domain}_monthly_shares.csv"
    if not csv_path.is_file():
        raise FileNotFoundError(f"Monthly shares CSV not found: {csv_path}. Run ml.trends first.")
    df = pd.read_csv(csv_path, index_col="period")
    return df


def calculate_mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """
    Computes Mean Absolute Percentage Error (MAPE).
    Uses safe denominator to prevent division by zero.
    """
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    # Clip denominator to at least 0.5% share to avoid exploding MAPE on near-zero shares
    denom = np.maximum(np.abs(y_true), 0.5)
    ape = np.abs((y_true - y_pred) / denom)
    return float(np.mean(ape) * 100.0)


def fit_and_evaluate_cluster(
    series: pd.Series,
    holdout_months: int = 6
) -> float:
    """
    Fits Prophet on series[:-holdout_months] and evaluates MAPE on holdout.
    """
    # Prophet requires 'ds' (datestamp) and 'y' (target)
    df = pd.DataFrame({
        "ds": pd.to_datetime(series.index),
        "y": series.values
    })
    
    if len(df) <= holdout_months + 6:
        return 0.0
        
    train_df = df.iloc[:-holdout_months]
    test_df = df.iloc[-holdout_months:]
    
    # Linear growth, no weekly/daily seasonality, yearly seasonality enabled
    m = Prophet(
        growth="linear",
        weekly_seasonality=False,
        daily_seasonality=False,
        yearly_seasonality=True,
        interval_width=0.80
    )
    m.fit(train_df)
    
    future = m.make_future_dataframe(periods=holdout_months, freq="MS")
    forecast = m.predict(future)
    pred_holdout = forecast.iloc[-holdout_months:]["yhat"].values
    
    mape = calculate_mape(test_df["y"].values, pred_holdout)
    return mape


def forecast_cluster_36_months(
    series: pd.Series,
    cluster_id: int,
    domain: str,
    forecast_months: int = 36
) -> Tuple[List[Dict], float]:
    """
    Fits Prophet on all historical points and forecasts 36 months ahead.
    Rolls up monthly forecasts to yearly values (2026, 2027, 2028).
    """
    df = pd.DataFrame({
        "ds": pd.to_datetime(series.index),
        "y": series.values
    })
    
    # 1. Compute holdout MAPE
    mape = fit_and_evaluate_cluster(series, holdout_months=6)
    
    # 2. Fit on full history
    m = Prophet(
        growth="linear",
        weekly_seasonality=False,
        daily_seasonality=False,
        yearly_seasonality=True,
        interval_width=0.80
    )
    m.fit(df)
    
    # 3. Forecast 36 months forward
    future = m.make_future_dataframe(periods=forecast_months, freq="MS")
    forecast = m.predict(future)
    
    # Filter to only future periods
    future_forecast = forecast.iloc[len(df):].copy()
    future_forecast["year"] = future_forecast["ds"].dt.year
    
    # 4. Roll up to yearly values (mean across months of that year)
    yearly_records = []
    for yr, group in future_forecast.groupby("year"):
        yhat = max(0.0, float(group["yhat"].mean()))
        lower = max(0.0, float(group["yhat_lower"].mean()))
        upper = max(0.0, float(group["yhat_upper"].mean()))
        
        # Ensure logical lower <= yhat <= upper
        if lower > yhat:
            lower = yhat
        if upper < yhat:
            upper = yhat
            
        yearly_records.append({
            "domain": domain,
            "cluster_id": cluster_id,
            "year": int(yr),
            "yhat": round(yhat, 2),
            "lower": round(lower, 2),
            "upper": round(upper, 2)
        })
        
    return yearly_records, mape


def run_forecasting_pipeline(domain: str = "fashion") -> Dict:
    """
    Executes the Phase 2b forecasting pipeline:
    1. Loads monthly shares.
    2. Runs Prophet forecasting per cluster with 6-month holdout MAPE.
    3. Rolls up to yearly predictions for 2026, 2027, 2028.
    4. Writes records to PostgreSQL 'forecasts' table.
    """
    print(f"\n=======================================================")
    print(f"Starting Forecasting Pipeline for Domain: '{domain}'")
    print(f"=======================================================")
    
    monthly_shares = load_monthly_shares(domain)
    cluster_cols = [c for c in monthly_shares.columns if c != "period"]
    print(f"[DATA] Loaded {len(monthly_shares)} monthly observations for {len(cluster_cols)} clusters.")
    
    all_forecast_records = []
    cluster_mapes = {}
    
    print("\n--- Fitting Prophet Models & Evaluating Holdout MAPE ---")
    for col in cluster_cols:
        cluster_id = int(col)
        series = monthly_shares[col]
        
        records, mape = forecast_cluster_36_months(series, cluster_id, domain)
        all_forecast_records.extend(records)
        cluster_mapes[cluster_id] = mape
        
        # Format display string
        fc_str = ", ".join(f"{r['year']}: {r['yhat']:.1f}% [{r['lower']:.1f}-{r['upper']:.1f}]" for r in records)
        print(f"  Cluster {cluster_id} | 6-Mo Holdout MAPE: {mape:5.1f}% | Forecast -> {fc_str}")
        
    # Write to PostgreSQL 'forecasts' table
    print("\n--- Writing Forecasts to PostgreSQL 'forecasts' Table ---")
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM forecasts WHERE domain = %s", (domain,))
            
            insert_query = """
                INSERT INTO forecasts (domain, cluster_id, year, yhat, lower, upper)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (domain, cluster_id, year)
                DO UPDATE SET yhat = EXCLUDED.yhat, lower = EXCLUDED.lower, upper = EXCLUDED.upper
            """
            
            rows = [
                (r["domain"], r["cluster_id"], r["year"], r["yhat"], r["lower"], r["upper"])
                for r in all_forecast_records
            ]
            cur.executemany(insert_query, rows)
            conn.commit()
            print(f"[DB] Successfully inserted {len(rows)} records into 'forecasts' table.")
            
    return {
        "domain": domain,
        "mapes": cluster_mapes,
        "forecasts": all_forecast_records
    }


def main():
    parser = argparse.ArgumentParser(description="TrendLens Forecasting Pipeline")
    parser.add_argument("--domain", choices=["fashion", "cars"], default="fashion")
    args = parser.parse_args()
    run_forecasting_pipeline(domain=args.domain)


if __name__ == "__main__":
    main()
