import React, { useState, useEffect, useRef } from 'react';
import { Activity, Droplets, Target, CheckCircle2, Waves, Settings, AlertTriangle, Zap, Wind, Shield, ArrowRight, MapPin, TrendingUp, BarChart3, Layers, Activity as Pulse } from 'lucide-react';
import { fetchActiveAlerts, fetchSensorReadings, fetchPredictions } from '../utils/dataFetcher';
import type { StakeholderAction, SensorReading, ZonePrediction } from '@schema';
import { getPredictionAlertLevel } from '../utils/schemaHelpers';
import { useGsapAnimations } from '../utils/useGsapAnimations';

export function DamOperatorDashboard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sensor, setSensor] = useState<SensorReading | null>(null);
  const [alerts, setAlerts] = useState<StakeholderAction[]>([]);
  const [prediction, setPrediction] = useState<ZonePrediction | null>(null);

  useGsapAnimations(containerRef, [sensor, alerts, prediction]);

  useEffect(() => {
    async function init() {
      const sData = await fetchSensorReadings('ZONE_PANAMARAM');
      const aData = await fetchActiveAlerts('dam_controller', '2024_peak');
      const pData = await fetchPredictions('2024_peak');

      if (sData.length > 0) setSensor(sData[0]);
      setAlerts(aData);
      setPrediction(pData.find(p => p.zone_id === 'ZONE_PANAMARAM') || null);
    }
    init();
  }, []);

  const reservoirPercentage = sensor?.reservoir_pct;
  const reservoirDisplay = typeof reservoirPercentage === 'number' ? `${reservoirPercentage}%` : '--';
  const inflowDisplay = typeof sensor?.flow_rate === 'number' ? `${sensor.flow_rate} m3/s` : '--';
  const reservoirGaugePct = typeof reservoirPercentage === 'number' ? reservoirPercentage : 0;
  const telemetryStatus = sensor ? 'LIVE' : '--';
  const level = prediction ? getPredictionAlertLevel(prediction) : 'GREEN';
  const systemStatus = level === 'RED' ? 'CRITICAL' : (level === 'YELLOW' || level === 'ORANGE') ? 'WARNING' : 'NORMAL';

  return (
    <div ref={containerRef} className="pt-20 sm:pt-24 lg:pt-26 p-4 sm:p-6 lg:p-8 h-full bg-transparent overflow-y-auto w-full custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-10 py-4 sm:py-6">

        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 sm:gap-8 border-b border-black/5 pb-8 sm:pb-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Waves size={28} className="text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-gray-900 brand-font uppercase leading-none">
                Hydraulic <span className="text-blue-600">Controller</span>
              </h1>
            </div>
            <p className="text-gray-700 font-bold uppercase text-[16px] pl-1 flex items-center gap-2">
              <Activity size={14} className="text-slate-600 animate-pulse" /> Precision Flow & Infrastructure Stability
            </p>
          </div>

          <div className="flex items-center gap-3 self-stretch sm:self-auto">
            <div className="glass-card px-4 sm:px-6 py-3 sm:py-4 rounded-[1.8rem] flex items-center gap-4 shadow-xl premium-shadow">
              <div className="text-right">
                <div className="text-[16px] font-black text-gray-700 uppercase leading-none mb-1">Hydraulic Status</div>
                <div className={`text-[15px] font-black uppercase ${systemStatus === 'CRITICAL' ? 'text-red-600' :
                  systemStatus === 'WARNING' ? 'text-orange-600' : 'text-emerald-600'
                  }`}>{systemStatus}</div>
              </div>
              <div className={`w-2 h-2 rounded-full animate-pulse ${systemStatus === 'CRITICAL' ? 'bg-red-600' :
                systemStatus === 'WARNING' ? 'bg-orange-600' : 'bg-emerald-600'
                }`} />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={<Droplets className="text-blue-600" />} label="Reservoir Level" value={reservoirDisplay} subtext="Live Sensor" glassType="glass-card" />
          <StatCard icon={<Zap className="text-amber-600" />} label="Inflow Pulse" value={inflowDisplay} subtext="Live Sensor" glassType="glass-card" />
          <StatCard icon={<Activity className="text-slate-600" />} label="Sensor Telemetry" value={telemetryStatus} subtext="Live Sensor" glassType="glass-card" />
          <StatCard icon={<Wind className="text-emerald-600" />} label="Downstream Impact" value={systemStatus} subtext="Lead Window: Active" glassType="glass-card" />
        </div>

        {/* Hydraulic Intelligence Section */}
        <section className="gsap-appear">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[14px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-2">
              <BarChart3 size={16} /> Hydraulic Intelligence
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Downstream Risk Area Chart */}
            <div className="glass-card glass-card-interactive p-6 rounded-[3rem] transition-all overflow-visible relative group [--glass-card-filter:none]">
              <div className="glass-blur-fix" />
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="text-[16px] font-black text-gray-900 uppercase">Risk Surface Analysis</div>
                  <div className="text-[12px] font-bold text-gray-700 uppercase tracking-tight italic">Downstream Saturation Projection</div>
                </div>
                <Layers size={20} className="text-red-500 opacity-50" />
              </div>

              <div className="h-24 relative mt-4">
                 <svg viewBox="0 0 100 40" className="w-full h-full preserve-3d" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {/* Background Area */}
                    <path 
                      d={`M0,40 ${[0.2, 0.5, 0.3, 0.8, 0.4, 0.9, 0.6].map((v, i) => `L${i * 15},${40 - (v * 35)}`).join(' ')} L100,40 Z`} 
                      fill="url(#riskGradient)" 
                      className="transition-all duration-1000"
                    />
                    {/* Line Path */}
                    <path 
                      d={`M0,${40 - (0.2 * 35)} ${[0.2, 0.5, 0.3, 0.8, 0.4, 0.9, 0.6].map((v, i) => `L${i * 15},${40 - (v * 35)}`).join(' ')}`} 
                      fill="none" 
                      stroke="#ef4444" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      className="transition-all duration-1000"
                    />
                 </svg>
                 <div className="absolute inset-0 flex justify-between items-end px-1 pointer-events-none opacity-60">
                    <span className="text-[7px] font-black text-gray-700 uppercase">T-0h</span>
                    <span className="text-[7px] font-black text-gray-700 uppercase">T-48h</span>
                 </div>
              </div>
            </div>

            <div className="glass-card glass-card-interactive p-6 rounded-[3rem] transition-all overflow-visible relative group [--glass-card-filter:none]">
              <div className="glass-blur-fix" />
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="text-[16px] font-black text-gray-900 uppercase">Inflow Turbulence</div>
                  <div className="text-[12px] font-bold text-gray-700 uppercase tracking-tight italic">High-Frequency Pulse Stream</div>
                </div>
                <Activity size={20} className="text-blue-500 opacity-50 group-hover:scale-125 group-hover:text-blue-600 transition-all duration-500" />
              </div>

              <div className="h-16 flex items-end gap-[3px] px-1 relative">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div 
                    key={i} 
                    className="flex-1 rounded-full animate-pulse bg-blue-500 transition-all duration-700"
                    style={{ 
                      height: `${reservoirGaugePct * (0.4 + Math.random() * 0.6)}%`,
                      opacity: 0.2 + (i * 0.03),
                      animationDelay: `${i * 100}ms`
                    }}
                  />
                ))}
                <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent pointer-events-none" />
              </div>
              <div className="mt-4 text-center flex items-center justify-center gap-2 border-t border-black/5 pt-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[10px] font-black text-gray-700 uppercase leading-none tracking-widest">Live Flow Sync</span>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-10">

          <section className="lg:col-span-1 glass-card rounded-[3rem] p-6 sm:p-10 flex flex-col items-center justify-center premium-shadow">
            <h3 className="text-[16px] font-black text-gray-600 uppercase mb-4">Capacity Saturation</h3>
            <div className="relative w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="96" cy="96" r="80" className="stroke-gray-100 fill-none" strokeWidth="12" />
                <circle
                  cx="96" cy="96" r="80"
                  className={`fill-none transition-all duration-1000 ${reservoirGaugePct > 85 ? 'stroke-red-600' : 'stroke-blue-600'}`}
                  strokeWidth="12"
                  strokeDasharray={`${(reservoirGaugePct / 100) * 502} 502`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute text-center">
                <div className="text-4xl font-black text-gray-950 brand-font">{reservoirDisplay}</div>
                <div className="text-[16px] text-gray-600 font-black uppercase mt-1">Saturated</div>
              </div>
            </div>
            <p className="mt-8 text-center text-gray-700 text-[15px] font-bold leading-relaxed italic max-w-[180px]">"Slight vertical margin increase detected by LSTM models."</p>
          </section>

          <section className="glass-card rounded-[3rem] overflow-visible flex flex-col lg:col-span-2 premium-shadow [--glass-card-filter:none]">
            <div className="glass-blur-fix" />
            <div className="p-5 sm:p-8 flex items-center justify-between glass-header">
              <h2 className="font-black text-gray-950 uppercase text-[15px] flex items-center gap-3">
                <Shield size={16} className="text-slate-700" /> Administrative Gate Protocols
              </h2>
              <div className="px-3 py-1 bg-slate-500/10 rounded-full text-[15px] font-black text-slate-700 uppercase">{alerts.length} ORDERS</div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 custom-scrollbar">
              {alerts.length > 0 ? (
                alerts.map((alert, idx) => (
                  <div key={idx} className="p-6 bg-blue-50/5 border border-blue-100/50 rounded-[2.5rem] relative group hover:shadow-lg transition-all flex items-center justify-between gap-6 shadow-sm">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`px-3 py-1 rounded-xl text-[16px] font-black uppercase ${alert.alert_level === 'RED' ? 'glass-red text-red-700' :
                          (alert.alert_level === 'YELLOW' || alert.alert_level === 'ORANGE' ? 'glass-orange text-orange-700' : 'glass-emerald text-emerald-700')
                          }`}>{alert.alert_level}</div>
                        <div className="text-gray-600 font-black text-[15px] uppercase opacity-80">Source: {alert.source}</div>
                      </div>
                      <p className="text-gray-950 font-bold text-[15px] leading-relaxed italic">"{alert.action}"</p>
                      <div className="mt-2 text-[16px] font-black text-slate-800 uppercase flex items-center gap-2">
                        <Target size={12} /> Priority: {alert.priority}
                      </div>
                    </div>
                    <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-black/5 opacity-40"><Target size={20} className="text-slate-600" /></div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-40 gap-4">
                  <CheckCircle2 size={48} strokeWidth={1.5} />
                  <p className="text-[16px] font-black uppercase">Flow Equilibrium Synchronized</p>
                </div>
              )}
            </div>
          </section>

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

function StatCard({ icon, label, value, subtext }: StatCardProps) {
  return (
    <div className={`glass-card glass-card-interactive p-6 rounded-[2.5rem] transition-all group`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 border border-white/20`}>
        {React.cloneElement(icon as any, { size: 20, className: 'text-inherit' })}
      </div>
      <div className="text-[15px] font-black text-gray-700 uppercase mb-1">{label}</div>
      <div className="text-3xl font-black text-gray-950 brand-font mb-2">{value}</div>
      <div className="text-[15px] font-bold text-gray-800 uppercase italic">{subtext}</div>
    </div>
  );
}
