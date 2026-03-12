from fastapi import APIRouter, Depends
from ....schemas import GraphResponse
from ....services.ai_ml_service import ai_ml_service

router = APIRouter()

@router.get("/graph", response_model=GraphResponse)
async def get_infrastructure_graph():
    """Returns the full infrastructure graph (nodes + edges)."""
    return ai_ml_service.get_graph()
