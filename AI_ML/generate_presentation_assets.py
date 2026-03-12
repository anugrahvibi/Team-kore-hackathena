from src.models.graph_analytics import GraphAnalytics
from src.models.visual_report import VisualReportGenerator
from src.models.dependency_graph import DependencyGraph
from src.models.lstm_predictor import LSTMFloodPredictor
from src.models.roi_calculator import ROICalculator
import os

def generate_demo_assets():
    print("🚀 Generating Dynamic Graphical Data for Judges...")
    
    # 1. Initialize Models
    dg = DependencyGraph()
    graph = dg.build()
    analytics = GraphAnalytics(graph)
    v_report = VisualReportGenerator(output_dir="outputs/presentation_charts")
    
    # 2. Generate Singularity Data
    vulnerability_data = analytics.calculate_vulnerabilities()
    path1 = v_report.generate_singularity_chart(vulnerability_data["top_singularities"])
    print(f"✅ Created: {path1}")
    
    # 3. Generate Lead Time Graphical Data
    lstm = LSTMFloodPredictor()
    predictions = lstm.predict_all_zones()
    path2 = v_report.generate_lead_time_distribution(predictions)
    print(f"✅ Created: {path2}")
    
    # 4. Generate ROI Optimization Data (Knapsack)
    # We'll simulate a ₹5M budget for the demo chart
    roi_calc = ROICalculator()
    candidates = []
    for node_id in graph.nodes:
        if graph.nodes[node_id]["type"] in ["substation", "hospital"]:
            # Mocking lives saved for a quick demo visual
            candidates.append({
                "node_id": node_id,
                "cost_inr": 1_000_000,
                "lives_saved": 50000 + (graph.degree(node_id) * 10000)
            })
    
    budget_analysis = roi_calc.allocate_budget(candidates, 5_000_000)
    path3 = v_report.generate_roi_comparison(budget_analysis)
    print(f"✅ Created: {path3}")
    
    print("\n🏆 All Assets Generated. Check 'AI_ML/outputs/presentation_charts/'")
    print("   Upload these PNGs to your slides/documentation immediately!")

if __name__ == "__main__":
    generate_demo_assets()
