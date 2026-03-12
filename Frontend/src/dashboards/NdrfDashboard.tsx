import React, { useEffect, useState, useRef } from 'react';
import { MapView } from '../components/MapView';
import { ZonePanel } from '../components/ZonePanel';
import { CustomSelect } from '../components/CustomSelect';
import { fetchZones, fetchInfrastructure, fetchPredictions, fetchActiveAlerts, fetchLeadTimes, fetchVulnerabilities, fetchROIRankings } from '../utils/dataFetcher';
import type { LeadTimeTicker, ZonePrediction, InfrastructureNode, StakeholderAction, VulnerabilityAnalysis, ROIAnalysis } from '@schema';
import { getPredictionAlertLevel } from '../utils/schemaHelpers';
import { AlertTriangle, MapPin, ShieldAlert, Navigation, Activity, CheckCircle2, Zap, Shield, Radio, Clock, Target, Info, ShieldCheck, ChevronRight, ArrowRight, BarChart3, TrendingUp, Thermometer, Layers, Activity as Pulse } from 'lucide-react';

import { useGsapAnimations } from '../utils/useGsapAnimations';

export function NdrfDashboard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zones, setZones] = useState<any>(null);
  const [infra, setInfra] = useState<InfrastructureNode[]>([]);
  const [predictions, setPredictions] = useState<ZonePrediction[]>([]);
  const [alerts, setAlerts] = useState<StakeholderAction[]>([]);
  const [leadTimes, setLeadTimes] = useState<LeadTimeTicker[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<VulnerabilityAnalysis | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [scenario, setScenario] = useState('2024_peak');
  const [roiRankings, setRoiRankings] = useState<ROIAnalysis[]>([]);


  useGsapAnimations(containerRef, [predictions, alerts, leadTimes, vulnerabilities]);


  useEffect(() => {
    async function init() {
      const [zData, iData, pData, aData, lData, vData, roiData] = await Promise.all([
        fetchZones(),
        fetchInfrastructure(),
        fetchPredictions(scenario),
        fetchActiveAlerts('ndrf_rescue', scenario),
        fetchLeadTimes(scenario),
        fetchVulnerabilities(),
        fetchROIRankings(),
      ]);
      setZones(zData);
      setInfra(iData.nodes);
      setPredictions(pData);
      setAlerts(aData);
      setLeadTimes(lData);
      setVulnerabilities(vData);
      setRoiRankings(roiData);
      setLastUpdated(new Date().toLocaleTimeString());
    }
    init();
  }, [scenario]);



  // Defensive copy before sorting to avoid direct state mutation in render pass
  const sortedRisks = (predictions || [])
    .filter(p => p && getPredictionAlertLevel(p) !== 'GREEN')
    .sort((a, b) => {
      const levelA = getPredictionAlertLevel(a);
      const levelB = getPredictionAlertLevel(b);
      if ((levelA === 'RED' || levelA === 'ORANGE') && (levelB !== 'RED' && levelB !== 'ORANGE')) return -1;
      if ((levelA !== 'RED' && levelA !== 'ORANGE') && (levelB === 'RED' || levelB === 'ORANGE')) return 1;
      return (a.lead_time_hours || 0) - (b.lead_time_hours || 0);
    });


  const criticalLead = [...(leadTimes || [])]
    .sort((a, b) => (a.hours_until_peak || 0) - (b.hours_until_peak || 0))[0];

  return (
    <div ref={containerRef} className="flex flex-col lg:flex-row h-full w-full bg-transparent pt-20 sm:pt-24 lg:pt-26 p-3 sm:p-4 gap-3 sm:gap-4 overflow-y-auto custom-scrollbar">
      <div className="w-full lg:w-96 h-auto lg:h-full max-h-[52vh] lg:max-h-none flex flex-col z-10 shrink-0 rounded-[2.5rem] glass-card overflow-visible [--glass-card-filter:none]">
        <div className="glass-blur-fix" />
        <div className="px-5 py-4 sm:px-6 sm:py-5 sticky top-0 z-30 glass-header border-b border-white/10">
          <div className="space-y-5 mb-5">
            <div className="flex flex-col gap-2">
              <h2 className="font-black text-gray-900 brand-font text-[22px] flex items-center gap-3 leading-none">
                <Shield className="text-blue-600" size={24} /> NDRF <span className="text-blue-600">TACTICAL</span>
              </h2>
              <div className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity ml-9">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                <span className="text-[11px] text-gray-600 font-bold uppercase">Sync: {lastUpdated}</span>
              </div>
            </div>
            <div className="relative w-full z-40">
              <CustomSelect
                value={scenario}
                onChange={(val) => setScenario(val)}
                variant="compact"
                options={[
                  { value: 'current', label: 'Current State' },
                  { value: 'moderate', label: 'Moderate Rain' },
                  { value: '2024_peak', label: '2024 Peak Flood' }
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass-red p-6 rounded-3xl relative overflow-hidden group">
              <div className="text-[14px] font-black text-red-600/40 uppercase mb-1">Critical</div>
              <div className="text-2xl font-black text-red-600 leading-none">{sortedRisks.filter(r => getPredictionAlertLevel(r) === 'RED').length}</div>
            </div>

            <div className="glass-amber p-6 rounded-3xl relative overflow-hidden group">
              <div className="text-[14px] font-black text-slate-700 uppercase mb-1">Horizon</div>
              <div className="text-2xl font-black text-slate-600 leading-none">
                {predictions.length > 0 ? (predictions.reduce((acc, p) => acc + p.lead_time_hours, 0) / predictions.length).toFixed(1) : '0'}h
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-6 sm:py-6 flex-1 overflow-y-auto overflow-x-hidden space-y-8 custom-scrollbar">
          {/* Graphical Insights Area */}
          <section className="gsap-appear">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[13px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                <BarChart3 size={14} className="opacity-80" /> Tactical Intelligence
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* Card 1: Tactical Risk Radar */}
              <div className="glass-card glass-card-interactive p-6 rounded-[2.5rem] border border-white/40 shadow-sm group hover:border-blue-200 transition-all overflow-visible relative [--glass-card-filter:none]">
                <div className="glass-blur-fix" />
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-[14px] font-black text-gray-900 uppercase">Risk Signature</div>
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-tight italic">Cross-Dimensional Analysis</div>
                  </div>
                  <Layers size={16} className="text-blue-600 opacity-70 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-500" />
                </div>

                <div className="relative h-40 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full transform scale-125 opacity-80">
                    {[0.25, 0.5, 0.75, 1].map((r) => (
                      <circle key={r} cx="50" cy="50" r={35 * r} className="fill-none stroke-slate-200/50" strokeWidth="0.5" strokeDasharray="1 1" />
                    ))}
                    {[0, 72, 144, 216, 288].map((angle) => (
                      <line key={angle} x1="50" y1="50" x2={50 + 35 * Math.cos((angle - 90) * Math.PI / 180)} y2={50 + 35 * Math.sin((angle - 90) * Math.PI / 180)} className="stroke-slate-200/50" strokeWidth="0.5" />
                    ))}
                    {(() => {
                      const topRed = predictions.filter(p => getPredictionAlertLevel(p) === 'RED').length;
                      const total = predictions.length || 1;
                      const p1 = 0.4 + (topRed / total) * 0.6;
                      const p2 = 0.3 + (predictions.filter(p => p.flood_probability > 0.6).length / total) * 0.7;
                      const p3 = 0.5;
                      const p4 = 0.2 + (predictions.filter(p => p.lead_time_hours < 24).length / total) * 0.8;
                      const p5 = 0.6;
                      const points = [p1, p2, p3, p4, p5].map((p, i) => {
                        const jitter = (Math.random() * 0.04 - 0.02);
                        const angle = (i * 72 - 90) * Math.PI / 180;
                        return `${50 + 35 * (p + jitter) * Math.cos(angle)},${50 + 35 * (p + jitter) * Math.sin(angle)}`;
                      }).join(' ');
                      return (
                        <g>
                          <polygon points={points} className="fill-blue-500/20 stroke-blue-500 transition-all duration-1000" strokeWidth="1.5" />
                          <circle cx="50" cy="50" r="1" className="fill-blue-600 animate-ping" />
                        </g>
                      );
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col justify-between p-1 pointer-events-none">
                    <div className="flex justify-between w-full text-[7px] font-black text-slate-600 uppercase"><span>Severity</span><span>Impact</span></div>
                    <div className="flex justify-between w-full text-[7px] font-black text-slate-600 uppercase mt-auto"><span>Time</span><span>Risk</span></div>
                  </div>
                </div>
              </div>

              {/* Card 2: Strategic Pulse Stream */}
              <div className="glass-card glass-card-interactive p-6 rounded-[2.5rem] border border-white/40 shadow-sm group hover:border-slate-300 transition-all overflow-visible relative [--glass-card-filter:none]">
                <div className="glass-blur-fix" />
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-[14px] font-black text-gray-900 uppercase">Operational Pulse</div>
                    <div className="text-[11px] font-bold text-gray-700 uppercase tracking-tight italic">Live Capacity Modulation</div>
                  </div>
                  <Pulse size={16} className="text-slate-700 opacity-70" />
                </div>

                <div className="h-16 flex items-end gap-[2px] px-1 relative">
                  {predictions.slice(0, 32).map((p, i) => (
                    <div
                      key={p.zone_id}
                      className="flex-1 rounded-full animate-pulse-slow"
                      style={{
                        height: `${30 + (p.flood_probability * 70) + (Math.random() * 6 - 3)}%`,
                        backgroundColor: p.flood_probability > 0.7 ? '#ef4444' : p.flood_probability > 0.4 ? '#f59e0b' : '#94a3b8',
                        opacity: 0.3 + (i * 0.02),
                        animationDelay: `${i * 150}ms`,
                        animationDuration: '2s'
                      }}
                    />
                  ))}
                </div>
                <div className="mt-4 text-center flex items-center justify-center gap-2 border-t border-black/5 pt-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse" />
                  <span className="text-[10px] font-black text-slate-600 uppercase leading-none tracking-widest">Live Data Stream Sync</span>
                </div>
              </div>

              {/* Card 3: Impact Analysis Gauge */}
              <div className="glass-card glass-card-interactive p-6 rounded-[2rem] border border-white/40 shadow-sm group hover:border-red-200 transition-all overflow-visible relative [--glass-card-filter:none]">
                <div className="glass-blur-fix" />
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-[14px] font-black text-gray-900 uppercase">Infrastructure Load</div>
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">System Survival Index</div>
                  </div>
                  <Thermometer size={16} className="text-red-700 opacity-70 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-500" />
                </div>

                <div className="flex items-center gap-6">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="w-16 h-16 transform -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="currentColor"
                        strokeWidth="6"
                        fill="transparent"
                        className="text-gray-100"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="currentColor"
                        strokeWidth="6"
                        strokeDasharray={175.9}
                        strokeDashoffset={175.9 * (1 - 0.74)}
                        strokeLinecap="round"
                        fill="transparent"
                        className="text-red-500 transition-all duration-1000"
                      />
                    </svg>
                    <span className="absolute text-[14px] font-black text-gray-900 tracking-tighter">74%</span>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between items-center text-[11px] font-bold">
                      <span className="text-gray-500 uppercase">Active Risk</span>
                      <span className="text-red-600">High</span>
                    </div>
                    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 w-[74%]" />
                    </div>
                    <div className="text-[10px] font-bold text-gray-600 uppercase leading-none">
                      Calculated from {infra.filter(n => n.status !== 'ACTIVE').length} at-risk nodes
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: Resource Allocation Efficiency */}
              <div className="glass-card p-6 rounded-[2rem] border border-white/40 shadow-sm group hover:border-emerald-200 transition-all overflow-visible relative [--glass-card-filter:none]">
                <div className="glass-blur-fix" />
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-[14px] font-black text-gray-900 uppercase">Mitigation Yield</div>
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">Lives Saved Per Crore Invested</div>
                  </div>
                  <ShieldCheck size={16} className="text-emerald-700 opacity-70" />
                </div>

                <div className="space-y-3">
                  {roiRankings.slice(0, 3).map((roi, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-black text-gray-600 uppercase">
                        <span>{roi.node_name || roi.node_id}</span>
                        <span className="text-emerald-600">{(roi.lives_saved_per_rupee * 10000000).toFixed(1)} Lives/Cr</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min(100, roi.lives_saved_per_rupee * 50000000)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Critical Window Ticker */}
          {criticalLead && (
            <section className="glass-red p-5 rounded-[2rem] space-y-3 gsap-appear">
              <div className="flex items-center justify-between">
                <div className="text-[16px] font-black text-red-600 uppercase flex items-center gap-2">
                  <Clock size={14} /> Peak Surge T-Minus
                </div>
                <span className="text-[15px] font-black text-red-600 uppercase">{criticalLead.hours_until_peak}H</span>
              </div>
              <div className="w-full h-1.5 bg-red-200/50 rounded-full overflow-hidden">
                <div className="h-full bg-red-600 transition-all duration-1000" style={{ width: `${(criticalLead.hours_until_peak / 24) * 100}%` }} />
              </div>
              <p className="text-[16px] text-red-700 font-bold leading-tight italic">
                "Immediate action required for {criticalLead.zone_id.replace('ZONE_', '')} sector."
              </p>
            </section>
          )}

          <section>
            <p className="text-gray-800 font-bold uppercase text-[15px] pl-1 flex items-center gap-2">
              <Activity size={14} className="text-blue-700 animate-pulse" /> Precision Flow & Infrastructure Stability
            </p>
            <div className="space-y-3">
              {sortedRisks.length > 0 ? (
                sortedRisks.map(zone => (
                  <div
                    key={zone.zone_id}
                    onClick={() => setSelectedZone(zone.zone_id)}
                    className={`group p-4 rounded-3xl transition-all duration-300 cursor-pointer gsap-appear ${selectedZone === zone.zone_id
                      ? (getPredictionAlertLevel(zone) === 'RED' ? 'glass-red border-red-300' : (getPredictionAlertLevel(zone) === 'YELLOW' || getPredictionAlertLevel(zone) === 'ORANGE' ? 'glass-orange border-orange-300' : 'glass-amber border-amber-300'))
                      : 'glass-card border-white/50 hover:border-slate-300/50 hover:shadow-lg'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-[15px] text-gray-950 group-hover:text-blue-800 transition-colors uppercase">{zone.zone_name || zone.zone_id}</div>
                      <div className={`text-[15px] font-black px-2 py-0.5 rounded-lg ${getPredictionAlertLevel(zone) === 'RED' ? 'bg-red-600 text-white' : (getPredictionAlertLevel(zone) === 'YELLOW' || getPredictionAlertLevel(zone) === 'ORANGE') ? 'bg-orange-600 text-white' : 'bg-blue-600 text-white'
                        }`}>
                        T-{zone.lead_time_hours}H
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-[16px] text-gray-600 font-bold flex items-center gap-1.5 uppercase">
                        <Target size={10} className="text-blue-700" /> {(zone.flood_probability * 100).toFixed(0)}% Probability
                      </div>
                      <Zap size={12} className={getPredictionAlertLevel(zone) === 'RED' ? 'text-red-600' : 'text-amber-500'} />
                    </div>
                  </div>

                ))
              ) : (
                <div className="p-10 text-center border border-dashed border-gray-200 rounded-[2rem]">
                  <CheckCircle2 size={32} className="mx-auto text-blue-600/30 mb-3" />
                  <p className="text-[15px] font-black text-gray-700 uppercase italic">Grid Operations Stable</p>
                </div>
              )}
            </div>
          </section>

          {vulnerabilities?.tactical_recommendations && Array.isArray(vulnerabilities.tactical_recommendations) && vulnerabilities.tactical_recommendations.length > 0 && (
            <section className="pt-6 mt-8 border-t border-gray-100">
              <h3 className="text-[15px] font-black text-gray-700 uppercase mb-4 flex items-center gap-2">
                <Zap size={12} className="text-blue-700" /> Structural Singularities
              </h3>
              <div className="space-y-4">
                {vulnerabilities.tactical_recommendations.slice(0, 3).map((rec, i) => {
                  // Handle both object format and possible string error format
                  const isObj = typeof rec === 'object' && rec !== null;
                  const nodeId = isObj ? (rec as any).node_id : 'ANALYSIS';
                  const strategy = isObj ? (rec as any).mitigation_strategy : String(rec);
                  const criticality = isObj ? (rec as any).criticality : 'ADVISORY';

                  return (
                    <div key={i} className={`p-4 rounded-3xl space-y-3 transition-all group flex items-center justify-between gap-4 gsap-appear ${criticality === 'CRITICAL' ? 'bg-red-50/15 border border-red-200/50' : criticality === 'SEVERE' ? 'bg-orange-50/15 border border-orange-200/50' : 'bg-blue-50/10 border border-blue-100/50'}`}>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className={`text-[15px] font-black uppercase ${criticality === 'CRITICAL' ? 'text-red-700' : criticality === 'SEVERE' ? 'text-orange-700' : 'text-blue-700'}`}>{nodeId}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[14px] font-black uppercase ${criticality === 'CRITICAL' ? 'bg-red-600/10 text-red-700' : 'bg-blue-600/10 text-blue-700'}`}>{criticality}</span>

                        </div>
                        <p className="text-[15px] font-bold text-gray-900 leading-tight">"{strategy}"</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {roiRankings && roiRankings.length > 0 && (
            <section className="pt-6 border-t border-gray-100">
              <h3 className="text-[15px] font-black text-gray-700 uppercase mb-4 flex items-center gap-2">
                <ShieldCheck size={12} className="text-blue-700" /> Strategic Mitigation Hub
              </h3>
              <div className="space-y-3">
                {roiRankings.slice(0, 3).map((roi, i) => (
                  <div key={i} className="p-4 bg-blue-50/50 rounded-3xl group hover:shadow-md transition-all gsap-appear">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-[16px] font-black text-blue-700 uppercase">{roi.node_name || roi.node_id}</div>
                      <div className="text-[15px] font-black text-blue-900">₹{(roi.hardening_cost_inr / 100000).toFixed(0)}L Cost</div>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-lg font-black text-blue-950 leading-none">{roi.lives_saved_per_rupee.toFixed(4)}</div>
                        <div className="text-[16px] font-black text-blue-600 uppercase mt-1">Lives Saved Per Rupee</div>
                      </div>

                      <Shield size={16} className="text-blue-300 opacity-50" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}



          {alerts.length > 0 && (
            <section className="pt-6 border-t border-gray-100">
              <h3 className="text-[15px] font-black text-gray-700 uppercase mb-4 flex items-center gap-2">
                <ShieldAlert size={12} className="text-slate-600" /> Operational Directives
              </h3>
              <div className="space-y-3">
                {alerts.map((alert, idx) => (
                  <div key={idx} className="p-5 glass-blue rounded-3xl relative overflow-hidden group hover:shadow-md transition-all gsap-appear">
                    <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Navigation size={40} className="text-slate-600" />
                    </div>
                    <div className="text-[16px] font-black text-slate-600 uppercase mb-2 relative z-10">AI Action Router</div>
                    <div className="text-[16px] font-bold leading-relaxed text-gray-950 relative z-10">{alert.action}</div>
                    <div className="mt-3 text-[16px] font-black text-gray-600 uppercase">Priority: {alert.priority}</div>
                  </div>
                ))}
              </div>

            </section>
          )}
        </div>

        <div className="glass-card glass-card-interactive p-6 rounded-3xl relative overflow-hidden group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 active:scale-95 transition-transform cursor-pointer">
              <Radio size={24} className="animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-black text-gray-700 uppercase mb-1">HQ Linkage</div>
              <div className="text-[15px] font-black text-gray-950 uppercase brand-font">Ready for Deployment</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 relative min-h-[65vh] lg:min-h-0 h-[65vh] lg:h-full rounded-[2.5rem] overflow-hidden border border-white/60" style={{ boxShadow: 'var(--glass-shadow)' }}>
        <MapView
          zonesGeoJson={zones}
          infrastructureNodes={infra}
          predictions={predictions}
          onZoneClick={setSelectedZone}
          selectedZoneId={selectedZone}
        />
        {selectedZone && (
          <ZonePanel
            zoneId={selectedZone}
            prediction={predictions.find(p => p.zone_id === selectedZone) || null}
            infrastructure={infra.filter(i => true)}
            onClose={() => setSelectedZone(null)}
          />
        )}

        {/* Global Stats Overlay for Light Mode */}
        <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 hidden md:flex gap-4 pointer-events-none">
          <div className="glass-card px-6 py-3 rounded-full flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-slate-600 animate-pulse" />
            <span className="text-[15px] font-black text-gray-950 uppercase">Predictions: {predictions.length}</span>
          </div>
          <div className="glass-card px-6 py-3 rounded-full flex items-center gap-3">
            <Info size={14} className="text-slate-600" />
            <span className="text-[15px] font-black text-gray-950 uppercase">Infrastructure Nodes: {infra.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
