import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, AlertTriangle, Shield, CheckCircle2, Navigation, Activity, ChevronRight, Info, InfoIcon } from 'lucide-react';
import { fetchPredictions, fetchActiveAlerts } from '../utils/dataFetcher';
import type { ZonePrediction, StakeholderAction } from '@schema';
import { getPredictionAlertLevel } from '../utils/schemaHelpers';
import { useGsapAnimations } from '../utils/useGsapAnimations';

export function PublicPortal() {
   const containerRef = useRef<HTMLDivElement>(null);
   const [pin, setPin] = useState('');
   const [searchResult, setSearchResult] = useState<ZonePrediction | null>(null);
   const [isSearching, setIsSearching] = useState(false);
   const [globalRisks, setGlobalRisks] = useState<ZonePrediction[]>([]);
   const [advisories, setAdvisories] = useState<StakeholderAction[]>([]);
   const [lastUpdated, setLastUpdated] = useState<string>('');

   useGsapAnimations(containerRef, [globalRisks, searchResult]);

   useEffect(() => {
      async function loadPublicData() {
         const [preds, alerts] = await Promise.all([
            fetchPredictions('2024_peak'),
            fetchActiveAlerts('Public', '2024_peak')
         ]);
         setGlobalRisks(preds);
         setAdvisories(alerts);
         setLastUpdated(new Date().toLocaleTimeString());
      }
      loadPublicData();
   }, []);

   const handleSearch = () => {
      if (!pin) return;
      setIsSearching(true);
      setTimeout(() => {
         const found = globalRisks.find(p => p.zone_id.toLowerCase().includes(pin.toLowerCase()) || (p as any).zone_name?.toLowerCase().includes(pin.toLowerCase()));
         setSearchResult(found || null);
         setIsSearching(false);
      }, 800);
   };

   return (
      <div ref={containerRef} className="pt-20 sm:pt-24 lg:pt-26 h-full w-full bg-transparent overflow-y-auto custom-scrollbar">
         <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-20 space-y-10 sm:space-y-16">

            {/* Cinematic Header */}
            <div className="text-center space-y-6 relative">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/5 blur-[100px] rounded-full -z-10" />
               <div className="flex items-center gap-2 mb-6 justify-center md:justify-start text-blue-700">
                  <Shield size={16} />
                  <span className="text-[16px] sm:text-[15px] font-black uppercase sm:tracking-[0.2em]">Community Defense Network</span>
               </div>
               <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-gray-950 brand-font leading-[0.9]">
                  Wayanad Flood <span className="text-blue-700 ending-serif">Intelligence</span>
               </h1>
               <p className="max-w-xl mx-auto text-gray-700 font-bold text-lg leading-relaxed">
                  Access real-time predictive data for your sector. Powered by high-resolution LSTM models.
               </p>
            </div>

            <div className="max-w-2xl mx-auto w-full">
               <div className="glass-card p-2 rounded-[2rem] sm:rounded-[2.5rem] flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white/60 backdrop-blur-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-white/60">
                  <input
                     type="text"
                     placeholder="Enter sector name (e.g. Kalpetta, Meppadi)"
                     value={pin}
                     onChange={(e) => setPin(e.target.value)}
                     className="glass-input h-14 sm:h-16 border-none bg-transparent shadow-none px-6 sm:px-10 flex-1 min-w-0"
                  />
                  <button
                     onClick={handleSearch}
                     className="w-full sm:w-auto shrink-0 justify-center bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-10 h-14 sm:h-16 rounded-[1.5rem] sm:rounded-[2rem] font-black text-[15px] uppercase transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center gap-2 sm:gap-3"
                  >
                     {isSearching ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search size={22} />}
                     Search Sector
                  </button>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

               {/* Search Result Window */}
               <div className="space-y-6">
                  <h2 className="text-[15px] font-black text-gray-600 uppercase flex items-center gap-3 pl-2">
                     <MapPin size={16} className="text-blue-700" /> Sector Analysis
                  </h2>

                  {searchResult ? (
                     <div className="glass-card p-6 sm:p-10 rounded-[3rem] space-y-8 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-start gap-3">
                           <div>
                              <h3 className="text-2xl sm:text-3xl font-black text-gray-950 brand-font uppercase leading-none break-words">{(searchResult as any).zone_name || searchResult.zone_id}</h3>
                              <div className="text-[16px] text-gray-600 font-bold mt-2 uppercase">Prediction Coordinates Verified</div>
                           </div>
                           <div className={`px-4 py-1.5 rounded-full text-[15px] font-black uppercase shadow-none ${getPredictionAlertLevel(searchResult) === 'RED' ? 'glass-red text-red-700' :
                              (getPredictionAlertLevel(searchResult) === 'YELLOW' || getPredictionAlertLevel(searchResult) === 'ORANGE') ? 'glass-orange text-orange-700' :
                                 'glass-emerald text-emerald-700'
                              }`}>
                              {getPredictionAlertLevel(searchResult)}
                           </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                           <div className="glass-blue p-6 rounded-3xl">
                              <div className="text-[16px] font-black text-blue-700 uppercase mb-1">Flood Prob.</div>
                              <div className="text-4xl font-black text-gray-950 brand-font">{(searchResult.flood_probability * 100).toFixed(0)}%</div>
                           </div>
                           <div className="glass-blue p-6 rounded-3xl">
                              <div className="text-[16px] font-black text-blue-700 uppercase mb-1">Lead Time</div>
                              <div className="text-4xl font-black text-blue-700 brand-font">{searchResult.lead_time_hours}H</div>
                           </div>
                        </div>

                        <div className="p-6 glass-blue rounded-3xl space-y-3">
                           <div className="flex items-center gap-3 text-blue-600">
                              <Info size={18} />
                              <span className="text-[15px] font-black uppercase">Model Safety Bulletin</span>
                           </div>
                           <p className="text-gray-600 text-[15px] font-medium leading-relaxed italic">
                              {getPredictionAlertLevel(searchResult) === 'RED'
                                 ? "Severe risk detected. Evacuation of ground-level structures is prioritized via government channels."
                                 : "Monitoring phase active. No immediate evacuation is recommended for this sector."}
                           </p>
                        </div>
                     </div>
                  ) : !isSearching && pin ? (
                     <div className="glass-card gsap-appear p-12 sm:p-20 rounded-[3rem] border-white/60 bg-white/95 backdrop-blur-3xl shadow-xl border border-white/60 text-center space-y-6 opacity-60 shadow-sm">
                        <AlertTriangle className="mx-auto text-orange-400 animate-pulse" size={48} />
                        <div className="text-[15px] font-black text-gray-400 uppercase">Sector ID Not Recognized</div>
                     </div>
                  ) : (
                     <div className="glass-card gsap-appear p-12 sm:p-20 rounded-[3rem] border-white/60 bg-white/95 backdrop-blur-3xl shadow-xl border border-white/60 text-center space-y-6 shadow-sm opacity-60">
                        <Activity className="mx-auto text-blue-400 animate-pulse" size={48} />
                        <div className="text-[15px] font-black text-gray-400 uppercase">Awaiting Parameter Input</div>
                     </div>
                  )}
               </div>

               {/* Active Risks & Advisories Feed */}
               <div className="space-y-6">
                  <div className="flex items-center justify-between px-2 mb-2">
                     <h2 className="text-[15px] font-black text-gray-600 uppercase flex items-center gap-3">
                        <Navigation size={16} className="text-blue-700" /> Active Advisories
                     </h2>
                     <div className="px-3 py-1 bg-amber-100 rounded-full text-[16px] font-black text-amber-600 uppercase border border-amber-200">Broadcast On</div>
                  </div>

                  <div className="space-y-4">
                     {advisories.length > 0 ? (
                        advisories.map((alert, idx) => (
                           <div key={idx} className="glass-card p-4 sm:p-6 rounded-[2.2rem] bg-white/95 backdrop-blur-3xl shadow-xl border border-white/60/50 shadow-xl premium-shadow flex items-start gap-4 sm:gap-6 group transition-transform">
                              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                                 <Activity size={24} />
                              </div>
                              <div className="flex-1 space-y-2">
                                 <div className="flex flex-wrap justify-between items-center gap-2">
                                    <span className="text-[15px] font-black text-blue-800 uppercase break-all">{alert.source} BROADCAST</span>
                                    <div className="text-[16px] font-black text-gray-700 uppercase">T-{alert.time_window_hours}H</div>
                                 </div>
                                 <p className="text-gray-950 font-bold text-[15px] leading-relaxed">{alert.action}</p>
                              </div>
                              <ChevronRight size={18} className="text-gray-300 mt-2 hidden sm:block" />
                           </div>
                        ))
                     ) : (
                        <div className="glass-card p-12 rounded-[2.2rem] border-white/60 bg-white/95 backdrop-blur-3xl shadow-xl border border-white/60/70 text-center space-y-4 shadow-sm opacity-40">
                           <CheckCircle2 className="mx-auto text-emerald-400" size={40} />
                           <div className="text-[15px] font-black text-gray-500 uppercase">All Public Systems Normalized</div>
                        </div>
                     )}
                  </div>
               </div>

            </div>

            {/* Global Stats Footer */}
            <div className="pt-12 sm:pt-20 border-t border-black/5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
               <div className="space-y-2">
                  <div className="text-[16px] font-black text-gray-600 uppercase">Model Ver.</div>
                  <div className="text-lg sm:text-xl font-black text-gray-950 break-all">LSTM_CASCADE_V3</div>
               </div>
               <div className="space-y-2">
                  <div className="text-[16px] font-black text-gray-600 uppercase">Live Sync</div>
                  <div className="text-xl font-black text-emerald-700 px-3 bg-emerald-50 rounded-lg inline-block">{globalRisks.length > 0 ? 'ONLINE' : 'OFFLINE'}</div>
               </div>
               <div className="space-y-2">
                  <div className="text-[16px] font-black text-gray-600 uppercase">Zones Online</div>
                  <div className="text-xl font-black text-gray-950">{globalRisks.length} Municipal</div>
               </div>
               <div className="space-y-2">
                  <div className="text-[16px] font-black text-gray-600 uppercase">Last Update</div>
                  <div className="text-xl font-black text-gray-950">{lastUpdated || 'Unavailable'}</div>
               </div>
            </div>

         </div>
      </div>
   );
}
