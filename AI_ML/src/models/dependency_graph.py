"""
CascadeNet 2.0 — Model 1: Dependency Graph
Builds a directed NetworkX graph for Kochi infrastructure.
Uses Random Forest to assign edge failure-probability weights.
"""

import json
import math
import os
import numpy as np
import pandas as pd
import networkx as nx
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

# ─── Paths ───────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, "data")
INFRA_FILE = os.path.join(DATA_DIR, "kochi_infrastructure.json")
FAILURES_FILE = os.path.join(DATA_DIR, "historical_failures.csv")


def _haversine_km(lat1, lon1, lat2, lon2):
    """Return great-circle distance in km between two lat/lon points."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


class DependencyGraph:
    """
    Directed graph of Kochi infrastructure.

    Nodes carry:
        - type            : 'substation' | 'water_pump' | 'hospital'
        - flood_threshold : depth (m) at which node fails
        - population_impact: people affected if this node goes down
        - status          : 'OPERATIONAL' | 'FAILED'

    Edges carry:
        - dependency      : 'power' | 'water'
        - failure_probability: weight from Random Forest (0-1)
    """

    def __init__(self):
        self.graph: nx.DiGraph = nx.DiGraph()
        self._rf_model: RandomForestClassifier | None = None
        self._hardened: set = set()

    # ── Build ─────────────────────────────────────────────────────────────────

    def build(self) -> nx.DiGraph:
        """Load infrastructure JSON and train RF edge weights. Returns the graph."""
        with open(INFRA_FILE, "r") as f:
            infra = json.load(f)

        # Add nodes
        for node in infra["nodes"]:
            self.graph.add_node(
                node["id"],
                type=node["type"],
                name=node["name"],
                lat=node["lat"],
                lon=node["lon"],
                flood_threshold=node["flood_threshold"],
                population_impact=node["population_impact"],
                status="OPERATIONAL",
                description=node.get("description", ""),
            )

        # Add edges with base failure probability
        for edge in infra["edges"]:
            src_data = self.graph.nodes[edge["source"]]
            tgt_data = self.graph.nodes[edge["target"]]
            dist = _haversine_km(src_data["lat"], src_data["lon"], tgt_data["lat"], tgt_data["lon"])
            self.graph.add_edge(
                edge["source"],
                edge["target"],
                dependency=edge["dependency"],
                distance_km=round(dist, 3),
                failure_probability=0.5,  # placeholder; RF will override
            )

        # Train Random Forest and update edge weights
        self._train_rf_weights()
        return self.graph

    # ── Random Forest Edge Weighting ──────────────────────────────────────────

    def _train_rf_weights(self):
        """Train RF on historical failures, then predict edge failure probabilities."""
        df = pd.read_csv(FAILURES_FILE)

        features = df[["distance_km", "power_dependency"]].values
        labels = (df["historical_failure_rate"] > 0.7).astype(int).values  # 1 = high risk

        X_train, X_test, y_train, y_test = train_test_split(features, labels, test_size=0.2, random_state=42)

        self._rf_model = RandomForestClassifier(n_estimators=50, random_state=42, n_jobs=-1)
        self._rf_model.fit(X_train, y_train)

        accuracy = self._rf_model.score(X_test, y_test)
        print(f"[DependencyGraph] RF Edge Model Accuracy: {accuracy:.2%}")

        # Update each edge with predicted failure probability
        for src, tgt, data in self.graph.edges(data=True):
            power_dep = 1 if data["dependency"] == "power" else 0
            feat = np.array([[data["distance_km"], power_dep]])
            prob = self._rf_model.predict_proba(feat)[0][1]
            self.graph[src][tgt]["failure_probability"] = round(float(prob), 4)

    # ── Utility Methods ───────────────────────────────────────────────────────

    def harden_node(self, node_id: str) -> bool:
        """
        Set a node's flood_threshold to infinity (un-floodable).
        Used for What-If ROI analysis.
        Returns True if node existed, False otherwise.
        """
        if node_id not in self.graph.nodes:
            return False
        self.graph.nodes[node_id]["flood_threshold"] = float("inf")
        self._hardened.add(node_id)
        print(f"[DependencyGraph] Node '{node_id}' hardened (threshold → ∞)")
        return True

    def soften_node(self, node_id: str, original_threshold: float) -> bool:
        """Restore a node's original threshold (undo hardening)."""
        if node_id not in self.graph.nodes:
            return False
        self.graph.nodes[node_id]["flood_threshold"] = original_threshold
        self._hardened.discard(node_id)
        return True

    def reset_statuses(self):
        """Reset all nodes to OPERATIONAL (for re-simulation)."""
        for node in self.graph.nodes:
            self.graph.nodes[node]["status"] = "OPERATIONAL"

    def to_dict(self) -> dict:
        """Serialize graph to JSON-safe dict for API responses."""

        def _sanitize(v):
            """Convert non-JSON-safe floats (inf, nan) to safe values."""
            if isinstance(v, float):
                if v == float("inf"):
                    return 9999.0   # sentinel: hardened / "infinity"
                if v != v:          # NaN check
                    return 0.0
            return v

        nodes = []
        for nid, attrs in self.graph.nodes(data=True):
            safe_attrs = {k: _sanitize(val) for k, val in attrs.items()}
            safe_attrs["hardened"] = nid in self._hardened
            nodes.append({"id": nid, **safe_attrs})

        edges = []
        for src, tgt, attrs in self.graph.edges(data=True):
            safe_attrs = {k: _sanitize(val) for k, val in attrs.items()}
            edges.append({"source": src, "target": tgt, **safe_attrs})

        return {
            "nodes": nodes,
            "edges": edges,
            "stats": {
                "total_nodes": self.graph.number_of_nodes(),
                "total_edges": self.graph.number_of_edges(),
                "hardened_nodes": list(self._hardened),
            },
        }

    def get_node_original_thresholds(self) -> dict:
        """Returns original thresholds from the JSON file."""
        with open(INFRA_FILE) as f:
            infra = json.load(f)
        return {n["id"]: n["flood_threshold"] for n in infra["nodes"]}


# ── Standalone test ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    dg = DependencyGraph()
    G = dg.build()
    print(f"\nGraph built: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")
    print("\nEdge failure probabilities (RF weighted):")
    for src, tgt, data in G.edges(data=True):
        print(f"  {src} → {tgt}  [{data['dependency']}]  failure_prob={data['failure_probability']}")
