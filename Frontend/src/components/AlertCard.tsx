import React, { useRef } from 'react';
import { AlertTriangle, Clock, ShieldCheck, Activity } from 'lucide-react';
import type { ZonePrediction } from '@schema';
import { getPredictionAlertLevel } from '../utils/schemaHelpers';
import { useGsapAnimations } from '../utils/useGsapAnimations';

interface AlertCardProps {
  prediction: ZonePrediction | null;
}

export function AlertCard({ prediction }: AlertCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useGsapAnimations(containerRef);

  if (!prediction) {
    return (
      <div className="bg-blue-50/5 border border-blue-100/50 p-10 rounded-[2.8rem] text-center space-y-6 shadow-sm">
        <Activity size={36} className="mx-auto text-blue-400 animate-pulse" />
        <p className="text-[16px] font-black text-blue-800/40 uppercase">Awaiting Tactical Handshake</p>
      </div>
    );
  }

  const level = getPredictionAlertLevel(prediction);
  const { flood_probability, zone_name, lead_time_hours } = prediction;
  
  const themes: Record<string, { glass: string; label: string; pill: string; icon: React.ReactNode }> = {
    GREEN: {
      glass: 'glass-emerald',
      label: 'STABLE',
      pill: 'bg-emerald-600',
      icon: <ShieldCheck size={20} className="text-emerald-700" />
    },
    YELLOW: {
      glass: 'glass-orange',
      label: 'YELLOW',
      pill: 'bg-yellow-600',
      icon: <AlertTriangle size={20} className="text-yellow-700" />
    },
    ORANGE: {
      glass: 'glass-orange',
      label: 'SEVERE',
      pill: 'bg-orange-600',
      icon: <AlertTriangle size={20} className="text-orange-700" />
    },
    RED: {
      glass: 'glass-red',
      label: 'CRITICAL',
      pill: 'bg-red-600',
      icon: <AlertTriangle size={20} className="text-red-700" />
    },
  };

  const theme = themes[level] || themes.GREEN;

  return (
    <div ref={containerRef} className={`p-8 rounded-[2.8rem] border border-white/40 ${theme.glass} space-y-8 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all alert-card-gsap`}>
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <h3 className="font-black text-2xl text-gray-950 brand-font">{zone_name}</h3>
          <div className="flex items-center gap-3">
             <div className={`w-2.5 h-2.5 rounded-full ${theme.pill} animate-pulse shadow-glow`} />
             <span className={`text-[15px] font-black uppercase opacity-80`}>{theme.label} VECTOR</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-4xl font-black text-gray-950 brand-font">{(flood_probability * 100).toFixed(0)}%</div>
          <div className="text-[13px] font-black text-gray-400 uppercase mt-1">Entropy Index</div>
        </div>
      </div>
      
      <div className={`flex items-center gap-4 pt-8 border-t border-white/20 text-[16px] font-black uppercase`}>
        <Clock size={16} className="opacity-40" />
        <span>T-{lead_time_hours}:00 PEAK SATURATION</span>
      </div>
    </div>
  );
}
