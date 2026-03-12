import React from 'react';
import { Clock } from 'lucide-react';

export function LeadTimeCounter({ hours }: { hours: number }) {
  const isCritical = hours <= 12;

  return (
    <div className={`flex flex-col items-center justify-center p-6 border rounded-2xl bg-white shadow-sm/50 ${isCritical ? 'border-red-500/50 text-red-700' : 'border-gray-200 text-gray-700'}`}>
      <div className="flex items-center gap-2 mb-2 uppercase text-xs font-bold opacity-80">
        <Clock size={16} />
        Lead Time to Peak
      </div>
      <div className="text-4xl font-black font-sans font-semibold text-gray-700">
        T-{hours.toString().padStart(2, '0')}:00
      </div>
    </div>
  );
}
