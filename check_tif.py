import rasterio
import sys

try:
    with rasterio.open(r"c:\Users\EmilShain\Code\Team-kore-hackathena\AI_ML\data\wayanad_satellite.tif") as src:
        print(f"Bounds: {src.bounds}")
        print(f"CRS: {src.crs}")
except Exception as e:
    print(f"Error: {e}")
