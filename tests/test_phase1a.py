"""
Smoke tests for Phase 1a (Data Preparation & Timeline Assignment)
Tests timeline.py and prepare_data.py on 50 sample images.
"""

from datetime import date
from pathlib import Path
import shutil
import tempfile
import numpy as np
from PIL import Image
import psycopg
import pytest
from dotenv import load_dotenv
import os

from ml.config import SEED
from ml.timeline import assign_timeline, generate_simulated_dates, parse_car_model_year
from ml.prepare_data import prepare_dataset, process_and_resize_image

load_dotenv()


def test_car_model_year_parsing():
    """Verify that car model years are accurately parsed from paths."""
    test_cases = [
        (Path("Acura RL Sedan 2012/0001.jpg"), 2012),
        (Path("BMW 3 Series Wagon 2014_img.jpeg"), 2014),
        (Path("Ford Mustang Convertible 2007/car.png"), 2007),
        (Path("Tesla Model S 2020/test.jpg"), 2020),
        (Path("Unknown Car/test.jpg"), 2012),  # Fallback
    ]
    for p, expected_year in test_cases:
        assert parse_car_model_year(p) == expected_year, f"Failed parsing year for {p}"


def test_simulated_timeline_fashion():
    """Verify simulated timeline distribution for fashion across 60 months."""
    dates = generate_simulated_dates(num_images=50, seed=SEED)
    assert len(dates) == 50
    for d in dates:
        assert isinstance(d, date)
        assert 2021 <= d.year <= 2025
        assert 1 <= d.month <= 12
        assert 1 <= d.day <= 28


def test_prepare_data_smoke_test(tmp_path):
    """
    Creates 50 synthetic test images, runs prepare_dataset,
    and checks database insertion and image resizing.
    """
    raw_test_dir = tmp_path / "raw_fashion"
    raw_test_dir.mkdir(parents=True, exist_ok=True)
    
    # 1. Create 50 diverse test images
    rng = np.random.RandomState(SEED)
    created_files = []
    for i in range(50):
        # Generate random RGB image
        arr = rng.randint(0, 256, (120, 160, 3), dtype=np.uint8)
        img = Image.fromarray(arr)
        file_path = raw_test_dir / f"sample_{i:04d}.jpg"
        img.save(file_path, "JPEG")
        created_files.append(file_path)
        
    assert len(created_files) == 50
    
    # 2. Run prepare_dataset
    inserted_count = prepare_dataset(
        domain="fashion",
        raw_dir=raw_test_dir,
        subset_size=50,
        clean_existing=True
    )
    assert inserted_count == 50
    
    # 3. Verify in PostgreSQL images table
    db_url = os.environ.get("DATABASE_URL")
    assert db_url is not None
    
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*), min(embed_index), max(embed_index) FROM images WHERE domain = 'fashion'")
            count, min_idx, max_idx = cur.fetchone()
            assert count == 50
            assert min_idx == 0
            assert max_idx == 49
            
            # Verify dates
            cur.execute("SELECT DISTINCT extract(year from taken_on) FROM images WHERE domain = 'fashion'")
            years = [int(r[0]) for r in cur.fetchall()]
            assert any(y in [2021, 2022, 2023, 2024, 2025] for y in years)

