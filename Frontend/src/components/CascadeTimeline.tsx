import React, { useRef } from 'react';
import type { InfrastructureNode } from '@schema';
import { useGsapAnimations } from '../utils/useGsapAnimations';

interface TimelineEvent {
  hour: number;
  node: InfrastructureNode;
  reason: string;
}

export function CascadeTimeline({ events }: { events: TimelineEvent[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useGsapAnimations(containerRef);

  if (events.length === 0) {
    return <div className="text-blue-800/40 font-black text-[16px] uppercase text-center py-12 italic">Operational Vacuum: No Cascades Detected</div>;
  }

  return (
    <div ref={containerRef} className="relative pl-6 space-y-8 border-l-2 border-blue-50/50 my-6">
      {events.map((evt, idx) => {
        const types = {
          substation: 'glass-red',
          hospital: 'glass-emerald',
          road: 'glass-orange',
          default: 'glass-blue'
        };
        const activeGlass = types[evt.node.type as keyof typeof types] || types.default;
        const dotColors = {
          substation: 'bg-red-600 shadow-red-500/40',
          hospital: 'bg-emerald-600 shadow-emerald-500/40',
          road: 'bg-orange-600 shadow-orange-500/40',
          default: 'bg-blue-600 shadow-blue-500/40'
        };
        const activeDot = dotColors[evt.node.type as keyof typeof dotColors] || dotColors.default;

        return (
          <div key={`${evt.node.id}-${idx}`} className="relative group timeline-item">
            {/* Timeline Dot */}
            <div className={`absolute -left-[31px] top-5 w-3.5 h-3.5 rounded-full ${activeDot} border-4 border-white shadow-xl ring-1 ring-blue-100 transition-transform group-hover:scale-125 z-10`} />
            
            <div className={`p-6 rounded-[2.2rem] border border-white/40 shadow-sm hover:shadow-lg transition-all ${activeGlass} space-y-4`} style={{ backdropFilter: 'blur(var(--glass-blur))' }}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                   <span className="text-[14px] font-black text-blue-900/60 uppercase">{evt.hour}H PULSE</span>
                   <span className={`text-[12px] font-black px-2.5 py-0.5 rounded-full uppercase bg-white/20`}>
                      {evt.node.type}
                   </span>
                </div>
              </div>
              
              <div className="space-y-2">
                 <div className="text-[15px] font-black text-gray-950 uppercase">
                   {evt.node.name}
                 </div>
                 <div className="text-[16px] text-gray-700 font-bold leading-relaxed italic opacity-80">
                    "{evt.reason}"
                 </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
