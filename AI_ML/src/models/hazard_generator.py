"""
CascadeNet 2.0 — Model 2: Hazard Scenario Generator
Generates 100 flood depth scenarios based on 2018 Kochi flood data.
Uses a sine temporal model peaking at hour 12.
"""

import math
import os
import random
import pandas as pd
import numpy as np

# ─── Paths ───────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, "data")
FLOOD_MAP_FILE = os.path.join(DATA_DIR, "flood_map_2018.csv")


class HazardGenerator:
    """
    Generates a 24-hour flood scenario ensemble.

    Temporal model:
        depth(t) = base_depth × peak_multiplier × sin(π × t / 24)
        - Water rises from hour 0, peaks at hour 12, recedes to 0 by hour 24.

    Ensemble:
        100 scenarios, each with a random peak_multiplier in [0.8, 1.2]
        representing ±20% variation from the 2018 flood baseline.
    """

    def __init__(self, n_scenarios: int = 100, random_seed: int = 42):
        self.n_scenarios = n_scenarios
        self.random_seed = random_seed
        random.seed(random_seed)
        np.random.seed(random_seed)

        self.flood_map: pd.DataFrame = self._load_flood_map()

    # ── Loader ────────────────────────────────────────────────────────────────

    def _load_flood_map(self) -> pd.DataFrame:
        """Load the base 2018 flood depth CSV."""
        df = pd.read_csv(FLOOD_MAP_FILE)
        print(f"[HazardGenerator] Loaded flood map: {len(df)} grid cells")
        return df

    # ── Core Temporal Model ───────────────────────────────────────────────────

    @staticmethod
    def depth_at_hour(base_depth: float, hour: int, peak_multiplier: float = 1.0) -> float:
        """
        Calculate flood depth at a given hour using sine curve.

        Args:
            base_depth: The baseline 2018 flood depth at this location (meters)
            hour: Current simulation hour (0-24)
            peak_multiplier: Ensemble variation factor (0.8 to 1.2)

        Returns:
            Flood depth in meters at this hour
        """
        if hour < 0 or hour > 24:
            return 0.0
        depth = base_depth * peak_multiplier * math.sin(math.pi * hour / 24)
        return max(0.0, round(depth, 4))

    def get_node_depth_at_hour(self, lat: float, lon: float, hour: int, peak_multiplier: float) -> float:
        """
        Find the interpolated flood depth for a specific node (lat/lon) at a given hour.
        Uses nearest grid cell from the flood map.

        Args:
            lat, lon: Node coordinates
            hour: Simulation hour
            peak_multiplier: Scenario multiplier

        Returns:
            Flood depth in meters
        """
        # Find nearest grid cell by Euclidean distance in lat/lon space
        df = self.flood_map.copy()
        df["dist"] = ((df["lat"] - lat) ** 2 + (df["lon"] - lon) ** 2) ** 0.5
        nearest = df.loc[df["dist"].idxmin()]
        base_depth = nearest["base_depth_m"]
        return self.depth_at_hour(base_depth, hour, peak_multiplier)

    # ── Scenario Generator ────────────────────────────────────────────────────

    def generate_scenarios(self) -> list[dict]:
        """
        Generate N flood scenarios, each with:
          - scenario_id
          - peak_multiplier: random float in [0.8, 1.2]
          - peak_hour: always 12
          - severity: label based on multiplier

        Returns:
            List of scenario dicts
        """
        multipliers = np.random.uniform(0.8, 1.2, self.n_scenarios)
        scenarios = []

        for i, mult in enumerate(multipliers):
            mult = round(float(mult), 4)
            if mult < 0.9:
                severity = "LOW"
            elif mult < 1.05:
                severity = "MODERATE"
            elif mult < 1.15:
                severity = "HIGH"
            else:
                severity = "EXTREME"

            scenarios.append({
                "scenario_id": i + 1,
                "peak_multiplier": mult,
                "peak_hour": 12,
                "severity": severity,
            })

        print(f"[HazardGenerator] Generated {len(scenarios)} scenarios")
        severity_counts = pd.Series([s["severity"] for s in scenarios]).value_counts().to_dict()
        print(f"[HazardGenerator] Severity breakdown: {severity_counts}")
        return scenarios

    def get_hourly_depths_for_node(self, lat: float, lon: float, peak_multiplier: float) -> dict[int, float]:
        """Returns a {hour: depth_m} dict for a node across all 24 hours."""
        return {
            hour: self.get_node_depth_at_hour(lat, lon, hour, peak_multiplier)
            for hour in range(25)
        }


# ── Standalone test ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    gen = HazardGenerator(n_scenarios=100)
    scenarios = gen.generate_scenarios()

    print(f"\nFirst 5 scenarios:")
    for s in scenarios[:5]:
        print(f"  Scenario {s['scenario_id']}: multiplier={s['peak_multiplier']}, severity={s['severity']}")

    # Test depth at centre of Ernakulam at hour 12
    depth = gen.get_node_depth_at_hour(9.9816, 76.2999, 12, 1.0)
    print(f"\nDepth at Ernakulam center (hour 12, 1.0x): {depth}m")
