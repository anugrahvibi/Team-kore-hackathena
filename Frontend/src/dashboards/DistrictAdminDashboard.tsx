import React, { useEffect, useState, useRef } from 'react';
import { fetchZones, fetchPredictions, fetchActiveAlerts, fetchROIRankings } from '../utils/dataFetcher';
import type { ZonePrediction, StakeholderAction, ROIAnalysis } from '@schema';
import { getPredictionAlertLevel } from '../utils/schemaHelpers';
import { Users, FileText, CheckCircle2, AlertCircle, Shield, ArrowUpRight, BarChart3, Activity, Zap, TrendingUp, Info, Clock, ArrowRight, Target, Thermometer, Layers, Activity as Pulse, Sparkles, LayoutGrid } from 'lucide-react';
import { useGsapAnimations } from '../utils/useGsapAnimations';

export function DistrictAdminDashboard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zones, setZones] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<ZonePrediction[]>([]);
  const [alerts, setAlerts] = useState<StakeholderAction[]>([]);
  const [roiRankings, setRoiRankings] = useState<ROIAnalysis[]>([]);

  useGsapAnimations(containerRef, [predictions, alerts, roiRankings]);

  useEffect(() => {
    async function init() {
      const [zData, pData, aData, roiData] = await Promise.all([
        fetchZones(),
        fetchPredictions('2024_peak'),
        fetchActiveAlerts('district_collector', '2024_peak'),
        fetchROIRankings(),
      ]);

      setZones(Array.isArray(zData) ? zData : []);
      setPredictions(pData);
      setAlerts(aData);
      setRoiRankings(roiData);
    }
    init();
  }, []);

  const totalExposed = predictions.reduce((acc, p) => {
    const level = getPredictionAlertLevel(p);
    if (['RED', 'ORANGE'].includes(level)) {
      const zone = zones.find(z => z.id === p.zone_id);
      return acc + (zone?.population || 0);
    }
    return acc;
  }, 0);

  return (
    <div ref={containerRef} className="pt-20 sm:pt-24 lg:pt-26 p-4 sm:p-6 lg:p-8 h-full bg-transparent overflow-y-auto w-full custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-10 py-4 sm:py-6">

        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-black/5 pb-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Shield size={28} className="text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-gray-900 brand-font uppercase leading-none">
                District <span className="text-blue-600">Collectorate</span>
              </h1>
            </div>
            <p className="text-gray-800 font-bold uppercase text-[15px] pl-1 flex items-center gap-2">
              <Activity size={14} className="text-blue-700 animate-pulse" /> Executive Intelligence Command
            </p>
          </div>

          <div className="glass-card p-4 sm:p-6 rounded-[2.2rem] flex items-center gap-4 sm:gap-6 shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-transform w-full md:w-auto gsap-appear">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Users size={80} />
            </div>
            <div>
              <h3 className="text-gray-700 font-black uppercase text-[16px] mb-2">Population Exposure Index</h3>
              <div className="text-3xl sm:text-4xl font-black text-red-600 flex items-center gap-3 brand-font break-all">
                {Math.round(totalExposed).toLocaleString()} <Users size={24} className="text-red-500 opacity-40" />
              </div>
            </div>
            <ArrowUpRight className="text-gray-700" size={24} />
          </div>
        </header>

        {/* Executive Tactical Intelligence Area */}
        <section className="gsap-appear">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[14px] font-black text-blue-600/60 uppercase tracking-widest flex items-center gap-2">
              <BarChart3 size={16} /> Executive Tactical Intelligence
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: Risk Magnitude Spread (Dynamic) */}
            <div className="glass-card glass-card-interactive p-6 rounded-[3rem] transition-all overflow-visible relative group [--glass-card-filter:none]">
              <div className="glass-blur-fix" />
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="text-[16px] font-black text-gray-900 uppercase">Sector Risk Spread</div>
                  <div className="text-[12px] font-bold text-gray-500 uppercase tracking-tight italic">Live Prediction Volume</div>
                </div>
                <Users size={20} className="text-blue-600 opacity-70 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-500" />
              </div>

              <div className="h-20 flex items-end gap-3 px-1">
                {[
                  { label: 'RED', color: '#ef4444', count: predictions.filter(p => getPredictionAlertLevel(p) === 'RED').length },
                  { label: 'ORANGE', color: '#f97316', count: predictions.filter(p => getPredictionAlertLevel(p) === 'ORANGE').length },
                  { label: 'YELLOW', color: '#eab308', count: predictions.filter(p => getPredictionAlertLevel(p) === 'YELLOW').length },
                  { label: 'GREEN', color: '#10b981', count: predictions.filter(p => getPredictionAlertLevel(p) === 'GREEN').length }
                ].map((stat, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex items-end h-20 relative">
                      <div
                        className="w-full rounded-t-lg transition-all duration-1000 group-hover:opacity-100 origin-bottom"
                        style={{
                          height: `${Math.max(10, (stat.count / (predictions.length || 1)) * 100 + (Math.random() * 4 - 2))}%`,
                          backgroundColor: stat.color,
                          opacity: 0.8
                        }}
                      />
                      {stat.count >= 0 && (
                        <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-black text-gray-700">{stat.count}</span>
                      )}
                    </div>
                    <span className="text-[9px] font-black text-gray-600">{stat.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-center flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[10px] font-black text-gray-600 uppercase leading-none">Live Spectrum Sync</span>
              </div>
            </div>

            {/* Card 2: District Resource Efficiency */}
            <div className="glass-card glass-card-interactive p-6 rounded-[3rem] transition-all overflow-visible relative group [--glass-card-filter:none]">
              <div className="glass-blur-fix" />
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="text-[16px] font-black text-gray-900 uppercase">ROI Allocation Efficiency</div>
                  <div className="text-[12px] font-bold text-gray-500 uppercase tracking-tight italic">Lives Saved vs. Capital</div>
                </div>
                <Shield size={20} className="text-emerald-600 opacity-70 group-hover:scale-125 group-hover:rotate-[-12deg] transition-transform duration-500" />
              </div>

              <div className="space-y-4">
                {roiRankings.slice(0, 3).map((roi, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-black uppercase">
                      <span className="text-gray-700 max-w-[140px] truncate">{roi.node_name || roi.node_id}</span>
                      <span className="text-emerald-600">{(roi.lives_saved_per_rupee * 100000).toFixed(1)} Index</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min(100, roi.lives_saved_per_rupee * 500000)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 3: District Vulnerability Radar */}
            <div className="glass-card p-6 rounded-[3.5rem] transition-all md:col-span-2 lg:col-span-1 overflow-hidden relative">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="text-[16px] font-black text-gray-900 uppercase">Vulnerability Signature</div>
                  <div className="text-[12px] font-bold text-gray-500 uppercase tracking-tight italic">Aggregated Risk Dimensions</div>
                </div>
                <Layers size={20} className="text-blue-600 opacity-70" />
              </div>

              <div className="relative h-44 flex items-center justify-center">
                 <svg viewBox="0 0 100 100" className="w-full h-full transform scale-125 opacity-70">
                   {[0.3, 0.6, 1].map((r) => (
                     <circle key={r} cx="50" cy="50" r={40 * r} className="fill-none stroke-blue-100/50" strokeWidth="0.5" strokeDasharray="2 2" />
                   ))}
                   {(() => {
                     const total = predictions.length || 1;
                     const p1 = 0.5 + (predictions.filter(p => ['RED', 'ORANGE'].includes(getPredictionAlertLevel(p))).length / total) * 0.5;
                     const p2 = 0.4 + (totalExposed / 10000) * 0.6;
                     const p3 = 0.7;
                     const p4 = 0.3 + (alerts.length / 10) * 0.7;
                     const axes = [p1, p2, p3, p4, 0.6];
                     const points = axes.map((p, i) => {
                       const angle = (i * 72 - 90) * Math.PI / 180;
                       return `${50 + 40 * p * Math.cos(angle)},${50 + 40 * p * Math.sin(angle)}`;
                     }).join(' ');
                     return <polygon points={points} className="fill-blue-500/20 stroke-blue-600 transition-all duration-1000" strokeWidth="1.5" />;
                   })()}
                 </svg>
                 <div className="absolute inset-0 flex flex-col justify-between p-2 pointer-events-none">
                    <div className="flex justify-between w-full text-[7px] font-black text-slate-700 uppercase"><span>Exposure</span><span>Risks</span></div>
                    <div className="flex justify-between w-full text-[7px] font-black text-slate-700 uppercase mt-auto"><span>Impact</span><span>Agility</span></div>
                 </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          <section className="glass-card rounded-[2.5rem] overflow-visible flex flex-col h-[500px] sm:h-[600px] shadow-xl premium-shadow gsap-appear [--glass-card-filter:none]">
            <div className="glass-blur-fix" />
            <div className="p-5 sm:p-8 flex items-center justify-between glass-header">
              <h2 className="font-black text-gray-900 uppercase text-[15px] flex items-center gap-3">
                <BarChart3 size={16} className="text-blue-600" /> Administrative Risk Distribution
              </h2>
              <span className="text-[15px] font-black text-blue-700 uppercase bg-blue-100/50 px-3 py-1 rounded-full">{predictions.length} SECTORS</span>
            </div>
            <div className="overflow-auto flex-1 custom-scrollbar">
              <table className="w-full min-w-[540px] text-left border-collapse">
                <thead className="text-gray-600 uppercase font-black text-[14px] sticky top-0 z-20 glass-header">
                  <tr>
                    <th className="p-6">Sector Identity</th>
                    <th className="p-6">Risk Assessment</th>
                    <th className="p-6 text-right">Lead (H)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {predictions.map(p => (
                    <tr key={p.zone_id} className="hover:bg-blue-50/10 transition-colors group cursor-default">
                      <td className="p-6">
                        <div className="font-black text-[15px] text-gray-950 group-hover:text-blue-700 transition-colors uppercase">{p.zone_name || p.zone_id}</div>
                        <div className="text-[16px] text-gray-600 font-bold uppercase mt-1">System ID: {p.zone_id}</div>
                      </td>
                      <td className="p-6">
                        <span className={`px-4 py-1.5 uppercase text-[15px] font-black rounded-full ${getPredictionAlertLevel(p) === 'RED' ? 'glass-red text-red-700' :
                            (getPredictionAlertLevel(p) === 'YELLOW' || getPredictionAlertLevel(p) === 'ORANGE') ? 'glass-orange text-orange-700' :
                              'glass-blue text-blue-700'
                          }`}>
                          {getPredictionAlertLevel(p)}
                        </span>
                      </td>
                      <td className="p-6 text-right font-black text-[15px] text-gray-900">{p.lead_time_hours}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="glass-card rounded-[2.5rem] overflow-visible flex flex-col h-[500px] sm:h-[600px] shadow-xl premium-shadow gsap-appear [--glass-card-filter:none]">
            <div className="glass-blur-fix" />
            <div className="p-5 sm:p-8 flex items-center justify-between glass-header">
              <h2 className="font-black text-gray-900 uppercase text-[15px] flex items-center gap-3">
                <Zap size={16} className="text-orange-600" /> Operational Directive Queue
              </h2>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse" />
                <span className="text-[16px] font-black text-orange-600 uppercase">{alerts.length} Directives</span>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-5 sm:p-8 space-y-6 custom-scrollbar">
              {alerts.length > 0 ? (
                alerts.map((alert, idx) => (
                  <div key={idx} className={`p-5 sm:p-6 rounded-[2.5rem] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 transition-all hover:shadow-lg group ${alert.alert_level === 'RED' ? 'bg-red-50/15 border border-red-200/50' : (alert.alert_level === 'YELLOW' || alert.alert_level === 'ORANGE' ? 'bg-orange-50/15 border border-orange-200/50' : 'bg-blue-50/10 border border-blue-100/50')}`}>
                    <div className="flex-1">
                      <span className={`text-[16px] font-black uppercase shrink-0 ${alert.alert_level === 'RED' ? 'text-red-700' : (alert.alert_level === 'YELLOW' || alert.alert_level === 'ORANGE' ? 'text-orange-700' : 'text-emerald-700')}`}>{alert.alert_level} Protocol</span>
                      <div className={`text-[15px] uppercase font-black mb-2 mt-1 ${alert.alert_level === 'RED' ? 'text-red-600' :
                          (alert.alert_level === 'YELLOW' || alert.alert_level === 'ORANGE') ? 'text-orange-600' : 'text-blue-600'
                        }`}>
                        Source: {alert.source}
                      </div>
                      <div className="text-gray-900 font-bold text-[15px] leading-relaxed max-w-sm italic">
                        "{alert.action}"
                      </div>
                      <div className="mt-4 text-[16px] font-black text-gray-400 uppercase flex items-center gap-2">
                        <Target size={12} className="opacity-60" /> Window: {alert.time_window_hours}H
                      </div>
                    </div>
                    <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-black/5 opacity-40"><Zap size={20} className="text-slate-600" /></div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4 opacity-30">
                  <CheckCircle2 size={48} strokeWidth={1.5} />
                  <p className="text-[16px] font-black uppercase">Operational Readiness Secured</p>
                </div>
              )}
            </div>
          </section>

        </div>

        {/* ROI Strategy Section */}
        <section className="glass-card p-6 sm:p-10 rounded-[3rem] premium-shadow space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-gray-900 uppercase flex items-center gap-3">
                <TrendingUp size={20} className="text-blue-600" /> Tactical Budget Optimization (ROI)
              </h2>
              <p className="text-gray-400 text-[15px] font-bold uppercase pl-1">Algorithmic allocation for maximum life-saving potential</p>
            </div>
            <div className="px-6 py-3 bg-blue-600 rounded-full text-white font-black text-[16px] uppercase shadow-lg shadow-blue-500/30">
              Optimizer Active
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {roiRankings.slice(0, 8).map((rank, i) => (
              <div key={rank.node_id} className="glass-card p-6 rounded-[2.5rem] bg-white/5 border border-white/40 shadow-sm hover:border-slate-300/30 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/5 -mr-12 -mt-12 rounded-full blur-2xl group-hover:bg-slate-500/10 transition-colors" />
                
                <div className="flex justify-between items-start mb-6">
                  <div className="px-3 py-1 bg-slate-100/50 rounded-xl text-[14px] font-black text-slate-700 uppercase">
                    SEC-{rank.node_id.slice(-3).toUpperCase()}
                  </div>
                  <div className="flex items-center gap-1.5 font-black text-[12px] text-emerald-600">
                    <TrendingUp size={14} /> {(rank.lives_saved_per_rupee * 100).toFixed(1)}%
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-[16px] font-black text-gray-900 group-hover:text-slate-700 transition-colors uppercase truncate">
                      {rank.node_name || rank.node_id.replace(/_/g, ' ')}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-black/5">
                    <div>
                      <div className="text-[14px] font-black text-gray-400 uppercase">ROI Pulse</div>
                      <div className="flex items-end gap-1 h-6 mt-1">
                        {[0.4, 0.7, 0.5, 0.9, 0.6].map((h, j) => (
                           <div key={j} className="w-1.5 bg-slate-500/40 rounded-full" style={{ height: `${h * 100}%` }} />
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                       <div className="text-[14px] font-black text-gray-400 uppercase">Lives</div>
                       <div className="text-xl font-black text-slate-700">+{rank.approximate_lives_saved}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
