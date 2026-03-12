import json
import os
from fastapi import APIRouter
from ....core.config import settings

router = APIRouter()

@router.get("/")
async def get_zones():
    """Returns the list of zones from GeoJSON."""
    zones_file = os.path.join(settings.DATA_DIR, "wayanad_zones.json")
    if os.path.exists(zones_file):
        with open(zones_file, "r") as f:
            data = json.load(f)
            return data.get("zones", [])
    
    # Fallback to frontend public data if needed
    frontend_zones_file = os.path.join(os.path.dirname(os.path.dirname(settings.AI_ML_DIR)), "Frontend", "public", "data", "zones.geojson")
    if os.path.exists(frontend_zones_file):
        with open(frontend_zones_file, "r") as f:
            data = json.load(f)
            return data.get("features", [])
            
    return []
