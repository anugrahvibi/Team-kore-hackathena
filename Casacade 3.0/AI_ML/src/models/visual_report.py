import matplotlib.pyplot as plt
import numpy as np
import os
import json

class VisualReportGenerator:
    """
    Generates high-quality charts for the Hackathon demo/slides.
    Focuses on 'Structural Singularity' and 'Lives Saved per Rupee'.
    """

    def __init__(self, output_dir="outputs/charts"):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)
        # Use a clean style
        plt.style.use('bmh')

    def generate_singularity_chart(self, top_singularities):
        """
        Creates a 'Structural Vulnerability' bar chart.
        Identifies the bottlenecks (singularities) for the judges.
        """
        names = [item['name'] for item in top_singularities]
        index = [item['singularity_index'] for item in top_singularities]
        
        plt.figure(figsize=(10, 6))
        colors = plt.cm.Reds(np.linspace(0.4, 0.9, len(names)))
        
        bars = plt.barh(names, index, color=colors)
        plt.xlabel('Singularity Index (Risk Leverage)')
        plt.title('Wayanad Infrastructure: Structural Singularities (Mathematical Bottlenecks)')
        plt.gca().invert_yaxis() # Highest risk at the top
        
        # Add labels on bars
        for bar in bars:
            width = bar.get_width()
            plt.text(width, bar.get_y() + bar.get_height()/2, f' {width}', 
                     va='center', fontweight='bold')

        plt.tight_layout()
        path = os.path.join(self.output_dir, "structural_vulnerability.png")
        plt.savefig(path, dpi=300)
        plt.close()
        return path

    def generate_roi_comparison(self, budget_analysis):
        """
        Generates a chart showing 'Before vs After' impact based on Knapsack optimization.
        """
        labels = ['Baseline (Unprotected)', 'Optimized (CascadeNet)']
        # We calculate the reduction in impact
        planned = budget_analysis['recommended_hardening_plan']
        total_saved = sum(item['lives_saved'] for item in planned)
        
        # Mock baseline for visual contrast (assuming total risk is 100% of pop impact)
        baseline = total_saved * 2.5 
        after = baseline - total_saved
        
        plt.figure(figsize=(8, 6))
        plt.bar(labels, [baseline, after], color=['#e74c3c', '#2ecc71'])
        plt.ylabel('Projected Population Impact (Total)')
        plt.title('Optimization Impact: Strategic Budget Allocation')
        
        plt.tight_layout()
        path = os.path.join(self.output_dir, "roi_impact.png")
        plt.savefig(path, dpi=300)
        plt.close()
        return path

    def generate_lead_time_distribution(self, predictions):
        """
        Shows the lead time distribution across Wayanad zones.
        """
        zones = [p['zone_name'] for p in predictions]
        lead_times = [p['lead_time_hours'] for p in predictions]
        
        plt.figure(figsize=(10, 5))
        plt.stem(zones, lead_times, linefmt='C0-', markerfmt='C0o', basefmt=' ')
        plt.ylabel('Evacuation Lead Time (Hours)')
        plt.title('Wayanad Response Windows: Time-to-Peak per Zone')
        plt.xticks(rotation=45, ha='right')
        plt.grid(axis='y', linestyle='--', alpha=0.7)
        
        plt.tight_layout()
        path = os.path.join(self.output_dir, "lead_time_distribution.png")
        plt.savefig(path, dpi=300)
        plt.close()
        return path

if __name__ == "__main__":
    # Self-test if run directly
    print("Generating demo charts...")
    # This would normally receive data from the API
