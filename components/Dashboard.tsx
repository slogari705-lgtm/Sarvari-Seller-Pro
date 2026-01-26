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
  Scale,
  PlusCircle,
  Users,
  Receipt,
  ChevronRight,
  Target,
  CloudCheck,
  WifiOff,
  Wand2,
  Smartphone,
  Share2,
  Monitor,
  X,
  Download,
  CheckCircle2,
  SmartphoneNfc
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AppState, View } from '../types';
import { getBusinessInsights } from '../geminiService';
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
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>(() => {
    const saved = localStorage.getItem('dashboard_costume');
    return saved ? JSON.parse(saved) : ['totalSales', 'orders', 'totalDebt', 'netProfit'];
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
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

  const activeInvoices = useMemo(() => state.invoices.filter(i => !i.isVoided), [state.invoices]);
  const totalSales = activeInvoices.reduce((acc, inv) => acc + inv.total, 0);
  const totalInvoiceProfit = activeInvoices.reduce((acc, inv) => acc + (inv.profit || 0), 0);
  const totalExpenses = state.expenses.reduce((acc, exp) => acc + exp.amount, 0);
  const totalDebt = state.customers.reduce((acc, cust) => acc + (cust.totalDebt || 0), 0);
  const netProfit = totalInvoiceProfit - totalExpenses;

  const fetchInsights = async () => {
    if (!navigator.onLine) return;
    setLoadingInsights(true);
    const data = await getBusinessInsights(state);
    setInsights(data);
    setLoadingInsights(false);
  };

  useEffect(() => { fetchInsights(); }, [activeInvoices.length]);

  const stats = [
    { id: 'totalSales', label: t.totalSales, value: totalSales, icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
    { id: 'orders', label: t.orders, value: activeInvoices.length, icon: ShoppingBag, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { id: 'totalDebt', label: 'Client Debt', value: totalDebt, icon: Scale, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20' },
    { id: 'netProfit', label: 'Net Profit', value: netProfit, icon: Activity, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-500/10' },
  ];

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Sarvari Seller Pro POS',
          text: 'Open my Offline Terminal',
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share aborted');
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* PWA Activation Banner: Essential for Mobile-to-App conversion without PC */}
      <div className="bg-indigo-600 dark:bg-indigo-500 p-8 rounded-[48px] text-white shadow-2xl relative overflow-hidden group">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl backdrop-blur-xl flex items-center justify-center shadow-inner"><SmartphoneNfc size={24} /></div>
              <h3 className="text-3xl font-black uppercase tracking-tighter">Mobile App Converter</h3>
            </div>
            <p className="text-indigo-100 text-[11px] font-bold uppercase tracking-[0.1em] leading-relaxed max-w-lg opacity-90">
              Transform this web terminal into a standalone app on your phone. No Computer required. Works 100% offline.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowInstallGuide(true)}
              className="px-8 py-5 bg-white text-indigo-600 rounded-[28px] font-black text-[10px] uppercase tracking-widest shadow-2xl hover:scale-105 transition-all active:scale-95 flex items-center gap-3"
            >
              <Download size={18} strokeWidth={3} /> Install Mobile App
            </button>
            <button 
              onClick={handleShare}
              className="p-5 bg-indigo-400/20 text-white rounded-[28px] backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all active:scale-90"
            >
              <Share2 size={24} />
            </button>
          </div>
        </div>
        <Smartphone size={220} className="absolute -bottom-20 -right-10 text-white/5 rotate-12 group-hover:rotate-0 transition-transform duration-700 pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none"></div>
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h3 className="font-black text-4xl uppercase tracking-tighter dark:text-white flex items-center gap-4">
            Sarvari Dashboard <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]'}`}></div>
          </h3>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-1">
            {isOnline ? 'Terminal Synchronized' : 'Edge Computing - Local Mode'}
          </p>
        </div>
        
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1 shrink-0">
           <button onClick={() => setCurrentView('terminal')} className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 active:scale-95 transition-all">
             <PlusCircle size={18} /> New Transaction
           </button>
           <button onClick={() => setCurrentView('dashboard-costume')} className="flex items-center gap-3 px-8 py-4 bg-white dark:bg-slate-900 border text-slate-600 dark:text-slate-200 rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all">
             <Wand2 size={18} /> Edit Layout
           </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.filter(s => visibleWidgets.includes(s.id)).map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[48px] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl group">
             <div className="flex items-center justify-between mb-6">
                <div className={`${stat.bg} ${stat.color} p-4 rounded-2xl shadow-inner group-hover:scale-110 transition-transform`}><stat.icon size={28} strokeWidth={2.5} /></div>
                <div className="h-1 w-12 bg-slate-50 dark:bg-slate-800 rounded-full"></div>
             </div>
             <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest truncate">{stat.label}</p>
             <h3 className="text-3xl font-black mt-2 dark:text-white tracking-tighter">
                {stat.id !== 'orders' ? state.settings.currency : ''}{stat.value.toLocaleString()}
             </h3>
          </div>
        ))}
      </div>

      {/* PWA Step-by-Step Installation Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-2xl animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[64px] w-full max-w-2xl shadow-2xl overflow-hidden border border-white/10 flex flex-col animate-in zoom-in-95">
              <header className="p-10 border-b flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-indigo-600 text-white rounded-3xl flex items-center justify-center shadow-2xl"><Smartphone size={32}/></div>
                    <div>
                       <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Install Native App</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobile Conversion Protocol</p>
                    </div>
                 </div>
                 <button onClick={() => setShowInstallGuide(false)} className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-rose-500 transition-all"><X size={28}/></button>
              </header>

              <div className="p-10 space-y-10 overflow-y-auto max-h-[65vh] custom-scrollbar">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Android Path */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[48px] border border-slate-100 dark:border-slate-700 flex flex-col items-center text-center space-y-6">
                       <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm">A</div>
                       <h4 className="font-black dark:text-white uppercase text-xs tracking-[0.2em]">Android / Chrome</h4>
                       <div className="space-y-4 w-full">
                          <div className="flex items-center gap-4 text-left">
                             <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                             <p className="text-[11px] font-bold text-slate-500">Tap the <b className="text-indigo-600">3 Dots (⋮)</b> in Chrome corner.</p>
                          </div>
                          <div className="flex items-center gap-4 text-left">
                             <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                             <p className="text-[11px] font-bold text-slate-500">Select <b className="text-indigo-600">"Install App"</b> from the list.</p>
                          </div>
                       </div>
                    </div>

                    {/* iOS Path */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[48px] border border-slate-100 dark:border-slate-700 flex flex-col items-center text-center space-y-6">
                       <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/40 text-rose-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm">S</div>
                       <h4 className="font-black dark:text-white uppercase text-xs tracking-[0.2em]">iPhone / Safari</h4>
                       <div className="space-y-4 w-full">
                          <div className="flex items-center gap-4 text-left">
                             <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                             <p className="text-[11px] font-bold text-slate-500">Tap the <b className="text-rose-600">Share Icon</b> (box with arrow).</p>
                          </div>
                          <div className="flex items-center gap-4 text-left">
                             <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                             <p className="text-[11px] font-bold text-slate-500">Tap <b className="text-rose-600">"Add to Home Screen"</b> below.</p>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="bg-indigo-600 p-8 rounded-[40px] text-white flex items-center gap-8 relative overflow-hidden">
                    <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md relative z-10"><CheckCircle2 size={32}/></div>
                    <div className="relative z-10">
                       <p className="font-black uppercase text-sm tracking-tight">Installation Completed?</p>
                       <p className="text-[10px] font-bold uppercase opacity-80 mt-1">Close your browser and launch the "Sarvari Pro" icon from your apps menu for the best experience.</p>
                    </div>
                    <Sparkles className="absolute -bottom-4 -right-4 text-white/10" size={100} />
                 </div>
              </div>
              
              <footer className="p-10 border-t bg-slate-50 dark:bg-slate-950/20 shrink-0">
                 <button onClick={() => setShowInstallGuide(false)} className="w-full py-6 bg-indigo-600 text-white rounded-[32px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-indigo-700 transition-all">Exit Guide</button>
              </footer>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-10 rounded-[56px] border border-slate-100 dark:border-slate-800 shadow-sm">
           <div className="flex items-center justify-between mb-10">
              <h4 className="font-black text-sm uppercase tracking-[0.2em] dark:text-white flex items-center gap-3"><TrendingUp size={20} className="text-indigo-600" /> Revenue Stream Pulse</h4>
           </div>
           <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[]}>
                  <defs><linearGradient id="cSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)', fontSize: '11px', fontWeight: '900'}} />
                  <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={6} fillOpacity={1} fill="url(#cSales)" />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-slate-950 p-10 rounded-[56px] shadow-2xl text-white flex flex-col justify-between border border-white/5 relative overflow-hidden group">
           <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-400/20 text-amber-400 rounded-2xl"><Sparkles size={24} /></div>
                    <h4 className="font-black text-[13px] uppercase tracking-[0.3em]">AI Intelligence</h4>
                 </div>
                 {isOnline && <button onClick={fetchInsights} disabled={loadingInsights} className="p-2.5 hover:bg-white/10 rounded-xl transition-all"><RefreshCw size={18} className={loadingInsights ? 'animate-spin' : ''} /></button>}
              </div>
              <div className="text-[12px] text-indigo-100/90 leading-relaxed font-bold bg-white/5 p-8 rounded-[36px] border border-white/10 shadow-inner italic">
                 {loadingInsights ? "Parsing transaction history..." : insights || "Execute sales to generate your first intelligence report."}
              </div>
           </div>
           <button onClick={() => setCurrentView('reports')} className="relative z-10 mt-10 w-full py-5 bg-white text-slate-900 rounded-[32px] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all group-hover:bg-indigo-50">
              Full Financial Audit <ArrowRight size={18} strokeWidth={3} />
           </button>
           <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none"></div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;