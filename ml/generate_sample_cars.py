"""
Generates representative raw car images for Phase 4 (Cars proof-of-concept)
following Stanford Cars naming conventions: '{Make} {Model} {BodyType} {Year}'.
Creates 5 classes across 5 distinct model years (2011 to 2015) with 10 images each (50 total).
"""

from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

from ml.config import CARS_RAW_DIR, SEED

CAR_CLASSES = [
    ("Acura RL Sedan 2011", (30, 60, 180)),       # Deep Blue Sedan
    ("Audi A4 Sedan 2012", (200, 30, 40)),        # Red Sedan
    ("BMW X5 SUV 2013", (40, 160, 60)),           # Forest Green SUV
    ("Ford Mustang Convertible 2014", (220, 180, 20)), # Yellow Sports Car
    ("Tesla Model S 2015", (150, 150, 160)),      # Silver EV
]

def generate_cars_dataset(num_per_class: int = 10, seed: int = SEED):
    rng = np.random.RandomState(seed)
    CARS_RAW_DIR.mkdir(parents=True, exist_ok=True)
    
    total_created = 0
    for class_name, base_color in CAR_CLASSES:
        class_dir = CARS_RAW_DIR / class_name
        class_dir.mkdir(parents=True, exist_ok=True)
        
        for idx in range(num_per_class):
            # Generate 256x256 image with class color palette + structured shapes
            img = Image.new("RGB", (256, 256), color=(240, 240, 240))
            draw = ImageDraw.Draw(img)
            
            # Variations in base color
            jitter = rng.randint(-25, 26, size=3)
            color = tuple(int(np.clip(c + j, 0, 255)) for c, j in zip(base_color, jitter))
            
            # Car body geometry
            draw.rectangle([30, 120, 226, 200], fill=color, outline=(20, 20, 20), width=2)
            # Cabin / roof
            draw.polygon([(60, 120), (90, 60), (170, 60), (200, 120)], fill=color, outline=(20, 20, 20))
            # Windows
            draw.polygon([(70, 115), (95, 70), (165, 70), (190, 115)], fill=(180, 220, 240))
            # Wheels
            draw.ellipse([50, 180, 90, 220], fill=(30, 30, 30), outline=(100, 100, 100), width=2)
            draw.ellipse([166, 180, 206, 220], fill=(30, 30, 30), outline=(100, 100, 100), width=2)
            
            # Subtle noise for natural variation
            noise = rng.randint(0, 15, (256, 256, 3), dtype=np.uint8)
            img_arr = np.clip(np.array(img, dtype=np.int16) + noise, 0, 255).astype(np.uint8)
            final_img = Image.fromarray(img_arr)
            
            file_name = f"{class_name}_{idx:03d}.jpg"
            final_img.save(class_dir / file_name, "JPEG", quality=90)
            total_created += 1
            
    print(f"Successfully generated {total_created} sample car images in {CARS_RAW_DIR}")
    return total_created

if __name__ == "__main__":
    generate_cars_dataset()
