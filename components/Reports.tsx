
import React, { useMemo, useState } from 'react';
import { 
  ComposedChart,
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie, 
  Cell,
  Legend,
  Area,
  Line
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Package,
  Receipt,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  Layers,
  Award,
  Wallet,
  Scale,
  Activity,
  ShieldCheck,
  AlertCircle,
  FileDown,
  Printer,
  Ban,
  Clock,
  Filter,
  RotateCcw,
  Zap,
  CreditCard,
  UserCheck,
  CheckCircle2,
  // Fix: Added missing RefreshCw icon import
  RefreshCw
} from 'lucide-react';
import { AppState } from '../types';
import { translations } from '../translations';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface Props {
  state: AppState;
}

const Reports: React.FC<Props> = ({ state }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [reportStartDate, setReportStartDate] = useState<string>('');
  const [reportStartTime, setReportStartTime] = useState<string>('00:00');
  const [reportEndDate, setReportEndDate] = useState<string>('');
  const [reportEndTime, setReportEndTime] = useState<string>('23:59');
  
  const t = translations[state.settings.language || 'en'];

  const { start, end } = useMemo(() => {
    const s = reportStartDate ? new Date(`${reportStartDate}T${reportStartTime}`).getTime() : 0;
    const e = reportEndDate ? new Date(`${reportEndDate}T${reportEndTime}`).getTime() : Infinity;
    return { start: s, end: e };
  }, [reportStartDate, reportStartTime, reportEndDate, reportEndTime]);

  const isLifetime = !reportStartDate && !reportEndDate;

  const activeInvoices = useMemo(() => {
    return state.invoices.filter(i => {
      const time = new Date(i.date).getTime();
      return !i.isVoided && !i.isDeleted && time >= start && time <= end;
    });
  }, [state.invoices, start, end]);

  const filteredExpenses = useMemo(() => {
    return state.expenses.filter(e => {
      const time = new Date(e.date).getTime();
      return !e.isDeleted && time >= start && time <= end;
    });
  }, [state.expenses, start, end]);

  // Financial Computations
  const totalSales = activeInvoices.reduce((acc, inv) => acc + inv.total, 0);
  const totalInvoiceProfit = activeInvoices.reduce((acc, inv) => acc + (inv.profit || 0), 0);
  const totalExpenses = filteredExpenses.reduce((acc, exp) => acc + exp.amount, 0);
  const netProfit = totalInvoiceProfit - totalExpenses;
  const totalInventoryValue = state.products.filter(p => !p.isDeleted).reduce((acc, p) => acc + ((p.costPrice || 0) * p.stock), 0);
  const totalReceivables = state.customers.filter(c => !c.isDeleted).reduce((acc, c) => acc + (c.totalDebt || 0), 0);

  const healthScore = useMemo(() => {
    if (totalSales === 0) return 0;
    const marginRatio = (netProfit / totalSales) * 100;
    const debtRatio = (totalReceivables / (totalSales || 1)) * 100;
    let score = 50 + (marginRatio * 2) - (debtRatio * 0.5);
    return Math.min(100, Math.max(0, Math.round(score)));
  }, [totalSales, netProfit, totalReceivables]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#475569'];

  const chartData = useMemo(() => {
    const dayMap: Record<string, {name: string, sales: number, expenses: number}> = {};
    activeInvoices.forEach(inv => {
      const d = new Date(inv.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
      if (!dayMap[d]) dayMap[d] = { name: d, sales: 0, expenses: 0 };
      dayMap[d].sales += inv.total;
    });
    filteredExpenses.forEach(exp => {
      const d = new Date(exp.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
      if (!dayMap[d]) dayMap[d] = { name: d, sales: 0, expenses: 0 };
      dayMap[d].expenses += exp.amount;
    });
    return Object.values(dayMap).sort((a,b) => new Date(a.name).getTime() - new Date(b.name).getTime()).slice(-15);
  }, [activeInvoices, filteredExpenses]);

  const paymentData = useMemo(() => {
    const methods: Record<string, number> = { cash: 0, card: 0, transfer: 0 };
    activeInvoices.forEach(inv => {
      methods[inv.paymentMethod] = (methods[inv.paymentMethod] || 0) + inv.total;
    });
    return Object.entries(methods).map(([name, value]) => ({ name: name.toUpperCase(), value }));
  }, [activeInvoices]);

  const topProducts = useMemo(() => {
    const prods: Record<string, { name: string, revenue: number, qty: number }> = {};
    activeInvoices.forEach(inv => {
      inv.items.forEach(it => {
        if (!prods[it.id]) prods[it.id] = { name: it.name, revenue: 0, qty: 0 };
        prods[it.id].revenue += it.buyPrice * it.quantity;
        prods[it.id].qty += it.quantity;
      });
    });
    return Object.values(prods).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [activeInvoices]);

  const topCustomers = useMemo(() => {
    const custs: Record<string, { name: string, total: number, visits: number }> = {};
    activeInvoices.forEach(inv => {
      if (!inv.customerId) return;
      const c = state.customers.find(customer => customer.id === inv.customerId);
      if (!c) return;
      if (!custs[c.id]) custs[c.id] = { name: c.name, total: 0, visits: 0 };
      custs[c.id].total += inv.total;
      custs[c.id].visits += 1;
    });
    return Object.values(custs).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [activeInvoices, state.customers]);

  const handleDownloadReportPDF = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    const element = document.getElementById('report-container');
    if (!element) return setIsDownloading(false);
    
    const filters = document.getElementById('report-filters-header');
    if (filters) filters.style.display = 'none';

    try {
      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
      pdf.save(`SARVARI_AUDIT_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) { 
      console.error("PDF Generation Failed:", error); 
    } finally { 
      if (filters) filters.style.display = 'flex';
      setIsDownloading(false); 
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500 max-w-full p-1 no-scrollbar">
      {/* Dynamic Filter Header */}
      <div id="report-filters-header" className="bg-white dark:bg-slate-900 p-8 rounded-[48px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col xl:flex-row items-center gap-8">
        <div className="flex-1 w-full space-y-6">
          <div className="flex items-center justify-between">
             <h4 className="font-black text-[11px] uppercase tracking-[0.3em] text-indigo-600 flex items-center gap-3"><Filter size={16}/> Temporal Audit Controls</h4>
             {!isLifetime && (
               <button onClick={() => { setReportStartDate(''); setReportEndDate(''); }} className="flex items-center gap-2 text-[10px] font-black text-rose-500 uppercase hover:underline"><RotateCcw size={14}/> Clear Range</button>
             )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
             <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Start Cycle</label>
                <div className="relative"><Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={16}/><input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-3.5 pl-14 pr-6 font-bold text-xs dark:text-white outline-none" /></div>
             </div>
             <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Pulse Time</label>
                <div className="relative"><Clock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={16}/><input type="time" value={reportStartTime} onChange={e => setReportStartTime(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-3.5 pl-14 pr-6 font-bold text-xs dark:text-white outline-none" /></div>
             </div>
             <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">End Cycle</label>
                <div className="relative"><Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={16}/><input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-3.5 pl-14 pr-6 font-bold text-xs dark:text-white outline-none" /></div>
             </div>
             <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Termination</label>
                <div className="relative"><Clock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={16}/><input type="time" value={reportEndTime} onChange={e => setReportEndTime(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-3.5 pl-14 pr-6 font-bold text-xs dark:text-white outline-none" /></div>
             </div>
          </div>
        </div>
        <div className="w-full xl:w-72 flex flex-col items-center justify-center p-8 bg-indigo-600 rounded-[40px] text-white shadow-2xl relative overflow-hidden group">
           <Zap className="absolute -top-4 -right-4 text-white/10" size={120} />
           <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-3 relative z-10 opacity-80 text-indigo-100">Live Context</p>
           <h3 className="text-2xl font-black uppercase tracking-tighter text-center relative z-10">{isLifetime ? 'Lifetime Audit' : 'Custom Pulse'}</h3>
        </div>
      </div>

      <div id="report-container" className="space-y-8 p-1">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-10 rounded-[56px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-8 relative z-10">
             <div className="w-20 h-20 bg-indigo-600 rounded-[32px] flex items-center justify-center text-white shadow-2xl shadow-indigo-200 dark:shadow-none shrink-0"><Activity size={40} strokeWidth={3} /></div>
             <div>
               <h3 className="text-4xl font-black uppercase tracking-tighter dark:text-white">Audit Hub</h3>
               <div className="flex items-center gap-3 mt-2">
                 <div className="px-4 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-full border border-emerald-100 dark:border-emerald-800 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div> Local Node Verified</div>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isLifetime ? 'Global Cumulative Data' : `Window: ${reportStartDate} → ${reportEndDate || 'Now'}`}</span>
               </div>
             </div>
          </div>
          <div className="flex items-center gap-4 relative z-10">
             <div className="text-right hidden xl:block mr-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Health Matrix</p>
                <div className="flex items-center gap-3 justify-end"><span className={`text-3xl font-black ${healthScore > 70 ? 'text-emerald-500' : healthScore > 40 ? 'text-amber-500' : 'text-rose-500'}`}>{healthScore}%</span><ShieldCheck size={28} className={healthScore > 70 ? 'text-emerald-500' : healthScore > 40 ? 'text-amber-500' : 'text-rose-500'} /></div>
             </div>
             <button onClick={handleDownloadReportPDF} disabled={isDownloading} className="px-10 py-5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-[32px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50">
               {isDownloading ? <RefreshCw size={20} className="animate-spin" /> : <FileDown size={20} strokeWidth={3} />} Physical Dispatch
             </button>
          </div>
          <div className="absolute top-0 right-0 p-4 opacity-[0.02] pointer-events-none dark:opacity-[0.05]"><BarChart3 size={400} /></div>
        </div>

        {/* Global KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { label: 'Gross Yield', value: totalSales, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/10', icon: DollarSign },
            { label: 'Net Surplus', value: netProfit, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', icon: TrendingUp },
            { label: 'Expenditures', value: totalExpenses, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10', icon: Receipt },
            { label: 'Assets', value: totalInventoryValue, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: Package },
            { label: 'Receivables', value: totalReceivables, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-500/10', icon: Scale },
            { label: 'Margin Efficiency', value: (netProfit / (totalSales || 1)) * 100, isPercent: true, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-500/10', icon: Activity },
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm group hover:shadow-xl transition-all flex flex-col justify-between">
              <div className={`${stat.bg} ${stat.color} p-3 rounded-2xl group-hover:scale-110 transition-transform mb-6 w-fit`}><stat.icon size={20} strokeWidth={2.5}/></div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">{stat.label}</p>
                <h4 className="text-2xl font-black dark:text-white truncate tracking-tighter">{stat.isPercent ? '' : state.settings.currency}{stat.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}{stat.isPercent ? '%' : ''}</h4>
              </div>
            </div>
          ))}
        </div>

        {/* High-Fidelity Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-10 rounded-[56px] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-12">
               <div>
                  <h4 className="font-black text-2xl dark:text-white uppercase tracking-tighter flex items-center gap-4"><TrendingUp size={28} className="text-indigo-600" /> Operational Velocity</h4>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Comparing terminal yield against daily outflows</p>
               </div>
               <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.5)]"/> <span className="text-[10px] font-black text-slate-500 uppercase">Revenue</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"/> <span className="text-[10px] font-black text-slate-500 uppercase">Expense</span></div>
               </div>
            </div>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <defs>
                    <linearGradient id="yieldGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={state.settings.theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 900}} />
                  <YAxis hide />
                  <Tooltip cursor={{fill: 'rgba(99,102,241,0.05)'}} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)', fontSize: '12px', fontWeight: '900'}} />
                  <Area type="monotone" dataKey="sales" name="Yield" stroke="#6366f1" strokeWidth={6} fill="url(#yieldGrad)" />
                  <Bar dataKey="expenses" name="Expenditure" fill="#f43f5e" radius={[10, 10, 0, 0]} barSize={12} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-10 rounded-[56px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
            <h4 className="font-black text-2xl dark:text-white uppercase tracking-tighter flex items-center gap-4 mb-10"><CreditCard size={28} className="text-amber-500" /> Settlement Flow</h4>
            <div className="flex-1 w-full h-[250px]">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={paymentData} innerRadius={80} outerRadius={110} paddingAngle={10} dataKey="value">
                      {paymentData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', fontWeight: '900' }} />
                  </PieChart>
               </ResponsiveContainer>
            </div>
            <div className="mt-8 space-y-4">
               {paymentData.map((p, i) => (
                 <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-transparent hover:border-slate-200 transition-all">
                    <div className="flex items-center gap-4">
                       <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}} />
                       <span className="text-[11px] font-black dark:text-white tracking-widest">{p.name}</span>
                    </div>
                    <span className="font-black text-sm dark:text-indigo-400">{state.settings.currency}{p.value.toLocaleString()}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* Detailed Leaderboards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="bg-white dark:bg-slate-900 p-10 rounded-[56px] border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                 <h4 className="font-black text-xl dark:text-white uppercase tracking-tighter flex items-center gap-3"><Award size={24} className="text-amber-400" /> Top Assets</h4>
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Yield Optimization</p>
              </div>
              <div className="space-y-4">
                 {topProducts.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/40 rounded-3xl group hover:bg-white dark:hover:bg-slate-800 transition-all border border-transparent hover:border-indigo-100 shadow-sm">
                       <div className="flex items-center gap-6">
                          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-700 flex items-center justify-center font-black text-lg text-indigo-600 shadow-sm">{i+1}</div>
                          <div>
                             <p className="font-black text-sm dark:text-white uppercase truncate max-w-[140px] tracking-tight">{p.name}</p>
                             <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{p.qty} Units Liquidated</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="font-black text-base dark:text-emerald-400">{state.settings.currency}{p.revenue.toLocaleString()}</p>
                          <p className="text-[8px] font-black text-slate-300 uppercase">Gross Return</p>
                       </div>
                    </div>
                 ))}
                 {topProducts.length === 0 && <div className="py-20 text-center opacity-20"><Package size={48} className="mx-auto mb-3"/><p className="text-[10px] font-black uppercase">No Sales Logged</p></div>}
              </div>
           </div>

           <div className="bg-white dark:bg-slate-900 p-10 rounded-[56px] border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                 <h4 className="font-black text-xl dark:text-white uppercase tracking-tighter flex items-center gap-3"><UserCheck size={24} className="text-emerald-500" /> Key Clients</h4>
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Loyalty Index</p>
              </div>
              <div className="space-y-4">
                 {topCustomers.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/40 rounded-3xl group hover:bg-white dark:hover:bg-slate-800 transition-all border border-transparent hover:border-emerald-100 shadow-sm">
                       <div className="flex items-center gap-6">
                          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-700 flex items-center justify-center font-black text-lg text-emerald-600 shadow-sm">{i+1}</div>
                          <div>
                             <p className="font-black text-sm dark:text-white uppercase truncate max-w-[140px] tracking-tight">{c.name}</p>
                             <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{c.visits} Historical Sessions</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="font-black text-base dark:text-emerald-400">{state.settings.currency}{c.total.toLocaleString()}</p>
                          <p className="text-[8px] font-black text-slate-300 uppercase">Contribution</p>
                       </div>
                    </div>
                 ))}
                 {topCustomers.length === 0 && <div className="py-20 text-center opacity-20"><UserCheck size={48} className="mx-auto mb-3"/><p className="text-[10px] font-black uppercase">No Data Nodes</p></div>}
              </div>
           </div>
        </div>

        {/* Footer Disclaimer for PDF */}
        <div className="p-10 border-t border-slate-100 dark:border-slate-800 text-center space-y-4">
           <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Confidential Terminal Audit Report</p>
           <p className="text-[9px] font-bold text-slate-400 leading-relaxed max-w-2xl mx-auto">This report provides a fiscal overview for internal auditing purposes only. Data is sourced from the local encrypted vault. Generated via Sarvari Seller Pro Professional Edition v1.3.2.</p>
        </div>
      </div>
    </div>
  );
};

export default Reports;
