from fastapi import APIRouter
from ....services.ai_ml_service import ai_ml_service

router = APIRouter()

@router.get("/{zone_id}")
async def get_cascade_analysis(zone_id: str):
    """Get cascade analysis for a specific zone."""
    # Run simulation and filter for nodes in this zone. 
    # For now, we return a mock structured response or full simulation summary.
    sim_data = ai_ml_service.run_simulation()
    
    # Filter the nodes from the graph to give zone-specific cascade details.
    # In a full implementation, you'd map node to zone. 
    # Here we just pass the general vulnerabilities.
    return {
        "zone_id": zone_id,
        "cascade_risk": sim_data["summary"],
        "critical_nodes": [n for n in sim_data["summary"].get("most_vulnerable_nodes", [])]
    }
