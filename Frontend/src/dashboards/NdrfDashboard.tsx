import React, { useEffect, useState, useRef } from 'react';
import { MapView } from '../components/MapView';
import { ZonePanel } from '../components/ZonePanel';
import { CustomSelect } from '../components/CustomSelect';
import { fetchZones, fetchInfrastructure, fetchPredictions, fetchActiveAlerts, fetchLeadTimes, fetchVulnerabilities, fetchROIRankings } from '../utils/dataFetcher';
import type { LeadTimeTicker, ZonePrediction, InfrastructureNode, StakeholderAction, VulnerabilityAnalysis, ROIAnalysis } from '@schema';
import { getPredictionAlertLevel } from '../utils/schemaHelpers';
import { AlertTriangle, MapPin, ShieldAlert, Navigation, Activity, CheckCircle2, Zap, Shield, Radio, Clock, Target, Info, ShieldCheck, ChevronRight, ArrowRight } from 'lucide-react';

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
      <div className="w-full lg:w-96 h-auto lg:h-full max-h-[52vh] lg:max-h-none glass-card flex flex-col z-10 shadow-xl shrink-0 rounded-[2.5rem] border border-white/70 bg-white/95 backdrop-blur-3xl shadow-xl border border-white/60/80 overflow-hidden">
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-black/5 sticky top-0 z-30" style={{ background: 'rgba(255, 255, 255, 0.94)', backdropFilter: 'blur(45px) saturate(230%)' }}>
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
            <div className="glass-red p-4 rounded-3xl relative overflow-hidden group">
              <div className="text-[14px] font-black text-red-600/40 uppercase mb-1">Critical</div>
              <div className="text-2xl font-black text-red-600 leading-none">{sortedRisks.filter(r => getPredictionAlertLevel(r) === 'RED').length}</div>
            </div>

            <div className="glass-blue p-4 rounded-3xl relative overflow-hidden group">
              <div className="text-[14px] font-black text-blue-600/40 uppercase mb-1">Horizon</div>
              <div className="text-2xl font-black text-blue-600 leading-none">
                {predictions.length > 0 ? (predictions.reduce((acc, p) => acc + p.lead_time_hours, 0) / predictions.length).toFixed(1) : '0'}h
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-6 sm:py-6 flex-1 overflow-y-auto overflow-x-hidden space-y-8 custom-scrollbar">
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
                        : 'glass-card border-white/50 hover:border-blue-300/50 hover:shadow-lg'
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
                      <ArrowRight size={32} className={`shrink-0 opacity-30 group-hover:opacity-100 group-hover:translate-x-1.5 transition-all ${criticality === 'CRITICAL' ? 'text-red-600' : criticality === 'SEVERE' ? 'text-orange-600' : 'text-blue-600'}`} />
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
                 <ShieldAlert size={12} className="text-blue-700" /> Operational Directives
               </h3>
              <div className="space-y-3">
                {alerts.map((alert, idx) => (
                  <div key={idx} className="p-5 glass-blue rounded-3xl relative overflow-hidden group hover:shadow-md transition-all gsap-appear">
                    <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Navigation size={40} className="text-blue-600" />
                    </div>
                     <div className="text-[16px] font-black text-blue-700 uppercase mb-2 relative z-10">AI Action Router</div>
                    <div className="text-[16px] font-bold leading-relaxed text-gray-950 relative z-10">{alert.action}</div>
                    <div className="mt-3 text-[16px] font-black text-gray-600 uppercase">Priority: {alert.priority}</div>
                  </div>
                ))}
              </div>

            </section>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t border-black/5 bg-white/95 backdrop-blur-3xl shadow-xl border border-white/60/60" style={{ backdropFilter: 'blur(32px) saturate(200%)' }}>
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

      <div className="flex-1 relative min-h-[65vh] lg:min-h-0 h-[65vh] lg:h-full rounded-[2.5rem] overflow-hidden border border-white/60 shadow-xl">
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
          <div className="bg-white/95 backdrop-blur-3xl shadow-xl border border-white/60/90 backdrop-blur-md px-6 py-3 rounded-full border border-white shadow-xl flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-700 animate-pulse" />
            <span className="text-[15px] font-black text-gray-950 uppercase">Predictions: {predictions.length}</span>
          </div>
          <div className="bg-white/95 backdrop-blur-3xl shadow-xl border border-white/60/90 backdrop-blur-md px-6 py-3 rounded-full border border-white shadow-xl flex items-center gap-3">
            <Info size={14} className="text-blue-700" />
            <span className="text-[15px] font-black text-gray-950 uppercase">Infrastructure Nodes: {infra.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
