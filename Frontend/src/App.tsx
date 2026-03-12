import React, { useEffect, useMemo, useState, useRef } from 'react';
// Cascadenet: Advanced Intelligence & Response Control System
import { BrowserRouter, Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { Bell, LogOut, X, ArrowRight, Clock } from 'lucide-react';

// Dashboards
import { NdrfDashboard } from './dashboards/NdrfDashboard';
import { DamOperatorDashboard } from './dashboards/DamOperatorDashboard';
import { DistrictAdminDashboard } from './dashboards/DistrictAdminDashboard';
import { HighwayDepartmentDashboard } from './dashboards/HighwayDepartmentDashboard';

// Components
import { Login } from './components/Login';
import { Signup } from './components/Signup';

// Context
import { AuthProvider, useAuth } from './AuthContext';
import type { Role } from './AuthContext';
import { fetchActiveAlerts } from './utils/dataFetcher';
import type { StakeholderAction } from '@schema';
import { useGsapAnimations } from './utils/useGsapAnimations';

const roleToAlertDepartment: Record<Exclude<Role, null>, string> = {
  'Dam Controller': 'dam_controller',
  'NDRF': 'ndrf_rescue',
  'District Collector': 'district_admin',
  'Highway Department': 'highway_department',
};

const roleToRoute: Record<Exclude<Role, null>, string> = {
  'Dam Controller': '/dam',
  'NDRF': '/ndrf',
  'District Collector': '/admin',
  'Highway Department': '/highway',
};

import { gsap } from 'gsap';

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, logout } = useAuth();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<StakeholderAction[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isRendered, setIsRendered] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const notificationRef = useRef<HTMLElement>(null);
  
  useGsapAnimations(navRef as any);

  const isAuthPage = location.pathname === '/' || location.pathname === '/signup' || location.pathname === '/login';
  const departmentKey = role ? roleToAlertDepartment[role] : null;

  // ── ALL hooks must come before any conditional returns ──────────────────────
  useEffect(() => {
    if (isRendered && notificationRef.current) {
      gsap.fromTo(notificationRef.current, 
        { 
          opacity: 0, 
          scale: 0.95, 
          y: -10,
          transformOrigin: 'top right'
        },
        { 
          opacity: 1, 
          scale: 1, 
          y: 0,
          duration: 0.25, 
          ease: 'power2.out' 
        }
      );
    }
  }, [isRendered]);

  useEffect(() => {
    if (!departmentKey || isAuthPage) return;
    let isMounted = true;

    const syncNotifications = async () => {
      const items = await fetchActiveAlerts(departmentKey);
      if (!isMounted) return;
      setNotifications(items);
      setUnreadCount(isNotificationsOpen ? 0 : items.length);
    };

    syncNotifications();
    return () => {
      isMounted = false;
    };
  }, [departmentKey, isNotificationsOpen, isAuthPage]);

  useEffect(() => {
    if (isNotificationsOpen) {
      setUnreadCount(0);
    }
  }, [isNotificationsOpen]);

  const visibleNotifications = useMemo(() => notifications.slice(0, 8), [notifications]);

  if (isAuthPage) return null;

  const toggleNotifications = () => {
    if (isNotificationsOpen) {
      // Exit Animation
      if (notificationRef.current) {
        gsap.to(notificationRef.current, {
          opacity: 0,
          scale: 0.95,
          y: -10,
          duration: 0.2,
          ease: 'power2.in',
          onComplete: () => {
            setIsNotificationsOpen(false);
            setIsRendered(false);
          }
        });
      } else {
        setIsNotificationsOpen(false);
        setIsRendered(false);
      }
    } else {
      setIsRendered(true);
      setIsNotificationsOpen(true);
    }
  };

  const onNotificationClick = () => {
    if (!role) return;
    setIsNotificationsOpen(false);
    const destination = roleToRoute[role];
    if (destination && location.pathname !== destination) {
      navigate(destination);
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const animateNavButtonHover = (element: HTMLElement, isEntering: boolean) => {
    gsap.to(element, {
      y: isEntering ? -2 : 0,
      scale: isEntering ? 1.04 : 1,
      duration: isEntering ? 0.18 : 0.2,
      ease: 'power2.out',
      overwrite: 'auto'
    });
  };

  const getSeverityClasses = (level: string) => {
    if (level === 'RED') return 'bg-red-50/80 border-red-200/70 border-l-red-600/70';
    if (level === 'AMBER' || level === 'ORANGE') return 'bg-orange-50/80 border-orange-200/70 border-l-orange-600/70';
    return 'bg-blue-50/80 border-blue-200/70 border-l-blue-600/70';
  };

  return (
    <>
      <nav ref={navRef} style={{ backdropFilter: 'blur(32px) saturate(200%)', WebkitBackdropFilter: 'blur(32px) saturate(200%)', background: 'rgba(255,255,255,0.6)' }} className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 w-[94%] sm:w-[92%] max-w-7xl h-14 sm:h-[4.25rem] rounded-[1.4rem] sm:rounded-[1.8rem] flex items-center justify-between px-2 sm:px-3 md:px-4 z-50 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] border border-white/80">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="/logo.svg" alt="Cascadenet logo" className="w-7 h-7" />
            </div>
            <h1 className="text-lg sm:text-xl font-black text-gray-950 brand-font leading-none">
              Cascade<span className="text-blue-700 ending-serif">Net</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:flex flex-col items-end text-right leading-none">
            <span className="text-[13px] font-black text-gray-800 uppercase">{role}</span>
          </div>
          <button
            aria-label="Open notifications"
            onClick={toggleNotifications}
            onMouseEnter={(e) => animateNavButtonHover(e.currentTarget, true)}
            onMouseLeave={(e) => animateNavButtonHover(e.currentTarget, false)}
            className="relative h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-full border border-gray-200/60 bg-white/95 backdrop-blur-3xl shadow-xl border border-white/60/80 text-gray-700 active:scale-90"
          >
            <Bell size={19} strokeWidth={2.4} className={unreadCount > 0 ? 'animate-pulse text-blue-600' : ''} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full bg-red-600 text-white text-[11px] font-black leading-[20px] text-center shadow-lg">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button 
            onClick={logout} 
            onMouseEnter={(e) => animateNavButtonHover(e.currentTarget, true)}
            onMouseLeave={(e) => animateNavButtonHover(e.currentTarget, false)}
            className="h-9 sm:h-10 w-9 sm:min-w-[112px] sm:w-auto flex items-center justify-center gap-0 sm:gap-2 bg-white/95 backdrop-blur-3xl shadow-xl border border-white/60/60 text-gray-800 px-0 sm:px-4 rounded-full font-black text-[12px] uppercase border border-gray-200/80 active:scale-95 shadow-sm"
          >
            <LogOut size={14} className="shrink-0" /> <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>

      {isRendered && (
        <>
          <aside ref={notificationRef} className="fixed top-[5.25rem] sm:top-[6.8rem] right-[3%] sm:right-[4%] md:right-7 w-[380px] max-w-[calc(100vw-1rem)] sm:max-w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-6rem)] sm:max-h-[76vh] z-[60] rounded-[1.5rem] sm:rounded-[2rem] border border-white/80 bg-white/92 backdrop-blur-3xl shadow-[0_22px_56px_rgba(15,23,42,0.18)] overflow-hidden origin-top-right">
             <header className="px-5 sm:px-6 py-4 border-b border-slate-200/70 bg-white/85 backdrop-blur-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[13px] font-black tracking-wide text-blue-900 uppercase">Astrava Directive Hub</div>
                  <div className="mt-1 text-[12px] font-black text-slate-500 uppercase">Live Sector Sync</div>
                  <div className="mt-2 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black uppercase text-slate-600">
                    {notifications.length} Active Alerts
                  </div>
                </div>
              <div className="flex items-center gap-3">
                <button
                   onClick={clearNotifications}
                   className="px-3 py-1.5 rounded-full text-[11px] font-black text-blue-700 hover:text-blue-900 hover:bg-blue-50/70 uppercase transition-all"
                >
                  Clear Hub
                </button>
                <button
                  aria-label="Close directive hub"
                  onClick={toggleNotifications}
                  className="h-9 w-9 rounded-xl border border-slate-200/70 text-slate-700 hover:bg-slate-100/80 flex items-center justify-center transition-all active:scale-90"
                >
                  <X size={16} />
                </button>
              </div>
              </div>
            </header>

            <div className="max-h-[calc(76vh-5.5rem)] overflow-y-auto custom-scrollbar p-3 bg-gradient-to-b from-white/70 to-slate-50/90 space-y-2.5">
              {visibleNotifications.length > 0 ? (
                visibleNotifications.map((item, idx) => (
                   <button
                    key={`${item.department}-${idx}`}
                    onClick={onNotificationClick}
                    className={`w-full text-left p-4 rounded-2xl border border-l-[4px] ${getSeverityClasses(item.alert_level)} hover:shadow-md hover:-translate-y-0.5 transition-all group flex items-center justify-between gap-4`}
                  >
                     <div className="flex-1">
                       <div className="flex items-center justify-between gap-3 mb-1.5">
                         <span className={`text-[13px] font-black uppercase tracking-wide truncate ${item.alert_level === 'RED' ? 'text-red-700' : (item.alert_level === 'ORANGE' ? 'text-orange-700' : 'text-blue-700')}`}>{item.department}</span>
                         <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${item.alert_level === 'RED' ? 'bg-red-100 text-red-700' : (item.alert_level === 'ORANGE' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700')}`}>{item.alert_level}</span>
                       </div>
                       <p className="text-[14px] font-semibold leading-snug text-slate-800 line-clamp-2">{item.action}</p>
                       {item.time_window_hours !== undefined && (
                         <div className="mt-2 text-[11px] font-black text-slate-500 uppercase flex items-center gap-1.5 tracking-wide">
                           <Clock size={12} className="opacity-50" /> T-{item.time_window_hours}H
                         </div>
                       )}
                     </div>
                     <ArrowRight size={24} className={`shrink-0 opacity-40 group-hover:opacity-100 group-hover:translate-x-1.5 transition-all ${item.alert_level === 'RED' ? 'text-red-700' : (item.alert_level === 'ORANGE' ? 'text-orange-700' : 'text-blue-700')}`} />
                  </button>
                ))
              ) : (
                <div className="py-10 px-6 text-center rounded-2xl border border-dashed border-slate-300/80 bg-white/70 backdrop-blur-md">
                  <p className="text-[14px] font-semibold text-slate-500">No active notifications</p>
                </div>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}

function ProtectedRoute({ children, allowedRole }: { children: React.ReactNode, allowedRole: Role }) {
  const { role } = useAuth();
  const persistedRole = (localStorage.getItem('cascade_role') as Role) || null;
  const effectiveRole = role || persistedRole;
  if (effectiveRole !== allowedRole) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  const persistedRole = (localStorage.getItem('cascade_role') as Role) || null;
  const effectiveRole = role || persistedRole;
  if (effectiveRole === 'Dam Controller') return <Navigate to="/dam" replace />;
  if (effectiveRole === 'NDRF') return <Navigate to="/ndrf" replace />;
  if (effectiveRole === 'District Collector') return <Navigate to="/admin" replace />;
  if (effectiveRole === 'Highway Department') return <Navigate to="/highway" replace />;
  return <>{children}</>;
}

function AppContent() {
  const { role } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const routeTitles: Record<string, string> = {
      '/': 'Cascadenet | Login',
      '/login': 'Cascadenet | Login',
      '/signup': 'Cascadenet | Sign Up',
      '/ndrf': 'Cascadenet | NDRF Dashboard',
      '/dam': 'Cascadenet | Dam Controller Dashboard',
      '/admin': 'Cascadenet | District Collector Dashboard',
      '/highway': 'Cascadenet | Highway Department Dashboard',
    };

    document.title = routeTitles[location.pathname] ?? 'Cascadenet | Flood Intelligence';
  }, [location.pathname]);
  
  return (
    <div className="h-dvh min-h-dvh w-full bg-[#f8fafc] text-gray-900 flex flex-col overflow-hidden relative font-sans no-scrollbar">
      {/* Ambient backgrounds — must be vivid so glassmorphism shows */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[70%] h-[50%] bg-blue-600/30 blur-[120px] rounded-full" />
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-700/20 blur-[140px] rounded-full animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-800/20 blur-[140px] rounded-full" />
        <div className="absolute top-[30%] right-[5%] w-[35%] h-[35%] bg-sky-500/15 blur-[120px] rounded-full" />
      </div>

      {role && <Navigation />}

      <main className="flex-1 w-full h-full relative z-10 overflow-hidden">
        <Routes>
          <Route path="/" element={<AuthRedirect><Login /></AuthRedirect>} />
          <Route path="/signup" element={<AuthRedirect><Signup /></AuthRedirect>} />
          <Route path="/ndrf" element={<ProtectedRoute allowedRole="NDRF"><NdrfDashboard /></ProtectedRoute>} />
          <Route path="/dam" element={<ProtectedRoute allowedRole="Dam Controller"><DamOperatorDashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute allowedRole="District Collector"><DistrictAdminDashboard /></ProtectedRoute>} />
          <Route path="/highway" element={<ProtectedRoute allowedRole="Highway Department"><HighwayDepartmentDashboard /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

