"""
CascadeNet 2.0 — 5-Stakeholder Action Router
When a zone hits RED / ORANGE, automatically generates
department-specific action items grounded in CWC and NDMA documentation.
"""

import json
import os
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
ACTIONS_FILE = os.path.join(DATA_DIR, "stakeholder_actions.json")
ZONES_FILE   = os.path.join(DATA_DIR, "kochi_zones.json")

STAKEHOLDERS = ["dam_operator", "ndrf", "district_collector", "highway_department", "public"]


class ActionRouter:
    """
    CascadeNet 2.0 — Actionability Layer
    A rules-based engine that maps ML model outputs to auditable government actions.
    Grounded in official CWC, NDMA, and NDRF documentation.
    """

    def __init__(self):
        # We don't necessarily need the actions JSON anymore for the truth-table rules,
        # but we can keep the zone info for population impact data.
        self._zones = {z["id"]: z for z in self._load_zones()}

    def _load_zones(self) -> list:
        if os.path.exists(ZONES_FILE):
            with open(ZONES_FILE) as f:
                return json.load(f)["zones"]
        return []

    def route_alert(self, zone_id: str, alert_level: str,
                    flood_probability: float, lead_time_hours: float,
                    projected_water_level_m: float,
                    reservoir_pct: float = None) -> dict:
        """
        Runs five simultaneous truth table lookups to generate structured action items.
        """
        # If no reservoir_pct provided, simulate a realistic value based on the alert_level
        if reservoir_pct is None:
            if alert_level == "RED":
                reservoir_pct = 85.0 + (flood_probability * 10)
            elif alert_level == "ORANGE":
                reservoir_pct = 70.0 + (flood_probability * 10)
            else:
                reservoir_pct = 45.0 + (flood_probability * 10)
        
        reservoir_pct = round(min(reservoir_pct, 100.0), 1)
        zone_info = self._zones.get(zone_id, {"name": zone_id.replace("ZONE_", ""), "population": 0})
        
        action_plans = []

        # 1. Dam Controller (CWC)
        dam_action = ""
        dam_priority = "LOW"
        if alert_level == "RED" and reservoir_pct > 90:
            dam_action = "Open all 5 spillway gates at full discharge. Notify EOC."
            dam_priority = "IMMEDIATE"
        elif alert_level == "RED" and reservoir_pct > 80:
            dam_action = f"Open Gate 2 + Gate 4 at full discharge. Current reservoir: {reservoir_pct}%."
            dam_priority = "IMMEDIATE"
        elif alert_level == "ORANGE":
            dam_action = "Maintain Gate 1 at 25% discharge. Monitor inflow at hourly intervals."
            dam_priority = "URGENT"
        else:
            dam_action = "Close all spillway gates. Maintain standard inflow/outflow monitoring."
            dam_priority = "ROUTINE"

        action_plans.append({
            "department": "dam_controller",
            "alert_level": alert_level,
            "action": dam_action,
            "time_window_hours": round(lead_time_hours * 0.8, 1),
            "source": "CWC Dam Safety Protocol Section 6.1",
            "reservoir_pct": reservoir_pct,
            "priority": dam_priority
        })

        # 2. NDRF / Rescue (NDRF SOP)
        ndrf_action = ""
        ndrf_priority = "LOW"
        if alert_level == "RED" and lead_time_hours < 8:
            ndrf_action = f"Deploy 4 NDRF battalions to {zone_info['name']} coordinates. Pre-position rescue boats."
            ndrf_priority = "IMMEDIATE"
        elif alert_level == "RED":
            ndrf_action = "Place 2 NDRF companies on 30-min standby at Aluva base."
            ndrf_priority = "IMMEDIATE"
        elif alert_level == "ORANGE":
            ndrf_action = "Stage 1 NDRF company at District Collectorate for rapid deployment."
            ndrf_priority = "URGENT"
        else:
            ndrf_action = "Maintain standard readiness at NDRF Thrissur base. Check equipment status."
            ndrf_priority = "ROUTINE"

        action_plans.append({
            "department": "ndrf_rescue",
            "alert_level": alert_level,
            "action": ndrf_action,
            "time_window_hours": round(lead_time_hours * 0.5, 1),
            "source": "NDRF SOP for Monsoon Failures Section 3.2",
            "priority": ndrf_priority
        })

        # 3. District Collector (NDMA)
        coll_action = ""
        coll_priority = "LOW"
        pop_risk = zone_info.get("population", 0)
        if projected_water_level_m > 3.0:
            coll_action = f"Issue Section 144 CrPC. Total evacuation for wards below 2m elevation. Impact: {pop_risk:,} people."
            coll_priority = "IMMEDIATE"
        elif projected_water_level_m > 1.5:
            coll_action = f"Evacuation for coastal wards only. Open 12 relief camps in {zone_info['name']}."
            coll_priority = "URGENT"
        elif alert_level == "ORANGE" or projected_water_level_m > 0.5:
            coll_action = "Issue early warning via PA systems. Clear local drainage bottlenecks."
            coll_priority = "PLANNED"
        else:
            coll_action = "Declare Monitoring Status. No evacuation required based on current depth."
            coll_priority = "ROUTINE"

        action_plans.append({
            "department": "district_collector",
            "alert_level": alert_level,
            "action": coll_action,
            "time_window_hours": round(lead_time_hours * 0.6, 1),
            "source": "NDMA Inundation Map Guidelines 2021",
            "priority": coll_priority
        })

        # 4. Highway Department (NHAI)
        road_action = ""
        road_priority = "LOW"
        if projected_water_level_m > 2.0:
            road_action = f"Immediately close NH66 Vyttila-Aroor stretch. Divert via Seaport-Airport Road."
            road_priority = "IMMEDIATE"
        elif projected_water_level_m > 0.8:
            road_action = "Deploy diesel pumps at Palarivattom and Edapally underpasses. Monitor water logging."
            road_priority = "URGENT"
        else:
            road_action = "Maintain regular road patrol. Monitor sensor nodes at low-lying crossings."
            road_priority = "ROUTINE"

        action_plans.append({
            "department": "highway_department",
            "alert_level": alert_level,
            "action": road_action,
            "time_window_hours": round(lead_time_hours * 0.4, 1),
            "source": "NHAI Flood Contingency Plan 2019",
            "priority": road_priority
        })

        # 5. Public
        pub_action = ""
        pub_priority = "LOW"
        if alert_level == "RED":
            pub_action = f"EVACUATE IMMEDIATELY. Move to nearest high-ground relief camp in {zone_info['name']}. Follow Western Corridor."
            pub_priority = "CRITICAL"
        elif alert_level == "ORANGE":
            pub_action = "Prepare 72-hour emergency kit. Monitor local news. Do not cross flooded roads."
            pub_priority = "URGENT"
        else:
            pub_action = "Stay informed via CM Distress App. Standard rainy season precautions apply."
            pub_priority = "ROUTINE"

        action_plans.append({
            "department": "public_advisory",
            "alert_level": alert_level,
            "action": pub_action,
            "time_window_hours": round(lead_time_hours * 0.3, 1),
            "source": "Kerala DDMP Public Advisory Template",
            "priority": pub_priority
        })

        return {
            "status": "success",
            "zone_id": zone_id,
            "zone_name": zone_info.get("name", zone_id),
            "timestamp": datetime.now().isoformat(),
            "input_risk": {
                "alert_level": alert_level,
                "flood_probability_pct": round(flood_probability * 100, 1),
                "projected_water_level_m": projected_water_level_m,
                "lead_time_hours": lead_time_hours
            },
            "action_plans": action_plans
        }

    def get_all_zone_summaries(self, zone_predictions: list[dict]) -> list[dict]:
        """
        Convenience method to generate plans for all zones at risk.
        """
        summaries = []
        for pred in zone_predictions:
            if pred["alert_level"] != "GREEN":
                plan = self.route_alert(
                    zone_id=pred["zone_id"],
                    alert_level=pred["alert_level"],
                    flood_probability=pred["flood_probability"],
                    lead_time_hours=pred["lead_time_hours"],
                    projected_water_level_m=pred["projected_water_level_m"]
                )
                summaries.append(plan)
        return summaries
