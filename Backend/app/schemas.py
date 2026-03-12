from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Literal, Any
from datetime import datetime

# --- Base Infrastructure Types ---

NodeType = Literal['substation', 'water_pump', 'hospital', 'road', 'comm_tower']
StatusType = Literal['ACTIVE', 'AT_RISK', 'BROKEN', 'OPERATIONAL']
DependencyType = Literal['power', 'water', 'access']

class InfrastructureNode(BaseModel):
    id: str
    type: NodeType
    name: str
    lat: float
    lon: float
    flood_threshold: float
    population_impact: int
    description: str
    status: StatusType = 'ACTIVE'

class DependencyEdge(BaseModel):
    source: str
    target: str
    dependency: DependencyType
    distance_km: Optional[float] = None
    failure_probability: float
    status: Literal['ACTIVE', 'BROKEN'] = 'ACTIVE'

# --- Simulation & Scenario Types ---

SeverityLevel = Literal['LOW', 'MEDIUM', 'HIGH', 'EXTREME']

class ScenarioShort(BaseModel):
    id: int
    severity: SeverityLevel
    peak_multiplier: float
    failed_nodes: int
    population_impact: int

class ScenarioSummary(BaseModel):
    total_scenarios: int
    avg_population_impact: float
    max_population_impact: int
    min_population_impact: int
    avg_failed_nodes: float
    worst_scenario: ScenarioShort
    most_vulnerable_nodes: List[Dict[str, Any]]

class ScenarioFull(BaseModel):
    scenario_id: int
    severity: SeverityLevel
    peak_multiplier: float
    failures_timeline: Dict[str, List[str]]
    failed_nodes: List[str]
    total_failed_nodes: int
    total_population_impact: int

# --- Prediction & XAI Types ---

class FeatureImportance(BaseModel):
    local_river_level: float
    local_rainfall: float
    upstream_dam_release: float

class ZonePrediction(BaseModel):
    zone_id: str
    zone_name: str
    flood_probability: float
    lead_time_hours: int
    feature_importance: FeatureImportance
    xai_summary: str

# --- ROI & Hardening Types ---

class ROIAnalysis(BaseModel):
    node_id: str
    node_name: str
    hardening_cost_inr: float
    approximate_lives_saved: float
    roi_ratio: float
    lives_saved_per_rupee: float
    recommendation: str

class BudgetAllocationItem(BaseModel):
    node_id: str
    lives_saved: float
    cost_inr: float

class BudgetAllocation(BaseModel):
    total_budget_inr: float
    total_lives_saved: float
    lives_saved_units: str
    recommended_hardening_plan: List[BudgetAllocationItem]

# --- Actionability Layer (Stakeholders) ---

AlertLevel = Literal['GREEN', 'YELLOW', 'ORANGE', 'RED']
Priority = Literal['NORMAL', 'HIGH', 'IMMEDIATE', 'LOW', 'ROUTINE', 'URGENT', 'PLANNED', 'CRITICAL']

class StakeholderAction(BaseModel):
    department: str
    alert_level: AlertLevel
    action: str
    time_window_hours: float
    source: str
    reservoir_pct: Optional[float] = None
    priority: Priority

# --- Analytics & Vulnerability ---

class SingularityPoint(BaseModel):
    node_id: str
    name: str
    singularity_index: float
    scores: Dict[str, float]

class VulnerabilityAnalysis(BaseModel):
    top_singularities: List[SingularityPoint]
    tactical_recommendations: List[str]

# --- Real-time Sensor & Ticker Types ---

class SensorReading(BaseModel):
    node_id: str
    zone_id: str
    timestamp: datetime
    rainfall_mmhr: float
    river_level_m: float
    reservoir_pct: float
    reservoir_inflow_m3s: float
    reservoir_outflow_m3s: float
    flow_rate: Optional[float] = None
    is_active: Optional[bool] = True
    last_updated: Optional[datetime] = None

class LeadTimeTicker(BaseModel):
    zone_id: str
    alert_level: AlertLevel
    flood_probability_pct: float
    hours_until_peak: int
    stakeholder_action_windows: Dict[str, float]
    status: Literal['CRITICAL', 'URGENT', 'MONITORING']

# --- Notification Types (New for Backend) ---

class Notification(BaseModel):
    id: Optional[str] = None
    title: str
    message: str
    severity: AlertLevel
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    read: bool = False
    category: str  # e.g., "CASCADE", "FLOOD_RISK", "SYSTEM"

# --- API Response Wrappers ---

class SimulateResponse(BaseModel):
    summary: ScenarioSummary
    top_5_worst_scenarios: List[ScenarioFull]
    top_5_best_scenarios: List[ScenarioFull]

class GraphResponse(BaseModel):
    nodes: List[InfrastructureNode]
    edges: List[DependencyEdge]

class PredictionResponse(BaseModel):
    predictions: List[ZonePrediction]

class HardenResponse(BaseModel):
    roi: ROIAnalysis
    baseline_avg_impact: int
    hardened_avg_impact: int

class ActionPlanWrapper(BaseModel):
    action_plans: List[StakeholderAction]

class AlertsResponse(BaseModel):
    action_plan: ActionPlanWrapper
