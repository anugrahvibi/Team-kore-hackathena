import React, { useEffect, useRef } from 'react';
import type { InfrastructureNode, ZonePrediction } from '@schema';
import { getPredictionAlertLevel, getAlertColor } from '../utils/schemaHelpers';

// ─── Zone IDs exactly match ZONE_FLOOD_THRESHOLDS in lstm_predictor.py ────────
const ZONE_COORDS: Record<string, [number, number]> = {
  "ZONE_KALPETTA": [11.6100, 76.0800],
  "ZONE_SULTHAN_BATHERY": [11.6600, 76.2500],
  "ZONE_MANANTHAVADY": [11.8000, 75.9700],
  "ZONE_VYTHIRI": [11.5500, 76.0200],
  "ZONE_PANAMARAM": [11.7900, 76.0300],
  "ZONE_AMBALAVAYAL": [11.7200, 76.1500],
};

function getZoneCoords(zoneId: string): [number, number] | null {
  return ZONE_COORDS[zoneId] ?? null;
}

interface MapViewProps {
  zonesGeoJson: any | null;
  infrastructureNodes: InfrastructureNode[];
  predictions: ZonePrediction[];
  onZoneClick: (zoneId: string) => void;
  selectedZoneId?: string | null;
}

export function MapView({ infrastructureNodes, predictions, onZoneClick, selectedZoneId }: MapViewProps) {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const circleLayersRef = useRef<any[]>([]);
  const nodeLayersRef = useRef<any[]>([]);
  const LRef = useRef<any>(null);

  // ── Init map once ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Inject Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    import('leaflet').then((L) => {
      LRef.current = L;

      // Fix Leaflet's default icon paths broken by bundlers
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Guard against React Strict Mode double-invoking effects
      if ((containerRef.current as any)._leaflet_id) return;
      const map = L.map(containerRef.current!, {
        center: [11.68, 76.08],
        zoom: 11,
        zoomControl: true,
      });
      mapRef.current = map;

      // Free OpenStreetMap tiles — no API key required
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // ── Re-draw zone circles when predictions update ────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const L = LRef.current;
    if (!map || !L || !predictions || predictions.length === 0) return;

    // Clear old circles safely
    circleLayersRef.current.forEach(c => {
      try { c.remove(); } catch (e) { }
    });
    circleLayersRef.current = [];

    predictions.forEach((p) => {
      if (!p || !p.zone_id) return;
      const coords = getZoneCoords(p.zone_id);
      if (!coords) return;
      const level = getPredictionAlertLevel(p);
      const color = getAlertColor(level);
      const pct = Math.round((p.flood_probability ?? 0) * 100);
      const isSelected = p.zone_id === selectedZoneId;
      const name = (p as any).zone_name || p.zone_id.replace('ZONE_', '').replace(/_/g, ' ');

      try {
        const circle = L.circle(coords, {
          radius: 1400,          // ~1.4km radius — clearly visible at zoom 12
          color,
          fillColor: color,
          fillOpacity: level === 'RED' ? 0.40 : (level === 'ORANGE' ? 0.32 : (level === 'YELLOW' ? 0.24 : 0.12)),
          weight: isSelected ? 4 : 2,
          opacity: 0.9,
        }).addTo(map);

        // Permanent, high-fidelity card for non-GREEN zones
        if (level !== 'GREEN') {
          circle.bindTooltip(
            `<div class="map-tooltip-card">
              <div class="tooltip-header">
                <div class="flex items-center gap-2">
                  <div class="w-1.5 h-1.5 rounded-full animate-pulse" style="background: ${color}"></div>
                  <span class="tooltip-title">${name}</span>
                </div>
                <span class="tooltip-badge" style="background:${color}15; color:${color}; border: 1px solid ${color}25">${level}</span>
              </div>
              <div class="tooltip-body">
                <div class="tooltip-metric">
                  <span class="metric-value">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:inline; margin-right:4px; opacity:0.6"><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 17c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 7c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>${pct}%
                  </span>
                  <span class="metric-label">Risk Index</span>
                </div>
                <div class="tooltip-metric">
                  <span class="metric-value">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:inline; margin-right:4px; opacity:0.6"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${p.lead_time_hours?.toFixed(1) ?? '?'}h
                  </span>
                  <span class="metric-label">Window</span>
                </div>
              </div>
            </div>`,
            { permanent: true, direction: 'top', className: 'cascade-tooltip', offset: [0, -8] }
          );
        } else {
          circle.bindTooltip(`<span><b>${name}</b> · ${pct}% · <span style="opacity:0.5; font-size:0.5rem; letter-spacing:0.1em">STABLE</span></span>`, { direction: 'top', className: 'cascade-tooltip-simple' });
        }

        circle.on('click', () => onZoneClick(p.zone_id));
        circleLayersRef.current.push(circle);
      } catch (err) {
        console.warn("Map Circle Error:", err);
      }
    });
  }, [predictions, selectedZoneId]);

  // ── Draw infrastructure nodes once they arrive ──────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const L = LRef.current;
    if (!map || !L || !infrastructureNodes || infrastructureNodes.length === 0) return;

    // Clear old node markers safely
    nodeLayersRef.current.forEach(m => {
      try { m.remove(); } catch (e) { }
    });
    nodeLayersRef.current = [];


    const cfg: Record<string, { color: string; label: string }> = {
      substation: { color: '#ef4444', label: 'PWR' },
      water_pump: { color: '#3b82f6', label: 'H2O' },
      hospital: { color: '#10b981', label: 'MED' },
      road: { color: '#f59e0b', label: 'WAY' },
      comm_tower: { color: '#8b5cf6', label: 'SIG' },
    };

    infrastructureNodes.forEach((node) => {
      if (!node.lat || !node.lon) return;
      const c = cfg[node.type] ?? { color: '#64748b', label: 'LOC' };
      const icon = L.divIcon({
        html: `<div style="
          width:24px;height:24px;border-radius:8px;
          background:${c.color}20; border:1.5px solid ${c.color}80;
          backdrop-filter:blur(8px);
          display:flex;align-items:center;justify-content:center;
          font-size:7px; font-weight:900; color:${c.color};
          box-shadow:0 4px 12px ${c.color}15;
          cursor:pointer; transform:rotate(45deg);">
            <div style="transform:rotate(-45deg)">${c.label}</div>
          </div>`,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      const marker = L.marker([node.lat, node.lon], { icon }).addTo(map);
      marker.bindTooltip(
        `<b>${node.name}</b><br/>${node.type.replace(/_/g, ' ')}<br/>Threshold: ${node.flood_threshold}m`,
        { direction: 'top' }
      );
      nodeLayersRef.current.push(marker);
    });
  }, [infrastructureNodes]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Risk Legend */}
      <div className="glass-card" style={{
        position: 'absolute', bottom: 20, right: 20, zIndex: 1000,
        borderRadius: 20, padding: '12px 16px',
        border: '1px solid rgba(255,255,255,0.4)',
        background: 'rgba(255,255,255,0.7)',
      }}>
        <div style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#334155', marginBottom: 10, opacity: 1 }}>
          Risk Matrix
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {([['#ef4444', 'CRITICAL'], ['#f97316', 'SEVERE'], ['#f59e0b', 'ELEVATED'], ['#10b981', 'STABLE']] as const).map(([color, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}40` }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: '#020617', letterSpacing: '0.05em' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Loading overlay while predictions not yet arrived */}
      {predictions.length === 0 && (
        <div className="absolute inset-0 z-[999] flex items-center justify-center bg-white/20 backdrop-blur-md pointer-events-none">
          <div className="flex items-center justify-center glass-card px-8 py-5 rounded-2xl shadow-xl min-w-[260px] border border-white/60 bg-white/95 backdrop-blur-3xl shrink-0">
            <span className="text-[13px] font-black text-blue-600 uppercase whitespace-nowrap animate-pulse">
              Synchronizing AI Data...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
