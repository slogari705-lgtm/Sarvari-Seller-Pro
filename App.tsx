
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart, 
  Settings as SettingsIcon,
  Menu,
  X,
  Moon,
  Sun,
  Lock,
  User as UserIcon,
  RotateCcw,
  Layout,
  Palette,
  Wand2,
  Package,
  FileText,
  Receipt,
  BarChart3,
  History,
  Trash2,
  Cpu,
  Boxes
} from 'lucide-react';
import { AppState, View } from './types';
import { translations } from './translations';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Customers from './components/Customers';
import Terminal from './components/Terminal';
import Invoices from './components/Invoices';
import Expenses from './components/Expenses';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Loans from './components/Loans';
import DashboardCostume from './components/DashboardCostume';
import Trash from './components/Trash';
import LockScreen from './components/LockScreen';
import Returns from './components/Returns';

const INITIAL_STATE: AppState = {
  products: [],
  customers: [],
  workers: [],
  invoices: [],
  expenses: [],
  templates: [{ id: 'modern', name: 'Standard Modern', layout: 'modern', brandColor: '#6366f1', showLogo: true }],
  loanTransactions: [],
  expenseCategories: ['Rent', 'Utilities', 'Salaries', 'Supplies', 'Marketing', 'Maintenance', 'Other'],
  lastSync: new Date().toISOString(),
  lastLocalBackup: new Date().toISOString(),
  settings: { 
    shopName: 'Sarvari Seller Pro', 
    shopAddress: '', 
    shopPhone: '', 
    shopEmail: '', 
    shopWebsite: '', 
    currency: '$', 
    taxRate: 0, 
    lowStockThreshold: 5, 
    invoiceTemplate: 'modern', 
    brandColor: '#6366f1', 
    language: 'en', 
    theme: 'light', 
    defaultCustomerId: '', 
    showSignatures: false,
    autoFileBackup: true,
    autoLocalBackup: true,
    autoBackupFolderLinked: false,
    cardDesign: {
      layout: 'horizontal',
      theme: 'mesh',
      primaryColor: '#4f46e5',
      secondaryColor: '#8b5cf6',
      pattern: 'mesh',
      borderRadius: 24,
      borderWidth: 1,
      fontFamily: 'sans',
      showQr: true,
      showPoints: true,
      showJoinDate: true,
      showLogo: true,
      textColor: 'light',
      glossy: true
    },
    loyaltySettings: {
      pointsPerUnit: 1,
      conversionRate: 0.01,
      enableTiers: true
    },
    security: {
      isLockEnabled: false,
      highSecurityMode: false,
      autoLockTimeout: 0
    }
  }
};

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('sarvari_pos_data');
    return saved ? { ...INITIAL_STATE, ...JSON.parse(saved) } : INITIAL_STATE;
  });

  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isAppLocked, setIsAppLocked] = useState(() => 
    !!state.settings.security?.isLockEnabled && !!state.settings.security?.passcode
  );

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const t = translations[state.settings.language || 'en'];
  const isRTL = state.settings.language === 'ps' || state.settings.language === 'dr';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.settings.theme === 'dark');
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [state.settings.theme, isRTL]);

  useEffect(() => {
    const backupService = setInterval(() => {
      if (stateRef.current.settings.autoLocalBackup) {
        try {
          localStorage.setItem('sarvari_pos_data', JSON.stringify(stateRef.current));
        } catch (error) {
          console.error("Storage Error:", error);
        }
      }
    }, 5000);
    return () => clearInterval(backupService);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updateState = <K extends keyof AppState>(key: K, value: AppState[K]) => setState(prev => ({ ...prev, [key]: value }));

  const coreNav = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'terminal', label: t.terminal, icon: ShoppingCart },
    { id: 'products', label: t.products, icon: Boxes },
    { id: 'customers', label: t.customers, icon: Users },
  ];

  const secondaryNav = [
    { id: 'invoices', label: t.invoices, icon: FileText },
    { id: 'expenses', label: t.expenses, icon: Receipt },
    { id: 'reports', label: t.reports, icon: BarChart3 },
  ];

  const workspaceNav = [
    { id: 'dashboard-costume', label: t.dashboardCostume, icon: Wand2 },
    { id: 'settings', label: t.settings, icon: SettingsIcon },
  ];

  if (isAppLocked && state.settings.security?.isLockEnabled && state.settings.security?.passcode) {
    return (
      <LockScreen 
        correctPasscode={state.settings.security.passcode} 
        securityQuestion={state.settings.security.securityQuestion}
        securityAnswer={state.settings.security.securityAnswer}
        highSecurityMode={state.settings.security.highSecurityMode}
        onUnlock={() => setIsAppLocked(false)} 
        shopName={state.settings.shopName} 
      />
    );
  }

  return (
    <div className={`flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden ${isRTL ? 'font-arabic' : ''}`}>
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[50] lg:hidden animate-in fade-in" onClick={() => setMobileMenuOpen(false)}/>
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-[60] ${sidebarOpen ? 'w-64' : 'w-20'} ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col shadow-xl lg:shadow-none`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 shrink-0">
          {(sidebarOpen || mobileMenuOpen) && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg">S</div>
              <span className="font-black text-xl tracking-tighter dark:text-white">Sarvari</span>
            </div>
          )}
          {!sidebarOpen && !mobileMenuOpen && (
            <div className="mx-auto w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl">S</div>
          )}
          <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={20}/></button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto custom-scrollbar">
          <div>
            <p className={`px-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-3 ${(!sidebarOpen && !mobileMenuOpen) ? 'hidden' : ''}`}>Core Systems</p>
            {coreNav.map((item) => (
              <button 
                key={item.id} 
                onClick={() => { setCurrentView(item.id as View); setMobileMenuOpen(false); }} 
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${currentView === item.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 dark:shadow-none' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <item.icon size={20} className={currentView === item.id ? 'text-white' : 'group-hover:scale-110 transition-transform'} /> 
                {(sidebarOpen || mobileMenuOpen) && <span className="font-black text-[12px] uppercase tracking-wider">{item.label}</span>}
              </button>
            ))}
          </div>

          <div>
            <p className={`px-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-3 ${(!sidebarOpen && !mobileMenuOpen) ? 'hidden' : ''}`}>Auditing</p>
            {secondaryNav.map((item) => (
              <button 
                key={item.id} 
                onClick={() => { setCurrentView(item.id as View); setMobileMenuOpen(false); }} 
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${currentView === item.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 dark:shadow-none' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <item.icon size={20} className={currentView === item.id ? 'text-white' : 'group-hover:scale-110 transition-transform'} /> 
                {(sidebarOpen || mobileMenuOpen) && <span className="font-black text-[12px] uppercase tracking-wider">{item.label}</span>}
              </button>
            ))}
          </div>

          <div>
            <p className={`px-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-3 ${(!sidebarOpen && !mobileMenuOpen) ? 'hidden' : ''}`}>Workspace</p>
            {workspaceNav.map((item) => (
              <button 
                key={item.id} 
                onClick={() => { setCurrentView(item.id as View); setMobileMenuOpen(false); }} 
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${currentView === item.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 dark:shadow-none' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <item.icon size={20} className={currentView === item.id ? 'text-white' : 'group-hover:scale-110 transition-transform'} /> 
                {(sidebarOpen || mobileMenuOpen) && <span className="font-black text-[12px] uppercase tracking-wider">{item.label}</span>}
              </button>
            ))}
          </div>
          
          <div className="pt-4 border-t border-slate-50 dark:border-slate-800">
             <p className={`px-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4 ${(!sidebarOpen && !mobileMenuOpen) ? 'hidden' : ''}`}>Advanced</p>
             {[
               { id: 'loans', label: t.loan, icon: History },
               { id: 'returns', label: t.returns, icon: RotateCcw },
               { id: 'trash', label: 'Trash Bin', icon: Trash2 }
             ].map((item) => (
               <button 
                 key={item.id} 
                 onClick={() => { setCurrentView(item.id as View); setMobileMenuOpen(false); }} 
                 className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-xl transition-all ${currentView === item.id ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-400 hover:text-indigo-500'}`}
               >
                 <item.icon size={18} />
                 {(sidebarOpen || mobileMenuOpen) && <span className="font-bold text-[12px] uppercase">{item.label}</span>}
               </button>
             ))}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <button onClick={() => updateState('settings', { ...state.settings, theme: state.settings.theme === 'dark' ? 'light' : 'dark' })} className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
            {state.settings.theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            {(sidebarOpen || mobileMenuOpen) && <span className="font-black text-[10px] uppercase tracking-widest">{state.settings.theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-20 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between shrink-0 z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 rounded-2xl">
              <Menu size={24}/>
            </button>
            <div>
              <h2 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-0.5">{state.settings.shopName}</h2>
              <h3 className="text-lg font-black dark:text-white uppercase tracking-tighter">
                {currentView === 'dashboard-costume' ? t.dashboardCostume : currentView.replace('-', ' ')}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-2xl border ${isOnline ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></div>
              <span className="text-[10px] font-black uppercase tracking-widest">{isOnline ? 'Cloud Sync' : 'Offline Mode'}</span>
            </div>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden lg:flex w-11 h-11 bg-slate-50 dark:bg-slate-800 rounded-2xl items-center justify-center text-slate-400 hover:text-indigo-600 transition-all">
              <Layout size={20} />
            </button>
            <button onClick={() => setCurrentView('settings')} className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-90 transition-all">
              <UserIcon size={20} strokeWidth={3} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {(() => {
              switch (currentView) {
                case 'dashboard': return <Dashboard state={state} setCurrentView={setCurrentView} sidebarOpen={sidebarOpen} />;
                case 'customers': return <Customers state={state} updateState={updateState} setCurrentView={setCurrentView} />;
                case 'terminal': return <Terminal state={state} updateState={updateState} />;
                case 'settings': return <Settings state={state} updateState={updateState} />;
                case 'products': return <Products state={state} updateState={updateState} />;
                case 'invoices': return <Invoices state={state} updateState={updateState} setCurrentView={setCurrentView} />;
                case 'expenses': return <Expenses state={state} updateState={updateState} />;
                case 'reports': return <Reports state={state} />;
                case 'loans': return <Loans state={state} updateState={updateState} setCurrentView={setCurrentView} />;
                case 'dashboard-costume': return <DashboardCostume state={state} setCurrentView={setCurrentView} />;
                case 'trash': return <Trash state={state} updateState={updateState} />;
                case 'returns': return <Returns state={state} setCurrentView={setCurrentView} />;
                default: return <Dashboard state={state} setCurrentView={setCurrentView} sidebarOpen={sidebarOpen} />;
              }
            })()}
          </div>
        </div>
      </main>
    </div>
  );
}
