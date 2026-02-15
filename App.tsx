import React, { useState, useEffect, useRef } from 'react';
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
  RotateCcw,
  Layout,
  Wand2,
  FileText,
  Receipt,
  BarChart3,
  History,
  Trash2,
  Boxes,
  LogOut,
  User as UserIcon,
  CloudUpload,
  CloudOff,
  RefreshCw,
  Cpu,
  ChevronDown,
  ChevronUp,
  Circle,
  Zap
} from 'lucide-react';
import { AppState, View } from './types';
import { translations } from './translations';
import { loadState, saveState, createSnapshot, getSyncQueue } from './db';
import { processSyncQueue } from './syncService';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Customers from './components/Customers';
import Terminal from './components/Terminal';
import Invoices from './components/Invoices';
import Expenses from './components/Expenses';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Loans from './components/Loans';
import Trash from './components/Trash';
import LockScreen from './components/LockScreen';
import Returns from './components/Returns';
import DashboardCostume from './components/DashboardCostume';

const INITIAL_STATE: AppState = {
  users: [],
  products: [],
  customers: [],
  invoices: [],
  expenses: [],
  syncQueue: [],
  templates: [{ id: 'modern', name: 'Standard Modern', layout: 'modern', brandColor: '#6366f1', showLogo: true }],
  loanTransactions: [],
  expenseCategories: ['Rent', 'Utilities', 'Supplies', 'Marketing', 'Maintenance', 'Other'],
  settings: { 
    shopName: 'Sarvari Seller Pro', 
    shopAddress: '', 
    shopPhone: '', 
    shopEmail: '', 
    shopWebsite: '', 
    currency: '$', 
    secondaryCurrency: 'AFN',
    exchangeRate: 85,
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
    cloudBackup: {
      provider: 'none',
      isEnabled: false,
      autoSyncInterval: 60
    },
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
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [isDashboardSubOpen, setIsDashboardSubOpen] = useState(true);

  useEffect(() => {
    const init = async () => {
      const saved = await loadState();
      if (saved) {
        setState({ ...INITIAL_STATE, ...saved });
      }
      const queue = await getSyncQueue();
      setPendingSyncCount(queue.length);
      setIsLoading(false);
      if (navigator.onLine) handleSync();
    };
    init();
  }, []);

  const handleSync = async () => {
    if (isSyncing || !navigator.onLine) return;
    setIsSyncing(true);
    await processSyncQueue();
    setIsSyncing(false);
  };

  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    if (isLoading) return;
    saveState(stateRef.current);
  }, [state, isLoading]);

  const t = translations[state.settings.language || 'en'];
  const isRTL = state.settings.language === 'ps' || state.settings.language === 'dr';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.settings.theme === 'dark');
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [state.settings.theme, isRTL]);

  const updateState = <K extends keyof AppState>(key: K, value: AppState[K]) => setState(prev => ({ ...prev, [key]: value }));

  if (isLoading) return null;

  return (
    <div className={`flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden ${isRTL ? 'font-arabic' : ''}`}>
      {mobileMenuOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[50] lg:hidden" onClick={() => setMobileMenuOpen(false)}/>}

      <aside className={`fixed lg:static inset-y-0 left-0 z-[60] ${sidebarOpen ? 'w-72' : 'w-24'} ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} bg-white dark:bg-slate-900 border-r dark:border-slate-800 transition-all duration-300 flex flex-col`}>
        <div className="p-8 flex items-center justify-between border-b dark:border-slate-800">
          {(sidebarOpen || mobileMenuOpen) && (
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl">S</div>
              <span className="font-black text-xl tracking-tighter dark:text-white">Sarvari</span>
            </div>
          )}
          <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden p-2"><X /></button>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-6 overflow-y-auto">
          {/* Dashboard Contextual Branching */}
          <div className="space-y-2">
            <button 
              onClick={() => { setCurrentView('dashboard'); setIsDashboardSubOpen(!isDashboardSubOpen); }}
              className={`w-full flex items-center justify-between px-4 py-4 rounded-[20px] transition-all ${currentView === 'dashboard' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <div className="flex items-center gap-4">
                <LayoutDashboard size={24} />
                {(sidebarOpen || mobileMenuOpen) && <span className="font-black text-xs uppercase tracking-widest">{t.dashboard}</span>}
              </div>
              {(sidebarOpen || mobileMenuOpen) && (isDashboardSubOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
            </button>
            
            {isDashboardSubOpen && (sidebarOpen || mobileMenuOpen) && (
              <div className="ml-8 pl-4 border-l-2 border-slate-100 dark:border-slate-800 space-y-2 py-1">
                <button 
                  onClick={() => setCurrentView('dashboard-costume')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'dashboard-costume' ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 font-black border border-indigo-100 dark:border-indigo-800 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                >
                  <Wand2 size={16} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Designer</span>
                  {currentView === 'dashboard-costume' && <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full ml-auto animate-pulse" />}
                </button>
              </div>
            )}
          </div>

          {[
            { id: 'terminal', label: t.terminal, icon: ShoppingCart },
            { id: 'products', label: t.products, icon: Boxes },
            { id: 'customers', label: t.customers, icon: Users },
            { id: 'invoices', label: t.invoices, icon: FileText },
            { id: 'expenses', label: t.expenses, icon: Receipt },
            { id: 'reports', label: t.reports, icon: BarChart3 },
            { id: 'settings', label: t.settings, icon: SettingsIcon }
          ].map((item) => (
            <button 
              key={item.id} 
              onClick={() => { setCurrentView(item.id as View); setMobileMenuOpen(false); }} 
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-[20px] transition-all ${currentView === item.id ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <item.icon size={24} />
              {(sidebarOpen || mobileMenuOpen) && <span className="font-black text-xs uppercase tracking-widest">{item.label}</span>}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-slate-50/50 dark:bg-slate-950/50">
        <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b dark:border-slate-800 px-8 flex items-center justify-between shrink-0 z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-3 bg-slate-100 dark:bg-slate-800 rounded-xl"><Menu /></button>
            <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">{currentView.replace('-', ' ')}</h3>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => updateState('settings', { ...state.settings, theme: state.settings.theme === 'dark' ? 'light' : 'dark' })} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
               {state.settings.theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black">U</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {(() => {
              switch (currentView) {
                case 'dashboard': return <Dashboard state={state} setCurrentView={setCurrentView} sidebarOpen={sidebarOpen} />;
                case 'dashboard-costume': return <DashboardCostume state={state} setCurrentView={setCurrentView} />;
                case 'terminal': return <Terminal state={state} updateState={updateState} />;
                case 'products': return <Products state={state} updateState={updateState} />;
                case 'customers': return <Customers state={state} updateState={updateState} />;
                case 'invoices': return <Invoices state={state} updateState={updateState} setCurrentView={setCurrentView} />;
                case 'expenses': return <Expenses state={state} updateState={updateState} />;
                case 'reports': return <Reports state={state} />;
                case 'settings': return <Settings state={state} updateState={updateState} />;
                case 'loans': return <Loans state={state} updateState={updateState} setCurrentView={setCurrentView} />;
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