import React, { useRef } from 'react';
import { Terminal, Users, Play, Pause, ChevronRight, Shield, Cpu, Zap, Activity, MapPin, ChevronDown, Waves, HardHat, Gavel, Truck, Code, ArrowRight } from 'lucide-react';
import { useAuth } from '../AuthContext';
import type { Role } from '../AuthContext';
import { useGsapAnimations } from '../utils/useGsapAnimations';

export function DevDashboard() {
  const { setRoleDirectly, simulationMode, toggleSimulation, affectedZone, setAffectedZone } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  
  useGsapAnimations(containerRef);

  const roles: Role[] = ['Dam Controller', 'NDRF', 'District Collector', 'Highway Department'];
  const zones = ['All Zones', 'Kalpetta Town', 'Sulthan Bathery', 'Mananthavady', 'Vythiri', 'Panamaram', 'Ambalavayal'];

  const getRoleIcon = (r: Role) => {
    switch (r) {
      case 'Dam Controller': return <Waves size={20} />;
      case 'NDRF': return <HardHat size={20} />;
      case 'District Collector': return <Gavel size={20} />;
      case 'Highway Department': return <Truck size={20} />;
      case 'Developer': return <Terminal size={20} />;
      default: return <Shield size={20} />;
    }
  };

  return (
    <div ref={containerRef} className="pt-24 sm:pt-28 lg:pt-32 p-4 sm:p-6 h-full bg-transparent overflow-y-auto w-full custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-6 py-4">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/10 pb-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gray-950 rounded-2xl flex items-center justify-center shadow-2xl shadow-black/40 border border-white/10">
                <Terminal size={32} className="text-blue-500" />
              </div>
              <div>
                <h1 className="text-4xl font-black text-gray-900 brand-font uppercase leading-none">
                  Core <span className="text-blue-600">Architect</span>
                </h1>
                <p className="text-gray-500 font-bold uppercase text-[13px] mt-2 tracking-widest flex items-center gap-2">
                  <Cpu size={14} className="text-blue-600 animate-pulse" /> Developer Control Plane v1.4.2
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="relative">
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="glass-card px-5 py-3.5 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-all border border-white/20 min-w-[200px] group shadow-lg"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <MapPin size={16} />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-[10px] font-black text-gray-500 uppercase leading-none mb-1">Impact Target</div>
                  <div className="text-[14px] font-black text-gray-900 leading-none">{affectedZone}</div>
                </div>
                <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 glass-card rounded-2xl border border-white/20 shadow-2xl p-2 z-[60] gsap-appear">
                  {zones.map((z) => (
                    <button
                      key={z}
                      onClick={() => {
                        setAffectedZone(z);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-3 rounded-xl text-left text-[13px] font-black uppercase transition-all ${
                        affectedZone === z ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-black/5'
                      }`}
                    >
                      {z}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card px-6 py-4 rounded-3xl flex items-center gap-6 shadow-xl border border-white/20">
               <div className="flex flex-col items-end">
                  <div className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Simulation State</div>
                  <div className={`text-[18px] font-black uppercase ${simulationMode === 'FLOOD' ? 'text-red-600' : 'text-emerald-600'}`}>
                    {simulationMode}
                  </div>
               </div>
               <button 
                onClick={toggleSimulation}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${
                  simulationMode === 'FLOOD' ? 'glass-tint-red text-red-600' : 'glass-tint-emerald text-emerald-600'
                }`}
               >
                  {simulationMode === 'FLOOD' ? <Pause size={24} /> : <Play size={24} />}
               </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Role Switching Panel */}
          <section className="glass-card rounded-[2.5rem] p-6 space-y-6 overflow-visible [--glass-card-filter:none]">
            <div className="glass-blur-fix" />
            <div className="flex items-center gap-3 border-b border-black/5 pb-4">
              <Users size={24} className="text-blue-600" />
              <h2 className="text-xl font-black text-gray-900 uppercase">Impersonation Matrix</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
               {roles.map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleDirectly(r)}
                  className="group w-full p-6 glass-card rounded-[2rem] flex items-center justify-between hover:bg-white/20 hover:-translate-y-1 transition-all duration-500 text-left border border-white/10"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                      {getRoleIcon(r)}
                    </div>
                    <div>
                      <div className="text-[15px] font-black text-gray-900 uppercase leading-none mb-1">{r}</div>
                      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">Access Level Sync: Authorized</div>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center group-hover:-rotate-45 transition-all duration-500 group-hover:bg-blue-600/10">
                    <ArrowRight size={20} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* System Simulator */}
          <section className="space-y-6">
            <div className="glass-card rounded-[2.5rem] p-6 space-y-6 h-full flex flex-col justify-between overflow-visible [--glass-card-filter:none]">
              <div className="glass-blur-fix" />
              <div>
                <div className="flex items-center gap-3 border-b border-black/5 pb-4 mb-6">
                  <Zap size={24} className="text-orange-500" />
                  <h2 className="text-xl font-black text-gray-900 uppercase">Entropy Injection</h2>
                </div>
                
                <p className="text-gray-600 font-bold leading-relaxed mb-10 italic">
                  Toggle the environment state to simulate disaster cascades. This globally overrides LSTM predictions with static risk triggers for UI testing across all dashboards.
                </p>

                <div className="grid grid-cols-2 gap-6">
                  <div className={`p-8 rounded-[2.5rem] border-2 transition-all ${simulationMode === 'NORMAL' ? 'border-emerald-500 bg-emerald-50/5' : 'border-transparent glass-card opacity-50'}`}>
                    <Activity size={32} className="text-emerald-600 mb-4" />
                    <div className="text-[18px] font-black text-gray-900 uppercase">Stable Matrix</div>
                    <div className="text-[12px] font-bold text-gray-400 uppercase mt-1">Predictions active</div>
                  </div>
                  
                  <div className={`p-8 rounded-[2.5rem] border-2 transition-all ${simulationMode === 'FLOOD' ? 'border-red-500 bg-red-50/5' : 'border-transparent glass-card opacity-50'}`}>
                    <AlertTriangle size={32} className="text-red-600 mb-4" />
                    <div className="text-[18px] font-black text-gray-900 uppercase">Flood Delta</div>
                    <div className="text-[12px] font-bold text-gray-400 uppercase mt-1">Forced Overlays</div>
                  </div>
                </div>
              </div>

              <button 
                onClick={toggleSimulation}
                className="mt-6 w-full py-5 rounded-2xl font-black uppercase text-[13px] tracking-widest transition-all active:scale-95 shadow-2xl flex items-center justify-center gap-4 bg-red-600 text-white shadow-red-500/20"
              >
                {simulationMode === 'FLOOD' ? <Play fill="white" /> : <Pause fill="white" />}
                {simulationMode === 'FLOOD' ? 'Revert to Operational Normal' : 'Initiate Cascade Protocol'}
              </button>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

function AlertTriangle({ size, className }: { size: number, className: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}
