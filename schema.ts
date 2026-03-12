/**
 * CascadeNet 2.0 — Shared Type Definitions
 * This file defines the structured data models for communication 
 * between the Python backend and the TypeScript/JavaScript frontend.
 */
// schema is read only
// --- Base Infrastructure Types ---

export type NodeType = 'substation' | 'water_pump' | 'hospital' | 'road' | 'comm_tower';

export interface InfrastructureNode {
    id: string;
    type: NodeType;
    name: string;
    lat: number;
    lon: number;
    flood_threshold: number;
    population_impact: number;
    description: string;
    status: 'ACTIVE' | 'AT_RISK' | 'BROKEN';
}

export type DependencyType = 'power' | 'water' | 'access';

export interface DependencyEdge {
    source: string;
    target: string;
    dependency: DependencyType;
    distance_km?: number;
    failure_probability: number;
    status: 'ACTIVE' | 'BROKEN';
}

// --- Simulation & Scenario Types ---

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';

export interface ScenarioSummary {
    total_scenarios: number;
    avg_population_impact: number;
    max_population_impact: number;
    min_population_impact: number;
    avg_failed_nodes: number;
    worst_scenario: ScenarioShort;
    most_vulnerable_nodes: Array<{
        node_id: string;
        failure_count: number;
        failure_rate: number;
    }>;
}

export interface ScenarioShort {
    id: number;
    severity: SeverityLevel;
    peak_multiplier: number;
    failed_nodes: number;
    population_impact: number;
}

export interface ScenarioFull {
    scenario_id: number;
    severity: SeverityLevel;
    peak_multiplier: number;
    failures_timeline: Record<string, string[]>; // hour -> node_ids
    failed_nodes: string[];
    total_failed_nodes: number;
    total_population_impact: number;
}

// --- Prediction & XAI Types ---

export interface FeatureImportance {
    local_river_level: number;
    local_rainfall: number;
    upstream_dam_release: number;
}

export interface ZonePrediction {
    zone_id: string;
    zone_name: string;
    flood_probability: number;
    lead_time_hours: number;
    feature_importance: FeatureImportance;
    xai_summary: string;
}

// --- ROI & Hardening Types ---

export interface ROIAnalysis {
    node_id: string;
    node_name: string;
    hardening_cost_inr: number;
    approximate_lives_saved: number;
    roi_ratio: number;
    lives_saved_per_rupee: number;
    recommendation: string;
}

export interface BudgetAllocation {
    total_budget_inr: number;
    total_lives_saved: number;
    lives_saved_units: string;
    recommended_hardening_plan: Array<{
        node_id: string;
        lives_saved: number;
        cost_inr: number;
    }>;
}

// --- Actionability Layer (Stakeholders) ---

export type AlertLevel = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
export type Priority = 'NORMAL' | 'HIGH' | 'IMMEDIATE';

export interface StakeholderAction {
    department: string;
    alert_level: AlertLevel;
    action: string;
    time_window_hours: number;
    source: string;
    reservoir_pct?: number;
    priority: Priority;
}

// --- Analytics & Vulnerability ---

export interface SingularityPoint {
    node_id: string;
    name: string;
    singularity_index: number;
    scores: {
        bottleneck_centrality: number;
        influence_pagerank: number;
    };
}

export interface VulnerabilityAnalysis {
    top_singularities: SingularityPoint[];
    tactical_recommendations: string[];
}

// --- Real-time Sensor & Ticker Types ---

export interface SensorReading {
    node_id: string;
    zone_id: string;
    timestamp: string;
    rainfall_mmhr: number;
    river_level_m: number;
    reservoir_pct: number;
    reservoir_inflow_m3s: number;
    reservoir_outflow_m3s: number;
    flow_rate?: number;
    is_active?: boolean;
    last_updated?: string;
}

export interface LeadTimeTicker {
    zone_id: string;
    alert_level: AlertLevel;
    flood_probability_pct: number;
    hours_until_peak: number;
    stakeholder_action_windows: Record<string, number>;
    status: 'CRITICAL' | 'URGENT' | 'MONITORING';
}

// --- API Response Wrappers ---

export interface SimulateResponse {
    summary: ScenarioSummary;
    top_5_worst_scenarios: ScenarioShort[];
    top_5_best_scenarios: ScenarioShort[];
}

export interface GraphResponse {
    nodes: InfrastructureNode[];
    edges: DependencyEdge[];
}

export interface HardenResponse {
    roi: ROIAnalysis;
    baseline_avg_impact: number;
    hardened_avg_impact: number;
}

export interface PredictionResponse {
    predictions: ZonePrediction[];
}

export interface AlertsResponse {
    action_plan: {
        action_plans: StakeholderAction[];
    };
}
