# CascadeNet 2.0 — AI/ML Module

> **Asthrava Hackathon** | Infrastructure Cascade Failure Prediction | Kochi, Kerala

A 3-model AI/ML pipeline that simulates how a flood event causes cascading failures across Kochi's power, water, and healthcare infrastructure — and computes which interventions save the most lives per rupee invested.

---

## Architecture

```
Flood Scenario          Dependency Graph        Cascade Propagator
(Hazard Generator)  →   (NetworkX + RF)     →   (Event-Driven Sim)
                                                        ↓
                                               ROI Calculator
                                               (Lives-Saved/₹)
```

### Model 1 — Dependency Graph (`src/models/dependency_graph.py`)
- `NetworkX` directed graph: 5 Substations → 10 Water Pumps → 3 Hospitals
- **Random Forest** trains on historical failure data to weight each edge with a `failure_probability`
- `harden_node(node_id)` sets a node's threshold to `∞` for What-If analysis

### Model 2 — Hazard Generator (`src/models/hazard_generator.py`)
- Loads 2018 Kochi flood baseline (`data/flood_map_2018.csv`)
- **Sine temporal model**: `depth(t) = base × multiplier × sin(π×t/24)` — peaks at hour 12
- Generates **100 scenarios** with ±20% random variation from the 2018 peak

### Model 3 — Cascade Propagator (`src/models/cascade_propagator.py`)
- Hourly loop (0–24h), threshold checks at each node
- If `node_depth > flood_threshold` → node `FAILED`
- If parent (substation) fails at hour H → children (pumps) fail at hour H+1
- Runs all 100 scenarios in parallel using `multiprocessing.Pool`
- Outputs `outputs/scenarios.json`

### ROI Calculator (`src/models/roi_calculator.py`)
- Compares baseline vs. hardened simulation
- **Metric**: `Lives-Saved-Per-Rupee = approximate_lives_saved / cost_INR`

---

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run the full pipeline (no server needed)
python run_pipeline.py

# 3. Start the API server
uvicorn src.api.main:app --reload --port 8000

# 4. Open the interactive docs
# → http://localhost:8000/docs
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check |
| `POST` | `/simulate` | Run full 100-scenario simulation |
| `GET` | `/scenarios` | All scenario results (JSON) |
| `GET` | `/graph` | Infrastructure graph (nodes + edges) |
| `GET` | `/node/{node_id}` | Single node details |
| `POST` | `/harden/{node_id}` | What-If: harden a node, compute ROI |
| `GET` | `/roi/rank` | Rank all nodes by Lives-Saved-Per-Rupee |

**Example — Harden a substation:**
```bash
curl -X POST http://localhost:8000/harden/SUB_3 \
  -H "Content-Type: application/json" \
  -d '{"cost_rupees": 1000000}'
```

---

## Infrastructure Nodes

| ID | Type | Name | Flood Threshold | Population Impact |
|----|------|------|----------------|-------------------|
| SUB_1 | Substation | Ernakulam Main | 0.5m | 50,000 |
| SUB_2 | Substation | Kalamassery | 0.6m | 40,000 |
| SUB_3 | Substation | Vyttila | **0.4m** | 45,000 |
| SUB_4 | Substation | Fort Kochi | **0.35m** | 30,000 |
| SUB_5 | Substation | Aluva | 0.7m | 35,000 |
| PUMP_1–10 | Water Pump | Various | 0.25–0.5m | 12k–28k each |
| HOSP_1–3 | Hospital | Gen / Amrita / Lisie | 0.4–0.6m | 40k–80k each |

---

## File Structure

```
AI_ML/
├── data/
│   ├── kochi_infrastructure.json   # Node + edge definitions
│   ├── flood_map_2018.csv          # Base flood depth grid
│   └── historical_failures.csv     # RF training data
├── src/
│   ├── models/
│   │   ├── dependency_graph.py     # Model 1
│   │   ├── hazard_generator.py     # Model 2
│   │   ├── cascade_propagator.py   # Model 3
│   │   └── roi_calculator.py       # ROI metric
│   └── api/
│       └── main.py                 # FastAPI app
├── outputs/                        # Auto-generated scenario JSONs
├── run_pipeline.py                 # One-shot demo runner
└── requirements.txt
```
