"""
TrendLens Timeline Assignment Module (Decision D1)
Assigns a 'taken_on' date to each image.
- Fashion: simulated (uniform deterministic across 2021-01 to 2025-12) or dated from CSV.
- Cars: real model year parsed from class names/filenames.
"""

from datetime import date, datetime
import os
from pathlib import Path
import re
from typing import List, Optional
import numpy as np
import pandas as pd

from ml.config import SEED, TIMELINE_END_DATE, TIMELINE_MODE, TIMELINE_START_DATE


def parse_car_model_year(image_path: Path) -> int:
    """
    Extracts the 4-digit model year from Stanford Cars class names or filenames.
    Example: 'Acura RL Sedan 2012' -> 2012
    Defaults to 2012 if no year pattern matches.
    """
    stem_and_parent = f"{image_path.parent.name} {image_path.stem}"
    match = re.search(r"(?:^|\D)(19\d{2}|20\d{2})(?:\D|$)", stem_and_parent)
    if match:
        year = int(match.group(1))
        if 1990 <= year <= 2025:
            return year
    return 2012  # Fallback median year in Stanford Cars


def generate_simulated_dates(num_images: int, seed: int = SEED) -> List[date]:
    """
    Assigns each image a deterministic date across 60 months (2021-01 to 2025-12).
    Independent of clustering and embeddings (Decision D1).
    """
    start = pd.Timestamp(TIMELINE_START_DATE)
    end = pd.Timestamp(TIMELINE_END_DATE)
    
    # 60 monthly periods
    month_starts = pd.date_range(start=start, end=end, freq="MS")
    num_months = len(month_starts)
    
    rng = np.random.RandomState(seed)
    
    # Distribute images uniformly across the 60 months
    # Each image gets a month assignment, shuffled deterministically
    repeats = int(np.ceil(num_images / num_months))
    assigned_month_indices = np.tile(np.arange(num_months), repeats)[:num_images]
    rng.shuffle(assigned_month_indices)
    
    # Assign a day between 1 and 28 for each image
    assigned_days = rng.randint(1, 29, size=num_images)
    
    dates = []
    for m_idx, d in zip(assigned_month_indices, assigned_days):
        m_start = month_starts[m_idx]
        dates.append(date(m_start.year, m_start.month, int(d)))
        
    return dates


def assign_timeline(
    domain: str,
    image_paths: List[Path],
    mode: Optional[str] = None,
    csv_path: Optional[Path] = None
) -> List[date]:
    """
    Assigns a 'taken_on' date for every image in image_paths.
    
    Parameters:
        domain: 'fashion' or 'cars'
        image_paths: list of Path objects
        mode: 'simulated', 'dated', or None (uses .env TIMELINE_MODE)
        csv_path: optional path to CSV for 'dated' mode
        
    Returns:
        List of python datetime.date objects matching image_paths in length.
    """
    active_mode = mode or TIMELINE_MODE
    
    if domain == "cars":
        # Decision D1: Stanford Cars uses real model years
        # Deterministically assign months and days within the model year for continuous monthly shares (D2)
        rng = np.random.RandomState(SEED)
        assigned_months = rng.randint(1, 13, size=len(image_paths))
        assigned_days = rng.randint(1, 29, size=len(image_paths))
        dates = []
        for p, m, d in zip(image_paths, assigned_months, assigned_days):
            year = parse_car_model_year(p)
            dates.append(date(year, int(m), int(d)))
        return dates
    
    # Fashion domain
    if active_mode == "dated" and csv_path and csv_path.is_file():
        df = pd.read_csv(csv_path)
        date_map = {}
        if "filename" in df.columns and "date" in df.columns:
            for _, row in df.iterrows():
                try:
                    dt = pd.to_datetime(row["date"]).date()
                    date_map[str(row["filename"])] = dt
                except Exception:
                    pass
        
        dates = []
        simulated_fallback = generate_simulated_dates(len(image_paths))
        for idx, p in enumerate(image_paths):
            dates.append(date_map.get(p.name, simulated_fallback[idx]))
        return dates
        
    # Default: simulated
    return generate_simulated_dates(len(image_paths))

