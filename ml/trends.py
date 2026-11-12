"""
TrendLens Trends Analytics Module (Phase 2, Task 1)
- Computes monthly cluster shares across the 60-month timeline (Decision D2)
- Performs yearly rollup (mean monthly share per year)
- Classifies trends into emerging, declining, or stable based on the +5/-5 rule (Decision D4)
- Writes trend summaries to PostgreSQL 'trends' table
- Exports monthly time series to data/processed/{domain}_monthly_shares.csv for Prophet
"""

import argparse
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
import psycopg
from dotenv import load_dotenv

from ml.config import (
    DECLINING_THRESHOLD,
    EMERGING_THRESHOLD,
    PROCESSED_DIR,
    TIMELINE_END_DATE,
    TIMELINE_START_DATE,
)

load_dotenv()


def get_db_connection():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL not set in environment or .env file.")
    return psycopg.connect(db_url, connect_timeout=5)


def classify_trend(
    first_year_share: float,
    last_year_share: float,
    emerging_thresh: float = EMERGING_THRESHOLD,
    declining_thresh: float = DECLINING_THRESHOLD
) -> str:
    """
    Decision D4 (Single source of truth):
    delta = last_year_share - first_year_share in percentage points.
    delta > +5.0 -> 'emerging'
    delta < -5.0 -> 'declining'
    otherwise    -> 'stable'
    """
    delta = last_year_share - first_year_share
    if delta > emerging_thresh:
        return "emerging"
    elif delta < declining_thresh:
        return "declining"
    return "stable"


def fetch_image_cluster_dates(domain: str) -> pd.DataFrame:
    """
    Fetches image ID, taken_on date, and K-Means cluster_id from PostgreSQL.
    Returns: pd.DataFrame with columns ['image_id', 'taken_on', 'cluster_id']
    """
    query = """
        SELECT i.id, i.taken_on, ic.cluster_id
        FROM images i
        JOIN image_clusters ic ON i.id = ic.image_id
        WHERE i.domain = %s AND ic.algo = 'kmeans'
        ORDER BY i.taken_on ASC
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (domain,))
            rows = cur.fetchall()
            
    if not rows:
        raise RuntimeError(f"No image clusters found for domain '{domain}'. Run ml.cluster first.")
        
    df = pd.DataFrame(rows, columns=["image_id", "taken_on", "cluster_id"])
    df["taken_on"] = pd.to_datetime(df["taken_on"])
    return df


def compute_monthly_cluster_shares(
    df: pd.DataFrame,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> pd.DataFrame:
    """
    Decision D2:
    Computes percentage share per month for every cluster across the timeline.
    Returns DataFrame indexed by period ('YYYY-MM') with columns for each cluster_id,
    where each row sums to 100.0%.
    """
    if start_date is None:
        min_year = int(df["taken_on"].dt.year.min())
        start_date = f"{min_year}-01-01"
    if end_date is None:
        max_year = int(df["taken_on"].dt.year.max())
        end_date = f"{max_year}-12-31"

    # Create complete month index
    month_range = pd.date_range(start=start_date, end=end_date, freq="MS")
    all_periods = month_range.strftime("%Y-%m").tolist()
    
    unique_clusters = sorted(df["cluster_id"].unique())
    df["period"] = df["taken_on"].dt.strftime("%Y-%m")
    
    # Count images per (period, cluster_id)
    counts = df.groupby(["period", "cluster_id"]).size().unstack(fill_value=0)
    
    # Reindex to guarantee all 60 months and all clusters exist
    counts = counts.reindex(index=all_periods, columns=unique_clusters, fill_value=0)
    
    # Compute monthly share percentage
    monthly_totals = counts.sum(axis=1)
    # Avoid zero division: if month has 0 images, distribute uniformly or 0
    shares = counts.div(monthly_totals.replace(0, np.nan), axis=0) * 100.0
    shares = shares.fillna(100.0 / len(unique_clusters))
    
    shares.index.name = "period"
    return shares


def compute_yearly_trends(
    monthly_shares: pd.DataFrame,
    domain: str
) -> List[Dict]:
    """
    Decision D2 & D4:
    Rolls up monthly shares into yearly averages per cluster.
    Applies the D4 trend classification (+5/-5 point delta rule).
    Returns list of dicts:
      [{'domain': ..., 'cluster_id': ..., 'year': ..., 'share': ..., 'label': ...}]
    """
    # Add year column
    df_shares = monthly_shares.copy()
    df_shares["year"] = [int(p.split("-")[0]) for p in df_shares.index]
    
    # Compute mean monthly share per year
    yearly_avg = df_shares.groupby("year").mean()
    years = sorted(yearly_avg.index.tolist())
    first_year = years[0]
    last_year = years[-1]
    
    trend_records = []
    
    for cluster_id in monthly_shares.columns:
        if cluster_id == "year":
            continue
            
        cluster_id = int(cluster_id)
        first_share = float(yearly_avg.loc[first_year, cluster_id])
        last_share = float(yearly_avg.loc[last_year, cluster_id])
        
        # Apply Decision D4 classification rule
        label = classify_trend(first_share, last_share)
        
        for yr in years:
            yr_share = round(float(yearly_avg.loc[yr, cluster_id]), 2)
            trend_records.append({
                "domain": domain,
                "cluster_id": cluster_id,
                "year": int(yr),
                "share": yr_share,
                "label": label
            })
            
    return trend_records


def run_trends_pipeline(domain: str = "fashion") -> Tuple[pd.DataFrame, List[Dict]]:
    """
    Executes the Phase 2a trends pipeline:
    1. Fetches clustered images from database.
    2. Computes 60-month time series of cluster shares (Decision D2).
    3. Rolls up to yearly averages with trend labels (Decision D4).
    4. Writes results to PostgreSQL 'trends' table.
    5. Saves monthly shares to data/processed/{domain}_monthly_shares.csv.
    """
    print(f"\n=======================================================")
    print(f"Starting Trends Pipeline for Domain: '{domain}'")
    print(f"=======================================================")
    
    df = fetch_image_cluster_dates(domain)
    print(f"[DATA] Fetched {len(df)} clustered records from database.")
    
    # 1. Compute monthly shares (Decision D2)
    monthly_shares = compute_monthly_cluster_shares(df)
    print(f"[TRENDS] Computed monthly shares across {len(monthly_shares)} months.")
    
    # Save monthly shares for Prophet (Phase 2b)
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    csv_path = PROCESSED_DIR / f"{domain}_monthly_shares.csv"
    monthly_shares.to_csv(csv_path)
    print(f"[EXPORT] Saved monthly time series to: {csv_path}")
    
    # 2. Yearly rollup & trend labels (Decision D4)
    yearly_records = compute_yearly_trends(monthly_shares, domain)
    print(f"[TRENDS] Generated {len(yearly_records)} yearly trend records.")
    
    # Print trend summary
    clusters = sorted(list(set(r["cluster_id"] for r in yearly_records)))
    years = sorted(list(set(r["year"] for r in yearly_records)))
    
    print("\n--- Summary of Yearly Cluster Shares & Labels (Decision D4) ---")
    for cid in clusters:
        c_recs = [r for r in yearly_records if r["cluster_id"] == cid]
        shares_str = ", ".join(f"{r['year']}: {r['share']:.1f}%" for r in c_recs)
        label = c_recs[0]["label"].upper()
        delta = c_recs[-1]["share"] - c_recs[0]["share"]
        print(f"  Cluster {cid} [{label} | Delta: {delta:+.2f} pts] -> {shares_str}")
        
    # 3. Write to PostgreSQL 'trends' table
    print("\n--- Writing to PostgreSQL 'trends' Table ---")
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM trends WHERE domain = %s", (domain,))
            
            insert_query = """
                INSERT INTO trends (domain, cluster_id, year, share, label)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (domain, cluster_id, year) 
                DO UPDATE SET share = EXCLUDED.share, label = EXCLUDED.label
            """
            
            rows = [
                (r["domain"], r["cluster_id"], r["year"], r["share"], r["label"])
                for r in yearly_records
            ]
            cur.executemany(insert_query, rows)
            conn.commit()
            print(f"[DB] Successfully inserted {len(rows)} records into 'trends' table.")
            
    return monthly_shares, yearly_records


def main():
    parser = argparse.ArgumentParser(description="TrendLens Trends Analytics Pipeline")
    parser.add_argument("--domain", choices=["fashion", "cars"], default="fashion")
    args = parser.parse_args()
    run_trends_pipeline(domain=args.domain)


if __name__ == "__main__":
    main()
