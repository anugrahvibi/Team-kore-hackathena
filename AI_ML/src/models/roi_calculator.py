"""
CascadeNet 2.0 — ROI Calculator
Computes Lives-Saved-Per-Rupee metric for node hardening decisions.
"""

import networkx as nx


class ROICalculator:
    """
    Calculates the ROI of infrastructure hardening interventions.

    Metric: Lives-Saved-Per-Rupee
        = (baseline_impact - hardened_impact) / cost_rupees

    Impact = total population_impact across all failed nodes
             summed across all simulation hours (population × failure_duration_hours)
    """

    @staticmethod
    def _total_impact(results: list[dict], graph: nx.DiGraph) -> int:
        """
        Compute aggregate population impact across all scenarios.
        Weights by failure duration (each scenario hour a node is failed = 1 unit of impact).
        """
        total = 0
        for scenario in results:
            failed_nodes = set(scenario.get("failed_nodes", []))
            for nid in failed_nodes:
                if nid in graph.nodes:
                    total += graph.nodes[nid]["population_impact"]
        return total

    @staticmethod
    def _total_impact_from_timeline(results: list[dict], graph: nx.DiGraph) -> int:
        """
        More granular: sum population × hours_failed for each node across scenarios.
        """
        total = 0
        for scenario in results:
            timeline = scenario.get("failures_timeline", {})
            # Track which nodes have failed and for how many hours
            failed_at = {}
            for hour_str, nodes in timeline.items():
                hour = int(hour_str)
                for nid in nodes:
                    if nid not in failed_at:
                        failed_at[nid] = hour

            for nid, fail_hour in failed_at.items():
                if nid in graph.nodes:
                    hours_failed = 24 - fail_hour  # hours until end of simulation
                    total += graph.nodes[nid]["population_impact"] * hours_failed
        return total

    def calculate_roi(
        self,
        graph: nx.DiGraph,
        baseline_results: list[dict],
        hardened_results: list[dict],
        cost_rupees: float,
        node_id: str,
    ) -> dict:
        """
        Compare baseline vs hardened simulation results to compute ROI.

        Args:
            graph: The infrastructure graph
            baseline_results: Scenario results WITHOUT hardening
            hardened_results: Scenario results WITH node hardened
            cost_rupees: Cost to harden (in INR)
            node_id: The hardened node ID

        Returns:
            ROI breakdown dict
        """
        baseline_impact = self._total_impact_from_timeline(baseline_results, graph)
        hardened_impact = self._total_impact_from_timeline(hardened_results, graph)

        lives_saved = baseline_impact - hardened_impact  # population-hours saved
        # Approximate lives saved: divide by avg 12 hours impact duration
        approx_lives = lives_saved // 12

        roi_ratio = (baseline_impact / hardened_impact) if hardened_impact > 0 else float("inf")

        lives_per_rupee = (approx_lives / cost_rupees) if cost_rupees > 0 else float("inf")

        node_name = graph.nodes[node_id]["name"] if node_id in graph.nodes else node_id
        node_type = graph.nodes[node_id]["type"] if node_id in graph.nodes else "unknown"

        return {
            "node_id": node_id,
            "node_name": node_name,
            "node_type": node_type,
            "hardening_cost_inr": cost_rupees,
            "baseline_population_impact_hours": baseline_impact,
            "hardened_population_impact_hours": hardened_impact,
            "population_hours_saved": lives_saved,
            "approximate_lives_saved": approx_lives,
            "roi_ratio": round(roi_ratio, 3),
            "lives_saved_per_rupee": round(lives_per_rupee, 6),
            "recommendation": _roi_recommendation(roi_ratio),
        }

    def rank_nodes_by_roi(
        self,
        graph: nx.DiGraph,
        baseline_results: list[dict],
        get_hardened_fn,  # callable(node_id) → hardened_results
        cost_rupees: float = 1_000_000,
    ) -> list[dict]:
        """
        Rank all nodes by ROI of hardening each one individually.
        Useful for showing judges the optimal mitigation strategy.

        Args:
            graph: Infrastructure graph
            baseline_results: Baseline simulation
            get_hardened_fn: Function that returns hardened results for a given node_id
            cost_rupees: Assumed uniform hardening cost

        Returns:
            List of ROI dicts sorted by lives_saved_per_rupee (descending)
        """
        rankings = []
        for node_id in graph.nodes:
            try:
                hardened_results = get_hardened_fn(node_id)
                roi = self.calculate_roi(graph, baseline_results, hardened_results, cost_rupees, node_id)
                rankings.append(roi)
            except Exception as e:
                print(f"[ROI] Skipping {node_id}: {e}")

        rankings.sort(key=lambda x: x["lives_saved_per_rupee"] if x["lives_saved_per_rupee"] != float("inf") else 1e18, reverse=True)
        return rankings

    def allocate_budget(self, candidate_nodes: list[dict], total_budget: float) -> dict:
        """
        Uses the 0/1 Knapsack dynamic programming algorithm to find the optimal 
        combination of nodes to harden given a fixed total budget.
        
        Args:
            candidate_nodes: List of dicts, each with 'node_id', 'cost_inr', 'lives_saved'.
            total_budget: Max INR budget available.
            
        Returns:
            Dict containing the selected nodes, total cost, and total lives saved.
        """
        # Knapsack requires integer weights (costs). We will normalize costs to units of 100,000 INR
        # to keep the DP table size manageable while retaining granularity.
        SCALE_FACTOR = 100_000
        budget_units = int(total_budget // SCALE_FACTOR)
        
        # Filter candidates that are valid and have > 0 lives saved
        items = []
        for c in candidate_nodes:
            # Round cost up to nearest scale unit to be safe with budget
            cost_u = int((c.get("cost_inr", 1_000_000) + SCALE_FACTOR - 1) // SCALE_FACTOR)
            val = int(c.get("lives_saved", 0))
            if cost_u > 0 and val > 0:
                items.append((c["node_id"], cost_u, val, c.get("cost_inr", cost_u*SCALE_FACTOR)))

        n = len(items)
        dp = [[0 for _ in range(budget_units + 1)] for _ in range(n + 1)]

        for i in range(1, n + 1):
            node_id, cost_u, val, raw_cost = items[i - 1]
            for w in range(1, budget_units + 1):
                if cost_u <= w:
                    dp[i][w] = max(dp[i - 1][w], dp[i - 1][w - cost_u] + val)
                else:
                    dp[i][w] = dp[i - 1][w]

        # Backtrack to find the selected items
        selected_nodes = []
        total_lives = dp[n][budget_units]
        w = budget_units
        total_cost_spent = 0
        
        for i in range(n, 0, -1):
            if dp[i][w] != dp[i - 1][w]:
                node_id, cost_u, val, raw_cost = items[i - 1]
                selected_nodes.append({
                    "node_id": node_id,
                    "lives_saved": val,
                    "cost_inr": raw_cost
                })
                w -= cost_u
                total_cost_spent += raw_cost

        return {
            "total_budget_inr": total_budget,
            "total_cost_allocated_inr": total_cost_spent,
            "total_lives_saved": total_lives,
            "budget_utilization_pct": round((total_cost_spent / total_budget) * 100, 2) if total_budget > 0 else 0,
            "recommended_hardening_plan": selected_nodes
        }

def _roi_recommendation(roi_ratio: float) -> str:
    if roi_ratio == float("inf"):
        return "CRITICAL — Hardening eliminates all impact. Highest priority."
    elif roi_ratio >= 2.0:
        return "EXCELLENT — Hardening more than doubles protection. Strongly recommended."
    elif roi_ratio >= 1.5:
        return "GOOD — Significant reduction in impact. Recommended."
    elif roi_ratio >= 1.1:
        return "MODERATE — Some benefit. Consider as part of broader strategy."
    else:
        return "LOW ROI — Limited impact reduction. Lower priority."


# ── Standalone test ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("[ROI Calculator] Import OK — use via API or cascade_propagator test.")
