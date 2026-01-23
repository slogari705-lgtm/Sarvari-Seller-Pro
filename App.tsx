
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
  PlusCircle,
  Moon,
  Sun,
  Sparkles,
  Scale,
  Palette,
  Layout as LayoutIcon,
  Wand2
} from 'lucide-react';
import { AppState, View, Product, Customer, InvoiceTemplate } from './types';
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

const DEFAULT_TEMPLATE: InvoiceTemplate = {
  id: 'default-modern',
  name: 'Standard Modern',
  layout: 'modern',
  brandColor: '#6366f1',
  headerText: 'Thank you for your business!',
  footerText: 'Please come again soon.',
  showLogo: true
};

const INITIAL_STATE: AppState = {
  products: [],
  customers: [],
  invoices: [],
  expenses: [],
  templates: [DEFAULT_TEMPLATE],
  loanTransactions: [],
  expenseCategories: ['Rent', 'Utilities', 'Salaries', 'Supplies', 'Marketing', 'Maintenance', 'Other'],
  settings: {
    shopName: 'Sarvari Seller Pro',
    shopAddress: '',
    shopPhone: '',
    shopEmail: '',
    shopWebsite: '',
    currency: '$',
    taxRate: 0,
    lowStockThreshold: 5,
    invoiceTemplate: 'default-modern',
    brandColor: '#6366f1',
    language: 'en',
    theme: 'light',
    defaultCustomerId: '',
  }
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('sarvari_pos_data');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...INITIAL_STATE,
        ...parsed,
        settings: { ...INITIAL_STATE.settings, ...parsed.settings }
      };
    }
    return INITIAL_STATE;
  });

  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const lang = state.settings.language || 'en';
  const t = translations[lang];
  const isRTL = lang === 'ps' || lang === 'dr';

  useEffect(() => {
    localStorage.setItem('sarvari_pos_data', JSON.stringify(state));
    if (state.settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [state, isRTL]);

  const updateState = <K extends keyof AppState>(key: K, value: AppState[K]) => {
    setState(prev => ({ ...prev, [key]: value }));
  };

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

  const handleNavClick = (id: View) => {
    setCurrentView(id);
    setMobileMenuOpen(false);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard state={state} setCurrentView={setCurrentView} />;
      case 'dashboard-costume': return <DashboardCostume state={state} setCurrentView={setCurrentView} />;
      case 'products': return <Products state={state} updateState={updateState} />;
      case 'customers': return <Customers state={state} updateState={updateState} setCurrentView={setCurrentView} />;
      case 'loans': return <Loans state={state} updateState={updateState} setCurrentView={setCurrentView} />;
      case 'terminal': return <Terminal state={state} updateState={updateState} />;
      case 'invoices': return <Invoices state={state} updateState={updateState} />;
      case 'expenses': return <Expenses state={state} updateState={updateState} />;
      case 'reports': return <Reports state={state} />;
      case 'settings': return <Settings state={state} updateState={updateState} />;
      default: return <Dashboard state={state} setCurrentView={setCurrentView} />;
    }
  };

  return (
    <div className={`flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden ${isRTL ? 'font-arabic' : ''}`}>
      {/* Sidebar */}
      <aside className={`hidden lg:flex ${sidebarOpen ? 'w-72' : 'w-20'} bg-white dark:bg-slate-900 border-x border-slate-200 dark:border-slate-800 transition-all duration-300 flex-col z-20 shadow-xl`}>
        <div className="p-6 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
              <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shrink-0">S</div>
              <span className="font-black text-xl tracking-tighter">Seller Pro</span>
            </div>
          )}
          {!sidebarOpen && <div className="mx-auto w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-xs">S</div>}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id as View)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all ${
                currentView === item.id 
                  ? 'bg-indigo-600 text-white shadow-xl' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <item.icon size={22} strokeWidth={currentView === item.id ? 2.5 : 2} />
              {sidebarOpen && <span className="font-bold text-sm">{item.label}</span>}
            </button>
          ))}
          
          <div className="pt-8 px-4 pb-2">
            <div className={`h-px bg-slate-100 dark:bg-slate-800 mb-6 ${!sidebarOpen && 'hidden'}`}></div>
            {sidebarOpen && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Customization</p>}
            <button 
              onClick={() => handleNavClick('dashboard-costume')}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all ${
                currentView === 'dashboard-costume' 
                  ? 'bg-indigo-600 text-white shadow-xl' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'
              }`}
            >
              <Wand2 size={22} />
              {sidebarOpen && <span className="font-bold text-sm">Dashboard Costume</span>}
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center p-3 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </aside>

      {/* Mobile Menu */}
      <aside className={`fixed top-0 bottom-0 ${isRTL ? 'right-0' : 'left-0'} w-72 bg-white dark:bg-slate-900 z-50 transform lg:hidden transition-transform duration-300 shadow-2xl ${mobileMenuOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')}`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-xs">S</div>
            <span className="font-black text-lg">Seller Pro</span>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-400"><X size={24} /></button>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id as View)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${
                currentView === item.id ? 'bg-indigo-600 text-white font-black' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              <item.icon size={24} />
              <span className="text-base font-bold">{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => handleNavClick('dashboard-costume')}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl mt-4 transition-all ${
              currentView === 'dashboard-costume' ? 'bg-indigo-600 text-white' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Wand2 size={24} />
            <span className="text-base font-bold">Dashboard Costume</span>
          </button>
        </nav>
      </aside>

      {mobileMenuOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)}></div>}

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-500"><Menu size={24} /></button>
            <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">
              {currentView === 'dashboard-costume' ? 'Dashboard Costume' : navItems.find(i => i.id === currentView)?.label}
            </h2>
          </div>

          <div className="flex items-center gap-3">
             <button onClick={() => updateState('settings', { ...state.settings, theme: state.settings.theme === 'dark' ? 'light' : 'dark' })} className="p-2.5 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all">
              {state.settings.theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">
              <Sparkles size={14} />
              <span className="hidden sm:inline">AI Analytics</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto w-full">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
