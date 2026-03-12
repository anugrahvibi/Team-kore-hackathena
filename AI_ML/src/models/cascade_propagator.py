"""
CascadeNet 2.0 — Model 3: Cascade Propagator
Event-driven simulation of infrastructure failure cascades.
Runs 100 scenarios using multiprocessing for speed.
"""

import copy
import json
import os
import multiprocessing as mp
from typing import Optional

import networkx as nx

from src.models.hazard_generator import HazardGenerator

# ─── Paths ───────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)


# ── Single scenario simulation (module-level for multiprocessing pickling) ────

def _simulate_one(args: tuple) -> dict:
    """
    Simulate cascading failures for a single scenario.
    Module-level function required for multiprocessing on Windows.

    Args:
        args: (scenario, nodes_data, edges_data)

    Returns:
        scenario result dict with failure timeline
    """
    scenario, nodes_data, edges_data = args
    peak_mult = scenario["peak_multiplier"]
    scenario_id = scenario["scenario_id"]

    # Re-build a local hazard generator (lightweight, no RF)
    gen = HazardGenerator.__new__(HazardGenerator)
    gen.random_seed = 42

    import pandas as pd
    data_dir = os.path.join(BASE_DIR, "data")
    gen.flood_map = pd.read_csv(os.path.join(data_dir, "flood_map_2018.csv"))

    # Node working copy
    node_status = {n["id"]: "OPERATIONAL" for n in nodes_data}
    failure_hour = {}      # node_id → hour it failed
    pending_cascade = {}   # node_id → hour to cascade-fail (parent failed at H, child fails at H+1)

    failures_timeline = {}  # hour → [node_ids that failed this hour]

    for hour in range(25):
        newly_failed = []

        for node in nodes_data:
            nid = node["id"]
            if node_status[nid] == "FAILED":
                continue

            # Check for pending cascade failure (child of a failed parent)
            if nid in pending_cascade and pending_cascade[nid] <= hour:
                node_status[nid] = "FAILED"
                failure_hour[nid] = hour
                newly_failed.append(nid)
                continue

            # Direct flood failure: depth at this node > threshold
            depth = gen.get_node_depth_at_hour(node["lat"], node["lon"], hour, peak_mult)
            threshold = node["flood_threshold"]
            if depth > threshold:
                node_status[nid] = "FAILED"
                failure_hour[nid] = hour
                newly_failed.append(nid)

                # Cascade: schedule children to fail at hour+1
                for edge in edges_data:
                    if edge["source"] == nid:
                        child_id = edge["target"]
                        if node_status[child_id] == "OPERATIONAL" and child_id not in pending_cascade:
                            pending_cascade[child_id] = hour + 1

        if newly_failed:
            failures_timeline[str(hour)] = newly_failed

    # Calculate total population impact for this scenario
    total_pop = sum(
        n["population_impact"]
        for n in nodes_data
        if node_status[n["id"]] == "FAILED"
    )
    failed_node_ids = [n["id"] for n in nodes_data if node_status[n["id"]] == "FAILED"]

    return {
        "scenario_id": scenario_id,
        "peak_multiplier": peak_mult,
        "severity": scenario["severity"],
        "failures_timeline": failures_timeline,
        "failed_nodes": failed_node_ids,
        "total_failed_nodes": len(failed_node_ids),
        "total_population_impact": total_pop,
    }


class CascadePropagator:
    """
    Runs the cascade simulation across all 100 scenarios.
    Uses multiprocessing.Pool for parallelism.
    """

    def __init__(self, graph: nx.DiGraph, hazard_gen: HazardGenerator):
        self.graph = graph
        self.hazard_gen = hazard_gen

        # Pre-extract serializable node/edge data (graphs aren't picklable)
        self.nodes_data = [
            {
                "id": nid,
                "lat": attrs["lat"],
                "lon": attrs["lon"],
                "flood_threshold": attrs["flood_threshold"],
                "population_impact": attrs["population_impact"],
                "type": attrs["type"],
                "name": attrs["name"],
            }
            for nid, attrs in graph.nodes(data=True)
        ]
        self.edges_data = [
            {"source": src, "target": tgt, "dependency": data["dependency"]}
            for src, tgt, data in graph.edges(data=True)
        ]

    def run_all_scenarios(self, scenarios: list[dict], use_multiprocessing: bool = True) -> list[dict]:
        """
        Run cascade simulation for all scenarios.

        Args:
            scenarios: List of scenario dicts from HazardGenerator
            use_multiprocessing: Use parallel pool (default True)

        Returns:
            List of scenario result dicts
        """
        args_list = [(s, self.nodes_data, self.edges_data) for s in scenarios]

        if use_multiprocessing and mp.current_process().name == "MainProcess":
            # Use half the available cores to avoid memory pressure on 6GB VRAM system
            n_workers = max(1, mp.cpu_count() // 2)
            print(f"[CascadePropagator] Running {len(scenarios)} scenarios on {n_workers} workers...")
            with mp.Pool(processes=n_workers) as pool:
                results = pool.map(_simulate_one, args_list)
        else:
            print(f"[CascadePropagator] Running {len(scenarios)} scenarios sequentially...")
            results = [_simulate_one(arg) for arg in args_list]

        # Sort by total population impact descending (worst first)
        results.sort(key=lambda x: x["total_population_impact"], reverse=True)
        print(f"[CascadePropagator] Simulation complete.")
        return results

    def save_results(self, results: list[dict], filename: str = "scenarios.json"):
        """Save all scenario results to outputs/scenarios.json"""
        path = os.path.join(OUTPUT_DIR, filename)
        with open(path, "w") as f:
            json.dump(results, f, indent=2)
        print(f"[CascadePropagator] Results saved to {path}")
        return path

    def get_summary(self, results: list[dict]) -> dict:
        """Compute aggregate statistics across all scenario results."""
        total_impacts = [r["total_population_impact"] for r in results]
        total_failed = [r["total_failed_nodes"] for r in results]

        worst = results[0]  # Already sorted worst-first
        best = results[-1]

        # Node failure frequency across all scenarios
        node_failure_freq = {}
        for r in results:
            for nid in r["failed_nodes"]:
                node_failure_freq[nid] = node_failure_freq.get(nid, 0) + 1

        most_vulnerable = sorted(node_failure_freq.items(), key=lambda x: x[1], reverse=True)[:5]

        return {
            "total_scenarios": len(results),
            "avg_population_impact": round(sum(total_impacts) / len(total_impacts)),
            "max_population_impact": max(total_impacts),
            "min_population_impact": min(total_impacts),
            "avg_failed_nodes": round(sum(total_failed) / len(total_failed), 1),
            "worst_scenario": {
                "id": worst["scenario_id"],
                "severity": worst["severity"],
                "peak_multiplier": worst["peak_multiplier"],
                "failed_nodes": worst["total_failed_nodes"],
                "population_impact": worst["total_population_impact"],
            },
            "best_scenario": {
                "id": best["scenario_id"],
                "severity": best["severity"],
                "peak_multiplier": best["peak_multiplier"],
                "failed_nodes": best["total_failed_nodes"],
                "population_impact": best["total_population_impact"],
            },
            "most_vulnerable_nodes": [
                {"node_id": nid, "failure_count": cnt, "failure_rate": round(cnt / len(results), 2)}
                for nid, cnt in most_vulnerable
            ],
        }


# ── Standalone test ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    sys.path.insert(0, os.path.join(BASE_DIR))

    from src.models.dependency_graph import DependencyGraph
    from src.models.hazard_generator import HazardGenerator

    print("=== CascadeNet 2.0 — Full Pipeline Test ===\n")

    # Build graph
    dg = DependencyGraph()
    G = dg.build()

    # Generate scenarios
    gen = HazardGenerator(n_scenarios=100)
    scenarios = gen.generate_scenarios()

    # Run cascade propagation
    propagator = CascadePropagator(G, gen)
    results = propagator.run_all_scenarios(scenarios, use_multiprocessing=True)
    propagator.save_results(results)
    summary = propagator.get_summary(results)

    print("\n=== Simulation Summary ===")
    print(f"Total scenarios: {summary['total_scenarios']}")
    print(f"Avg population impact: {summary['avg_population_impact']:,}")
    print(f"Worst scenario: {summary['worst_scenario']}")
    print(f"Most vulnerable: {summary['most_vulnerable_nodes']}")
