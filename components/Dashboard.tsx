
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
  FileText,
  Package,
  AlertTriangle,
  Scale,
  Layout,
  Clock
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AppState, View } from '../types';
import { getBusinessInsights } from '../services/geminiService';
import { translations } from '../translations';

interface Props {
  state: AppState;
  setCurrentView: (view: View) => void;
}

const Dashboard: React.FC<Props> = ({ state, setCurrentView }) => {
  const [insights, setInsights] = useState<string>('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  
  // Load Costume Settings
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>(() => {
    const saved = localStorage.getItem('dashboard_costume');
    return saved ? JSON.parse(saved) : ['totalSales', 'orders', 'totalDebt', 'netProfit'];
  });

  // Re-sync costume settings whenever component mounts or updates
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('dashboard_costume');
      if (saved) setVisibleWidgets(JSON.parse(saved));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const t = translations[state.settings.language || 'en'];

  const totalSales = state.invoices.reduce((acc, inv) => acc + inv.total, 0);
  const totalInvoiceProfit = state.invoices.reduce((acc, inv) => acc + (inv.profit || 0), 0);
  const totalExpenses = state.expenses.reduce((acc, exp) => acc + exp.amount, 0);
  const totalDebt = state.customers.reduce((acc, cust) => acc + (cust.totalDebt || 0), 0);
  
  const netProfit = totalInvoiceProfit - totalExpenses;
  const recentInvoices = [...state.invoices].reverse().slice(0, 5);

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    return last7Days.map(date => {
      const dayData = state.invoices.filter(inv => inv.date.startsWith(date));
      const daySales = dayData.reduce((sum, inv) => sum + inv.total, 0);
      const dayProfit = dayData.reduce((sum, inv) => sum + (inv.profit || 0), 0);
      const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
      return { name: dayName, sales: daySales, profit: dayProfit };
    });
  }, [state.invoices]);

  const fetchInsights = async () => {
    if (state.invoices.length === 0) {
      setInsights("Process your first transaction to unlock AI intelligence.");
      return;
    }
    setLoadingInsights(true);
    const data = await getBusinessInsights(state);
    setInsights(data);
    setLoadingInsights(false);
  };

  useEffect(() => {
    fetchInsights();
  }, [state.invoices.length]);

  const allStats = [
    { id: 'totalSales', label: t.totalSales, value: `${state.settings.currency}${totalSales.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { id: 'orders', label: t.orders, value: state.invoices.length.toString(), icon: ShoppingBag, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
    { id: 'totalDebt', label: t.totalDebt, value: `${state.settings.currency}${totalDebt.toLocaleString()}`, icon: Scale, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20' },
    { id: 'netProfit', label: t.netProfit, value: `${state.settings.currency}${netProfit.toLocaleString()}`, icon: Activity, color: netProfit >= 0 ? 'text-violet-600' : 'text-rose-600', bg: 'bg-violet-50 dark:bg-violet-500/10' },
  ];

  const lowStockProducts = state.products.filter(p => {
    const threshold = p.lowStockThreshold ?? state.settings.lowStockThreshold;
    return p.stock <= threshold;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div>
            <h3 className="font-black text-3xl uppercase tracking-tighter dark:text-white">Business pulse</h3>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Live snapshots from your offline database</p>
         </div>
         <button 
           onClick={() => setCurrentView('dashboard-costume')}
           className="flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:text-indigo-600 shadow-sm"
         >
           <Layout size={14} strokeWidth={3} />
           Costume Dashboard
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {allStats.filter(s => visibleWidgets.includes(s.id)).map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 flex items-start justify-between transition-all hover:shadow-xl hover:-translate-y-1 group">
            <div>
              <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-3xl font-black mt-2 dark:text-white tracking-tighter">{stat.value}</h3>
            </div>
            <div className={`${stat.bg} ${stat.color} p-4 rounded-2xl group-hover:scale-110 transition-transform`}>
              <stat.icon size={28} strokeWidth={2.5} />
            </div>
          </div>
        ))}
      </div>

      {lowStockProducts.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-900/10 border-2 border-rose-100 dark:border-rose-900/30 p-5 rounded-[32px] flex items-center justify-between animate-in slide-in-from-top-4">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-rose-500 text-white rounded-[20px] flex items-center justify-center shadow-lg shadow-rose-200 dark:shadow-none">
              <AlertTriangle size={28} />
            </div>
            <div>
              <h4 className="font-black text-rose-900 dark:text-rose-200 uppercase tracking-tighter text-lg">{t.inventoryAlerts}</h4>
              <p className="text-xs text-rose-700 dark:text-rose-400 font-bold uppercase tracking-widest opacity-80">{lowStockProducts.length} items require restock</p>
            </div>
          </div>
          <button 
            onClick={() => setCurrentView('products')}
            className="px-8 py-3.5 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-rose-700 transition-all shadow-xl shadow-rose-100 dark:shadow-none active:scale-95"
          >
            {t.viewAll}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-10">
            <div>
               <h3 className="font-black text-xl dark:text-white uppercase tracking-tighter">{t.salesOverview}</h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">7-Day Transaction Performance</p>
            </div>
            <div className="flex gap-2">
                <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-[0.2em]">Revenue</div>
                <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-[0.2em]">Net Profit</div>
            </div>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={state.settings.theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} dy={15} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '24px', 
                    border: 'none', 
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    backgroundColor: state.settings.theme === 'dark' ? '#0f172a' : '#fff',
                    color: state.settings.theme === 'dark' ? '#fff' : '#000',
                    fontWeight: '900',
                    fontSize: '12px'
                  }}
                />
                <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-[48px] shadow-2xl text-white relative overflow-hidden group flex flex-col justify-between">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                   <Sparkles size={24} className="text-white" />
                </div>
                <h3 className="font-black text-xl uppercase tracking-tighter">{t.aiInsights}</h3>
              </div>
              <button 
                onClick={fetchInsights}
                disabled={loadingInsights}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all active:scale-90"
              >
                <RefreshCw size={20} className={`${loadingInsights ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            <div className="text-sm text-indigo-100 leading-relaxed font-medium bg-white/5 p-6 rounded-[32px] border border-white/10 min-h-[200px] max-h-[300px] overflow-y-auto custom-scrollbar">
              {loadingInsights ? (
                <div className="space-y-4">
                  <div className="h-3 w-3/4 bg-white/10 rounded-full animate-pulse"></div>
                  <div className="h-3 w-full bg-white/10 rounded-full animate-pulse delay-75"></div>
                  <div className="h-3 w-5/6 bg-white/10 rounded-full animate-pulse delay-150"></div>
                </div>
              ) : (
                <div className="prose prose-invert prose-sm">
                  {insights || "Process transactions to sync your local data for analysis."}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 relative z-10">
            <button 
              onClick={() => setCurrentView('reports')}
              className="w-full py-5 bg-white text-indigo-900 rounded-[28px] font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:shadow-2xl transition-all hover:-translate-y-1 active:translate-y-0 shadow-xl"
            >
              {t.viewFullReport}
              <ArrowRight size={18} strokeWidth={3} />
            </button>
          </div>
          
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-indigo-400/5 rounded-full blur-2xl"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-indigo-600">
                  <Clock size={20} />
               </div>
               <h3 className="font-black text-lg dark:text-white uppercase tracking-tighter">{t.recentInvoices}</h3>
            </div>
            <button onClick={() => setCurrentView('invoices')} className="text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] hover:underline transition-all">View All Archives</button>
          </div>
          <div className="space-y-4">
            {recentInvoices.length === 0 ? (
              <div className="text-center py-20 text-slate-300">
                <FileText size={48} className="mx-auto opacity-10 mb-4" />
                <p className="font-black text-xs uppercase tracking-widest">Historical record empty</p>
              </div>
            ) : (
              recentInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-5 rounded-[28px] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700 group">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-[18px] flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform shadow-sm">
                      <FileText size={22} />
                    </div>
                    <div>
                      <p className="font-black text-sm dark:text-white">INV-#{inv.id.substring(0, 6)}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(inv.date).toLocaleDateString()}</p>
                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>{t[inv.status || 'paid']}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-lg text-slate-800 dark:text-white">{state.settings.currency}{inv.total.toFixed(2)}</p>
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-1">+{state.settings.currency}{(inv.profit || 0).toFixed(0)} Margin</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-rose-500">
                  <Package size={20} />
               </div>
               <h3 className="font-black text-lg dark:text-white uppercase tracking-tighter">Inventory Health</h3>
            </div>
            <button onClick={() => setCurrentView('products')} className="text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] hover:underline transition-all">Catalog Manager</button>
          </div>
          <div className="space-y-4">
            {lowStockProducts.slice(0, 5).map((p) => {
              const isOut = p.stock === 0;
              return (
                <div key={p.id} className={`flex items-center justify-between p-5 rounded-[28px] border transition-all ${isOut ? 'bg-rose-50/50 border-rose-100 dark:bg-rose-500/5 dark:border-rose-900/30' : 'bg-amber-50/50 border-amber-100 dark:bg-amber-500/5 dark:border-amber-900/30'}`}>
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 bg-white dark:bg-slate-800 rounded-[18px] flex items-center justify-center border shadow-sm ${isOut ? 'text-rose-600 border-rose-100' : 'text-amber-600 border-amber-100'}`}>
                      <Package size={22} strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="font-black text-sm dark:text-white">{p.name}</p>
                      <p className={`text-[9px] font-black uppercase tracking-[0.1em] mt-1 ${isOut ? 'text-rose-600' : 'text-amber-600'}`}>
                        {isOut ? "Critical Outage" : `Only ${p.stock} units remain`}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setCurrentView('products')}
                    className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm transition-all hover:scale-105 active:scale-95 ${isOut ? 'bg-rose-600 text-white border-rose-600' : 'bg-amber-500 text-white border-amber-500'}`}
                  >
                    Restock
                  </button>
                </div>
              );
            })}
            {lowStockProducts.length === 0 && (
              <div className="py-20 text-center text-slate-300">
                <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-100 dark:border-emerald-800">
                  <TrendingUp size={40} />
                </div>
                <p className="font-black text-sm uppercase tracking-widest text-slate-500">Inventory looks healthy!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
