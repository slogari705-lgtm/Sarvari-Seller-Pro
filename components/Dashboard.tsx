
import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  ShoppingBag, 
  Activity,
  ArrowRight,
  Sparkles,
  RefreshCw,
  PlusCircle,
  Smartphone,
  Share2,
  X,
  Download,
  SmartphoneNfc,
  Monitor,
  Wand2,
  PieChart,
  Wallet,
  Check,
  Save,
  ChevronRight,
  Scale,
  AlertCircle
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AppState, View } from '../types';
import { getBusinessInsights } from '../geminiService';
import { translations } from '../translations';

interface Props {
  state: AppState;
  setCurrentView: (view: View) => void;
  sidebarOpen: boolean;
  onInstallApp?: () => void;
  showInstallBtn?: boolean;
}

const Dashboard: React.FC<Props> = ({ state, setCurrentView, sidebarOpen, onInstallApp, showInstallBtn }) => {
  const [insights, setInsights] = useState<string>('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>(() => {
    const saved = localStorage.getItem('dashboard_costume');
    return saved ? JSON.parse(saved) : ['totalSales', 'orders', 'totalDebt', 'netProfit'];
  });

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

  const t = translations[state.settings.language || 'en'];
  const activeInvoices = useMemo(() => state.invoices.filter(i => !i.isVoided && !i.isDeleted), [state.invoices]);
  const totalSales = activeInvoices.reduce((acc, inv) => acc + inv.total, 0);
  const totalInvoiceProfit = activeInvoices.reduce((acc, inv) => acc + (inv.profit || 0), 0);
  const totalExpenses = state.expenses.filter(e => !e.isDeleted).reduce((acc, exp) => acc + exp.amount, 0);
  const totalDebt = state.customers.filter(c => !c.isDeleted).reduce((acc, cust) => acc + (cust.totalDebt || 0), 0);
  const netProfit = totalInvoiceProfit - totalExpenses;
  const assetValue = useMemo(() => state.products.filter(p => !p.isDeleted).reduce((acc, p) => acc + (p.costPrice * p.stock), 0), [state.products]);
  const grossMargin = useMemo(() => totalSales > 0 ? (totalInvoiceProfit / totalSales) * 100 : 0, [totalSales, totalInvoiceProfit]);

  const fetchInsights = async () => {
    if (!navigator.onLine) return;
    setLoadingInsights(true);
    const data = await getBusinessInsights(state);
    setInsights(data);
    setLoadingInsights(false);
  };

  useEffect(() => { 
    if (activeInvoices.length > 0) fetchInsights(); 
  }, [activeInvoices.length]);

  const stats = [
    { id: 'totalSales', label: t.totalSales, value: totalSales, icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
    { id: 'orders', label: t.orders, value: activeInvoices.length, icon: ShoppingBag, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { id: 'totalDebt', label: 'Client Debt', value: totalDebt, icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20' },
    { id: 'netProfit', label: 'Net Profit', value: netProfit, icon: Activity, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-500/10' },
    { id: 'assetValue', label: 'Inventory Value', value: assetValue, icon: Wallet, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { id: 'grossMargin', label: 'Gross Margin %', value: grossMargin, icon: PieChart, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-500/10' },
  ];

  const chartData = useMemo(() => {
    const invoices = activeInvoices.slice(-15);
    if (invoices.length === 0) return [{ name: 'Init', sales: 0, profit: 0 }];
    return invoices.map((inv, idx) => ({
      name: idx + 1,
      sales: inv.total,
      profit: inv.profit || 0
    }));
  }, [activeInvoices]);

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Sarvari Seller Pro POS', text: 'My Offline POS Terminal', url: window.location.href }); } 
      catch (err) { console.log('Share aborted'); }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 relative">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 dark:from-indigo-900 dark:to-slate-900 p-10 rounded-[56px] text-white shadow-2xl relative overflow-hidden group">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-[24px] backdrop-blur-xl flex items-center justify-center shadow-inner"><SmartphoneNfc size={32} /></div>
              <h3 className="text-3xl font-black uppercase tracking-tighter">Install Mobile Terminal</h3>
            </div>
            <p className="text-indigo-100 text-[12px] font-bold uppercase tracking-[0.1em] leading-relaxed max-w-lg opacity-90">Transform your browser into a native POS application. Works 100% offline with advanced local security.</p>
          </div>
          <div className="flex items-center gap-3">
            {showInstallBtn ? (
              <button onClick={onInstallApp} className="px-10 py-5 bg-white text-indigo-600 rounded-[32px] font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-105 transition-all active:scale-95 flex items-center gap-3"><Download size={20} strokeWidth={3} /> Install Now</button>
            ) : (
              <div className="px-8 py-4 bg-white/10 rounded-full border border-white/20 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <Check size={18} className="text-emerald-400"/> System Optimized
              </div>
            )}
            <button onClick={handleShare} className="p-5 bg-indigo-400/20 text-white rounded-full backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all active:scale-90"><Share2 size={24} /></button>
          </div>
        </div>
        <Smartphone size={240} className="absolute -bottom-24 -right-12 text-white/5 rotate-12 group-hover:rotate-0 transition-transform duration-700 pointer-events-none" />
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h3 className="font-black text-4xl uppercase tracking-tighter dark:text-white flex items-center gap-4">Terminal Pulse <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-rose-500'}`}></div></h3>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-1">Offline Database Integrated • Zero Latency Mode</p>
        </div>
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1 shrink-0">
           <button onClick={() => setCurrentView('terminal')} className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-indigo-700 active:scale-95 transition-all"><PlusCircle size={18} /> New Transaction</button>
           <button onClick={() => setCurrentView('dashboard-costume')} className="flex items-center gap-3 px-8 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-200 rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all"><Wand2 size={18} /> Customize</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {stats.filter(s => visibleWidgets.includes(s.id)).map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[48px] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl group relative overflow-hidden">
             <div className="flex items-center justify-between mb-6"><div className={`${stat.bg} ${stat.color} p-4 rounded-2xl group-hover:scale-110 transition-transform`}><stat.icon size={28} strokeWidth={2.5} /></div></div>
             <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest truncate">{stat.label}</p>
             <h3 className="text-3xl font-black mt-2 dark:text-white tracking-tighter">{stat.id !== 'orders' && stat.id !== 'grossMargin' ? state.settings.currency : ''}{stat.value.toLocaleString(undefined, { maximumFractionDigits: stat.id === 'grossMargin' ? 1 : 0 })}{stat.id === 'grossMargin' ? '%' : ''}</h3>
             <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-100 transition-opacity pointer-events-none"><stat.icon size={80} /></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-10 rounded-[56px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col min-h-[400px]">
           <div className="flex items-center justify-between mb-10">
              <h4 className="font-black text-sm uppercase tracking-[0.2em] dark:text-white flex items-center gap-3"><TrendingUp size={20} className="text-indigo-600" /> Operational High-Fidelity Audit</h4>
              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-600"/> <span className="text-[9px] font-black text-slate-400 uppercase">Gross Sales</span></div>
                 <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"/> <span className="text-[9px] font-black text-slate-400 uppercase">Net Profit</span></div>
              </div>
           </div>
           
           <div className="flex-1 w-full min-h-[250px]">
              {activeInvoices.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="cSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                      <linearGradient id="cProfit" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={state.settings.theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                    <XAxis dataKey="name" hide />
                    <YAxis hide />
                    <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)', fontSize: '11px', fontWeight: '900', background: state.settings.theme === 'dark' ? '#1e293b' : '#ffffff', color: state.settings.theme === 'dark' ? '#ffffff' : '#1e293b'}} />
                    <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={6} fillOpacity={1} fill="url(#cSales)" />
                    <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#cProfit)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center space-y-4 opacity-30">
                  <Activity size={48} className="text-slate-300" />
                  <p className="font-black text-xs uppercase tracking-[0.3em]">Waiting for terminal data...</p>
                </div>
              )}
           </div>
        </div>

        <div className="bg-slate-950 p-10 rounded-[56px] shadow-2xl text-white flex flex-col justify-between border border-white/5 relative overflow-hidden group">
           <div className="relative z-10">
              <div className="flex items-center justify-between mb-8"><div className="flex items-center gap-3"><div className="p-3 bg-amber-400/20 text-amber-400 rounded-2xl"><Sparkles size={24} /></div><h4 className="font-black text-[13px] uppercase tracking-[0.3em]">AI Intelligence</h4></div>{isOnline && <button onClick={fetchInsights} disabled={loadingInsights} className="p-2.5 hover:bg-white/10 rounded-xl transition-all"><RefreshCw size={18} className={loadingInsights ? 'animate-spin' : ''} /></button>}</div>
              <div className="text-[12px] text-indigo-100/90 leading-relaxed font-bold bg-white/5 p-8 rounded-[36px] border border-white/10 italic">{loadingInsights ? "Crunching ledger data..." : insights || "The AI is waiting for transaction data to provide a strategic analysis."}</div>
           </div>
           <button onClick={() => setCurrentView('reports')} className="relative z-10 mt-10 w-full py-5 bg-white text-slate-900 rounded-[32px] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all">Enterprise Analytics <ArrowRight size={18} strokeWidth={3} /></button>
           <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none"></div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
