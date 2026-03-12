from fastapi import APIRouter, Depends, HTTPException
from ....schemas import SensorReading
from ....core.database import get_db
from datetime import datetime
from typing import List

router = APIRouter()

@router.get("/{zone_id}/latest", response_model=SensorReading)
async def get_latest_sensor_reading(zone_id: str):
    """Fetch the most recent sensor reading for a zone from MongoDB."""
    db = get_db()
    
    # In a real app, this would come from a live sensor feed
    # For the demo, we'll try to get it from DB or generate a realistic one
    reading = await db.sensor_readings.find_one(
        {"zone_id": zone_id},
        sort=[("timestamp", -1)]
    )
    
    if not reading:
        # Generate a realistic fallback for the hackathon demo
        return {
            "node_id": f"SENSOR_{zone_id}",
            "zone_id": zone_id,
            "timestamp": datetime.utcnow(),
            "rainfall_mmhr": 2.5,
            "river_level_m": 1.2,
            "reservoir_pct": 82.5,
            "reservoir_inflow_m3s": 450,
            "reservoir_outflow_m3s": 380
        }
    
    return reading

@router.post("/record", status_code=201)
async def record_sensor_reading(reading: SensorReading):
    """Store a new sensor reading in MongoDB."""
    db = get_db()
    # Pydantic's model_dump transforms datetime to string if not handled
    reading_dict = reading.model_dump()
    await db.sensor_readings.insert_one(reading_dict)
    return {"status": "recorded"}
