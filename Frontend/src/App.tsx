import React, { useEffect, useMemo, useState, useRef } from 'react';
// CascadeNet: Advanced Intelligence & Response Control System
import { BrowserRouter, Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { Bell, LogOut, X, ArrowRight, Clock } from 'lucide-react';

// Dashboards
import { NdrfDashboard } from './dashboards/NdrfDashboard';
import { DamOperatorDashboard } from './dashboards/DamOperatorDashboard';
import { DistrictAdminDashboard } from './dashboards/DistrictAdminDashboard';
import { PublicPortal } from './dashboards/PublicPortal';
import { HighwayDepartmentDashboard } from './dashboards/HighwayDepartmentDashboard';

// Components
import { Login } from './components/Login';
import { Signup } from './components/Signup';

// Context
import { AuthProvider, useAuth } from './AuthContext';
import type { Role } from './AuthContext';
import { fetchActiveAlerts } from './utils/dataFetcher';
import type { Alert } from './utils/dataFetcher';
import { useGsapAnimations } from './utils/useGsapAnimations';

const roleToAlertDepartment: Record<Exclude<Role, null>, string> = {
  'Dam Controller': 'dam_controller',
  'NDRF': 'ndrf_rescue',
  'District Collector': 'district_admin',
  'Highway Department': 'highway_department',
  'Public': 'Public',
};

const roleToRoute: Record<Exclude<Role, null>, string> = {
  'Dam Controller': '/dam',
  'NDRF': '/ndrf',
  'District Collector': '/admin',
  'Highway Department': '/highway',
  'Public': '/public',
};

import { gsap } from 'gsap';

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, logout } = useAuth();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Alert[]>([]);
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
      const sorted = [...items].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
      setNotifications(sorted);
      setUnreadCount(isNotificationsOpen ? 0 : sorted.length);
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

  const getSeverityClasses = (level: string) => {
    if (level === 'RED') return 'glass-red border-l-red-600/60 shadow-red-500/5';
    if (level === 'AMBER' || level === 'ORANGE') return 'glass-orange border-l-orange-600/60 shadow-orange-500/5';
    return 'glass-blue border-l-blue-600/60 shadow-blue-500/5';
  };

  return (
    <>
      <nav ref={navRef} style={{ backdropFilter: 'blur(32px) saturate(200%)', WebkitBackdropFilter: 'blur(32px) saturate(200%)', background: 'rgba(255,255,255,0.6)' }} className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 w-[94%] sm:w-[92%] max-w-7xl h-14 sm:h-[4.25rem] rounded-[1.4rem] sm:rounded-[1.8rem] flex items-center justify-between px-2 sm:px-3 md:px-4 z-50 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] border border-white/80">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="/logo.svg" alt="CascadeNet logo" className="w-7 h-7" />
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
            className="h-9 sm:h-10 w-9 sm:min-w-[112px] sm:w-auto flex items-center justify-center gap-0 sm:gap-2 bg-white/95 backdrop-blur-3xl shadow-xl border border-white/60/60 text-gray-800 px-0 sm:px-4 rounded-full font-black text-[12px] uppercase border border-gray-200/80 active:scale-95 shadow-sm"
          >
            <LogOut size={14} className="shrink-0" /> <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>

      {isRendered && (
        <>
          <aside ref={notificationRef} className="fixed top-[5.25rem] sm:top-[6.8rem] right-[3%] sm:right-[4%] md:right-7 w-[360px] max-w-[calc(100vw-1rem)] sm:max-w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-6rem)] sm:max-h-[76vh] z-[60] rounded-[1.5rem] sm:rounded-[2rem] border border-white/80 bg-white/95 backdrop-blur-3xl shadow-xl border border-white/60/60 shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden origin-top-right backdrop-blur-3xl">
             <header className="h-16 px-6 border-b border-white/20 flex items-center justify-between bg-white/95 backdrop-blur-3xl shadow-xl border border-white/60/20 backdrop-blur-3xl">
              <div>
                 <div className="text-[14px] font-black text-blue-900 uppercase">Astrava Directive Hub</div>
                 <div className="text-[12px] font-black text-blue-800/40 uppercase mt-0.5">Live Sector Sync</div>
              </div>
              <div className="flex items-center gap-3">
                <button
                   onClick={clearNotifications}
                   className="px-4 py-1.5 rounded-full text-[14px] font-black text-blue-700 hover:text-blue-900 hover:bg-blue-50/50 uppercase transition-all gsap-header"
                >
                  Clear Hub
                </button>
                <button
                  aria-label="Close directive hub"
                  onClick={toggleNotifications}
                  className="h-9 w-9 rounded-2xl border border-white/40 text-blue-900 hover:bg-white/95 backdrop-blur-3xl shadow-xl border border-white/60/80 flex items-center justify-center transition-all active:scale-90"
                >
                  <X size={16} />
                </button>
              </div>
            </header>

            <div className="max-h-[calc(76vh-3.5rem)] overflow-y-auto custom-scrollbar p-3.5 space-y-2.5 bg-white/95 backdrop-blur-3xl shadow-xl border border-white/60/20">
              {visibleNotifications.length > 0 ? (
                visibleNotifications.map((item) => (
                   <button
                    key={item.id}
                    onClick={onNotificationClick}
                    className={`w-full text-left p-5 rounded-[2.2rem] border border-white/40 border-l-[4px] ${getSeverityClasses(item.alert_level)} hover:shadow-lg transition-all backdrop-blur-xl group flex items-center justify-between gap-5 gsap-appear`}
                  >
                     <div className="flex-1">
                       <div className="flex items-center justify-between gap-3 mb-2">
                         <span className={`text-[15px] font-black uppercase truncate ${item.alert_level === 'RED' ? 'text-red-700' : (item.alert_level === 'AMBER' || item.alert_level === 'ORANGE' ? 'text-orange-700' : 'text-emerald-700')}`}>{item.zone_id}</span>
                         <span className={`px-2 py-0.5 rounded-full text-[13px] font-black uppercase ${item.alert_level === 'RED' ? 'bg-red-600/10 text-red-700' : (item.alert_level === 'AMBER' || item.alert_level === 'ORANGE' ? 'bg-orange-600/10 text-orange-700' : 'bg-emerald-600/10 text-emerald-700')}`}>{item.alert_level}</span>
                       </div>
                       <p className="text-[16px] font-bold leading-snug text-gray-900 line-clamp-2 italic">"{item.action_text}"</p>
                       {item.deadline_hrs !== undefined && (
                         <div className="mt-3 text-[14px] font-black text-gray-500 uppercase flex items-center gap-2">
                           <Clock size={12} className="opacity-40" /> T-{item.deadline_hrs}H
                         </div>
                       )}
                     </div>
                     <ArrowRight size={32} className={`shrink-0 opacity-40 group-hover:opacity-100 group-hover:translate-x-2 transition-all ${item.alert_level === 'RED' ? 'text-red-700' : (item.alert_level === 'AMBER' || item.alert_level === 'ORANGE' ? 'text-orange-700' : 'text-emerald-700')}`} />
                  </button>
                ))
              ) : (
                <div className="py-12 px-6 text-center rounded-2xl border border-dashed border-white/80 bg-white/95 backdrop-blur-3xl shadow-xl border border-white/60/40 backdrop-blur-sm">
                  <p className="text-[15px] font-semibold text-gray-400">No active notifications</p>
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
  if (effectiveRole === 'Public') return <Navigate to="/public" replace />;
  return <>{children}</>;
}

function AppContent() {
  const { role } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const routeTitles: Record<string, string> = {
      '/': 'CascadeNet | Login',
      '/login': 'CascadeNet | Login',
      '/signup': 'CascadeNet | Sign Up',
      '/public': 'CascadeNet | Public Dashboard',
      '/ndrf': 'CascadeNet | NDRF Dashboard',
      '/dam': 'CascadeNet | Dam Controller Dashboard',
      '/admin': 'CascadeNet | District Collector Dashboard',
      '/highway': 'CascadeNet | Highway Department Dashboard',
    };

    document.title = routeTitles[location.pathname] ?? 'CascadeNet | Flood Intelligence';
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
          <Route path="/public" element={<ProtectedRoute allowedRole="Public"><PublicPortal /></ProtectedRoute>} />
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

