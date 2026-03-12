#!/usr/bin/env python3
"""
Cascadenet — Quick Pipeline Runner
Run this to test the entire pipeline end-to-end without the API server.
"""
import sys
import os

# Ensure imports work from the AI_ML root
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.models.dependency_graph import DependencyGraph
from src.models.hazard_generator import HazardGenerator
from src.models.cascade_propagator import CascadePropagator
from src.models.roi_calculator import ROICalculator


def main():
    print("=" * 60)
    print("  Cascadenet — Infrastructure Cascade Predictor")
    print("  Asthrava Hackathon | Wayanad, Kerala")
    print("=" * 60)

    # ── Step 1: Build infrastructure graph ──────────────────────
    print("\n[1/4] Building Wayanad infrastructure dependency graph...")
    dg = DependencyGraph()
    G = dg.build()
    original_thresholds = dg.get_node_original_thresholds()
    print(f"      ✓ {G.number_of_nodes()} nodes, {G.number_of_edges()} edges loaded")

    # ── Step 2: Generate flood scenarios ────────────────────────
    print("\n[2/4] Generating 100 flood scenarios (±20% of 2024 baseline)...")
    gen = HazardGenerator(n_scenarios=100)
    scenarios = gen.generate_scenarios()
    print(f"      ✓ {len(scenarios)} scenarios ready")

    # ── Step 3: Run cascade simulation ──────────────────────────
    print("\n[3/4] Running cascade propagation simulation...")
    propagator = CascadePropagator(G, gen)
    results = propagator.run_all_scenarios(scenarios, use_multiprocessing=True)
    path = propagator.save_results(results)
    summary = propagator.get_summary(results)

    print(f"\n      ✓ Results saved to: {path}")
    print(f"\n{'─'*60}")
    print("  SIMULATION RESULTS")
    print(f"{'─'*60}")
    print(f"  Total scenarios run   : {summary['total_scenarios']}")
    print(f"  Avg population impact : {summary['avg_population_impact']:,} people")
    print(f"  Worst scenario impact : {summary['max_population_impact']:,} people")
    print(f"  Avg nodes failed      : {summary['avg_failed_nodes']}")
    print(f"\n  WORST SCENARIO:")
    ws = summary['worst_scenario']
    print(f"    ID #{ws['id']} | Severity: {ws['severity']} | Multiplier: {ws['peak_multiplier']}x")
    print(f"    Failed nodes: {ws['failed_nodes']} | Impact: {ws['population_impact']:,} people")
    print(f"\n  MOST VULNERABLE NODES:")
    for n in summary['most_vulnerable_nodes']:
        print(f"    {n['node_id']:12s} fails in {n['failure_rate']*100:.0f}% of scenarios")

    # ── Step 4: ROI analysis (harden SUB_3 — highest risk) ──────
    print(f"\n[4/4] Running What-If ROI analysis: Harden SUB_3 (Mananthavady Substation)...")
    COST = 1_000_000  # 10 lakh INR

    dg.harden_node("SUB_3")
    propagator2 = CascadePropagator(G, gen)
    hardened_results = propagator2.run_all_scenarios(scenarios, use_multiprocessing=True)

    roi_calc = ROICalculator()
    roi = roi_calc.calculate_roi(G, results, hardened_results, COST, "SUB_3")

    dg.soften_node("SUB_3", original_thresholds["SUB_3"])  # restore

    print(f"\n{'─'*60}")
    print("  ROI ANALYSIS — Harden Mananthavady Substation (₹10 Lakh)")
    print(f"{'─'*60}")
    print(f"  Baseline impact       : {roi['baseline_population_impact_hours']:,} pop-hrs")
    print(f"  Hardened impact       : {roi['hardened_population_impact_hours']:,} pop-hrs")
    print(f"  Approx. lives saved   : {roi['approximate_lives_saved']:,}")
    print(f"  ROI ratio             : {roi['roi_ratio']}x")
    print(f"  Lives saved / ₹       : {roi['lives_saved_per_rupee']:.6f}")
    print(f"  Recommendation        : {roi['recommendation']}")
    print(f"\n{'='*60}")
    print("  Pipeline complete. Start API with:")
    print("  uvicorn src.api.main:app --reload --port 8000")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
