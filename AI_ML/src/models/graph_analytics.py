import networkx as nx
import pandas as pd
import json

class GraphAnalytics:
    """
    Advanced Network Science Engine for CascadeNet 2.0.
    Calculates structural vulnerabilities using graph theory (Centrality measures).
    """

    def __init__(self, graph: nx.DiGraph):
        self.graph = graph

    def calculate_vulnerabilities(self) -> dict:
        """
        Calculate multiple centrality measures to identify 'Structural Singularities'.
        """
        # 1. Betweenness Centrality (The 'Bridge' / 'Bottleneck' score)
        # Represents how many shortest paths pass through this node.
        betweenness = nx.betweenness_centrality(self.graph, normalized=True)

        # 2. Closeness Centrality (The 'Reach' score)
        # Represents how quickly a failure at this node can reach all other nodes.
        closeness = nx.closeness_centrality(self.graph)

        # 3. Degree Centrality (The 'Hub' score)
        # Represents how many direct connections a node has.
        degree = nx.degree_centrality(self.graph)

        # 4. PageRank (The 'Influence' score)
        # Identifies nodes that are connected to other critical nodes (recursive importance).
        pagerank = nx.pagerank(self.graph, alpha=0.85)

        results = []
        for node_id in self.graph.nodes:
            node_data = self.graph.nodes[node_id]
            
            # Combine scores into a weighted 'Criticality Singularity Index'
            # We weight Betweenness highest (40%) because it identifies the bottlenecks.
            singularity_score = (
                (betweenness[node_id] * 0.4) +
                (pagerank[node_id] * 0.3) +
                (closeness[node_id] * 0.2) +
                (degree[node_id] * 0.1)
            )

            results.append({
                "node_id": node_id,
                "name": node_data.get("name", node_id),
                "type": node_data.get("type", "unknown"),
                "scores": {
                    "bottleneck_centrality": round(betweenness[node_id], 4),
                    "influence_pagerank": round(pagerank[node_id], 4),
                    "reach_closeness": round(closeness[node_id], 4),
                    "connectivity_degree": round(degree[node_id], 4)
                },
                "singularity_index": round(singularity_score * 100, 2) # Scale to 0-100 for readability
            })

        # Sort by Singularity Index descending
        ordered_results = sorted(results, key=lambda x: x["singularity_index"], reverse=True)

        return {
            "status": "success",
            "analysis_metadata": {
                "algorithm": "NetworkX Centrality Suite",
                "metrics": ["Betweenness", "PageRank", "Closeness", "Degree"],
                "node_count": self.graph.number_of_nodes(),
                "edge_count": self.graph.number_of_edges()
            },
            "top_singularities": ordered_results[:5], # Return Top 5 for the 'Quick View'
            "full_vulnerability_map": ordered_results
        }

    def get_bottleneck_recommendations(self) -> list[str]:
        """
        Generate human-readable tactical recommendations based on graph theory.
        """
        data = self.calculate_vulnerabilities()
        recommendations = []
        
        for item in data["top_singularities"][:3]:
            node_name = item["name"]
            score = item["singularity_index"]
            
            if score > 15:
                recommendations.append(
                    f"CRITICAL: {node_name} is a high-centrality singularity. Failure here will paralyze major downstream sectors."
                )
            else:
                recommendations.append(
                    f"ADVISORY: {node_name} acts as a secondary bridge. Recommended for proactive hardening."
                )
        
        return recommendations
