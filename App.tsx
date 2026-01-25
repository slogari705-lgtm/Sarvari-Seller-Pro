
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ShoppingCart, 
  FileText, 
  Receipt, 
  BarChart3, 
  Settings as SettingsIcon,
  Menu,
  X,
  Moon,
  Sun,
  Sparkles,
  Scale,
  Wand2,
  ChevronRight,
  Wifi,
  WifiOff,
  CloudSync,
  RefreshCw
} from 'lucide-react';
import { AppState, View, InvoiceTemplate } from './types';
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

const INITIAL_STATE: AppState = {
  products: [],
  customers: [],
  invoices: [],
  expenses: [],
  templates: [{ id: 'modern', name: 'Standard Modern', layout: 'modern', brandColor: '#6366f1', showLogo: true }],
  loanTransactions: [],
  expenseCategories: ['Rent', 'Utilities', 'Salaries', 'Supplies', 'Marketing', 'Maintenance', 'Other'],
  lastSync: new Date().toISOString(),
  settings: { shopName: 'Sarvari Seller Pro', shopAddress: '', shopPhone: '', shopEmail: '', shopWebsite: '', currency: '$', taxRate: 0, lowStockThreshold: 5, invoiceTemplate: 'modern', brandColor: '#6366f1', language: 'en', theme: 'light', defaultCustomerId: '' }
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('sarvari_pos_data');
    return saved ? { ...INITIAL_STATE, ...JSON.parse(saved) } : INITIAL_STATE;
  });

  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  const t = translations[state.settings.language || 'en'];
  const isRTL = state.settings.language === 'ps' || state.settings.language === 'dr';

  useEffect(() => {
    localStorage.setItem('sarvari_pos_data', JSON.stringify(state));
    document.documentElement.classList.toggle('dark', state.settings.theme === 'dark');
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [state, isRTL]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerSync = () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    // Simulated sync delay to show consistency handling
    setTimeout(() => {
      setState(prev => ({ ...prev, lastSync: new Date().toISOString() }));
      setIsSyncing(false);
    }, 1500);
  };

  const updateState = <K extends keyof AppState>(key: K, value: AppState[K]) => setState(prev => ({ ...prev, [key]: value }));

  const navItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'terminal', label: t.terminal, icon: ShoppingCart },
    { id: 'products', label: t.products, icon: Package },
    { id: 'customers', label: t.customers, icon: Users },
    { id: 'loans', label: t.loan, icon: Scale },
    { id: 'invoices', label: t.invoices, icon: FileText },
    { id: 'expenses', label: t.expenses, icon: Receipt },
    { id: 'reports', label: t.reports, icon: BarChart3 },
    { id: 'settings', label: t.settings, icon: SettingsIcon },
  ];

  return (
    <div className={`flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden ${isRTL ? 'font-arabic' : ''}`}>
      <aside className={`hidden lg:flex ${sidebarOpen ? 'w-64' : 'w-20'} bg-white dark:bg-slate-900 border-x transition-all duration-300 flex-col z-40 shadow-sm`}>
        <div className="p-4 flex items-center justify-between border-b shrink-0">
          {sidebarOpen && <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap"><div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-base shadow-md">S</div><span className="font-black text-base tracking-tighter dark:text-white">Sarvari Pro</span></div>}
          {!sidebarOpen && <div className="mx-auto w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-sm">S</div>}
        </div>
        <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setCurrentView(item.id as View)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${currentView === item.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <item.icon size={18} /> {sidebarOpen && <span className="font-bold text-[13px]">{item.label}</span>}
            </button>
          ))}
          <div className="h-px bg-slate-100 dark:bg-slate-800 my-4" />
          <button onClick={() => setCurrentView('dashboard-costume')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${currentView === 'dashboard-costume' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
            <Wand2 size={18} /> {sidebarOpen && <span className="font-bold text-[13px]">Costume View</span>}
          </button>
        </nav>
        <div className="p-3 border-t">
          <div className={`mb-3 flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${isOnline ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20'}`}>
            {isOnline ? <Wifi size={12}/> : <WifiOff size={12}/>}
            {sidebarOpen && (isOnline ? 'Online Engine' : 'Offline Mode')}
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full flex items-center justify-center p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">{sidebarOpen ? <X size={16}/> : <Menu size={16}/>}</button>
        </div>
      </aside>

      <aside className={`fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} w-64 bg-white dark:bg-slate-900 z-50 transform lg:hidden transition-transform duration-300 shadow-2xl ${mobileMenuOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')}`}>
        <div className="p-5 border-b flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-sm">S</div><span className="font-black text-base dark:text-white">Sarvari Pro</span></div><button onClick={() => setMobileMenuOpen(false)} className="text-slate-400"><X size={20}/></button></div>
        <nav className="p-3 space-y-1 overflow-y-auto">{navItems.map((item) => (
          <button key={item.id} onClick={() => { setCurrentView(item.id as View); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${currentView === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><item.icon size={20} /><span className="text-sm font-bold">{item.label}</span></button>
        ))}</nav>
      </aside>

      {mobileMenuOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)}></div>}

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-12 bg-white dark:bg-slate-900 border-b px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden text-slate-500"><Menu size={20}/></button>
            <h2 className="text-sm font-black dark:text-white uppercase tracking-tighter truncate">{currentView.replace('-', ' ')}</h2>
            {isSyncing && (
              <div className="flex items-center gap-1.5 ml-2 text-indigo-500 animate-pulse">
                <RefreshCw size={12} className="animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Syncing Core...</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => updateState('settings', { ...state.settings, theme: state.settings.theme === 'dark' ? 'light' : 'dark' })} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg">{state.settings.theme === 'dark' ? <Sun size={16}/> : <Moon size={16}/>}</button>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />
            <Sparkles size={16} className="text-indigo-500 animate-pulse" />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-3 lg:p-6 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {!isOnline && (
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/50 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                   <WifiOff size={16} className="text-amber-600" />
                   <p className="text-[10px] font-black text-amber-800 dark:text-amber-200 uppercase tracking-widest">Running in Local-Only Isolation. Data will be unified upon restoration of link.</p>
                </div>
                <button onClick={() => window.location.reload()} className="px-3 py-1 bg-white dark:bg-slate-800 rounded-lg text-[9px] font-black uppercase shadow-sm">Check Connection</button>
              </div>
            )}
            {(() => {
              switch (currentView) {
                case 'dashboard': return <Dashboard state={state} setCurrentView={setCurrentView} sidebarOpen={sidebarOpen} />;
                case 'dashboard-costume': return <DashboardCostume state={state} setCurrentView={setCurrentView} />;
                case 'products': return <Products state={state} updateState={updateState} />;
                case 'customers': return <Customers state={state} updateState={updateState} setCurrentView={setCurrentView} />;
                case 'terminal': return <Terminal state={state} updateState={updateState} />;
                case 'invoices': return <Invoices state={state} updateState={updateState} />;
                case 'expenses': return <Expenses state={state} updateState={updateState} />;
                case 'reports': return <Reports state={state} />;
                case 'settings': return <Settings state={state} updateState={updateState} />;
                case 'loans': return <Loans state={state} updateState={updateState} setCurrentView={setCurrentView} />;
                default: return <Dashboard state={state} setCurrentView={setCurrentView} sidebarOpen={sidebarOpen} />;
              }
            })()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
