# CascadeNet 2.0 — API Integration Guide
> For the Frontend Developer · Base URL: `http://localhost:8000`

## Quick Start
```js
const API = 'http://localhost:8000'; // change to server IP if not localhost
```

---

## Endpoints

### 1. Health Check
```js
// GET /
const res = await fetch(`${API}/`);
const data = await res.json();
// data.status === 'online'
```

---

### 2. Run Full Simulation
```js
// POST /simulate  (~15s on first call, fast after)
const res = await fetch(`${API}/simulate`, { method: 'POST' });
const data = await res.json();
```
**Response shape:**
```json
{
  "summary": {
    "total_scenarios": 100,
    "avg_population_impact": 529280,
    "max_population_impact": 545000,
    "min_population_impact": 510000,
    "avg_failed_nodes": 16.5,
    "worst_scenario": {
      "id": 1, "severity": "EXTREME", "peak_multiplier": 1.19,
      "failed_nodes": 17, "population_impact": 545000
    },
    "most_vulnerable_nodes": [
      { "node_id": "SUB_4", "failure_count": 100, "failure_rate": 1.0 }
    ]
  },
  "top_5_worst_scenarios": [...],
  "top_5_best_scenarios": [...]
}
```

---

### 3. Get All 100 Scenarios
```js
// GET /scenarios
const res = await fetch(`${API}/scenarios`);
const data = await res.json();
// data.scenarios → array of 100 results, sorted worst-first
```
**Each scenario:**
```json
{
  "scenario_id": 1,
  "severity": "HIGH",
  "peak_multiplier": 1.15,
  "failures_timeline": {
    "6": ["SUB_4"],
    "7": ["PUMP_6", "PUMP_7"],
    "8": ["HOSP_3"]
  },
  "failed_nodes": ["SUB_4", "PUMP_6", "PUMP_7", "HOSP_3"],
  "total_failed_nodes": 17,
  "total_population_impact": 545000
}
```

---

### 4. Get Infrastructure Graph
```js
// GET /graph
const res = await fetch(`${API}/graph`);
const data = await res.json();
// data.nodes → array of all 18 nodes
// data.edges → array of all 16 edges with failure_probability
```
**Node fields:** `id, type, name, lat, lon, flood_threshold, population_impact, status`  
**Edge fields:** `source, target, dependency, distance_km, failure_probability`

---

### 5. Get Single Node
```js
// GET /node/{node_id}
const res = await fetch(`${API}/node/SUB_4`);
const data = await res.json();
// data.attributes → full node info
// data.parents → upstream nodes
// data.children → downstream nodes
```

---

### 6. What-If Harden Analysis (Key Demo Feature)
```js
// POST /harden/{node_id}
const res = await fetch(`${API}/harden/SUB_4`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ cost_rupees: 1000000 }) // ₹10 lakh
});
const data = await res.json();
```
**Response shape:**
```json
{
  "roi": {
    "node_id": "SUB_4",
    "node_name": "Fort Kochi Substation",
    "hardening_cost_inr": 1000000,
    "approximate_lives_saved": 85000,
    "roi_ratio": 2.4,
    "lives_saved_per_rupee": 0.085,
    "recommendation": "EXCELLENT — Strongly recommended."
  },
  "baseline_avg_impact": 529280,
  "hardened_avg_impact": 220000
}
```

---

### 7. ROI Ranking (All Nodes)
```js
// GET /roi/rank  (~30s, runs 18 hardening simulations)
const res = await fetch(`${API}/roi/rank`);
const data = await res.json();
// data.top_10_by_roi → sorted by lives_saved_per_rupee descending
```

---

## III. 3D Map GeoJSON Endpoints (PRD Component 3)

### 8. Hourly Flood Grid
```js
// GET /flood-grid/{hour}?multiplier=1.0
// hour: 0-24
const res = await fetch(`${API}/flood-grid/12`);
const data = await res.json();
// data.features -> GeoJSON points for Mapbox
```

### 9. Scenario Hourly Node/Edge States
```js
// GET /scenario/{id}/hourly-states
const res = await fetch(`${API}/scenario/1/hourly-states`);
const data = await res.json();
// data.hourly_states['12'].nodes -> Node statuses at Hour 12
// data.hourly_states['12'].edges -> Edge statuses at Hour 12
```

### 10. Population Impact Heatmap (Circles)
```js
// GET /impact-zones/{hour}?scenario_id=1
const res = await fetch(`${API}/impact-zones/12`);
const data = await res.json();
// data.features -> GeoJSON Circle Features (radius_m in properties)
```

---

## IV. Flood Prediction (PRD Component 1 — LSTM)

### 11. All Zones Prediction (with XAI)
```js
// GET /predict/zones
const res = await fetch(`${API}/predict/zones`);
const data = await res.json();
// data.predictions[0].flood_probability -> 0.0 to 1.0
// data.predictions[0].feature_importance -> { local_river_level: 60, local_rainfall: 30, upstream_dam_release: 10 }
// data.predictions[0].xai_summary -> String summary of the risk drivers.
```

### 12. Single Zone Prediction (supports Historical Mode)
```js
// GET /predict/zone/ZONE_FORT_KOCHI?scenario=2018_peak
const res = await fetch(`${API}/predict/zone/ZONE_FORT_KOCHI?scenario=2018_peak`);
```

---

## V. Actionability Layer (PRD Component 2 — 5-Stakeholders)
> The actionability layer is a rules-based "Truth Table" engine. It never generates recommendations from ML — only from pre-loaded official documentation.

### 13. Trigger All-Stakeholder Action Plan
```js
// POST /alerts/trigger?zone_id=ZONE_FORT_KOCHI&reservoir_pct=88.5
const res = await fetch(`${API}/alerts/trigger?zone_id=ZONE_FORT_KOCHI`, { method: 'POST' });
const data = await res.json();
// Each item in data.action_plan.action_plans:
// {
//   "department": "dam_controller",
//   "alert_level": "RED",
//   "action": "Open Gate 2 + Gate 4 at full discharge",
//   "time_window_hours": 6.2,
//   "source": "CWC Dam Safety Protocol Section 6.1",
//   "reservoir_pct": 87,
//   "priority": "IMMEDIATE"
// }
```

### 14. Action Summary (Overview)
```js
// GET /alerts/summary
const res = await fetch(`${API}/alerts/summary`);
```

### 15. Lead Time Ticker
```js
// GET /lead-time
const res = await fetch(`${API}/lead-time`);
// data.lead_time_tickers -> { hours_until_peak, stakeholder_action_windows }
```

---

## VI. Strategic ROI & Budget Planning (Knapsack Optimization)

### 16. Strategic Budget Allocator
```js
// POST /roi/allocate?budget_inr=5000000
const res = await fetch(`${API}/roi/allocate?budget_inr=5000000`, { method: 'POST' });
const data = await res.json();
// data.budget_analysis -> { total_budget_inr, total_lives_saved, lives_saved_units: 'approximate_lives'
//    recommended_hardening_plan: [{ node_id, lives_saved, cost_inr }, ...] }
```

## VII. Network Science & Singularity Detection (Structural Vulnerability)

### 17. Structural Vulnerability Map
```js
// GET /analytics/vulnerability-map
const res = await fetch(`${API}/analytics/vulnerability-map`);
const data = await res.json();
// data.singularity_analysis.top_singularities -> [{ node_id, name, singularity_index, scores: { bottleneck_centrality, influence_pagerank } }, ...]
// data.tactical_recommendations -> ["CRITICAL: Substation 4 is a high-centrality singularity...", ...]
```
**Why this matters:** These nodes are the "Structural Singularities." If they fail, they trigger the most massive non-linear cascades across the entire city's infrastructure.

---

## Node Reference (Updated)

| ID | Type | Pop. Impact | Risk | Description |
|----|------|-------------|------|-------------|
| SUB_1-5 | substation | 30k-50k | Varies | Power Grid |
| PUMP_1-10 | water_pump | 12k-28k | Varies | Water Supply |
| HOSP_1-3 | hospital | 40k-80k | Varies | Healthcare |
| ROAD_1-4 | road | 80k-150k | High | Transport |
| TOWER_1-3 | comm_tower | 50k-200k | Medium | Communications |

---

## Implementation Notes
- **Lead Time:** LSTM outputs time-to-peak (6-24h). Higher probability = shorter window.
- **Actions:** Grounded in official CWC & NDMA SOP documentation.
- **3D Tunnels:** Dependency lines on 3D map should be styled based on `status: BROKEN | ACTIVE`.
