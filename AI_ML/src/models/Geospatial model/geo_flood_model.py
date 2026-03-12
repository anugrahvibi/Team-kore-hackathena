import os
import json
import math
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
import matplotlib.patches as mpatches
from matplotlib.lines import Line2D
import rasterio
from rasterio.plot import show as rioshow
from rasterio.warp import reproject, Resampling
from scipy.interpolate import griddata
from scipy.spatial import Voronoi
from shapely.geometry import Polygon, MultiPolygon, Point, shape
import geopandas as gpd

# ── 4.1 — Satellite Base Layer ────────────────────────────────────────────────
def load_satellite(tif_path):
    """
    Load Sentinel-2 GeoTIFF and normalize for display.
    Returns: fig, ax with satellite image rendered as RGB background.
    Applies 2% percentile stretch for visual contrast enhancement.
    """
    if not os.path.exists(tif_path):
        # Fallback for missing TIFF to avoid crashing during initial setup
        fig, ax = plt.subplots(figsize=(14, 12))
        ax.set_facecolor("none")
        fig.patch.set_facecolor("none")
        # Dummy bounds if file missing (using Wayanad approx)
        class DummyBounds:
            left, right, bottom, top = 75.77, 76.30, 11.50, 12.00
        return fig, ax, DummyBounds()

    with rasterio.open(tif_path) as src:
        # Read RGB bands (adjust band order to match your download)
        red   = src.read(1).astype(float)
        green = src.read(2).astype(float)
        blue  = src.read(3).astype(float)
        transform = src.transform
        crs = src.crs
        bounds = src.bounds

    # 2% linear stretch (standard for satellite display)
    def stretch(band):
        valid = band[band > 0]
        if len(valid) == 0: return band
        p2, p98 = np.percentile(valid, [2, 98])
        return np.clip((band - p2) / (p98 - p2), 0, 1)

    rgb = np.dstack([stretch(red), stretch(green), stretch(blue)])
    
    fig, ax = plt.subplots(figsize=(14, 12))
    fig.patch.set_facecolor("none")
    ax.set_facecolor("none")
    
    # Render satellite image using rasterio extent
    extent = [bounds.left, bounds.right, bounds.bottom, bounds.top]
    ax.imshow(rgb, extent=extent, origin="upper", zorder=1, interpolation="bilinear")
    
    return fig, ax, bounds

# ── 4.2 — Flood Depth Raster Overlay ──────────────────────────────────────────
def build_flood_surface(flood_df, boundary_poly, hour=12, peak_multiplier=1.0, grid_resolution=300):
    """
    Interpolate 24 flood depth sample points into a continuous raster surface.
    Uses cubic interpolation. Applies sine temporal model from HazardGenerator.
    Masks output to district boundary polygon.
    """
    def depth_at_hour(base, t, mult):
        return max(0.0, base * mult * math.sin(math.pi * t / 24))

    # Sample depths at this hour
    pts_lon = flood_df["lon"].values
    pts_lat = flood_df["lat"].values
    depths  = np.array([depth_at_hour(d, hour, peak_multiplier) 
                        for d in flood_df["base_depth_m"]])

    # Build interpolation grid over district bounds
    minx, miny, maxx, maxy = boundary_poly.bounds
    grid_lon = np.linspace(minx, maxx, grid_resolution)
    grid_lat = np.linspace(miny, maxy, grid_resolution)
    GL, GLA  = np.meshgrid(grid_lon, grid_lat)

    surface = griddata(
        np.column_stack([pts_lon, pts_lat]),
        depths,
        (GL, GLA),
        method="cubic",
        fill_value=0.0
    )
    surface = np.clip(surface, 0, None)

    # Mask outside boundary
    mask = np.array([
        [boundary_poly.contains(Point(GL[i,j], GLA[i,j])) for j in range(grid_resolution)]
        for i in range(grid_resolution)
    ])
    return GL, GLA, np.where(mask, surface, np.nan)


def render_flood_overlay(ax, GL, GLA, surface, alpha=0.65):
    """
    Renders flood surface as a semi-transparent blue gradient over satellite.
    Colormap: transparent at 0m → light blue → deep navy at peak depth.
    Adds colorbar with depth scale.
    """
    FLOOD_CMAP = mcolors.LinearSegmentedColormap.from_list("flood", [
        (0.0,  (0.1, 0.5, 1.0, 0.0)),
        (0.10, (0.2, 0.6, 1.0, 0.30)),
        (0.35, (0.0, 0.3, 0.9, 0.60)),
        (0.65, (0.0, 0.1, 0.7, 0.80)),
        (1.0,  (0.0, 0.0, 0.4, 0.95)),
    ])
    vmax = np.nanmax(surface) if not np.all(np.isnan(surface)) else 1.0
    # Clean alpha: mask out depths < 0.05m to remove background "haze"
    masked_surface = np.where(surface < 0.05, np.nan, surface)
    mesh = ax.pcolormesh(GL, GLA, masked_surface, cmap=FLOOD_CMAP,
                         vmin=0, vmax=vmax, shading="auto",
                         alpha=alpha, zorder=5)
    return mesh

# ── 4.3 — Zone Choropleth (LSTM Output) ───────────────────────────────────────
ZONE_THRESHOLDS = {
    "ZONE_KALPETTA":        {"orange": 0.6, "red": 0.9,  "base": 0.70, "elev": 780, "prox": 1.5},
    "ZONE_SULTHAN_BATHERY": {"orange": 1.0, "red": 1.5,  "base": 0.40, "elev": 930, "prox": 3.0},
    "ZONE_MANANTHAVADY":    {"orange": 1.5, "red": 2.2,  "base": 0.60, "elev": 760, "prox": 0.5},
    "ZONE_VYTHIRI":         {"orange": 0.6, "red": 0.9,  "base": 0.80, "elev": 700, "prox": 0.8},
    "ZONE_PANAMARAM":       {"orange": 1.5, "red": 2.2,  "base": 0.65, "elev": 750, "prox": 0.3},
    "ZONE_AMBALAVAYAL":     {"orange": 1.0, "red": 1.5,  "base": 0.45, "elev": 900, "prox": 2.5},
}
PEAK_CONDITIONS_2018 = {
    "ZONE_KALPETTA":        {"rain": 6.8, "river": 1.0,  "outflow": 2400},
    "ZONE_SULTHAN_BATHERY": {"rain": 5.5, "river": 1.6,  "outflow": 2400},
    "ZONE_MANANTHAVADY":    {"rain": 7.1, "river": 2.3,  "outflow": 2400},
    "ZONE_VYTHIRI":         {"rain": 7.2, "river": 1.1,  "outflow": 2400},
    "ZONE_PANAMARAM":       {"rain": 6.5, "river": 2.4,  "outflow": 2400},
    "ZONE_AMBALAVAYAL":     {"rain": 5.8, "river": 1.7,  "outflow": 2400},
}

def lstm_predict_all(zones):
    """
    Compute flood probability and alert level per zone using the LSTM feature
    weighting.
    """
    for z in zones:
        zid = z["id"]
        t, c = ZONE_THRESHOLDS[zid], PEAK_CONDITIONS_2018[zid]
        prob = (t["base"]*0.30 + min(c["river"]/t["red"],1)*0.40 +
                min(c["rain"]/8.0,1)*0.15 + min(c["outflow"]/3000,1)*0.15)
        if t["elev"] >= 900: prob *= 0.72
        elif t["elev"] >= 800: prob *= 0.88
        if t["prox"] <= 0.5: prob = min(prob*1.10, 1.0)
        z["flood_probability"] = round(min(max(prob, 0), 1), 3)
        high_elev = t["elev"] >= 900
        if high_elev:
            z["alert_level"] = "RED" if prob>=0.85 else "ORANGE" if prob>=0.45 else "GREEN"
        else:
            z["alert_level"] = "RED" if (c["river"]>=t["red"] or prob>=0.78) else "ORANGE" if (c["river"]>=t["orange"] or prob>=0.50) else "GREEN"
    return zones


def build_voronoi_zones(zones, boundary_poly):
    """
    Generate Voronoi polygons from zone centroids, clipped to district boundary.
    """
    pts = np.array([[z["lon"], z["lat"]] for z in zones])
    mn = [boundary_poly.bounds[0]-0.5, boundary_poly.bounds[1]-0.5]
    mx = [boundary_poly.bounds[2]+0.5, boundary_poly.bounds[3]+0.5]
    mirrors = [[mn[0],mn[1]],[mx[0],mn[1]],[mn[0],mx[1]],[mx[0],mx[1]]]
    vor = Voronoi(np.vstack([pts, mirrors]))
    polys = []
    for i in range(len(zones)):
        reg = vor.regions[vor.point_region[i]]
        if -1 in reg or not reg:
            polys.append(boundary_poly)
        else:
            cell = Polygon(vor.vertices[reg])
            clipped = cell.intersection(boundary_poly)
            polys.append(clipped if not clipped.is_empty else boundary_poly)
    return polys


def render_zone_choropleth(ax, zones, zone_polys, alpha=0.28):
    """
    Render semi-transparent zone fill on satellite background.
    """
    ALERT_COLORS = {"RED": "#ff2d2d", "ORANGE": "#ff8c00", "GREEN": "#00c950"}
    for i, z in enumerate(zones):
        col  = ALERT_COLORS[z["alert_level"]]
        poly = zone_polys[i]
        zg   = gpd.GeoDataFrame(geometry=[poly], crs="EPSG:4326")
        # Fill removed for borderline-only visuals as per request
        # zg.plot(ax=ax, color=col, alpha=alpha, zorder=3)
        zg.plot(ax=ax, facecolor="none", edgecolor=col, linewidth=1.5,
                alpha=0.85, zorder=4)
        # Label
        ax.text(z["lon"], z["lat"]+0.024, z["name"],
                fontsize=8, color="white", fontweight="bold", ha="center",
                zorder=16, bbox=dict(boxstyle="round,pad=0.22",
                facecolor="none", alpha=0.9, edgecolor="none"))
        ax.text(z["lon"], z["lat"]-0.024,
                f"{z['flood_probability']*100:.0f}% \u00b7 {z['alert_level']}",
                fontsize=7.5, color=col, fontweight="bold", ha="center",
                zorder=16, bbox=dict(boxstyle="round,pad=0.20",
                facecolor="none", alpha=0.9, edgecolor=col, lw=0.8))

# ── 4.4 — Infrastructure Nodes with Singularity Index ────────────────────────
def compute_singularity_index(nodes, edges):
    """
    Replicates GraphAnalytics.calculate_vulnerabilities().
    Scoring: betweenness 45% + degree 25% + population_impact 30%.
    """
    node_ids = [n["id"] for n in nodes]
    adj = {n: [] for n in node_ids}
    deg = {n: 0  for n in node_ids}
    for e in edges:
        s, t = e["source"], e["target"]
        if s in adj and t in adj:
            adj[s].append(t); adj[t].append(s)
            deg[s] += 1;      deg[t] += 1
    max_deg = max(deg.values()) if deg.values() else 1

    # BFS betweenness
    btw = {n: 0.0 for n in node_ids}
    for src in node_ids:
        visited = {src: 0}; queue = [src]; paths = {src: 1}; order = []
        while queue:
            v = queue.pop(0); order.append(v)
            for w in adj[v]:
                if w not in visited:
                    visited[w] = visited[v]+1; queue.append(w)
                    paths[w] = paths.get(w,0)+paths[v]
        dep = {n: 0.0 for n in node_ids}
        for w in reversed(order):
            for v in adj[w]:
                if visited.get(v,999) < visited.get(w,999):
                    dep[v] += (paths.get(v,1)/max(paths.get(w,1),1)) * (1+dep[w])
            if w != src: btw[w] += dep[w]
    max_btw = max(btw.values()) if btw.values() else 1e-9

    singularity = {}
    for nd in nodes:
        nid  = nd["id"]
        b    = btw[nid] / max_btw
        d    = deg[nid] / max_deg
        pop  = nd["population_impact"] / 80000.0
        singularity[nid] = round((b*0.45 + d*0.25 + pop*0.30)*100, 1)
    return singularity


NODE_MARKERS = {"substation":"s", "water_pump":"o", "hospital":"P",
                "road":"D",       "comm_tower":"^"}
NODE_COLORS  = {"substation":"#ffe066", "water_pump":"#66b3ff",
                "hospital":"#ff6b9d",  "road":"#aaaaaa", "comm_tower":"#c39ff5"}
STATUS_COLORS = {"ACTIVE":"#00c950", "AT_RISK":"#ffa500", "BROKEN":"#ff2d2d"}
EDGE_COLORS   = {"power":"#ffe066",  "water":"#66b3ff",  "access":"#aaaaaa"}

def get_node_status(node, flood_df, hour, peak_multiplier, failed_set):
    """
    Determine node status based on flood depth vs threshold.
    """
    df   = flood_df.copy()
    df["dist"] = ((df["lat"]-node["lat"])**2 + (df["lon"]-node["lon"])**2)**0.5
    base = df.loc[df["dist"].idxmin(), "base_depth_m"]
    depth = max(0.0, base * peak_multiplier * math.sin(math.pi * hour / 24))
    if node["id"] in failed_set or depth >= node["flood_threshold"]:
        return "BROKEN", depth
    elif depth >= node["flood_threshold"] * 0.70:
        return "AT_RISK", depth
    return "ACTIVE", depth


def render_infrastructure(ax, nodes, edges, flood_df, hour,
                          peak_multiplier, failed_set, singularity):
    """
    Plot 25 infrastructure nodes on satellite map.
    """
    # Draw edges first (underneath nodes)
    for e in edges:
        src_nd = next((n for n in nodes if n["id"]==e["source"]), None)
        tgt_nd = next((n for n in nodes if n["id"]==e["target"]), None)
        if not src_nd or not tgt_nd: continue
        s_broken = src_nd["id"] in failed_set
        t_broken = tgt_nd["id"] in failed_set
        if s_broken and t_broken:
            ec, lw, alpha = "#ff2d2d", 2.0, 0.95
        elif s_broken or t_broken:
            ec, lw, alpha = "#ff8800", 1.4, 0.80
        else:
            ec, lw, alpha = EDGE_COLORS.get(e["dependency"], "#ffffff"), 0.9, 0.45
        ax.annotate("",
            xy=(tgt_nd["lon"], tgt_nd["lat"]),
            xytext=(src_nd["lon"], src_nd["lat"]),
            arrowprops=dict(arrowstyle="-|>", color=ec, lw=lw,
                            alpha=alpha, mutation_scale=10), zorder=8)

    # Draw nodes
    for nd in nodes:
        status, depth = get_node_status(nd, flood_df, hour,
                                        peak_multiplier, failed_set)
        si   = singularity.get(nd["id"], 0)
        sc   = STATUS_COLORS[status]
        sz   = 55 + si * 3.0            # size proportional to singularity
        mrk  = NODE_MARKERS.get(nd["type"], "o")

        if status == "BROKEN":          # halo for critical failures
            ax.plot(nd["lon"], nd["lat"], mrk, ms=math.sqrt(sz)*1.8,
                    color="#ff2d2d", alpha=0.22, zorder=12, mec="none")
        ax.plot(nd["lon"], nd["lat"], mrk,
                ms=math.sqrt(sz), color=sc, alpha=0.95,
                zorder=13, mec="white", mew=0.7)

# ── 4.5 — Output Functions ────────────────────────────────────────────────────

# ── OUTPUT 1: Static Peak Map ─────────────────────────────────────────────────
def build_static_map(tif_path, boundary_gdf, boundary_poly, zones,
                     zone_polys, flood_df, nodes, edges, singularity, scenarios):
    """
    Renders the 2018 peak flood state (Hour 12) over satellite imagery.
    """
    worst = max(scenarios, key=lambda s: s["total_population_impact"])
    failed_by_12 = {nid for h, nids in worst["failures_timeline"].items()
                    if int(h) <= 12 for nid in nids}

    fig, ax, bounds = load_satellite(tif_path)

    GL, GLA, surface = build_flood_surface(
        flood_df, boundary_poly, hour=12, peak_multiplier=worst["peak_multiplier"])

    render_zone_choropleth(ax, zones, zone_polys, alpha=0.25)
    mesh = render_flood_overlay(ax, GL, GLA, surface, alpha=0.60)
    render_infrastructure(ax, nodes, edges, flood_df, 12,
                          worst["peak_multiplier"], failed_by_12, singularity)
    
    # Borderline - Plot as a bold continuous outline on top
    # Using boundary.plot() to ensure a continuous line irrespective of polygon parts
    gpd.GeoSeries([boundary_poly]).boundary.plot(ax=ax, color="#00ffff",
                                                 linewidth=3.5, zorder=16)

    # Colorbar
    cbar = fig.colorbar(mesh, ax=ax, fraction=0.022, pad=0.02)
    cbar.set_label("Flood Depth (m) at Peak Hour 12", color="white", fontsize=9)
    cbar.ax.yaxis.set_tick_params(color="white")
    plt.setp(cbar.ax.yaxis.get_ticklabels(), color="white")
    cbar.outline.set_edgecolor("#00ffff")

    # Title removed for minimalist visuals
    # ax.set_title("CascadeNet 3.0 \u2014 Wayanad Satellite Flood Map\n"
    #              f"2018 Peak Scenario \u00b7 Hour 12 \u00b7 {len(failed_by_12)} nodes failed \u00b7 "
    #              f"Pop. impact: {worst['total_population_impact']:,}",
    #              color="white", fontsize=13, fontweight="bold", pad=12)
    _style_axes(ax, bounds)
    _add_legend(ax)
    os.makedirs("AI_ML/outputs/visuals", exist_ok=True)
    plt.tight_layout()
    plt.savefig("AI_ML/outputs/visuals/wayanad_satellite_flood_map.png",
                dpi=180, bbox_inches="tight", transparent=True)
    plt.close()
    print("\u2705 Static map saved")


# ── OUTPUT 2: 24-Hour Cascade Animation ───────────────────────────────────────
def build_cascade_animation(tif_path, boundary_gdf, boundary_poly, zones,
                             zone_polys, flood_df, nodes, edges, singularity, scenarios):
    """
    Renders a 13-frame GIF (hours 0,2,4,...,24).
    """
    import imageio.v2 as imageio, io as io_module
    worst = max(scenarios, key=lambda s: s["total_population_impact"])
    HOURS = list(range(0, 25, 2))

    frames = []
    for h in HOURS:
        failed = {nid for hr, nids in worst["failures_timeline"].items()
                  if int(hr) <= h for nid in nids}
        GL, GLA, surface = build_flood_surface(
            flood_df, boundary_poly, hour=h,
            peak_multiplier=worst["peak_multiplier"], grid_resolution=120)

        fig, ax, bounds = load_satellite(tif_path)
        render_zone_choropleth(ax, zones, zone_polys, alpha=0.20)
        mesh = render_flood_overlay(ax, GL, GLA, surface, alpha=0.58)
        render_infrastructure(ax, nodes, edges, flood_df, h,
                              worst["peak_multiplier"], failed, singularity)
        gpd.GeoSeries([boundary_poly]).boundary.plot(ax=ax, color="#00ffff",
                                                     linewidth=3.0, zorder=16)

        # Stats overlay
        broken  = sum(1 for nd in nodes if nd["id"] in failed)
        pop_aff = sum(nd["population_impact"] for nd in nodes if nd["id"] in failed)
        frac    = math.sin(math.pi * h / 24)
        ax.text(0.985, 0.975,
                f"Hour {h:02d}:00\n"
                f"BROKEN: {broken:2d} / {len(nodes)}\n"
                f"Pop. affected: {pop_aff:,}\n"
                f"Flood: {'\u2588'*int(frac*12)}{'\u2591'*(12-int(frac*12))} {frac*100:.0f}%",
                transform=ax.transAxes, fontsize=8, va="top", ha="right",
                color="white", fontfamily="monospace",
                bbox=dict(boxstyle="round,pad=0.4", facecolor="none",
                          edgecolor="#00ffff", alpha=0.90), zorder=20)

        # Title removed for minimalist visuals
        # ax.set_title(f"CascadeNet 3.0 \u2014 Cascade Simulation \u00b7 Hour {h:02d}:00",
        #              color="white", fontsize=12, fontweight="bold")
        _style_axes(ax, bounds)

        buf = io_module.BytesIO()
        plt.savefig(buf, format="png", dpi=150, transparent=True)
        plt.close()
        buf.seek(0)
        frames.append(imageio.imread(buf))
        print(f"  Frame Hour {h:02d} rendered \u2014 {broken} nodes broken")

    # Fixed: durations argument for mimwrite
    fps = 2
    imageio.mimwrite("AI_ML/outputs/visuals/wayanad_cascade_animation.gif",
                     frames, format="gif", fps=fps, loop=0)
    print("\u2705 Animation saved")


# ── OUTPUT 3: Ensemble Failure Heatmap ────────────────────────────────────────
def build_ensemble_heatmap(tif_path, boundary_gdf, boundary_poly, zones,
                            zone_polys, flood_df, nodes, edges, singularity, scenarios):
    """
    Two-panel figure: Mean flood depth + Failure frequency.
    """
    # Compute failure rates
    fail_rate = {}
    for nd in nodes:
        fail_rate[nd["id"]] = sum(
            1 for sc in scenarios if nd["id"] in sc["failed_nodes"]
        ) / len(scenarios)

    # Compute mean flood surface across all scenarios
    all_surfs = []
    for sc in scenarios:
        _, _, s = build_flood_surface(flood_df, boundary_poly, 12,
                                       sc["peak_multiplier"], 80)
        all_surfs.append(np.where(np.isnan(s), 0, s))
    GL_e, GLA_e, s_mask = build_flood_surface(flood_df, boundary_poly, 12, 1.0, 80)
    mean_surf = np.where(np.isnan(s_mask), np.nan, np.mean(all_surfs, axis=0))

    fig, axes = plt.subplots(1, 2, figsize=(20, 10))
    fig.patch.set_facecolor("none")

    for panel, ax in enumerate(axes):
        # Load satellite background manually for each panel to avoid conflict
        if os.path.exists(tif_path):
            with rasterio.open(tif_path) as src:
                red = src.read(1).astype(float)
                grn = src.read(2).astype(float)
                blu = src.read(3).astype(float)
                bounds = src.bounds
            def stretch(b):
                valid = b[b>0]
                if len(valid)==0: return b
                p2,p98=np.percentile(valid,[2,98])
                return np.clip((b-p2)/(p98-p2),0,1)
            rgb = np.dstack([stretch(red),stretch(grn),stretch(blu)])
            ext = [bounds.left,bounds.right,bounds.bottom,bounds.top]
            ax.imshow(rgb, extent=ext, origin="upper", zorder=1, interpolation="bilinear")
        else:
            ax.set_facecolor("none")
            # Approx bounds
            bounds = type('obj', (object,), {'left':75.77, 'right':76.30, 'bottom':11.50, 'top':12.00})
            
        gpd.GeoSeries([boundary_poly]).boundary.plot(ax=ax, color="#00ffff",
                                                     linewidth=2.5, zorder=16)
        _style_axes(ax, bounds)

        if panel == 0:
            mesh = render_flood_overlay(ax, GL_e, GLA_e, mean_surf, alpha=0.65)
            cbar = fig.colorbar(mesh, ax=ax, fraction=0.025, pad=0.02)
            cbar.set_label("Mean Flood Depth (m) \u2014 100 Scenarios", color="white", fontsize=9)
            cbar.ax.yaxis.set_tick_params(color="white")
            plt.setp(cbar.ax.yaxis.get_ticklabels(), color="white")
            cbar.outline.set_edgecolor("#00ffff")
            # Title removed for minimalist visuals
            # ax.set_title("Ensemble Mean Flood Surface\n100 Scenarios \u00b7 Hour 12 Peak",
            #              color="white", fontsize=12, fontweight="bold")
        else:
            # Edges faint
            for e in edges:
                sn = next((n for n in nodes if n["id"]==e["source"]),None)
                tn = next((n for n in nodes if n["id"]==e["target"]),None)
                if sn and tn:
                    ax.plot([sn["lon"],tn["lon"]],[sn["lat"],tn["lat"]],
                            color=EDGE_COLORS.get(e["dependency"], "#ffffff"), lw=0.8, alpha=0.30, zorder=6)
            # Nodes colored by failure rate
            cmap_fr = plt.cm.RdYlGn_r
            for nd in nodes:
                fr = fail_rate.get(nd["id"], 0)
                si = singularity.get(nd["id"],0)
                sz = 60 + si*3.5
                col = cmap_fr(fr)
                mrk = NODE_MARKERS.get(nd["type"], "o")
                ax.plot(nd["lon"],nd["lat"],mrk,ms=math.sqrt(sz)*1.4,
                        color=col,alpha=0.20,zorder=11,mec="none")
                ax.plot(nd["lon"],nd["lat"],mrk,ms=math.sqrt(sz),
                        color=col,alpha=0.95,zorder=12,mec="white",mew=0.6)
                if fr >= 0.70:
                    ax.text(nd["lon"],nd["lat"]+0.018,f"{fr*100:.0f}%",
                            fontsize=6.5,color="white",ha="center",zorder=14,fontweight="bold",
                            bbox=dict(boxstyle="round,pad=0.15",facecolor="#ff2d2d",
                                      alpha=0.82,edgecolor="none"))
            sm = plt.cm.ScalarMappable(cmap=cmap_fr, norm=plt.Normalize(0,1))
            sm.set_array([])
            cbar2 = fig.colorbar(sm,ax=ax,fraction=0.025,pad=0.02)
            cbar2.set_label("Node Failure Rate (% of 100 scenarios)",
                            color="white",fontsize=9)
            cbar2.set_ticks([0,.25,.5,.75,1.0])
            cbar2.set_ticklabels(["0%","25%","50%","75%","100%"])
            cbar2.ax.yaxis.set_tick_params(color="white")
            plt.setp(cbar2.ax.yaxis.get_ticklabels(),color="white")
            cbar2.outline.set_edgecolor("#00ffff")

            # Top-5 table
            top5 = sorted(fail_rate.items(),key=lambda x:x[1],reverse=True)[:5]
            tbl  = "\n".join([f"  {nid:10s}  {fr*100:5.0f}%  SI={singularity.get(nid,0):.0f}"
                              for nid,fr in top5])
            ax.text(0.015,0.985,f"TOP 5 MOST VULNERABLE\n{'─'*28}\n{tbl}",
                    transform=ax.transAxes,fontsize=7.5,va="top",
                    color="white",fontfamily="monospace",
                    bbox=dict(boxstyle="round,pad=0.4",facecolor="none",
                              edgecolor="#00ffff",alpha=0.92),zorder=20)
            # Title removed for minimalist visuals
            # ax.set_title("Infrastructure Failure Frequency\n"
            #              "100 Scenarios \u00b7 Node size = Singularity Index",
            #              color="white", fontsize=12, fontweight="bold")

    # Title removed for minimalist visuals
    # fig.suptitle("CascadeNet 3.0 \u2014 Wayanad Ensemble Risk Analysis",
    #              color="white",fontsize=14,fontweight="bold",y=1.01)
    plt.tight_layout()
    plt.savefig("AI_ML/outputs/visuals/wayanad_ensemble_heatmap.png",
                dpi=150, bbox_inches="tight", transparent=True)
    plt.close()
    print("\u2705 Ensemble heatmap saved")

# ── 5 HELPER FUNCTIONS ────────────────────────────────────────────────────────
def _style_axes(ax, bounds):
    ax.set_xlim(bounds.left  - 0.01, bounds.right + 0.01)
    ax.set_ylim(bounds.bottom - 0.01, bounds.top  + 0.01)
    
    # Hide all axis elements for minimalist visual logic
    ax.set_axis_off()
    
    # North arrow - remains as a spatial orientation cue
    ax.annotate("", xy=(0.965,0.115), xycoords="axes fraction",
                xytext=(0.965,0.07),
                arrowprops=dict(arrowstyle="->", color="white", lw=1.5))
    ax.text(0.965,0.128,"N",transform=ax.transAxes,
            color="white",ha="center",fontsize=10,fontweight="bold")

def _add_legend(ax):
    handles = [
        mpatches.Patch(color="#ff2d2d",alpha=0.7,label="RED \u2014 Critical Flood"),
        mpatches.Patch(color="#ff8c00",alpha=0.7,label="ORANGE \u2014 Moderate Flood"),
        mpatches.Patch(color="#00c950",alpha=0.7,label="GREEN \u2014 Lower Risk"),
        Line2D([0],[0],marker="s",color="w",mfc="#ffe066",ms=7,lw=0,label="Substation"),
        Line2D([0],[0],marker="o",color="w",mfc="#66b3ff",ms=7,lw=0,label="Water Pump"),
        Line2D([0],[0],marker="P",color="w",mfc="#ff6b9d",ms=8,lw=0,label="Hospital"),
        Line2D([0],[0],marker="D",color="w",mfc="#aaaaaa",ms=6,lw=0,label="Road Node"),
        Line2D([0],[0],marker="^",color="w",mfc="#c39ff5",ms=7,lw=0,label="Comm Tower"),
        Line2D([0],[0],color="#00c950",lw=2,label="ACTIVE"),
        Line2D([0],[0],color="#ffa500",lw=2,label="AT_RISK"),
        Line2D([0],[0],color="#ff2d2d",lw=2,label="BROKEN"),
        Line2D([0],[0],color="#ffe066",lw=1.5,label="Power Edge"),
        Line2D([0],[0],color="#66b3ff",lw=1.5,label="Water Edge"),
        Line2D([0],[0],color="#aaaaaa",lw=1.5,label="Access Edge"),
    ]
    ax.legend(handles=handles, loc="lower left", fontsize=7,
              facecolor="none", edgecolor="#00ffff",
              labelcolor="white", framealpha=0.0, ncol=1)

# ── MAIN ENTRY POINT ──────────────────────────────────────────────────────────
def main():
    print("━"*60)
    print("  CascadeNet 3.0 \u2014 Satellite GIS Flood Model")
    print("━"*60)

    # Paths
    TIF_PATH      = "AI_ML/data/wayanad_satellite.tif"
    BOUNDARY_PATH = "AI_ML/data/wayanad_boundary.geojson"
    ZONES_PATH    = "AI_ML/data/wayanad_zones.json"
    INFRA_PATH    = "AI_ML/data/wayanad_infrastructure.json"
    FLOOD_PATH    = "AI_ML/data/flood_map_2018_wayanad.csv"
    SCENARIO_PATH = "AI_ML/outputs/scenarios.json"

    print("[1] Loading data...")
    if not os.path.exists(ZONES_PATH):
        print(f"Error: {ZONES_PATH} not found.")
        return
    with open(ZONES_PATH)    as f: zones     = json.load(f)["zones"]
    with open(INFRA_PATH)    as f: infra     = json.load(f)
    with open(SCENARIO_PATH) as f: scenarios = json.load(f)
    flood_df = pd.read_csv(FLOOD_PATH)
    nodes, edges = infra["nodes"], infra["edges"]

    print("[2] Loading real district boundary...")
    boundary_gdf  = gpd.read_file(BOUNDARY_PATH).to_crs("EPSG:4326")
    # Consolidated geometry using union_all() (or unary_union for older gpd)
    if hasattr(boundary_gdf, 'union_all'):
        boundary_poly = boundary_gdf.union_all()
    else:
        boundary_poly = boundary_gdf.unary_union

    print("[3] Running LSTM predictions...")
    zones = lstm_predict_all(zones)
    for z in zones:
        print(f"     {z['alert_level']:7s} {z['name']:20s} {z['flood_probability']*100:5.1f}%")

    print("[4] Building Voronoi zone polygons...")
    zone_polys = build_voronoi_zones(zones, boundary_poly)

    print("[5] Computing Singularity Index...")
    singularity = compute_singularity_index(nodes, edges)
    top3 = sorted(singularity.items(), key=lambda x: x[1], reverse=True)[:3]
    for nid, si in top3:
        nm = next((n["name"] for n in nodes if n["id"]==nid), nid)
        print(f"     {nid}: {nm} \u2014 SI={si}")

    print("[6] Building Output 1 \u2014 Satellite Flood Map (static)...")
    build_static_map(TIF_PATH, boundary_gdf, boundary_poly, zones,
                     zone_polys, flood_df, nodes, edges, singularity, scenarios)

    print("[7] Building Output 2 \u2014 24hr Cascade Animation...")
    build_cascade_animation(TIF_PATH, boundary_gdf, boundary_poly, zones,
                             zone_polys, flood_df, nodes, edges, singularity, scenarios)

    print("[8] Building Output 3 \u2014 Ensemble Heatmap (100 scenarios)...")
    build_ensemble_heatmap(TIF_PATH, boundary_gdf, boundary_poly, zones,
                            zone_polys, flood_df, nodes, edges, singularity, scenarios)

    print()
    print("━"*60)
    print("  OUTPUTS \u2192 AI_ML/outputs/visuals/")
    print("  1. wayanad_satellite_flood_map.png")
    print("  2. wayanad_cascade_animation.gif")
    print("  3. wayanad_ensemble_heatmap.png")
    print("━"*60)


if __name__ == "__main__":
    main()
