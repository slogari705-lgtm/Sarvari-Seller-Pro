
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
  Bell,
  Search,
  Sparkles,
  Moon,
  Sun,
  PlusCircle,
  PackageCheck,
  Scale,
  Palette
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
  const [quickAddMenuOpen, setQuickAddMenuOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<'product' | 'customer' | null>(null);

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
      {/* Sidebar - Optimized for APK/Native Feel */}
      <aside className={`hidden lg:flex ${sidebarOpen ? 'w-72' : 'w-20'} bg-white dark:bg-slate-900 border-x border-slate-200 dark:border-slate-800 transition-all duration-300 flex-col z-20`}>
        <div className="p-6 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shrink-0 shadow-lg">S</div>
              <span className="font-black text-xl tracking-tighter dark:text-white">Seller Pro</span>
            </div>
          )}
          {!sidebarOpen && <div className="mx-auto w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-sm">S</div>}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id as View)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all ${
                currentView === item.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <item.icon size={22} strokeWidth={currentView === item.id ? 2.5 : 2} />
              {sidebarOpen && <span className="font-bold text-sm tracking-tight">{item.label}</span>}
            </button>
          ))}
          
          {/* Dashboard Costume Section (Custom/Quick Customization) */}
          <div className="pt-8 px-4 pb-2">
            <div className={`h-px bg-slate-100 dark:bg-slate-800 mb-6 ${!sidebarOpen && 'hidden'}`}></div>
            {sidebarOpen && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Costume Options</p>}
            <button 
              onClick={() => handleNavClick('settings')}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all text-slate-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600`}
            >
              <Palette size={22} />
              {sidebarOpen && <span className="font-bold text-sm tracking-tight">Theme Costume</span>}
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center p-3 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      <aside className={`fixed top-0 bottom-0 ${isRTL ? 'right-0' : 'left-0'} w-72 bg-white dark:bg-slate-900 z-50 transform lg:hidden transition-transform duration-300 ease-in-out shadow-2xl ${mobileMenuOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')}`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-sm">S</div>
            <span className="font-black text-lg">Seller Pro</span>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-400"><X size={24} /></button>
        </div>
        <nav className="p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id as View)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${
                currentView === item.id 
                  ? 'bg-indigo-600 text-white font-black shadow-lg shadow-indigo-200 dark:shadow-none' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              <item.icon size={24} />
              <span className="text-base font-bold">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {mobileMenuOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)}></div>}

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-500"><Menu size={24} /></button>
            <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">
              {navItems.find(i => i.id === currentView)?.label}
            </h2>
          </div>

          <div className="flex items-center gap-1 sm:gap-3">
            <button onClick={() => updateState('settings', { ...state.settings, theme: state.settings.theme === 'dark' ? 'light' : 'dark' })} className="p-2.5 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all">
              {state.settings.theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="relative">
              <button onClick={() => setQuickAddMenuOpen(!quickAddMenuOpen)} className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md active:scale-95 transition-all">
                <PlusCircle size={20} />
              </button>
              {quickAddMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setQuickAddMenuOpen(false)} />
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in duration-200">
                    <button onClick={() => { setQuickAddType('product'); setQuickAddMenuOpen(false); }} className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 flex items-center gap-3">
                      <Package size={16} className="text-indigo-500" /> {t.quickAddProduct}
                    </button>
                    <button onClick={() => { setQuickAddType('customer'); setQuickAddMenuOpen(false); }} className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 flex items-center gap-3">
                      <Users size={16} className="text-indigo-500" /> {t.quickAddCustomer}
                    </button>
                  </div>
                </>
              )}
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">
              <Sparkles size={14} />
              <span className="hidden sm:inline">Insights</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto w-full">
            {renderContent()}
          </div>
        </div>
      </main>

      {/* Quick Add Modals */}
      {quickAddType === 'product' && (
        <QuickAddProductModal t={t} currency={state.settings.currency} onClose={() => setQuickAddType(null)} onSave={(n, p, c, s) => {
          const newProd: Product = { id: Math.random().toString(36).substr(2, 9), name: n, price: p, costPrice: c, stock: s, sku: `SKU-${Date.now().toString().slice(-4)}`, category: 'General' };
          updateState('products', [...state.products, newProd]);
          setQuickAddType(null);
        }} />
      )}
      {quickAddType === 'customer' && (
        <QuickAddCustomerModal t={t} onClose={() => setQuickAddType(null)} onSave={(n, p) => {
          const newCust: Customer = { id: Math.random().toString(36).substr(2, 9), name: n, phone: p, email: '', totalSpent: 0, totalDebt: 0, lastVisit: 'Just joined' };
          updateState('customers', [...state.customers, newCust]);
          setQuickAddType(null);
        }} />
      )}
    </div>
  );
};

const QuickAddProductModal = ({ t, currency, onClose, onSave }: any) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [stock, setStock] = useState('');
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-8 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X size={20}/></button>
        <h3 className="text-xl font-black mb-6 dark:text-white uppercase tracking-tight">Quick Product</h3>
        <div className="space-y-4 mb-8">
          <input autoFocus value={name} onChange={e => setName(e.target.value)} type="text" placeholder="Product Name" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-xl py-3 px-4 outline-none focus:border-indigo-500 font-bold dark:text-white" />
          <div className="grid grid-cols-2 gap-3">
            <input value={cost} onChange={e => setCost(e.target.value)} type="number" placeholder={`Buy (${currency})`} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-xl py-3 px-4 outline-none focus:border-indigo-500 font-bold dark:text-white" />
            <input value={price} onChange={e => setPrice(e.target.value)} type="number" placeholder={`Sell (${currency})`} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-xl py-3 px-4 outline-none focus:border-indigo-500 font-bold dark:text-white" />
          </div>
          <input value={stock} onChange={e => setStock(e.target.value)} type="number" placeholder="Initial Stock" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-xl py-3 px-4 outline-none focus:border-indigo-500 font-bold dark:text-white" />
        </div>
        <button onClick={() => onSave(name, Number(price), Number(cost), Number(stock))} className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl shadow-lg hover:bg-indigo-700 transition-all active:scale-95 uppercase text-xs tracking-widest">{t.add}</button>
      </div>
    </div>
  );
};

const QuickAddCustomerModal = ({ t, onClose, onSave }: any) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-8 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X size={20}/></button>
        <h3 className="text-xl font-black mb-6 dark:text-white uppercase tracking-tight">Quick Customer</h3>
        <div className="space-y-4 mb-8">
          <input autoFocus value={name} onChange={e => setName(e.target.value)} type="text" placeholder="Full Name" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-xl py-3 px-4 outline-none focus:border-indigo-500 font-bold dark:text-white" />
          <input value={phone} onChange={e => setPhone(e.target.value)} type="text" placeholder="Phone Number" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-xl py-3 px-4 outline-none focus:border-indigo-500 font-bold dark:text-white" />
        </div>
        <button onClick={() => onSave(name, phone)} className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl shadow-lg hover:bg-indigo-700 transition-all active:scale-95 uppercase text-xs tracking-widest">{t.add}</button>
      </div>
    </div>
  );
};

export default App;
