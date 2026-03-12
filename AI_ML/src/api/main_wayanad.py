"""
Cascadenet — FastAPI Application
Exposes the full cascade simulation pipeline via HTTP endpoints.
"""

import copy
import json
import os
import sys
import threading
import time

# Ensure src is importable when running from AI_ML root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.models.dependency_graph import DependencyGraph
from src.models.hazard_generator import HazardGenerator
from src.models.cascade_propagator import CascadePropagator
from src.models.roi_calculator import ROICalculator
from src.models.lstm_predictor import LSTMFloodPredictor
from src.models.action_router import ActionRouter
from src.models.graph_analytics import GraphAnalytics

# ─── App ─────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Cascadenet API",
    description="Infrastructure cascade failure prediction for Wayanad, Kerala. Asthrava Hackathon.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Singleton pipeline state ────────────────────────────────────────────────

_dep_graph: DependencyGraph | None = None
_hazard_gen: HazardGenerator | None = None
_scenarios: list[dict] | None = None
_baseline_results: list[dict] | None = None
_original_thresholds: dict = {}
_pipeline_lock = threading.Lock()  # Prevents concurrent pipeline initializations

# ─── Simple in-memory response cache (TTL = 60s) ─────────────────────────────
_cache: dict = {}            # key -> (value, expiry_timestamp)
_CACHE_TTL = 60              # seconds

def _cache_get(key: str):
    entry = _cache.get(key)
    if entry and time.time() < entry[1]:
        return entry[0]
    return None

def _cache_set(key: str, value):
    _cache[key] = (value, time.time() + _CACHE_TTL)

# New: LSTM + Action Router singletons
_lstm_predictor: LSTMFloodPredictor | None = None
_action_router: ActionRouter | None = None


def _get_lstm():
    """Lazy-initialize the LSTM predictor."""
    global _lstm_predictor
    if _lstm_predictor is None:
        print("[API] Training LSTM flood predictor...")
        _lstm_predictor = LSTMFloodPredictor()
        acc = _lstm_predictor.build_and_train()
        print(f"[API] LSTM ready. Accuracy: {acc:.1%}")
    return _lstm_predictor


def _get_router():
    """Lazy-initialize the action router."""
    global _action_router
    if _action_router is None:
        _action_router = ActionRouter()
    return _action_router


def _get_pipeline():
    """Lazy-initialize the pipeline on first request (thread-safe)."""
    global _dep_graph, _hazard_gen, _scenarios, _baseline_results, _original_thresholds

    if _baseline_results is not None:
        return _dep_graph, _hazard_gen, _scenarios, _baseline_results

    with _pipeline_lock:
        # Double-check inside lock in case another thread finished first
        if _baseline_results is not None:
            return _dep_graph, _hazard_gen, _scenarios, _baseline_results

        print("[API] Initializing pipeline...")
        dg = DependencyGraph()
        dg.build()
        _original_thresholds = dg.get_node_original_thresholds()

        hg = HazardGenerator(n_scenarios=100)
        sc = hg.generate_scenarios()

        propagator = CascadePropagator(dg.graph, hg)
        results = propagator.run_all_scenarios(sc, use_multiprocessing=False)
        propagator.save_results(results)

        # Assign globals only AFTER everything is ready
        _dep_graph = dg
        _hazard_gen = hg
        _scenarios = sc
        _baseline_results = results

        print("[API] Pipeline ready.")

    return _dep_graph, _hazard_gen, _scenarios, _baseline_results


# ─── Request/Response Models ──────────────────────────────────────────────────

class HardenRequest(BaseModel):
    cost_rupees: float = 1_000_000  # Default 10 lakh INR


# ─── Endpoints ───────────────────────────────────────────────────────────────

@app.on_event("startup")
def _startup_prewarm():
    """Pre-warm the heavy pipeline, LSTM model, and ROI rankings in background threads at server start."""
    def _warm_pipeline():
        try:
            print("[STARTUP] Pre-warming cascade pipeline in background...")
            _get_pipeline()
            print("[STARTUP] Cascade pipeline warm ✓")
        except Exception as e:
            print(f"[STARTUP] Pipeline warm failed: {e}")

    def _warm_lstm():
        try:
            print("[STARTUP] Pre-warming LSTM predictor in background...")
            _get_lstm()
            print("[STARTUP] LSTM predictor warm ✓")
        except Exception as e:
            print(f"[STARTUP] LSTM warm failed: {e}")

    def _warm_roi():
        try:
            # Wait for pipeline to be ready first
            import time as _time
            for _ in range(60):
                if _baseline_results is not None:
                    break
                _time.sleep(2)
            print("[STARTUP] Pre-computing ROI rankings in background...")
            rank_roi()
            print("[STARTUP] ROI rankings cached ✓")
        except Exception as e:
            print(f"[STARTUP] ROI pre-compute failed: {e}")

    threading.Thread(target=_warm_pipeline, daemon=True).start()
    threading.Thread(target=_warm_lstm, daemon=True).start()
    threading.Thread(target=_warm_roi, daemon=True).start()


@app.get("/", tags=["Health"])
def health():
    """Health check endpoint. Returns system status."""
    pipeline_ready = _baseline_results is not None
    lstm_ready = _lstm_predictor is not None and _lstm_predictor._trained
    return {
        "status": "online",
        "project": "Cascadenet",
        "description": "Infrastructure cascade failure prediction — Wayanad, Kerala",
        "team": "Asthrava Hackathon",
        "ready": pipeline_ready and lstm_ready,
        "pipeline_ready": pipeline_ready,
        "lstm_ready": lstm_ready,
        "endpoints": ["/simulate", "/scenarios", "/graph", "/harden/{node_id}", "/roi/rank"],
    }


@app.post("/simulate", tags=["Simulation"])
def simulate():
    """
    Run the full 100-scenario cascade simulation pipeline.
    Returns aggregate statistics and top 5 worst scenarios.
    """
    dg, gen, scenarios, results = _get_pipeline()
    propagator = CascadePropagator(dg.graph, gen)
    summary = propagator.get_summary(results)

    return {
        "status": "success",
        "summary": summary,
        "top_5_worst_scenarios": results[:5],
        "top_5_best_scenarios": results[-5:],
    }


@app.get("/scenarios", tags=["Simulation"])
def get_scenarios():
    """
    Return all 100 scenario results with failure timelines.
    Sorted by population impact (worst first).
    """
    _, _, _, results = _get_pipeline()
    return {
        "total": len(results),
        "scenarios": results,
    }


@app.get("/graph", tags=["Infrastructure"])
def get_graph():
    """Return the full infrastructure graph (nodes + RF-weighted edges). Cached 60s."""
    cached = _cache_get("graph")
    if cached is not None:
        return cached
    dg, _, _, _ = _get_pipeline()
    result = dg.to_dict()
    _cache_set("graph", result)
    return result


@app.get("/node/{node_id}", tags=["Infrastructure"])
def get_node(node_id: str):
    """Get details for a specific infrastructure node."""
    dg, _, _, _ = _get_pipeline()
    if node_id not in dg.graph.nodes:
        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found")

    attrs = dict(dg.graph.nodes[node_id])
    parents = list(dg.graph.predecessors(node_id))
    children = list(dg.graph.successors(node_id))

    return {
        "node_id": node_id,
        "attributes": attrs,
        "parents": parents,
        "children": children,
    }


@app.post("/harden/{node_id}", tags=["What-If Analysis"])
def harden_node(node_id: str, body: HardenRequest):
    """
    Harden a node (set threshold → ∞), re-run simulation, and compute ROI.

    This is the core What-If ROI endpoint for the hackathon demo.
    Shows how much population impact is reduced by protecting one node.
    """
    dg, gen, scenarios, baseline_results = _get_pipeline()

    if node_id not in dg.graph.nodes:
        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found")

    # Save original threshold and harden
    original_thresh = _original_thresholds.get(node_id, dg.graph.nodes[node_id]["flood_threshold"])
    dg.harden_node(node_id)

    # Re-simulate with hardened graph
    propagator = CascadePropagator(dg.graph, gen)
    hardened_results = propagator.run_all_scenarios(scenarios, use_multiprocessing=False)

    # Compute ROI
    roi_calc = ROICalculator()
    roi = roi_calc.calculate_roi(
        graph=dg.graph,
        baseline_results=baseline_results,
        hardened_results=hardened_results,
        cost_rupees=body.cost_rupees,
        node_id=node_id,
    )

    hardened_summary = propagator.get_summary(hardened_results)

    # Restore original threshold after analysis
    dg.soften_node(node_id, original_thresh)

    return {
        "status": "success",
        "action": f"Hardened '{node_id}' for What-If analysis",
        "roi": roi,
        "hardened_simulation_summary": hardened_summary,
        "baseline_avg_impact": sum(r["total_population_impact"] for r in baseline_results) // len(baseline_results),
        "hardened_avg_impact": sum(r["total_population_impact"] for r in hardened_results) // len(hardened_results),
    }


@app.get("/roi/rank", tags=["What-If Analysis"])
def rank_roi():
    """
    Rank all infrastructure nodes by ROI of hardening.
    Shows judges the optimal investment strategy.
    Returns top 10 nodes sorted by Lives-Saved-Per-Rupee.
    Cached for 24h — expensive computation.
    """
    cached = _cache_get("roi_rank")
    if cached is not None:
        return cached

    dg, gen, scenarios, baseline_results = _get_pipeline()
    roi_calc = ROICalculator()
    COST = 1_000_000  # 10 lakh INR per node hardening

    rankings = []
    for node_id in dg.graph.nodes:
        original_thresh = _original_thresholds.get(node_id)
        dg.harden_node(node_id)

        propagator = CascadePropagator(dg.graph, gen)
        hardened_results = propagator.run_all_scenarios(scenarios, use_multiprocessing=False)

        roi = roi_calc.calculate_roi(dg.graph, baseline_results, hardened_results, COST, node_id)
        rankings.append(roi)

        dg.soften_node(node_id, original_thresh)

    rankings.sort(
        key=lambda x: x["lives_saved_per_rupee"] if x["lives_saved_per_rupee"] != float("inf") else 1e18,
        reverse=True,
    )

    result = {
        "status": "success",
        "hardening_cost_per_node_inr": COST,
        "total_nodes_ranked": len(rankings),
        "top_10_by_roi": rankings[:10],
    }
    # Cache for 24 hours — deterministic result, no need to recompute
    _cache["roi_rank"] = (result, time.time() + 86400)
    return result


@app.post("/roi/allocate", tags=["What-If Analysis"])
def allocate_budget(budget_inr: float = 5_000_000):
    """
    Wayanad Strategic Budget Allocator.
    Uses the 0/1 Knapsack Algorithm to select the optimal combination of 
    infrastructure nodes to harden to maximize total lives saved.
    
    Args:
        budget_inr: Total available budget in INR. Default 50 Lakhs (5M).
    """
    dg, gen, scenarios, baseline_results = _get_pipeline()
    roi_calc = ROICalculator()
    COST_PER_NODE = 1_000_000  # Default assumed cost per node
    
    # 1. First, calculate ROI for all candidates individually
    candidates = []
    for node_id in dg.graph.nodes:
        # Only consider Substations and Hospitals for hardening in this demo
        if dg.graph.nodes[node_id]["type"] not in ["substation", "hospital"]:
            continue
            
        original_thresh = _original_thresholds.get(node_id)
        dg.harden_node(node_id)
        
        propagator = CascadePropagator(dg.graph, gen)
        hardened_results = propagator.run_all_scenarios(scenarios, use_multiprocessing=False)
        roi = roi_calc.calculate_roi(dg.graph, baseline_results, hardened_results, COST_PER_NODE, node_id)
        
        candidates.append({
            "node_id": node_id,
            "cost_inr": COST_PER_NODE,
            "lives_saved": roi["approximate_lives_saved"]
        })
        
        dg.soften_node(node_id, original_thresh)

    # 2. Run Knapsack Optimization
    optimization_result = roi_calc.allocate_budget(candidates, budget_inr)
    
    return {
        "status": "success",
        "budget_analysis": optimization_result,
        "message": f"Optimal plan generated for ₹{budget_inr:,.0f} budget."
    }


@app.get("/analytics/vulnerability-map", tags=["Network Science & Singularity Detection"])
def get_structural_vulnerabilities():
    """
    Advanced Network Science Engine.
    Exposes the 'Structural Singularities' of Wayanad by calculating 
    Betweenness Centrality & PageRank across the infrastructure graph.
    
    Identifies the EXACT bottlenecks where a single failure will 
    trigger a total systemic collapse (Singularity Points).
    """
    dg, gen, scenarios, baseline_results = _get_pipeline()
    analytics = GraphAnalytics(dg.graph)
    analysis_data = analytics.calculate_vulnerabilities()
    recommendations = analytics.get_bottleneck_recommendations()
    
    return {
        "status": "success",
        "singularity_analysis": analysis_data,
        "tactical_recommendations": recommendations,
        "demonstration_logic": "Centrality-based detection of non-linear cascade triggers (Structural Singularities)."
    }


# ─── 3D Map Endpoints ─────────────────────────────────────────────────────────

@app.get("/flood-grid/{hour}", tags=["3D Map"])
def flood_grid(hour: int, multiplier: float = 1.0):
    """
    Returns a GeoJSON FeatureCollection of flood depths across Wayanad at a given hour.
    Used by the frontend to render the animated water layer on the 3D map.

    Args:
        hour: Simulation hour (0-24)
        multiplier: Flood peak multiplier (0.8-1.2). Defaults to 1.0 (2024 baseline).
    """
    if hour < 0 or hour > 24:
        raise HTTPException(status_code=400, detail="Hour must be between 0 and 24")

    dg, gen, _, _ = _get_pipeline()

    # Max depth in the dataset for normalisation
    max_depth = float(gen.flood_map["base_depth_m"].max()) * 1.2

    features = []
    for _, row in gen.flood_map.iterrows():
        depth = gen.depth_at_hour(float(row["base_depth_m"]), hour, multiplier)
        intensity = round(min(depth / max_depth, 1.0), 4) if max_depth > 0 else 0.0
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [round(float(row["lon"]), 6), round(float(row["lat"]), 6)]
            },
            "properties": {
                "depth_m": round(depth, 4),
                "intensity": intensity,
            }
        })

    return {
        "hour": hour,
        "multiplier": multiplier,
        "peak_hour": 12,
        "type": "FeatureCollection",
        "features": features,
    }


@app.get("/scenario/{scenario_id}/hourly-states", tags=["3D Map"])
def scenario_hourly_states(scenario_id: int):
    """
    Returns complete node + edge status for every hour (0-24) in a given scenario.
    Used by the frontend to animate infrastructure pins and cascade dependency lines.

    Each hour contains:
      - nodes: {node_id: {status, depth_m, threshold, population_impact}}
      - edges: {source__target: 'ACTIVE' | 'BROKEN'}
      - total_failed, population_impacted
    """
    dg, gen, scenarios, results = _get_pipeline()

    scenario = next((r for r in results if r["scenario_id"] == scenario_id), None)
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario {scenario_id} not found")

    mult = scenario["peak_multiplier"]
    graph = dg.graph
    failed_at = {}  # node_id → hour first failed

    # Replay the timeline to determine exact failure hours
    for h_str, nodes in scenario["failures_timeline"].items():
        h = int(h_str)
        for nid in nodes:
            if nid not in failed_at:
                failed_at[nid] = h

    hourly_states = {}
    for hour in range(25):
        node_states = {}
        failed_this_hour = set(nid for nid, fh in failed_at.items() if fh <= hour)

        for nid, attrs in graph.nodes(data=True):
            depth = gen.get_node_depth_at_hour(attrs["lat"], attrs["lon"], hour, mult)
            node_states[nid] = {
                "status": "FAILED" if nid in failed_this_hour else "OPERATIONAL",
                "depth_m": round(depth, 4),
                "threshold": attrs["flood_threshold"] if attrs["flood_threshold"] < 999 else None,
                "population_impact": attrs["population_impact"],
                "type": attrs["type"],
                "name": attrs["name"],
                "lat": attrs["lat"],
                "lon": attrs["lon"],
            }

        edge_states = {}
        for src, tgt, edata in graph.edges(data=True):
            key = f"{src}__{tgt}"
            src_failed = src in failed_this_hour
            edge_states[key] = {
                "status": "BROKEN" if src_failed else "ACTIVE",
                "dependency": edata["dependency"],
                "failure_probability": edata.get("failure_probability", 0),
            }

        total_failed = len(failed_this_hour)
        pop_impacted = sum(
            graph.nodes[nid]["population_impact"]
            for nid in failed_this_hour
            if nid in graph.nodes
        )

        hourly_states[str(hour)] = {
            "nodes": node_states,
            "edges": edge_states,
            "total_failed": total_failed,
            "population_impacted": pop_impacted,
        }

    return {
        "scenario_id": scenario_id,
        "severity": scenario["severity"],
        "peak_multiplier": mult,
        "total_hours": 25,
        "hourly_states": hourly_states,
    }


@app.get("/impact-zones/{hour}", tags=["3D Map"])
def impact_zones(hour: int, scenario_id: int = 1):
    """
    Returns a GeoJSON FeatureCollection of impact circles around failed nodes at a given hour.
    Used by the frontend to render the population heatmap overlay on the 3D map.

    Circle radius is proportional to population_impact.
    Color intensity = higher impact → darker red.
    """
    if hour < 0 or hour > 24:
        raise HTTPException(status_code=400, detail="Hour must be between 0 and 24")

    dg, gen, scenarios, results = _get_pipeline()

    scenario = next((r for r in results if r["scenario_id"] == scenario_id), None)
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario {scenario_id} not found")

    graph = dg.graph
    failed_at = {}
    for h_str, nodes in scenario["failures_timeline"].items():
        h = int(h_str)
        for nid in nodes:
            if nid not in failed_at:
                failed_at[nid] = h

    failed_now = set(nid for nid, fh in failed_at.items() if fh <= hour)
    max_impact = max((graph.nodes[nid]["population_impact"] for nid in graph.nodes), default=1)

    features = []
    for nid, attrs in graph.nodes(data=True):
        is_failed = nid in failed_now
        pop = attrs["population_impact"]
        # Radius scaled: 500m minimum for operational, up to 1500m for max-impact failed node
        radius_m = int(500 + (pop / max_impact) * 1000) if is_failed else 300

        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [round(attrs["lon"], 6), round(attrs["lat"], 6)]
            },
            "properties": {
                "node_id": nid,
                "node_name": attrs["name"],
                "type": attrs["type"],
                "status": "FAILED" if is_failed else "OPERATIONAL",
                "population_impact": pop,
                "impact_ratio": round(pop / max_impact, 4),
                "radius_m": radius_m,
                "failed_at_hour": failed_at.get(nid),
            }
        })

    total_impacted = sum(
        graph.nodes[nid]["population_impact"]
        for nid in failed_now
        if nid in graph.nodes
    )

    return {
        "hour": hour,
        "scenario_id": scenario_id,
        "total_failed_nodes": len(failed_now),
        "total_population_impacted": total_impacted,
        "type": "FeatureCollection",
        "features": features,
    }



# -- Flood Prediction Endpoints (PRD Component 1) ----------------------------

@app.get('/predict/zones', tags=['Flood Prediction'])
def predict_all_zones(scenario: str = 'current'):
    """Get flood predictions for all zones, optionally for a scenario. Cached 60s per scenario."""
    cache_key = f"predict_zones_{scenario}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    lstm = _get_lstm()
    if scenario in ('2024_peak', 'moderate'):
        results = lstm.simulate_scenario(scenario)
    else:
        results = lstm.predict_all_zones()
    red_count = sum(1 for r in results if r['alert_level'] == 'RED')
    orange_count = sum(1 for r in results if r['alert_level'] in ('ORANGE', 'AMBER'))
    response = {
        'status': 'success',
        'scenario': scenario,
        'total_zones': len(results),
        'red_zones': red_count,
        'orange_zones': orange_count,
        'overall_threat_level': 'RED' if red_count > 0 else ('ORANGE' if orange_count > 0 else 'GREEN'),
        'predictions': results,
    }
    _cache_set(cache_key, response)
    return response


@app.get('/predict/zone/{zone_id}', tags=['Flood Prediction'])
def predict_single_zone(zone_id: str, scenario: str = 'current'):
    lstm = _get_lstm()
    valid_zones = ['ZONE_KALPETTA', 'ZONE_SULTHAN_BATHERY', 'ZONE_MANANTHAVADY', 'ZONE_VYTHIRI', 'ZONE_PANAMARAM', 'ZONE_AMBALAVAYAL']
    if zone_id not in valid_zones:
        raise HTTPException(status_code=404, detail=f'Zone not found. Valid: {valid_zones}')
    if scenario in ('2024_peak', 'moderate'):
        all_preds = lstm.simulate_scenario(scenario)
        pred = next((p for p in all_preds if p['zone_id'] == zone_id), None)
    else:
        pred = lstm.predict_zone(zone_id)
    return {'status': 'success', 'prediction': pred}


@app.post('/alerts/trigger', tags=['Actionability Layer'])
def trigger_alert(zone_id: str, scenario: str = 'current', reservoir_pct: float = None):
    lstm = _get_lstm()
    router = _get_router()
    valid_zones = ['ZONE_KALPETTA', 'ZONE_SULTHAN_BATHERY', 'ZONE_MANANTHAVADY', 'ZONE_VYTHIRI', 'ZONE_PANAMARAM', 'ZONE_AMBALAVAYAL']
    if zone_id not in valid_zones:
        raise HTTPException(status_code=404, detail='Zone not found.')
    if scenario in ('2024_peak', 'moderate'):
        all_preds = lstm.simulate_scenario(scenario)
        pred = next((p for p in all_preds if p['zone_id'] == zone_id), None)
    else:
        pred = lstm.predict_zone(zone_id)
    if pred is None:
        raise HTTPException(status_code=500, detail='Prediction failed.')
    action_plan = router.route_alert(
        zone_id=pred['zone_id'],
        alert_level=pred['alert_level'],
        flood_probability=pred['flood_probability'],
        lead_time_hours=pred['lead_time_hours'],
        projected_water_level_m=pred['projected_water_level_m'],
        reservoir_pct=reservoir_pct
    )
    return {'status': 'success', 'prediction': pred, 'action_plan': action_plan}


@app.get('/alerts/summary', tags=['Actionability Layer'])
def get_alert_summary(scenario: str = 'current'):
    """Get alert summaries. Cached 60s per scenario."""
    cache_key = f"alerts_summary_{scenario}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    lstm = _get_lstm()
    router = _get_router()
    if scenario in ('2024_peak', 'moderate'):
        predictions = lstm.simulate_scenario(scenario)
    else:
        predictions = lstm.predict_all_zones()
    summaries = router.get_all_zone_summaries(predictions)
    response = {'status': 'success', 'scenario': scenario, 'total_zones_alerted': len(summaries), 'zone_summaries': summaries}
    _cache_set(cache_key, response)
    return response


@app.get('/lead-time', tags=['Flood Prediction'])
def get_lead_times(scenario: str = 'current'):
    """Get lead time tickers. Cached 60s per scenario."""
    import datetime as dt
    cache_key = f"lead_times_{scenario}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    lstm = _get_lstm()
    if scenario in ('2024_peak', 'moderate'):
        predictions = lstm.simulate_scenario(scenario)
    else:
        predictions = lstm.predict_all_zones()
    stakeholder_deadlines = {'dam_operator': 2, 'ndrf': 3, 'district_collector': 3, 'highway_department': 4, 'public': 6}
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
    response = {'status': 'success', 'scenario': scenario, 'generated_at': dt.datetime.now().isoformat(), 'lead_time_tickers': tickers}
    _cache_set(cache_key, response)
    return response
