"""
TrendLens Data Preparation Module (Phase 1, Task 1)
Samples configured subset with SEED=42, skips unreadable files,
resizes to 224x224, assigns timeline, and inserts rows into PostgreSQL 'images' table.
"""

import argparse
import os
from pathlib import Path
import sys
from typing import List, Tuple
from PIL import Image
import numpy as np
import psycopg
from dotenv import load_dotenv

from ml.config import (
    CARS_RAW_DIR,
    CARS_SUBSET_SIZE,
    FASHION_RAW_DIR,
    FASHION_SUBSET_SIZE,
    IMAGE_SIZE,
    PROCESSED_DIR,
    SEED,
)
from ml.timeline import assign_timeline

load_dotenv()


def get_db_connection():
    """Returns a psycopg connection to the PostgreSQL database."""
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL environment variable is not set. Check your .env file.")
    return psycopg.connect(db_url, connect_timeout=5)


def discover_raw_images(raw_dir: Path) -> List[Path]:
    """Recursively finds all image files in the target raw directory."""
    extensions = {".jpg", ".jpeg", ".png", ".webp"}
    if not raw_dir.is_dir():
        return []
    
    found = []
    for ext in extensions:
        found.extend(raw_dir.rglob(f"*{ext}"))
        found.extend(raw_dir.rglob(f"*{ext.upper()}"))
    
    # Sort for deterministic sampling
    found = sorted(list(set(found)))
    return found


def sample_images(image_paths: List[Path], target_size: int, seed: int = SEED) -> List[Path]:
    """Deterministically samples up to target_size images."""
    if len(image_paths) <= target_size:
        return image_paths
    
    rng = np.random.RandomState(seed)
    indices = rng.choice(len(image_paths), size=target_size, replace=False)
    indices.sort()
    return [image_paths[i] for i in indices]


def process_and_resize_image(src_path: Path, dest_path: Path) -> bool:
    """
    Validates, converts to RGB, resizes to IMAGE_SIZE (224, 224), and saves.
    Returns True on success, False if file is corrupted/unreadable.
    """
    try:
        with Image.open(src_path) as img:
            rgb_img = img.convert("RGB")
            resized = rgb_img.resize(IMAGE_SIZE, Image.Resampling.BILINEAR)
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            resized.save(dest_path, "JPEG", quality=90)
            return True
    except Exception as e:
        print(f"Skipping corrupted image {src_path.name}: {e}")
        return False


def prepare_dataset(
    domain: str,
    raw_dir: Path,
    subset_size: int,
    db_conn = None,
    clean_existing: bool = True
) -> int:
    """
    Prepares dataset for the specified domain:
    1. Discovers raw images.
    2. Samples configured subset size with SEED=42.
    3. Resizes to 224x224 and writes to data/processed/{domain}/.
    4. Generates timeline dates.
    5. Inserts metadata into PostgreSQL 'images' table.
    """
    print(f"[{domain.upper()}] Scanning raw directory: {raw_dir}")
    all_images = discover_raw_images(raw_dir)
    print(f"[{domain.upper()}] Found {len(all_images)} total images in {raw_dir}")
    
    if len(all_images) == 0:
        print(f"[{domain.upper()}] Warning: No images found in {raw_dir}. Please place dataset images there.")
        return 0
    
    sampled = sample_images(all_images, target_size=subset_size)
    print(f"[{domain.upper()}] Sampled {len(sampled)} images (subset limit: {subset_size})")
    
    target_processed_dir = PROCESSED_DIR / domain
    target_processed_dir.mkdir(parents=True, exist_ok=True)
    
    valid_records = []
    print(f"[{domain.upper()}] Processing and resizing images to {IMAGE_SIZE}...")
    for idx, img_path in enumerate(sampled):
        # Save processed image as domain_00000.jpg
        out_filename = f"{domain}_{idx:06d}.jpg"
        out_path = target_processed_dir / out_filename
        
        if process_and_resize_image(img_path, out_path):
            valid_records.append((img_path, out_path))
            
    print(f"[{domain.upper()}] Successfully processed {len(valid_records)} valid images.")
    if len(valid_records) == 0:
        return 0
    
    # Generate timeline dates
    dest_paths = [rec[1] for rec in valid_records]
    src_paths = [rec[0] for rec in valid_records]
    dates = assign_timeline(domain=domain, image_paths=src_paths)
    
    # Insert records into PostgreSQL
    owns_conn = False
    if db_conn is None:
        db_conn = get_db_connection()
        owns_conn = True
        
    try:
        with db_conn.cursor() as cur:
            if clean_existing:
                # Remove dependent records in image_clusters first to respect foreign key constraint
                cur.execute("""
                    DELETE FROM image_clusters 
                    WHERE image_id IN (SELECT id FROM images WHERE domain = %s)
                """, (domain,))
                # Remove existing images for this domain
                cur.execute("DELETE FROM images WHERE domain = %s", (domain,))
                print(f"[{domain.upper()}] Cleared previous image records for domain '{domain}'.")
                
            insert_query = """
                INSERT INTO images (domain, path, taken_on, embed_index)
                VALUES (%s, %s, %s, %s)
            """
            
            rows = [
                (domain, str(dest_path.relative_to(PROCESSED_DIR.parent)), dt, embed_idx)
                for embed_idx, (dest_path, dt) in enumerate(zip(dest_paths, dates))
            ]
            
            cur.executemany(insert_query, rows)
            db_conn.commit()
            print(f"[{domain.upper()}] Inserted {len(rows)} records into 'images' table.")
            return len(rows)
    finally:
        if owns_conn:
            db_conn.close()


def main():
    parser = argparse.ArgumentParser(description="TrendLens Data Preparation")
    parser.add_argument("--domain", choices=["fashion", "cars"], default="fashion", help="Target domain")
    parser.add_argument("--smoke-test", action="store_true", help="Run smoke test on 50 images")
    parser.add_argument("--subset", type=int, default=None, help="Custom subset size")
    args = parser.parse_args()
    
    if args.domain == "fashion":
        raw_dir = FASHION_RAW_DIR
        default_size = 50 if args.smoke_test else FASHION_SUBSET_SIZE
    else:
        raw_dir = CARS_RAW_DIR
        default_size = 50 if args.smoke_test else CARS_SUBSET_SIZE
        
    subset_size = args.subset if args.subset is not None else default_size
    prepare_dataset(domain=args.domain, raw_dir=raw_dir, subset_size=subset_size)


if __name__ == "__main__":
    main()

