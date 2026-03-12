from fastapi import APIRouter
from .endpoints import infrastructure, ml, sensors, notifications, zones, cascade

api_router = APIRouter()
api_router.include_router(infrastructure.router, prefix="/infrastructure", tags=["infrastructure"])
api_router.include_router(ml.router, prefix="/ml", tags=["ml"])
api_router.include_router(sensors.router, prefix="/sensors", tags=["sensors"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(zones.router, prefix="/zones", tags=["zones"])
api_router.include_router(cascade.router, prefix="/cascade", tags=["cascade"])
