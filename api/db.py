"""
TrendLens Database Module (api/db.py)
PostgreSQL read queries for trends and forecasts adhering to AGENTS.md Section 7 schema.
Plain SQL, no ORM, psycopg driver.
"""

import os
from typing import Dict, List, Optional
from fastapi import HTTPException
import psycopg
from dotenv import load_dotenv

from ml.config import TIMELINE_MODE

load_dotenv()


def get_db_connection():
    """Returns a psycopg connection to the PostgreSQL database."""
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL environment variable is not set. Check your .env file.")
    return psycopg.connect(db_url, connect_timeout=5)


def get_trends_from_db(domain: str) -> Dict:
    """
    Fetches all clusters with yearly share history and trend labels.
    Returns dictionary conforming to API contract:
      {domain, years, mode: 'live', timeline, clusters: [{cluster_id, name, label, share: [...]}]}
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Check if domain exists in clusters
            cur.execute("""
                SELECT c.cluster_id, c.name, t.year, t.share, t.label
                FROM clusters c
                LEFT JOIN trends t ON c.domain = t.domain AND c.cluster_id = t.cluster_id
                WHERE c.domain = %s
                ORDER BY c.cluster_id ASC, t.year ASC
            """, (domain,))
            rows = cur.fetchall()
            
    if not rows:
        raise HTTPException(status_code=404, detail=f"No trend data found for domain '{domain}'")
        
    # Group rows by cluster_id
    clusters_map = {}
    years_set = set()
    
    for cid, name, yr, share, label in rows:
        if cid not in clusters_map:
            clusters_map[cid] = {
                "cluster_id": cid,
                "name": name,
                "label": label or "stable",
                "shares_by_year": {}
            }
        if yr is not None and share is not None:
            clusters_map[cid]["shares_by_year"][int(yr)] = float(share)
            years_set.add(int(yr))
        if label:
            clusters_map[cid]["label"] = label
            
    sorted_years = sorted(list(years_set)) if years_set else [2021, 2022, 2023, 2024, 2025]
    
    cluster_list = []
    for cid in sorted(clusters_map.keys()):
        c_info = clusters_map[cid]
        shares_list = [c_info["shares_by_year"].get(yr, 0.0) for yr in sorted_years]
        cluster_list.append({
            "cluster_id": c_info["cluster_id"],
            "name": c_info["name"],
            "label": c_info["label"],
            "share": shares_list
        })
        
    timeline_str = "real" if domain == "cars" else TIMELINE_MODE
    return {
        "domain": domain,
        "years": sorted_years,
        "mode": "live",
        "timeline": timeline_str,
        "clusters": cluster_list
    }


def get_forecast_from_db(domain: str, cluster_id: int) -> Dict:
    """
    Fetches historical shares and Prophet forecast bounds for a specific cluster.
    Returns dictionary conforming to API contract:
      {cluster_id, name, label, history: [{year, share}], forecast: [{year, yhat, lower, upper}]}
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # 1. Fetch cluster name
            cur.execute("""
                SELECT name FROM clusters 
                WHERE domain = %s AND cluster_id = %s
            """, (domain, cluster_id))
            cluster_row = cur.fetchone()
            if not cluster_row:
                raise HTTPException(status_code=404, detail=f"Cluster {cluster_id} not found in domain '{domain}'")
            name = cluster_row[0]
            
            # 2. Fetch history from trends table
            cur.execute("""
                SELECT year, share, label 
                FROM trends 
                WHERE domain = %s AND cluster_id = %s 
                ORDER BY year ASC
            """, (domain, cluster_id))
            trend_rows = cur.fetchall()
            
            # 3. Fetch future projections from forecasts table
            cur.execute("""
                SELECT year, yhat, lower, upper 
                FROM forecasts 
                WHERE domain = %s AND cluster_id = %s 
                ORDER BY year ASC
            """, (domain, cluster_id))
            forecast_rows = cur.fetchall()

            # 4. Fetch sample image IDs for this cluster (Decision D3 & Phase 5)
            cur.execute("""
                SELECT i.id
                FROM images i
                JOIN image_clusters ic ON i.id = ic.image_id
                WHERE i.domain = %s AND ic.algo = 'kmeans' AND ic.cluster_id = %s
                ORDER BY i.id ASC
                LIMIT 6
            """, (domain, cluster_id))
            sample_ids = [int(r[0]) for r in cur.fetchall()]
            
    label = trend_rows[-1][2] if trend_rows else "stable"
    history = [{"year": int(r[0]), "share": float(r[1])} for r in trend_rows]
    forecast = [
        {
            "year": int(r[0]),
            "yhat": float(r[1]),
            "lower": float(r[2]),
            "upper": float(r[3])
        }
        for r in forecast_rows
    ]
    
    timeline_str = "real" if domain == "cars" else TIMELINE_MODE
    return {
        "domain": domain,
        "cluster_id": cluster_id,
        "name": name,
        "label": label,
        "timeline": timeline_str,
        "history": history,
        "forecast": forecast,
        "sample_images": sample_ids
    }


def get_catalog_from_db(
    domain: str,
    cluster_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0
) -> Dict:
    """
    Fetches real catalog images from the PostgreSQL database joined with their K-Means cluster and trend label.
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # 1. Total count
            if cluster_id is not None:
                cur.execute("""
                    SELECT count(i.id)
                    FROM images i
                    JOIN image_clusters ic ON i.id = ic.image_id
                    WHERE i.domain = %s AND ic.algo = 'kmeans' AND ic.cluster_id = %s
                """, (domain, cluster_id))
            else:
                cur.execute("""
                    SELECT count(i.id)
                    FROM images i
                    JOIN image_clusters ic ON i.id = ic.image_id
                    WHERE i.domain = %s AND ic.algo = 'kmeans'
                """, (domain,))
            total_count = cur.fetchone()[0]

            # 2. Get records
            query = """
                SELECT 
                    i.id,
                    i.domain,
                    i.path,
                    i.taken_on,
                    ic.cluster_id,
                    COALESCE(c.name, 'Style ' || ic.cluster_id) as cluster_name,
                    COALESCE((
                        SELECT label FROM trends 
                        WHERE domain = i.domain AND cluster_id = ic.cluster_id 
                        ORDER BY year DESC LIMIT 1
                    ), 'stable') as cluster_label
                FROM images i
                JOIN image_clusters ic ON i.id = ic.image_id AND ic.algo = 'kmeans'
                LEFT JOIN clusters c ON i.domain = c.domain AND ic.cluster_id = c.cluster_id
                WHERE i.domain = %s
            """
            params: list = [domain]
            if cluster_id is not None:
                query += " AND ic.cluster_id = %s"
                params.append(cluster_id)

            query += " ORDER BY i.id ASC LIMIT %s OFFSET %s"
            params.extend([limit, offset])

            cur.execute(query, tuple(params))
            rows = cur.fetchall()

    items = []
    for row in rows:
        img_id, dom, path, taken_on, cid, cname, clabel = row
        items.append({
            "id": img_id,
            "domain": dom,
            "path": path,
            "url": f"/images/{img_id}",
            "taken_on": str(taken_on),
            "cluster_id": cid,
            "cluster_name": cname,
            "cluster_label": clabel,
        })

    return {
        "domain": domain,
        "cluster_id": cluster_id,
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "images": items
    }
