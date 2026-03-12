import os
import sys
import json
from typing import List, Dict

# Add AI_ML to path to import models
SERVICE_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.dirname(SERVICE_DIR)
BACKEND_DIR = os.path.dirname(APP_DIR)
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
AI_ML_DIR = os.path.join(PROJECT_ROOT, "AI_ML")
sys.path.insert(0, AI_ML_DIR)

from src.models.dependency_graph import DependencyGraph
from src.models.hazard_generator import HazardGenerator
from src.models.cascade_propagator import CascadePropagator
from src.models.roi_calculator import ROICalculator
from src.models.lstm_predictor_wayanad import LSTMFloodPredictor
from src.models.action_router import ActionRouter
from src.models.graph_analytics import GraphAnalytics

class AIMLService:
    def __init__(self):
        self._dg = None
        self._hg = None
        self._lstm = None
        self._router = None
    
    @property
    def dg(self):
        if not self._dg:
            self._dg = DependencyGraph()
            self._dg.build()
        return self._dg
    
    @property
    def hg(self):
        if not self._hg:
            self._hg = HazardGenerator(n_scenarios=10) # Reduced for quick server response
        return self._hg

    @property
    def lstm(self):
        if not self._lstm:
            self._lstm = LSTMFloodPredictor()
            self._lstm.build_and_train()
        return self._lstm
    
    @property
    def router(self):
        if not self._router:
            self._router = ActionRouter()
        return self._router
        
    def get_graph(self):
        return self.dg.to_dict()

    def run_simulation(self):
        scenarios = self.hg.generate_scenarios()
        propagator = CascadePropagator(self.dg.graph, self.hg)
        results = propagator.run_all_scenarios(scenarios, use_multiprocessing=False)
        summary = propagator.get_summary(results)
        return {
            "summary": summary,
            "top_5_worst_scenarios": results[:5],
            "top_5_best_scenarios": results[-5:]
        }

    def predict_zones(self, scenario: str = 'current'):
        if scenario in ('2024_peak', 'moderate'):
            return self.lstm.simulate_scenario(scenario)
        return self.lstm.predict_all_zones()

    def get_vulnerabilities(self):
        analytics = GraphAnalytics(self.dg.graph)
        return {
            "top_singularities": analytics.calculate_vulnerabilities()["top_singularities"],
            "tactical_recommendations": analytics.get_bottleneck_recommendations()
        }

    def calculate_roi(self, node_id: str, cost_rupees: float):
        # Implementation similar to main_wayanad.py
        scenarios = self.hg.generate_scenarios()
        propagator_base = CascadePropagator(self.dg.graph, self.hg)
        baseline_results = propagator_base.run_all_scenarios(scenarios, use_multiprocessing=False)
        
        original_thresh = self.dg.get_node_original_thresholds().get(node_id)
        self.dg.harden_node(node_id)
        
        propagator_hardened = CascadePropagator(self.dg.graph, self.hg)
        hardened_results = propagator_hardened.run_all_scenarios(scenarios, use_multiprocessing=False)
        
        roi_calc = ROICalculator()
        roi = roi_calc.calculate_roi(self.dg.graph, baseline_results, hardened_results, cost_rupees, node_id)
        
        self.dg.soften_node(node_id, original_thresh)
        
        return {
            "roi": roi,
            "baseline_avg_impact": sum(r["total_population_impact"] for r in baseline_results) // len(baseline_results),
            "hardened_avg_impact": sum(r["total_population_impact"] for r in hardened_results) // len(hardened_results)
        }

    def trigger_alerts(self, zone_id: str, scenario: str = 'current'):
        predictions = self.predict_zones(scenario)
        pred = next((p for p in predictions if p['zone_id'] == zone_id), None)
        if not pred:
            return None
        
        actions = self.router.route_alert(
            zone_id=pred['zone_id'],
            alert_level=pred['alert_level'],
            flood_probability=pred['flood_probability'],
            lead_time_hours=pred['lead_time_hours'],
            projected_water_level_m=pred['projected_water_level_m']
        )
        return {"prediction": pred, "action_plan": actions}

ai_ml_service = AIMLService()
