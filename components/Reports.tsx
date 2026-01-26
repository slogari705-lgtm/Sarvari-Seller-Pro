
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
  Zap
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

  const getFilterTimestamps = () => {
    const start = reportStartDate ? new Date(`${reportStartDate}T${reportStartTime}`).getTime() : 0;
    const end = reportEndDate ? new Date(`${reportEndDate}T${reportEndTime}`).getTime() : Infinity;
    return { start, end };
  };

  const { start, end } = getFilterTimestamps();
  const isLifetime = !reportStartDate && !reportEndDate;

  const activeInvoices = useMemo(() => {
    return state.invoices.filter(i => {
      const time = new Date(i.date).getTime();
      return !i.isVoided && time >= start && time <= end;
    });
  }, [state.invoices, start, end]);

  const filteredExpenses = useMemo(() => {
    return state.expenses.filter(e => {
      const time = new Date(e.date).getTime();
      return time >= start && time <= end;
    });
  }, [state.expenses, start, end]);

  const totalSales = activeInvoices.reduce((acc, inv) => acc + inv.total, 0);
  const totalInvoiceProfit = activeInvoices.reduce((acc, inv) => acc + (inv.profit || 0), 0);
  const totalExpenses = filteredExpenses.reduce((acc, exp) => acc + exp.amount, 0);
  const netProfit = totalInvoiceProfit - totalExpenses;
  
  const totalInventoryValue = state.products.reduce((acc, p) => acc + ((p.costPrice || 0) * p.stock), 0);
  const totalReceivables = state.customers.reduce((acc, c) => acc + (c.totalDebt || 0), 0);

  const healthScore = useMemo(() => {
    if (totalSales === 0) return 0;
    const marginRatio = (netProfit / totalSales) * 100;
    const debtRatio = (totalReceivables / (totalSales || 1)) * 100;
    let score = 50 + (marginRatio * 2) - (debtRatio * 0.5);
    return Math.min(100, Math.max(0, Math.round(score)));
  }, [totalSales, netProfit, totalReceivables]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#475569'];

  const chartData = useMemo(() => {
    if (isLifetime) {
      const today = new Date();
      const data = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthName = d.toLocaleString('default', { month: 'short' });
        const invoicesInMonth = state.invoices.filter(inv => {
          const invDate = new Date(inv.date);
          return !inv.isVoided && invDate.getMonth() === d.getMonth() && invDate.getFullYear() === d.getFullYear();
        });
        const sales = invoicesInMonth.reduce((sum, inv) => sum + inv.total, 0);
        const expenses = state.expenses.filter(exp => {
          const expDate = new Date(exp.date);
          return expDate.getMonth() === d.getMonth() && expDate.getFullYear() === d.getFullYear();
        }).reduce((sum, exp) => sum + exp.amount, 0);
        data.push({ name: monthName, sales, expenses });
      }
      return data;
    } else {
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
    }
  }, [activeInvoices, filteredExpenses, isLifetime, state.invoices, state.expenses]);

  const topCategories = useMemo(() => {
    const cats: Record<string, { revenue: number, volume: number }> = {};
    activeInvoices.forEach(inv => {
      inv.items.forEach(it => {
        if (!cats[it.category]) cats[it.category] = { revenue: 0, volume: 0 };
        cats[it.category].revenue += it.price * it.quantity;
        cats[it.category].volume += it.quantity;
      });
    });
    return Object.entries(cats).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [activeInvoices]);

  const handleDownloadReportPDF = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    const element = document.getElementById('report-container');
    if (!element) return setIsDownloading(false);
    
    // Hide filter header for clean PDF
    const filters = document.getElementById('report-filters-header');
    if (filters) filters.style.display = 'none';

    try {
      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true, 
        logging: false, 
        backgroundColor: state.settings.theme === 'dark' ? '#020617' : '#ffffff' 
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // First Page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Subsequent Pages
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`Sarvari_POS_Report_${isLifetime ? 'Lifetime' : 'Filtered'}_${Date.now()}.pdf`);
    } catch (error) { 
      console.error("PDF Generation Failed:", error); 
    } finally { 
      if (filters) filters.style.display = 'flex';
      setIsDownloading(false); 
    }
  };

  const clearFilters = () => {
    setReportStartDate(''); setReportEndDate('');
    setReportStartTime('00:00'); setReportEndTime('23:59');
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500 max-w-full p-1 no-scrollbar">
      <div id="report-filters-header" className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col xl:flex-row items-center gap-6">
        <div className="flex-1 w-full space-y-4">
          <div className="flex items-center justify-between">
             <h4 className="font-black text-[11px] uppercase tracking-[0.2em] text-indigo-600 flex items-center gap-2"><Filter size={14}/> Query Parameters</h4>
             {!isLifetime && (
               <button onClick={clearFilters} className="flex items-center gap-1 text-[10px] font-black text-rose-500 uppercase hover:underline"><RotateCcw size={12}/> Reset to Lifetime</button>
             )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
             <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Start Date</label>
                <div className="relative"><Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14}/><input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl py-3 pl-10 pr-4 font-bold text-xs outline-none focus:ring-2 ring-indigo-500/20 dark:text-white" /></div>
             </div>
             <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Start Time</label>
                <div className="relative"><Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14}/><input type="time" value={reportStartTime} onChange={e => setReportStartTime(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl py-3 pl-10 pr-4 font-bold text-xs outline-none focus:ring-2 ring-indigo-500/20 dark:text-white" /></div>
             </div>
             <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">End Date</label>
                <div className="relative"><Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14}/><input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl py-3 pl-10 pr-4 font-bold text-xs outline-none focus:ring-2 ring-indigo-500/20 dark:text-white" /></div>
             </div>
             <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">End Time</label>
                <div className="relative"><Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14}/><input type="time" value={reportEndTime} onChange={e => setReportEndTime(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl py-3 pl-10 pr-4 font-bold text-xs outline-none focus:ring-2 ring-indigo-500/20 dark:text-white" /></div>
             </div>
          </div>
        </div>
        <div className="w-full xl:w-auto flex flex-col items-center justify-center p-6 bg-indigo-50 dark:bg-indigo-900/10 rounded-[32px] border border-indigo-100 dark:border-indigo-900/30">
           <p className="text-[9px] font-black text-indigo-600 uppercase mb-2 tracking-widest">Active Scope</p>
           <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter text-center">{isLifetime ? <div className="flex items-center gap-2"><Zap size={18} className="text-amber-500 fill-amber-500"/> Lifetime Data</div> : <span className="text-slate-700 dark:text-slate-200">Custom Pulse</span>}</h3>
        </div>
      </div>

      <div id="report-container" className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-6">
             <div className="w-16 h-16 bg-indigo-600 rounded-[24px] flex items-center justify-center text-white shadow-xl shrink-0"><Activity size={32} strokeWidth={2.5} /></div>
             <div>
               <h3 className="text-3xl font-black uppercase tracking-tighter dark:text-white">Business Intelligence</h3>
               <div className="flex items-center gap-2 mt-1"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isLifetime ? 'Full History Cumulative Audit' : `Audit From ${reportStartDate} to ${reportEndDate || 'Present'}`}</span><div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></div></div>
             </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right hidden xl:block">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fiscal Integrity Score</p>
                <div className="flex items-center gap-3 justify-end"><span className={`text-2xl font-black ${healthScore > 70 ? 'text-emerald-500' : healthScore > 40 ? 'text-amber-500' : 'text-rose-500'}`}>{healthScore}%</span><ShieldCheck size={24} className={healthScore > 70 ? 'text-emerald-500' : healthScore > 40 ? 'text-amber-500' : 'text-rose-500'} /></div>
             </div>
             <button onClick={handleDownloadReportPDF} disabled={isDownloading} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50">{isDownloading ? <Clock size={16} className="animate-spin" /> : <FileDown size={18} />} Export Summary</button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { label: 'Revenue Pool', value: totalSales, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/10', icon: DollarSign },
            { label: 'Filtered Profit', value: netProfit, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', icon: TrendingUp },
            { label: 'Outflows (Exp)', value: totalExpenses, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10', icon: Receipt },
            { label: 'Asset Value', value: totalInventoryValue, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: Package },
            { label: 'Receivables', value: totalReceivables, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-500/10', icon: Scale },
            { label: 'Net Margin', value: (netProfit / (totalSales || 1)) * 100, isPercent: true, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-500/10', icon: Activity },
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm group hover:shadow-lg transition-all">
              <div className={`${stat.bg} ${stat.color} p-2.5 rounded-xl group-hover:scale-110 transition-transform mb-4 w-fit`}><stat.icon size={18} /></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">{stat.label}</p>
              <h4 className="text-xl font-black dark:text-white truncate tracking-tighter">{stat.isPercent ? '' : state.settings.currency}{stat.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}{stat.isPercent ? '%' : ''}</h4>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[48px] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="mb-10">
              <h4 className="font-black text-xl dark:text-white uppercase tracking-tighter flex items-center gap-3"><BarChart3 size={24} className="text-indigo-600" /> Volume Pulse</h4>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">{isLifetime ? 'Twelve Month Aggregate' : 'Filtered Period Daily Breakdown'}</p>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <defs><linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={state.settings.theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 900}} />
                  <YAxis hide />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)', fontSize: '12px', fontWeight: '900'}} />
                  <Area type="monotone" dataKey="sales" name="Revenue" stroke="#6366f1" strokeWidth={5} fill="url(#salesGrad)" />
                  <Bar dataKey="expenses" name="Expenditure" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={10} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[48px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
            <div className="mb-8"><h4 className="font-black text-xl dark:text-white uppercase tracking-tighter flex items-center gap-3"><PieIcon size={24} className="text-amber-500" /> Revenue Hub</h4></div>
            <div className="flex-1 space-y-4 overflow-y-auto max-h-[350px] custom-scrollbar pr-2">
               {topCategories.map((cat, i) => (
                  <div key={i} className="group flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-transparent hover:border-indigo-100 transition-all">
                     <div className="flex items-center gap-5">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-xl" style={{backgroundColor: COLORS[i % COLORS.length]}}>{i + 1}</div>
                        <div className="min-w-0">
                           <p className="font-black text-sm dark:text-white uppercase truncate tracking-tight">{cat.name}</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase">{cat.volume} Transactions</p>
                        </div>
                     </div>
                     <p className="text-base font-black text-slate-800 dark:text-white">{state.settings.currency}{cat.revenue.toLocaleString()}</p>
                  </div>
               ))}
               {topCategories.length === 0 && <div className="py-24 text-center opacity-30 font-black text-[10px] uppercase tracking-[0.3em]">No Activity Records</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
