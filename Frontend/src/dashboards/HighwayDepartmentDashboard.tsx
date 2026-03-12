import React, { useState, useEffect, useRef } from 'react';
import { Activity, MapPin, AlertTriangle, Hammer, CheckCircle2, Truck, ArrowRightLeft, ShieldCheck, TrendingDown, Radio, Navigation, Clock, Route, ArrowRight, Shield, TrendingUp, BarChart3 } from 'lucide-react';
import { fetchActiveAlerts, fetchPredictions } from '../utils/dataFetcher';
import type { StakeholderAction, ZonePrediction } from '@schema';
import { getPredictionAlertLevel } from '../utils/schemaHelpers';
import { useGsapAnimations } from '../utils/useGsapAnimations';

export function HighwayDepartmentDashboard() {
  const [alerts, setAlerts] = useState<StakeholderAction[]>([]);
  const [predictions, setPredictions] = useState<ZonePrediction[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

   useGsapAnimations(containerRef, [alerts, predictions]);

  useEffect(() => {
    async function init() {
      const aData = await fetchActiveAlerts('highway_department', '2024_peak');
      const pData = await fetchPredictions('2024_peak');
      setAlerts(aData);
      setPredictions(pData);
    }
    init();
  }, []);

  const criticalRoads = alerts.length;
  const avgLeadTime = predictions.length > 0 
    ? (predictions.reduce((acc, p) => acc + (p.lead_time_hours || 0), 0) / predictions.length).toFixed(1)
    : '--';
  const assetsReady = alerts.length > 0 ? 'ACTIVE' : '--';

  return (
    <div ref={containerRef} className="pt-20 sm:pt-24 lg:pt-26 p-4 sm:p-6 lg:p-8 h-full bg-transparent overflow-y-auto w-full custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-10 py-4 sm:py-6">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-black/5 pb-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Truck size={28} className="text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-gray-950 brand-font uppercase leading-none">
                Logistics <span className="text-blue-700">Command</span> <Route size={28} className="text-blue-700 inline-block ml-2" />
              </h1>
            </div>
            <p className="text-gray-700 font-bold uppercase text-[16px] pl-1 flex items-center gap-2">
               <Activity size={14} className="text-blue-600 animate-pulse" /> Grid Network & Transit Stability Hub
            </p>
          </div>
          
           <div className="flex items-center gap-3 self-stretch sm:self-auto">
             <div className="glass-card px-4 sm:px-6 py-3 sm:py-4 rounded-[1.8rem] flex items-center gap-4 shadow-xl premium-shadow">
                <div className="text-right">
                   <div className="text-[16px] font-black text-gray-700 uppercase">Network Status</div>
                   <div className="text-[15px] font-black text-blue-600 uppercase">Connected</div>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
             </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard icon={<Hammer />} label="Active Closures" value={criticalRoads.toString()} subtext="System Logged" glassType="glass-blue" />
          <StatCard icon={<TrendingDown />} label="Avg. Response" value={`${avgLeadTime}h`} subtext="Lead Projection" glassType="glass-blue" />
          <StatCard icon={<Shield />} label="Assets Ready" value={assetsReady} subtext="Live Directives" glassType="glass-blue" />
        </div>

        {/* Network Intelligence Area */}
        <section className="gsap-appear">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[14px] font-black text-blue-600/60 uppercase tracking-widest flex items-center gap-2">
              <BarChart3 size={16} /> Grid Network Intelligence
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: Directive Priority Spread (Dynamic) */}
            <div className="glass-card glass-card-interactive p-6 rounded-[3rem] transition-all overflow-visible relative group [--glass-card-filter:none]">
              <div className="glass-blur-fix" />
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="text-[16px] font-black text-gray-900 uppercase">Operational Urgency</div>
                  <div className="text-[12px] font-bold text-gray-500 uppercase tracking-tight italic">Live Directive Priority Spread</div>
                </div>
                <Radio size={20} className="text-blue-500 opacity-50 group-hover:scale-125 group-hover:text-blue-600 transition-all duration-500" />
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
                          height: `${Math.max(10, (stat.count / (predictions.length || 1)) * 100 + (Math.random() * 5 - 2.5))}%`,
                          backgroundColor: stat.color,
                          opacity: 0.8
                        }}
                      />
                      {stat.count >= 0 && (
                        <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-black text-gray-500">{stat.count}</span>
                      )}
                    </div>
                    <span className="text-[8px] font-black text-gray-400">{stat.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-center flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[10px] font-black text-gray-500 uppercase">Live Network Relay</span>
              </div>
            </div>

            {/* Card 2: Strategic Lead Window */}
            <div className="glass-card glass-card-interactive p-6 rounded-[3rem] transition-all overflow-visible relative group [--glass-card-filter:none]">
              <div className="glass-blur-fix" />
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="text-[16px] font-black text-gray-900 uppercase">Transit Safety Buffer</div>
                  <div className="text-[12px] font-bold text-gray-500 uppercase tracking-tight italic">Lead Time per Logistics Node</div>
                </div>
                <Clock size={20} className="text-emerald-500 opacity-50 group-hover:scale-125 group-hover:rotate-[30deg] transition-all duration-500" />
              </div>
              
              <div className="space-y-4">
                {predictions.slice(0, 3).map((p, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-black uppercase">
                      <span className="text-gray-700 truncate max-w-[140px]">{p.zone_name || p.zone_id}</span>
                      <span className="text-emerald-600">T-{p.lead_time_hours}H</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.min(100, (p.lead_time_hours / 48) * 100)}%` }} 
                      />
                    </div>
                  </div>
                ))}
                {predictions.length === 0 && (
                   <div className="text-gray-400 text-[12px] font-bold uppercase py-4 text-center">No Active Transit Risks Detected</div>
                )}
              </div>
            </div>

            {/* Card 3: Network Integrity Horizon */}
            <div className="glass-card glass-card-interactive p-6 rounded-[3rem] transition-all md:col-span-2 lg:col-span-1 overflow-visible relative group [--glass-card-filter:none]">
              <div className="glass-blur-fix" />
              <div className="flex justify-between items-start mb-4">
               <div>
                  <div className="text-[16px] font-black text-gray-900 uppercase">Logistics Connectivity</div>
                  <div className="text-[12px] font-bold text-gray-500 uppercase tracking-tight italic">Active Route Integrity</div>
                </div>
                <Navigation size={20} className="text-blue-500 opacity-50 group-hover:scale-125 group-hover:-translate-y-1 transition-transform duration-500" />
              </div>
              
              <div className="flex items-center gap-6">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="42" className="stroke-gray-100 fill-none" strokeWidth="8" />
                    <circle
                      cx="48" cy="48" r="42"
                      className="fill-none stroke-emerald-600 transition-all duration-1000"
                      strokeWidth="8"
                      strokeDasharray="263.89"
                      strokeDashoffset={263.89 * (1 - (predictions.filter(p => p.flood_probability < 0.4).length / (predictions.length || 1)))}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-xl font-black text-gray-950 tracking-tighter">
                      {((predictions.filter(p => p.flood_probability < 0.4).length / (predictions.length || 1)) * 100).toFixed(0)}%
                    </span>
                    <span className="text-[8px] font-black text-gray-400 uppercase">Reliable</span>
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-black uppercase text-gray-500">
                      <span>Secure Artery Nodes</span>
                      <span className="text-emerald-600">{predictions.filter(p => p.flood_probability < 0.4).length} Nodes</span>
                    </div>
                    <div className="w-full h-1 bg-gray-100 rounded-full">
                      <div 
                        className="h-full bg-emerald-500 transition-all" 
                        style={{ width: `${(predictions.filter(p => p.flood_probability < 0.4).length / (predictions.length || 1)) * 100}%` }} 
                      />
                    </div>
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 leading-tight uppercase italic whitespace-normal">
                    Aggregate cross-node connectivity analysis from telemetry.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-10">
          <section className="lg:col-span-2 rounded-[3rem] glass-card overflow-hidden flex flex-col h-[500px] sm:h-[600px] premium-shadow">
             <div className="p-6 flex items-center justify-between gap-6 transition-all group overflow-hidden relative glass-header">
                <h2 className="font-black text-gray-900 uppercase text-[15px] flex items-center gap-3">
                   <Navigation size={16} className="text-blue-700" /> Operational Deployment Field
                </h2>
                <div className="px-3 py-1 bg-gray-100 rounded-full text-[15px] font-black text-gray-700 uppercase border border-gray-200">{alerts.length} ORDERS</div>
             </div>
             <div className="overflow-y-auto flex-1 p-5 sm:p-8 space-y-6 custom-scrollbar">
                {alerts.length > 0 ? (
                   alerts.map((alert, idx) => (
                     <div key={idx} className="p-5 sm:p-6 rounded-3xl relative group transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 shadow-sm">
                       <div className="flex-1">
                         <div className="flex items-center gap-3 mb-2">
                            <div className={`px-3 py-1 rounded-xl text-[15px] font-black uppercase ${
                               alert.alert_level === 'RED' ? 'glass-red text-red-700' : 
                               (alert.alert_level === 'YELLOW' || alert.alert_level === 'ORANGE' ? 'glass-orange text-orange-700' : 'glass-blue text-blue-700')
                             }`}>
                               {alert.department || 'HIGHWAY'}
                            </div>
                            <AlertTriangle size={14} className="text-amber-500 opacity-70" />
                         </div>
                         <p className="text-gray-950 font-bold text-[15px] leading-relaxed mb-1">{alert.action}</p>
                         <div className="text-[16px] text-gray-600 font-bold uppercase italic">Source: {alert.source}</div>
                       </div>
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm self-end sm:self-auto">
                           <MapPin size={24} />
                        </div>
                     </div>
                   ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-40 gap-6">
                    <CheckCircle2 size={64} strokeWidth={1} />
                    <p className="text-[16px] font-black uppercase">Operations Synchronized</p>
                  </div>
                )}
             </div>
          </section>

          <div className="space-y-6 flex flex-col">
            <div className="glass-blue p-6 sm:p-8 rounded-[2.5rem] shadow-xl space-y-4">
               <div className="flex items-center gap-3">
                  <Clock size={18} className="text-blue-600" />
                  <span className="text-[16px] font-black uppercase text-blue-600/60">Global Critical Window</span>
               </div>
               <div className="text-3xl sm:text-4xl font-black brand-font text-gray-900">{avgLeadTime}H</div>
               <p className="text-blue-700/60 text-[15px] font-medium leading-relaxed italic">"Model suggests logistics deployment before T-minus 4h for optimal resource retention."</p>
            </div>
            
            <section className="glass-card rounded-[3rem] overflow-hidden flex flex-col flex-1 premium-shadow">
               <div className="p-8 transition-all flex flex-col gap-6 glass-header">
                  <h2 className="font-black text-gray-900 uppercase text-[15px] flex items-center gap-3">
                     <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-black/5 group-hover:-rotate-45 transition-all duration-300"><ArrowRightLeft size={16} className="text-blue-600" /></div> Rapid Directives
                  </h2>
               </div>
               <div className="p-5 sm:p-8 space-y-4">
                  {(alerts.length > 0 ? alerts.slice(0, 4).map((alert) => alert.action) : []).map((task, i) => (
                       <div key={`${task}-${i}`} className="flex items-center justify-between p-4 bg-blue-50/10 border border-blue-100/50 rounded-3xl text-[15px] font-bold text-gray-700 group transition-all cursor-default overflow-hidden">
                         <div className="flex items-center gap-4">
                           <CheckCircle2 size={18} className="text-blue-600" />
                           <span className="uppercase leading-tight">{task}</span>
                         </div>
                         <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-black/5 group-hover:-rotate-45 transition-all duration-300"><ArrowRight size={28} className="text-blue-600 opacity-20 group-hover:opacity-100  transition-all shrink-0" /></div>
                     </div>
                  ))}
                  {alerts.length === 0 && (
                    <div className="p-4 bg-blue-50/10 border border-blue-100/50 rounded-3xl text-[15px] font-bold text-gray-500 uppercase">
                      No live directives
                    </div>
                  )}
               </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  glassType: string;
}

function StatCard({ icon, label, value, subtext, glassType }: StatCardProps) {
  return (
    <div className={`glass-card ${glassType} p-6 rounded-[2.5rem] transition-all group`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 border border-white/20`}>
        {React.cloneElement(icon as any, { size: 20, className: 'text-inherit' })}
      </div>
      <div className="text-[15px] font-black text-gray-700 uppercase mb-1">{label}</div>
      <div className="text-3xl font-black text-gray-950 brand-font mb-2">{value}</div>
      <div className="text-[15px] font-bold text-gray-800 uppercase italic">{subtext}</div>
    </div>
  );
}
