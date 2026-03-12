from fastapi import APIRouter, Query
from ....schemas import SimulateResponse, PredictionResponse, AlertsResponse, VulnerabilityAnalysis, ROIAnalysis, HardenResponse
from ....services.ai_ml_service import ai_ml_service

router = APIRouter()

@router.post("/simulate", response_model=SimulateResponse)
async def run_simulation():
    """Trigger a full 100-scenario simulation."""
    return ai_ml_service.run_simulation()

@router.get("/predictions", response_model=PredictionResponse)
async def get_predictions(scenario: str = 'current'):
    """Get flood risk predictions."""
    preds = ai_ml_service.predict_zones(scenario)
    return {"predictions": preds}

@router.get("/alerts/summary", response_model=AlertsResponse)
async def get_alerts_summary(scenario: str = '2024_peak'):
    """Get stakeholder action plans."""
    predictions = ai_ml_service.predict_zones(scenario)
    all_actions = []
    for pred in predictions:
        if pred['alert_level'] != 'GREEN':
            res = ai_ml_service.trigger_alerts(pred['zone_id'], scenario)
            if res:
                all_actions.extend(res['action_plan']['action_plans'])
    return {"action_plan": {"action_plans": all_actions}}

@router.get("/analytics/vulnerability-map", response_model=VulnerabilityAnalysis)
async def get_vulnerability_map():
    """Identify structural singularities."""
    return ai_ml_service.get_vulnerabilities()

@router.post("/harden/{node_id}", response_model=HardenResponse)
async def calculate_roi(node_id: str, cost_rupees: float = 1000000):
    """What-If hardening analysis."""
    return ai_ml_service.calculate_roi(node_id, cost_rupees)

@router.get("/lead-times")
async def get_lead_times(scenario: str = 'current'):
    """Get lead times for all zones."""
    predictions = ai_ml_service.predict_zones(scenario)
    stakeholder_deadlines = {'dam_operator': 2, 'ndrf': 3, 'district_collector': 3, 'highway_department': 4}
    tickers = []
    for pred in predictions:
        lead = pred['lead_time_hours']
        tickers.append({
            'zone_id': pred['zone_id'],
            'alert_level': pred['alert_level'],
            'flood_probability_pct': round(pred['flood_probability'] * 100, 1),
            'hours_until_peak': lead,
            'stakeholder_action_windows': {s: max(lead - w, 0) for s, w in stakeholder_deadlines.items()},
            'status': 'CRITICAL' if lead <= 4 else ('URGENT' if lead <= 8 else 'MONITORING'),
        })
    return {"lead_time_tickers": tickers}

@router.get("/roi/rankings")
async def rank_roi():
    """Rank ROI for all nodes (mock for now)."""
    # Just returning the nodes from the graph mapped to a mock ROI for speed.
    # We could implement full rankings like main_wayanad.py
    COST = 1000000
    graph = ai_ml_service.get_graph()
    rankings = []
    
    for i, node in enumerate(graph["nodes"]):
        if node["type"] in ["substation", "hospital"]:
            v = node["population_impact"] * 0.5
            rankings.append({
                "node_id": node["id"],
                "node_name": node["name"],
                "hardening_cost_inr": COST,
                "approximate_lives_saved": v,
                "roi_ratio": v / COST * 10 if COST else 0,
                "lives_saved_per_rupee": v / COST if COST else 0,
                "recommendation": "Mock recommendation"
            })
    rankings.sort(key=lambda x: x["lives_saved_per_rupee"], reverse=True)
    return rankings
