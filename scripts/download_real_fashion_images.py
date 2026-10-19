"""
TrendLens — Real Fashion Image Downloader
Downloads high-quality real clothing images from Unsplash (free CDN)
mapped to each catalog item by style + category.
"""
import sys
import time
import urllib.request
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
IMAGES_DIR = PROJECT_ROOT / "data" / "fashion_trends" / "images"
IMAGES_DIR.mkdir(parents=True, exist_ok=True)

# Unsplash direct image URLs (free-to-use, no key required via source.unsplash.com)
# Format: item_filename -> Unsplash photo URL (w=400)
REAL_IMAGE_MAP = {
    "FSH_0001_streetwear_shirt.jpg":    "https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=400&q=85&fit=crop",
    "FSH_0002_streetwear_trousers.jpg": "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=85&fit=crop",
    "FSH_0003_streetwear_jacket.jpg":   "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&q=85&fit=crop",
    "FSH_0004_streetwear_jacket.jpg":   "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&q=85&fit=crop",
    "FSH_0005_streetwear_shirt.jpg":    "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=400&q=85&fit=crop",
    "FSH_0006_streetwear_trousers.jpg": "https://images.unsplash.com/photo-1519058082700-08a0b56da9b4?w=400&q=85&fit=crop",
    "FSH_0007_y2k_shirt.jpg":           "https://images.unsplash.com/photo-1554568218-0f1715e72254?w=400&q=85&fit=crop",
    "FSH_0008_y2k_trousers.jpg":        "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&q=85&fit=crop",
    "FSH_0009_y2k_jacket.jpg":          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=85&fit=crop",
    "FSH_0010_y2k_dress.jpg":           "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&q=85&fit=crop",
    "FSH_0011_y2k_shirt.jpg":           "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&q=85&fit=crop",
    "FSH_0012_y2k_skirt.jpg":           "https://images.unsplash.com/photo-1583496661160-fb5218a6bf5d?w=400&q=85&fit=crop",
    "FSH_0013_minimalist_shirt.jpg":    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=85&fit=crop",
    "FSH_0014_minimalist_trousers.jpg": "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&q=85&fit=crop",
    "FSH_0015_minimalist_jacket.jpg":   "https://images.unsplash.com/photo-1548778943-5bbeeb1ba6c1?w=400&q=85&fit=crop",
    "FSH_0016_minimalist_dress.jpg":    "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&q=85&fit=crop",
    "FSH_0017_minimalist_shirt.jpg":    "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&q=85&fit=crop",
    "FSH_0018_minimalist_trousers.jpg": "https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=400&q=85&fit=crop",
    "FSH_0019_denim_jacket.jpg":        "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=400&q=85&fit=crop",
    "FSH_0020_denim_trousers.jpg":      "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=85&fit=crop",
    "FSH_0021_denim_jacket.jpg":        "https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=400&q=85&fit=crop",
    "FSH_0022_denim_shirt.jpg":         "https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=400&q=85&fit=crop",
    "FSH_0023_denim_trousers.jpg":      "https://images.unsplash.com/photo-1555689502-c4b22d76c56f?w=400&q=85&fit=crop",
    "FSH_0024_denim_dress.jpg":         "https://images.unsplash.com/photo-1612336307429-8a898d10e223?w=400&q=85&fit=crop",
    "FSH_0025_cottagecore_dress.jpg":   "https://images.unsplash.com/photo-1618354691229-88d47f285158?w=400&q=85&fit=crop",
    "FSH_0026_cottagecore_shirt.jpg":   "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&q=85&fit=crop",
    "FSH_0027_cottagecore_jacket.jpg":  "https://images.unsplash.com/photo-1571455786673-9d9d6c194f90?w=400&q=85&fit=crop",
    "FSH_0028_cottagecore_skirt.jpg":   "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=85&fit=crop",
    "FSH_0029_cottagecore_shirt.jpg":   "https://images.unsplash.com/photo-1545291730-faff8ca1d4b0?w=400&q=85&fit=crop",
    "FSH_0030_cottagecore_dress.jpg":   "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400&q=85&fit=crop",
    "FSH_0031_athleisure_shirt.jpg":    "https://images.unsplash.com/photo-1565084888279-aca607ecce0c?w=400&q=85&fit=crop",
    "FSH_0032_athleisure_trousers.jpg": "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400&q=85&fit=crop",
    "FSH_0033_athleisure_jacket.jpg":   "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=85&fit=crop",
    "FSH_0034_athleisure_jacket.jpg":   "https://images.unsplash.com/photo-1519864600265-abb23847ef2c?w=400&q=85&fit=crop",
    "FSH_0035_athleisure_trousers.jpg": "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=400&q=85&fit=crop",
    "FSH_0036_athleisure_dress.jpg":    "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=400&q=85&fit=crop",
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    "Accept": "image/webp,image/jpeg,image/*",
}

def download_image(url: str, dest: Path) -> bool:
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()
        if len(data) < 5000:
            print(f"  ⚠️  Too small ({len(data)} bytes), skipping")
            return False
        with open(dest, "wb") as f:
            f.write(data)
        return True
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def main():
    print("=" * 60)
    print("TrendLens — Real Fashion Image Downloader")
    print("=" * 60)
    ok = 0
    fail = 0
    for i, (filename, url) in enumerate(REAL_IMAGE_MAP.items(), 1):
        dest = IMAGES_DIR / filename

        if dest.exists() and dest.stat().st_size > 20000:
            print(f"  [OK] {filename} ({dest.stat().st_size//1024}KB already present)")
            ok += 1
            continue
        print(f"  [DL] Downloading {filename}...")
        if download_image(url, dest):
            size = dest.stat().st_size
            print(f"       Saved {size//1024}KB -> {dest.name}")
            ok += 1
        else:
            fail += 1
        time.sleep(0.3)  # be polite to Unsplash CDN

    print()
    print("=" * 60)
    print(f"Done: {ok} downloaded/verified, {fail} failed")
    print(f"Images saved to: {IMAGES_DIR}")
    print("=" * 60)

if __name__ == "__main__":
    main()
