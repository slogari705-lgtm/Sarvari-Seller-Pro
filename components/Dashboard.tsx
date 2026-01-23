
import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  Users as UsersIcon, 
  Activity,
  ArrowRight,
  Sparkles,
  RefreshCw,
  FileText,
  Package,
  AlertTriangle,
  Scale
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
  const t = translations[state.settings.language || 'en'];

  const totalSales = state.invoices.reduce((acc, inv) => acc + inv.total, 0);
  const totalInvoiceProfit = state.invoices.reduce((acc, inv) => acc + (inv.profit || 0), 0);
  const totalExpenses = state.expenses.reduce((acc, exp) => acc + exp.amount, 0);
  const totalDebt = state.customers.reduce((acc, cust) => acc + (cust.totalDebt || 0), 0);
  
  // Net Profit = Gross Profit (from invoices) - Expenses
  // If historical invoices don't have 'profit' field, fallback to estimating (simplified) or 0
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
      setInsights("Start making sales to get AI-powered business insights!");
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

  const stats = [
    { id: 'totalSales', label: t.totalSales, value: `${state.settings.currency}${totalSales.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10', trend: totalSales > 0 ? '+100%' : '0%' },
    { id: 'orders', label: t.orders, value: state.invoices.length.toString(), icon: ShoppingBag, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/10', trend: state.invoices.length > 0 ? '+100%' : '0%' },
    { id: 'totalDebt', label: t.totalDebt, value: `${state.settings.currency}${totalDebt.toLocaleString()}`, icon: Scale, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20', trend: totalDebt > 0 ? 'Active Loans' : '' },
    { id: 'netProfit', label: t.netProfit, value: `${state.settings.currency}${netProfit.toLocaleString()}`, icon: Activity, color: netProfit >= 0 ? 'text-violet-600' : 'text-rose-600', bg: 'bg-violet-50 dark:bg-violet-500/10', trend: `Gross: ${state.settings.currency}${totalInvoiceProfit.toLocaleString()}` },
  ];

  const lowStockProducts = state.products.filter(p => {
    const threshold = p.lowStockThreshold ?? state.settings.lowStockThreshold;
    return p.stock <= threshold;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-start justify-between transition-all hover:shadow-md group">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{stat.label}</p>
              <h3 className="text-2xl font-black mt-1 dark:text-white tracking-tight">{stat.value}</h3>
              <div className="mt-2 flex items-center justify-between">
                {stat.trend && (
                  <div className={`flex items-center gap-1 text-xs font-bold ${stat.id === 'totalDebt' ? 'text-rose-500' : 'text-emerald-600'}`}>
                    <span>{stat.trend}</span>
                  </div>
                )}
                {stat.id === 'totalDebt' && totalDebt > 0 && (
                  <button onClick={() => setCurrentView('loans')} className="text-[10px] font-black text-rose-500 uppercase hover:underline ml-2 opacity-0 group-hover:opacity-100 transition-opacity">View All</button>
                )}
              </div>
            </div>
            <div className={`${stat.bg} ${stat.color} p-3 rounded-xl`}>
              <stat.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      {lowStockProducts.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-200 dark:border-rose-900/30 p-4 rounded-3xl flex items-center justify-between animate-in slide-in-from-top-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-rose-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-rose-200 dark:shadow-none">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h4 className="font-black text-rose-900 dark:text-rose-200 uppercase tracking-tighter">{t.inventoryAlerts}</h4>
              <p className="text-xs text-rose-700 dark:text-rose-400 font-bold">{lowStockProducts.length} items require your attention.</p>
            </div>
          </div>
          <button 
            onClick={() => setCurrentView('products')}
            className="px-6 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-md active:scale-95"
          >
            {t.viewAll}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-lg dark:text-white uppercase tracking-tighter">{t.salesOverview}</h3>
            <div className="flex gap-2">
                <div className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">Sales</div>
                <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest">Profit</div>
            </div>
          </div>
          <div className="h-[300px] w-full">
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
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                    backgroundColor: state.settings.theme === 'dark' ? '#0f172a' : '#fff',
                    color: state.settings.theme === 'dark' ? '#fff' : '#000',
                    fontWeight: 'bold'
                  }}
                />
                <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-[32px] shadow-2xl text-white relative overflow-hidden group">
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Sparkles size={24} className="text-indigo-200" />
                <h3 className="font-black text-xl uppercase tracking-tighter">{t.aiInsights}</h3>
              </div>
              <button 
                onClick={fetchInsights}
                disabled={loadingInsights}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all active:scale-95"
              >
                <RefreshCw size={20} className={`${loadingInsights ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            <div className="flex-1 text-sm text-indigo-100 leading-relaxed overflow-y-auto max-h-[220px] pr-2 custom-scrollbar">
              {loadingInsights ? (
                <div className="flex flex-col gap-4 opacity-50">
                  <div className="h-4 w-3/4 bg-white/20 rounded-lg animate-pulse"></div>
                  <div className="h-4 w-full bg-white/20 rounded-lg animate-pulse"></div>
                  <div className="h-4 w-5/6 bg-white/20 rounded-lg animate-pulse"></div>
                </div>
              ) : (
                <div className="prose prose-invert prose-sm font-medium">
                  {insights || "Process your first transaction to unlock AI intelligence."}
                </div>
              )}
            </div>

            <button 
              onClick={() => setCurrentView('reports')}
              className="mt-8 w-full py-4 bg-white text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:shadow-xl transition-all hover:-translate-y-1 active:translate-y-0"
            >
              {t.viewFullReport}
              <ArrowRight size={18} />
            </button>
          </div>
          
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-indigo-400/10 rounded-full blur-xl"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-lg dark:text-white uppercase tracking-tighter">{t.recentInvoices}</h3>
            <button 
              onClick={() => setCurrentView('invoices')}
              className="text-indigo-600 text-xs font-black uppercase tracking-widest hover:underline"
            >
              {t.viewAll}
            </button>
          </div>
          <div className="space-y-4">
            {recentInvoices.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <FileText size={48} className="mx-auto opacity-10 mb-4" />
                <p className="font-bold text-sm italic">{t.noTransactionsYet}</p>
              </div>
            ) : (
              recentInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <FileText size={24} />
                    </div>
                    <div>
                      <p className="font-black text-sm dark:text-white">#{inv.id.substring(0, 8)}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(inv.date).toLocaleDateString()}</p>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{t[inv.status || 'paid']}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-base text-indigo-600 dark:text-indigo-400">{state.settings.currency}{inv.total.toFixed(2)}</p>
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                       Profit: {state.settings.currency}{(inv.profit || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-lg dark:text-white uppercase tracking-tighter">{t.inventoryAlerts}</h3>
            <button 
              onClick={() => setCurrentView('products')}
              className="text-indigo-600 text-xs font-black uppercase tracking-widest hover:underline"
            >
              {t.viewAll}
            </button>
          </div>
          <div className="space-y-4">
            {lowStockProducts.map((p) => {
              const threshold = p.lowStockThreshold ?? state.settings.lowStockThreshold;
              const isOut = p.stock === 0;
              return (
                <div key={p.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isOut ? 'bg-rose-50/50 border-rose-100 dark:bg-rose-500/5 dark:border-rose-500/20' : 'bg-amber-50/50 border-amber-100 dark:bg-amber-500/5 dark:border-amber-500/20'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center border shadow-sm ${isOut ? 'text-rose-600 border-rose-100 dark:border-rose-500/30' : 'text-amber-600 border-amber-100 dark:border-amber-500/30'}`}>
                      <Package size={24} />
                    </div>
                    <div>
                      <p className="font-black text-sm dark:text-white">{p.name}</p>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${isOut ? 'text-rose-600' : 'text-amber-600'}`}>
                        {isOut ? t.outOfStock : `${t.lowStock}: ${p.stock} ${t.unitsLeft}`}
                        <span className="ml-2 text-slate-400 opacity-60">(Min: {threshold})</span>
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setCurrentView('products')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all hover:shadow-sm ${isOut ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700' : 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600'}`}
                  >
                    {t.restock}
                  </button>
                </div>
              );
            })}
            {lowStockProducts.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity size={32} />
                </div>
                <p className="font-bold text-sm uppercase tracking-widest">{t.inventoryHealthy}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
