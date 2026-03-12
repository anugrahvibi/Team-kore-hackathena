import React, { useState, useEffect, useRef } from 'react';
import { Activity, Droplets, Target, CheckCircle2, Waves, Settings, AlertTriangle, Zap, Wind, Shield, ArrowRight, MapPin } from 'lucide-react';
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
              <Activity size={14} className="text-blue-600 animate-pulse" /> Precision Flow & Infrastructure Stability
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
          <StatCard icon={<Droplets />} label="Reservoir Level" value={reservoirDisplay} subtext="Live Sensor" glassType="glass-card" />
          <StatCard icon={<Zap />} label="Inflow Pulse" value={inflowDisplay} subtext="Live Sensor" glassType="glass-card" />
          <StatCard icon={<Activity />} label="Sensor Telemetry" value={telemetryStatus} subtext="Live Sensor" glassType="glass-card" />
          <StatCard icon={<Wind />} label="Downstream Impact" value={systemStatus} subtext="Lead Window: Active" glassType="glass-card" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-10">

          <section className="lg:col-span-1 glass-card rounded-[3rem] border-white/60 p-6 sm:p-10 shadow-xl flex flex-col items-center justify-center bg-white/95 backdrop-blur-3xl shadow-xl border border-white/60/70 premium-shadow">
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

          <section className="glass-card rounded-[3rem] border-white/60 overflow-hidden flex flex-col lg:col-span-2 shadow-xl bg-white/95 backdrop-blur-3xl shadow-xl border border-white/60/70 premium-shadow">
            <div className="p-5 sm:p-8 border-b border-gray-100 bg-white/95 backdrop-blur-3xl shadow-xl border border-white/60/50 flex items-center justify-between">
              <h2 className="font-black text-gray-950 uppercase text-[15px] flex items-center gap-3">
                <Shield size={16} className="text-blue-700" /> Administrative Gate Protocols
              </h2>
              <div className="px-3 py-1 bg-blue-500/10 rounded-full text-[15px] font-black text-blue-700 uppercase">{alerts.length} ORDERS</div>
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
                        <div className="text-gray-400 font-black text-[15px] uppercase opacity-60">Source: {alert.source}</div>
                      </div>
                      <p className="text-gray-950 font-bold text-[15px] leading-relaxed italic">"{alert.action}"</p>
                      <div className="mt-2 text-[16px] font-black text-blue-700/60 uppercase flex items-center gap-2">
                        <Target size={12} /> Priority: {alert.priority}
                      </div>
                    </div>
                    <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-black/5 group-hover:-rotate-45 transition-all duration-300"><ArrowRight size={32} className="text-blue-600 opacity-40 group-hover:opacity-100  transition-all shrink-0 cursor-pointer" /></div>
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

function StatCard({ icon, label, value, subtext, glassType }: StatCardProps) {
  return (
    <div className={`glass-card ${glassType} p-6 rounded-[2.5rem] hover:scale-[1.02] transition-all group`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 border border-white/20`}>
        {React.cloneElement(icon as any, { size: 20, className: 'text-inherit' })}
      </div>
      <div className="text-[15px] font-black text-gray-700 uppercase mb-1">{label}</div>
      <div className="text-3xl font-black text-gray-950 brand-font mb-2">{value}</div>
      <div className="text-[15px] font-bold text-gray-800 uppercase italic">{subtext}</div>
    </div>
  );
}
