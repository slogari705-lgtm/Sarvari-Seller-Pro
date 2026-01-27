import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ShoppingCart, 
  ShoppingBag,
  FileText, 
  Receipt, 
  BarChart3, 
  Settings as SettingsIcon,
  Menu,
  X,
  Moon,
  Sun,
  Scale,
  Wand2,
  RefreshCw,
  Trash2,
  Lock,
  User as UserIcon,
  Bell,
  Monitor,
  Save,
  RotateCcw,
  AlertTriangle,
  History,
  Layout
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

  const lowStockCount = useMemo(() => {
    return state.products.filter(p => !p.isDeleted && p.stock <= (p.lowStockThreshold ?? state.settings.lowStockThreshold)).length;
  }, [state.products, state.settings.lowStockThreshold]);

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

  const navItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'terminal', label: t.terminal, icon: ShoppingBag },
    { id: 'customers', label: t.customers, icon: Users },
    { id: 'products', label: t.products, icon: Package, badge: lowStockCount > 0 ? lowStockCount : null },
  ];

  const operationalItems = [
    { id: 'invoices', label: t.invoices, icon: FileText },
    { id: 'returns', label: t.returns, icon: RotateCcw },
    { id: 'expenses', label: t.expenses, icon: Receipt },
    { id: 'reports', label: t.reports, icon: BarChart3 },
    { id: 'loans', label: t.loan, icon: Scale },
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
        <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 shrink-0">
          {(sidebarOpen || mobileMenuOpen) && (
            <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg">S</div>
              <span className="font-black text-lg tracking-tighter dark:text-white">Sarvari Pro</span>
            </div>
          )}
          {!sidebarOpen && !mobileMenuOpen && (
            <div className="mx-auto w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg">S</div>
          )}
          <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={20}/></button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="px-3 text-[9px] font-black text-slate-300 uppercase tracking-widest mb-2">Main Terminal</p>
          {navItems.map((item) => (
            <button 
              key={item.id} 
              onClick={() => { setCurrentView(item.id as View); setMobileMenuOpen(false); }} 
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all group ${currentView === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={18} className={currentView === item.id ? 'text-white' : 'group-hover:scale-110 transition-transform'} /> 
                {(sidebarOpen || mobileMenuOpen) && <span className="font-bold text-[13px] tracking-tight">{item.label}</span>}
              </div>
              {(sidebarOpen || mobileMenuOpen) && item.badge !== null && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${currentView === item.id ? 'bg-white text-indigo-600' : 'bg-rose-500 text-white animate-pulse'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}

          <div className="h-px bg-slate-100 dark:bg-slate-800 my-4 mx-2" />
          <p className="px-3 text-[9px] font-black text-slate-300 uppercase tracking-widest mb-2">Operations</p>
          {operationalItems.map((item) => (
            <button 
              key={item.id} 
              onClick={() => { setCurrentView(item.id as View); setMobileMenuOpen(false); }} 
              className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl transition-all ${currentView === item.id ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <item.icon size={16} /> 
              {(sidebarOpen || mobileMenuOpen) && <span className="font-medium text-[12px] tracking-tight">{item.label}</span>}
            </button>
          ))}

          <div className="h-px bg-slate-100 dark:bg-slate-800 my-4 mx-2" />
          <p className="px-3 text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">Workspace Design</p>
          <button 
            onClick={() => { setCurrentView('dashboard-costume'); setMobileMenuOpen(false); }} 
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all group ${currentView === 'dashboard-costume' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <Layout size={18} className={currentView === 'dashboard-costume' ? 'text-white' : 'text-amber-500'} /> 
            {(sidebarOpen || mobileMenuOpen) && <span className="font-black text-[11px] uppercase tracking-wider">Custom Layout</span>}
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <button 
            onClick={() => { setCurrentView('settings'); setMobileMenuOpen(false); }} 
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl transition-all ${currentView === 'settings' ? 'text-indigo-600' : 'text-slate-400'}`}
          >
            <SettingsIcon size={16} /> 
            {(sidebarOpen || mobileMenuOpen) && <span className="text-[11px] font-black uppercase tracking-widest">Settings</span>}
          </button>
          {state.settings.security?.isLockEnabled && (
            <button onClick={() => setIsAppLocked(true)} className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all font-black text-[10px] uppercase tracking-widest"><Lock size={14}/> {(sidebarOpen || mobileMenuOpen) && 'Lock Terminal'}</button>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden lg:flex w-full items-center justify-center p-2.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">{sidebarOpen ? <X size={18}/> : <Menu size={18}/>}</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 flex items-center justify-between shrink-0 z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
              <Menu size={22}/>
            </button>
            <div className="flex flex-col">
              <h2 className="text-[10px] md:text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] leading-none mb-1">
                {state.settings.shopName}
              </h2>
              <h3 className="text-xs md:text-sm font-black dark:text-white uppercase tracking-tighter truncate max-w-[150px]">
                {currentView.replace('-', ' ')}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${isOnline ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></div>
              <span className="text-[9px] font-black uppercase tracking-widest">{isOnline ? 'Cloud' : 'Edge'}</span>
            </div>
            <button onClick={() => updateState('settings', { ...state.settings, theme: state.settings.theme === 'dark' ? 'light' : 'dark' })} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
              {state.settings.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {(() => {
              switch (currentView) {
                case 'dashboard': return <Dashboard state={state} setCurrentView={setCurrentView} sidebarOpen={sidebarOpen} />;
                case 'dashboard-costume': return <DashboardCostume state={state} setCurrentView={setCurrentView} />;
                case 'products': return <Products state={state} updateState={updateState} />;
                case 'customers': return <Customers state={state} updateState={updateState} setCurrentView={setCurrentView} />;
                case 'terminal': return <Terminal state={state} updateState={updateState} />;
                case 'invoices': return <Invoices state={state} updateState={updateState} setCurrentView={setCurrentView} />;
                case 'returns': return <Returns state={state} setCurrentView={setCurrentView} />;
                case 'expenses': return <Expenses state={state} updateState={updateState} />;
                case 'reports': return <Reports state={state} />;
                case 'settings': return <Settings state={state} updateState={updateState} />;
                case 'loans': return <Loans state={state} updateState={updateState} setCurrentView={setCurrentView} />;
                case 'trash': return <Trash state={state} updateState={updateState} />;
                default: return <Dashboard state={state} setCurrentView={setCurrentView} sidebarOpen={sidebarOpen} />;
              }
            })()}
          </div>
        </div>
      </main>
    </div>
  );
}