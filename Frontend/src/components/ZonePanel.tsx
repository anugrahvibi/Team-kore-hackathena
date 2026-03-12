import React from 'react';
import type { ZonePrediction, InfrastructureNode } from '@schema';

import { AlertCard } from './AlertCard';
import { CascadeTimeline } from './CascadeTimeline';
import { X, Activity, Shield } from 'lucide-react';
import { useGsapAnimations } from '../utils/useGsapAnimations';
import { useRef } from 'react';
import { gsap } from 'gsap';

interface ZonePanelProps {
  zoneId: string | null;
  prediction: ZonePrediction | null;
  infrastructure: InfrastructureNode[];
  onClose: () => void;
}


export function ZonePanel({ zoneId, prediction, infrastructure, onClose }: ZonePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  useGsapAnimations(containerRef, [zoneId]);

  if (!zoneId) return null;

  const handleClose = () => {
    if (contentRef.current) {
      gsap.to(contentRef.current, {
        x: 400,
        opacity: 0,
        scale: 0.95,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: onClose
      });
    } else {
      onClose();
    }
  };

  // Do not synthesize timeline events in the UI. Show only real event data when integrated.
  const events: Array<{ hour: number; node: InfrastructureNode; reason: string }> = [];

   return (
    <div ref={containerRef} className="fixed inset-0 z-[60] flex items-center justify-end p-4 pointer-events-none">
      <div 
        ref={contentRef} 
        className="w-[calc(100%-1.5rem)] sm:w-[420px] h-[calc(100%-1.5rem)] sm:h-[85vh] bg-white/95 backdrop-blur-3xl shadow-xl border border-white/60/70 backdrop-blur-3xl border border-white/80 rounded-[2.5rem] shadow-[0_30px_70px_rgba(0,0,0,0.2)] flex flex-col pointer-events-auto gsap-appear origin-right"
      >
        <header className="h-24 px-8 border-b border-white/20 flex items-center justify-between bg-white/95 backdrop-blur-3xl shadow-xl border border-white/60/20 backdrop-blur-3xl shrink-0">
          <div>
            <div className="text-[16px] font-black text-blue-900 uppercase">Astrava Directive Hub</div>
            <div className="text-[13px] font-black text-blue-800/40 uppercase mt-0.5">Sector Command</div>
          </div>
          <button 
            onClick={handleClose} 
            className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white/40 hover:bg-white/95 backdrop-blur-3xl shadow-xl border border-white/60/80 text-blue-900 border border-white/40 transition-all active:scale-90"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </header>

      <div className="p-5 sm:p-8 overflow-y-auto flex-1 custom-scrollbar space-y-6 sm:space-y-10">
        <div>
          <AlertCard prediction={prediction} />
        </div>

        {prediction && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/95 backdrop-blur-3xl shadow-xl border border-white/60/40 p-6 rounded-[2.2rem] border border-white/60 shadow-sm space-y-2">
              <div className="text-3xl font-black text-blue-800 brand-font">
                {(prediction.flood_probability * 100).toFixed(0)}%
              </div>
              <div className="text-[12px] text-blue-900/40 font-black uppercase">
                Risk Probability
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-3xl shadow-xl border border-white/60/40 p-6 rounded-[2.2rem] border border-white/60 shadow-sm space-y-2">
              <div className="text-3xl font-black text-gray-950 brand-font">
                {infrastructure.length}
              </div>
              <div className="text-[12px] text-blue-900/40 font-black uppercase">
                Nodes Locked
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <h3 className="text-[11px] font-black text-gray-600 uppercase flex items-center gap-2">
            <Shield size={14} className="text-blue-700" /> Automated Response Directives
          </h3>
          <CascadeTimeline events={events} />
        </div>
      </div>
      
      <div className="p-8 border-t border-white/20 bg-white/95 backdrop-blur-3xl shadow-xl border border-white/60/30 backdrop-blur-xl shrink-0">
         <div className="text-[11px] font-black text-blue-800/40 uppercase text-center">
            Tactical Handshake: Secure
         </div>
      </div>
    </div>
  </div>
  );
}
