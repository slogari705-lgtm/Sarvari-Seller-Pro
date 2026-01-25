
import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
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
  Clock,
  PlusCircle,
  Users,
  Receipt,
  ChevronRight,
  Target,
  CloudCheck,
  WifiOff
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { AppState, View } from '../types';
import { getBusinessInsights } from '../services/geminiService';
import { translations } from '../translations';

interface Props {
  state: AppState;
  setCurrentView: (view: View) => void;
  sidebarOpen: boolean;
}

const Dashboard: React.FC<Props> = ({ state, setCurrentView, sidebarOpen }) => {
  const [insights, setInsights] = useState<string>('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>(() => {
    const saved = localStorage.getItem('dashboard_costume');
    return saved ? JSON.parse(saved) : ['totalSales', 'orders', 'totalDebt', 'netProfit'];
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      fetchInsights();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleStorageChange = () => {
      const saved = localStorage.getItem('dashboard_costume');
      if (saved) setVisibleWidgets(JSON.parse(saved));
    };
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const t = translations[state.settings.language || 'en'];

  // Calculations
  const totalSales = state.invoices.reduce((acc, inv) => acc + inv.total, 0);
  const totalInvoiceProfit = state.invoices.reduce((acc, inv) => acc + (inv.profit || 0), 0);
  const totalExpenses = state.expenses.reduce((acc, exp) => acc + exp.amount, 0);
  const totalDebt = state.customers.reduce((acc, cust) => acc + (cust.totalDebt || 0), 0);
  const netProfit = totalInvoiceProfit - totalExpenses;
  
  const recentInvoices = [...state.invoices].reverse().slice(0, 5);
  const lowStockItems = state.products.filter(p => p.stock <= (p.lowStockThreshold ?? state.settings.lowStockThreshold));

  // Category Pulse Data
  const categorySales = useMemo(() => {
    const sales: Record<string, number> = {};
    state.invoices.forEach(inv => {
      inv.items.forEach(it => {
        sales[it.category] = (sales[it.category] || 0) + (it.price * it.quantity);
      });
    });
    return Object.entries(sales)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);
  }, [state.invoices]);

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
      return { 
        name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }), 
        sales: daySales, 
        profit: dayProfit 
      };
    });
  }, [state.invoices]);

  const fetchInsights = async () => {
    if (!navigator.onLine) {
      setInsights("You are currently working offline. Connect to the internet to generate new AI insights based on your recent data.");
      return;
    }
    if (state.invoices.length === 0) {
      setInsights("Sarvari Intelligence: Record sales to generate deep performance analysis.");
      return;
    }
    setLoadingInsights(true);
    const data = await getBusinessInsights(state);
    setInsights(data);
    setLoadingInsights(false);
  };

  useEffect(() => { fetchInsights(); }, [state.invoices.length]);

  const stats = [
    { id: 'totalSales', label: t.totalSales, value: totalSales, icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
    { id: 'orders', label: t.orders, value: state.invoices.length, icon: ShoppingBag, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { id: 'totalDebt', label: 'Global Debt', value: totalDebt, icon: Scale, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20' },
    { id: 'netProfit', label: 'Net Profit', value: netProfit, icon: Activity, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-500/10' },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-500 max-w-full">
      {/* Header & Quick Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
           <div>
              <h3 className="font-black text-2xl lg:text-3xl uppercase tracking-tighter dark:text-white flex items-center gap-2">
                Sarvari Control <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
              </h3>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                {isOnline ? 'Cloud Synced System' : 'Local Archive Instance'}
              </p>
           </div>
           {state.lastSync && sidebarOpen && (
             <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <CloudCheck size={12} className="text-emerald-500" />
                <span className="text-[8px] font-black text-slate-500 uppercase">Synced {new Date(state.lastSync).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
             </div>
           )}
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
           {[
             { label: 'New Sale', icon: PlusCircle, view: 'terminal', color: 'bg-indigo-600' },
             { label: 'Add Client', icon: Users, view: 'customers', color: 'bg-white dark:bg-slate-900 border text-slate-600' },
             { label: 'Log Expense', icon: Receipt, view: 'expenses', color: 'bg-white dark:bg-slate-900 border text-slate-600' },
             { label: 'Manager', icon: Layout, view: 'dashboard-costume', color: 'bg-slate-100 text-slate-500' },
           ].map((action, i) => (
             <button 
               key={i}
               onClick={() => setCurrentView(action.view as View)}
               className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-all active:scale-95 shadow-sm ${action.color} ${action.label === 'New Sale' ? 'text-white' : 'dark:text-slate-200'}`}
             >
               <action.icon size={14} /> {action.label}
             </button>
           ))}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.filter(s => visibleWidgets.includes(s.id)).map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm group hover:shadow-md transition-all">
             <div className="flex items-center justify-between mb-2">
                <div className={`${stat.bg} ${stat.color} p-1.5 rounded-lg`}>
                   <stat.icon size={14} strokeWidth={2.5} />
                </div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-500 transition-colors">Details <ChevronRight size={8} className="inline"/></span>
             </div>
             <p className="text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase tracking-widest truncate">{stat.label}</p>
             <h3 className="text-xl lg:text-2xl font-black mt-0.5 dark:text-white tracking-tighter">
                {stat.id !== 'orders' ? state.settings.currency : ''}{stat.value.toLocaleString()}
             </h3>
          </div>
        ))}
      </div>

      {/* Middle Interactive Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Area Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
           <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-black text-xs uppercase tracking-widest dark:text-white">Performance Pulse</h4>
                <p className="text-[8px] font-bold text-slate-400 uppercase">Revenue vs Profit (Last 7 Days)</p>
              </div>
              <div className="flex gap-2">
                 <div className="flex items-center gap-1"><div className="w-2 h-2 bg-indigo-500 rounded-full"></div><span className="text-[8px] font-black uppercase text-slate-400">Rev</span></div>
                 <div className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div><span className="text-[8px] font-black uppercase text-slate-400">Profit</span></div>
              </div>
           </div>
           <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="cSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                    <linearGradient id="cProfit" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 800}} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: '900'}} />
                  <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#cSales)" />
                  <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#cProfit)" />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* AI & Insights Hub */}
        <div className="bg-slate-950 p-5 rounded-[32px] shadow-xl text-white flex flex-col justify-between border border-white/5 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 blur-3xl rounded-full"></div>
           <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-400" />
                    <h4 className="font-black text-[11px] uppercase tracking-tighter">Sarvari AI Analyst</h4>
                 </div>
                 {isOnline ? (
                   <button onClick={fetchInsights} disabled={loadingInsights} className="p-1.5 hover:bg-white/10 rounded-lg transition-all">
                      <RefreshCw size={14} className={`${loadingInsights ? 'animate-spin' : ''}`} />
                   </button>
                 ) : (
                   <div className="p-1.5 text-rose-500" title="Offline - AI unavailable">
                      <WifiOff size={14} />
                   </div>
                 )}
              </div>
              <div className="text-[10px] text-indigo-100/70 leading-relaxed font-medium bg-white/5 p-4 rounded-2xl border border-white/10 max-h-[160px] overflow-y-auto custom-scrollbar italic">
                 {loadingInsights ? "Crunching terminal data..." : insights || "Awaiting your first 24 hours of data for full operational analysis."}
              </div>
           </div>
           <button onClick={() => setCurrentView('reports')} className="relative z-10 mt-4 w-full py-2.5 bg-white text-slate-900 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2">
              Financial Intel <ArrowRight size={12} />
           </button>
        </div>
      </div>

      {/* Bottom Grid: Activity & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-4">
        {/* Category Breakdown (Mini Bar Chart) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
           <div className="flex items-center justify-between mb-4">
              <h4 className="font-black text-[10px] uppercase tracking-widest dark:text-white flex items-center gap-2"><Target size={14} className="text-indigo-600" /> Category Pulse</h4>
           </div>
           <div className="h-[140px]">
              {categorySales.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categorySales} layout="vertical" margin={{ left: -30 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 8, fontWeight: 900}} width={80} />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                    <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-300 text-[8px] font-black uppercase italic">Insufficient volume</div>
              )}
           </div>
        </div>

        {/* Live Feed: Invoices & Alerts */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
           <div className="flex items-center justify-between mb-4">
              <h4 className="font-black text-[10px] uppercase tracking-widest dark:text-white flex items-center gap-2"><Clock size={14} className="text-indigo-600" /> Terminal Feed</h4>
              <button onClick={() => setCurrentView('invoices')} className="text-indigo-600 text-[8px] font-black uppercase">Archives</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                 <p className="text-[7px] font-black text-slate-400 uppercase mb-1 px-1">Recent Invoices</p>
                 {recentInvoices.slice(0,3).map((inv) => (
                   <div key={inv.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:border-slate-200 transition-all">
                      <div className="flex items-center gap-2">
                         <div className="w-7 h-7 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center border text-indigo-600"><FileText size={14} /></div>
                         <div className="min-w-0">
                            <p className="font-black text-[9px] dark:text-white truncate">INV-#{inv.id}</p>
                            <p className="text-[7px] font-bold text-slate-400">{new Date(inv.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                         </div>
                      </div>
                      <p className="font-black text-[11px] text-slate-800 dark:text-white">{state.settings.currency}{inv.total.toFixed(0)}</p>
                   </div>
                 ))}
              </div>
              <div className="space-y-2">
                 <p className="text-[7px] font-black text-slate-400 uppercase mb-1 px-1">Alert Hub</p>
                 {lowStockItems.length > 0 ? lowStockItems.slice(0,3).map((p) => (
                   <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/30 dark:bg-rose-500/5 border border-rose-100/50">
                      <div className="flex items-center gap-2">
                         <div className="w-7 h-7 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center border text-rose-500"><Package size={14} /></div>
                         <p className="font-black text-[9px] dark:text-white truncate max-w-[80px]">{p.name}</p>
                      </div>
                      <span className="text-[7px] font-black px-1.5 py-0.5 bg-rose-600 text-white rounded-md uppercase">{p.stock} Left</span>
                   </div>
                 )) : (
                   <div className="p-4 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                      <p className="text-[8px] font-black text-slate-300 uppercase">Inventory healthy</p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
