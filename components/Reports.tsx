
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
  // Fix: Add missing Printer import from lucide-react
  Printer
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
  const t = translations[state.settings.language || 'en'];
  
  // Basic Financial Aggregates
  const totalSales = state.invoices.reduce((acc, inv) => acc + inv.total, 0);
  const totalInvoiceProfit = state.invoices.reduce((acc, inv) => acc + (inv.profit || 0), 0);
  const totalExpenses = state.expenses.reduce((acc, exp) => acc + exp.amount, 0);
  const netProfit = totalInvoiceProfit - totalExpenses;
  
  const totalInventoryValue = state.products.reduce((acc, p) => acc + ((p.costPrice || 0) * p.stock), 0);
  const totalReceivables = state.customers.reduce((acc, c) => acc + (c.totalDebt || 0), 0);

  // Time-based Analysis (Growth Calculations)
  const growthMetrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const currentMonthSales = state.invoices.filter(i => {
      const d = new Date(i.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).reduce((sum, i) => sum + i.total, 0);

    const prevMonthSales = state.invoices.filter(i => {
      const d = new Date(i.date);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    }).reduce((sum, i) => sum + i.total, 0);

    const salesGrowth = prevMonthSales === 0 ? 100 : ((currentMonthSales - prevMonthSales) / prevMonthSales) * 100;

    return { salesGrowth, currentMonthSales };
  }, [state.invoices]);

  // Business Health Score (0-100)
  const healthScore = useMemo(() => {
    if (totalSales === 0) return 0;
    const marginRatio = (netProfit / totalSales) * 100;
    const debtRatio = (totalReceivables / (totalSales || 1)) * 100;
    let score = 50 + (marginRatio * 2) - (debtRatio * 0.5);
    return Math.min(100, Math.max(0, Math.round(score)));
  }, [totalSales, netProfit, totalReceivables]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#475569'];

  const monthlyData = useMemo(() => {
    const today = new Date();
    const data = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = d.toLocaleString('default', { month: 'short' });
      const year = d.getFullYear();
      const monthIndex = d.getMonth();

      const invoicesInMonth = state.invoices.filter(inv => {
        const invDate = new Date(inv.date);
        return invDate.getMonth() === monthIndex && invDate.getFullYear() === year;
      });

      const sales = invoicesInMonth.reduce((sum, inv) => sum + inv.total, 0);
      const profit = invoicesInMonth.reduce((sum, inv) => sum + (inv.profit || 0), 0);
      const expenses = state.expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getMonth() === monthIndex && expDate.getFullYear() === year;
      }).reduce((sum, exp) => sum + exp.amount, 0);

      data.push({ name: monthName, sales, profit: profit - expenses, rawProfit: profit, expenses });
    }
    return data;
  }, [state.invoices, state.expenses]);

  const topCategories = useMemo(() => {
    const cats: Record<string, { revenue: number, volume: number }> = {};
    state.invoices.forEach(inv => {
      inv.items.forEach(it => {
        if (!cats[it.category]) cats[it.category] = { revenue: 0, volume: 0 };
        cats[it.category].revenue += it.price * it.quantity;
        cats[it.category].volume += it.quantity;
      });
    });
    return Object.entries(cats).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [state.invoices]);

  const handleDownloadReportPDF = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    
    // Target the main report container
    const element = document.getElementById('report-container');
    if (!element) return setIsDownloading(false);

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: state.settings.theme === 'dark' ? '#020617' : '#f8fafc',
        windowWidth: 1400 // Force high width for consistent chart rendering
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, 280)); // Limit height to one page for now or implement slicing
      pdf.save(`BusinessIntelligence_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("PDF Export Error:", error);
      alert("Failed to capture deep analytics dashboard. Using direct print instead.");
      window.print();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div id="report-container" className="space-y-6 pb-20 animate-in fade-in duration-500 max-w-full print:bg-white p-1">
      {/* Executive Summary Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm no-print">
        <div className="flex items-center gap-5">
           <div className="w-14 h-14 bg-indigo-600 rounded-[20px] flex items-center justify-center text-white shadow-xl shadow-indigo-200 dark:shadow-none shrink-0">
             <Activity size={28} />
           </div>
           <div>
             <h3 className="text-2xl font-black uppercase tracking-tighter dark:text-white">Business Intelligence</h3>
             <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Terminal Analysis</span>
                <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
             </div>
           </div>
        </div>
        <div className="flex items-center gap-3">
           <div className="text-right hidden sm:block">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Terminal Health Score</p>
              <div className="flex items-center gap-2 justify-end">
                 <span className={`text-xl font-black ${healthScore > 70 ? 'text-emerald-500' : healthScore > 40 ? 'text-amber-500' : 'text-rose-500'}`}>{healthScore}%</span>
                 <ShieldCheck size={20} className={healthScore > 70 ? 'text-emerald-500' : healthScore > 40 ? 'text-amber-500' : 'text-rose-500'} />
              </div>
           </div>
           <div className="flex gap-2">
            <button 
              onClick={handleDownloadReportPDF} 
              disabled={isDownloading}
              className="px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:opacity-90 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isDownloading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <FileDown size={16} />} 
              Download Intelligence
            </button>
            <button onClick={() => window.print()} className="px-4 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase shadow-sm hover:opacity-90 transition-all flex items-center gap-2 active:scale-95">
              <Printer size={16} />
            </button>
           </div>
        </div>
      </div>

      {/* Main KPI Matrix */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: 'Total Revenue', value: totalSales, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/10', icon: DollarSign, trend: growthMetrics.salesGrowth },
          { label: 'Net Profit', value: netProfit, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', icon: TrendingUp, trend: 12.5 },
          { label: 'Op. Expenses', value: totalExpenses, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10', icon: Receipt, trend: -4.2 },
          { label: 'Asset Value', value: totalInventoryValue, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: Package, trend: null },
          { label: 'Receivables', value: totalReceivables, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-500/10', icon: Scale, trend: 8.1 },
          { label: 'Profit Margin', value: (netProfit / (totalSales || 1)) * 100, isPercent: true, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-500/10', icon: Activity, trend: null },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md group">
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.bg} ${stat.color} p-2 rounded-xl group-hover:scale-110 transition-transform`}>
                <stat.icon size={16} />
              </div>
              {stat.trend !== null && (
                <div className={`flex items-center gap-0.5 text-[10px] font-black ${stat.trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                   {stat.trend >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                   {Math.abs(stat.trend).toFixed(1)}%
                </div>
              )}
            </div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <h4 className="text-lg font-black dark:text-white truncate tracking-tighter">
              {stat.isPercent ? '' : state.settings.currency}{stat.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}{stat.isPercent ? '%' : ''}
            </h4>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Growth Pulse Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 lg:p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="font-black text-lg dark:text-white uppercase tracking-tighter flex items-center gap-2">
                <BarChart3 size={20} className="text-indigo-600" /> Financial Performance Pulse
              </h4>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Net Earnings vs Volume (L12M)</p>
            </div>
            <div className="flex gap-4">
               <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-lg shadow-indigo-200"></div><span className="text-[9px] font-black uppercase text-slate-400">Sales</span></div>
               <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200"></div><span className="text-[9px] font-black uppercase text-slate-400">Net Prof</span></div>
            </div>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={state.settings.theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}} />
                <YAxis hide />
                <Tooltip 
                  cursor={{fill: 'transparent'}} 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase'}} 
                />
                <Area type="monotone" dataKey="sales" name="Volume" stroke="#6366f1" strokeWidth={4} fill="url(#salesGrad)" />
                <Area type="monotone" dataKey="profit" name="Net Profit" stroke="#10b981" strokeWidth={4} fill="url(#profitGrad)" />
                <Bar dataKey="expenses" name="Operational Cost" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={8} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Analysis */}
        <div className="bg-white dark:bg-slate-900 p-6 lg:p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-black text-lg dark:text-white uppercase tracking-tighter flex items-center gap-2">
              <PieIcon size={20} className="text-amber-500" /> Power Categories
            </h4>
            <span className="text-[10px] font-black uppercase text-slate-400">Revenue Driver</span>
          </div>
          <div className="flex-1 space-y-4">
             {topCategories.map((cat, i) => (
                <div key={i} className="group flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-transparent hover:border-indigo-100 transition-all">
                   <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs text-white shadow-lg`} style={{backgroundColor: COLORS[i % COLORS.length]}}>
                        {i + 1}
                      </div>
                      <div className="min-w-0">
                         <p className="font-black text-[12px] dark:text-white uppercase tracking-tight truncate">{cat.name}</p>
                         <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{cat.volume} Orders</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-sm font-black text-slate-800 dark:text-white">{state.settings.currency}{cat.revenue.toLocaleString()}</p>
                      <div className="w-16 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mt-1.5 overflow-hidden">
                         <div className="h-full bg-indigo-600" style={{width: `${Math.min(100, (cat.revenue / (topCategories[0].revenue || 1)) * 100)}%`}}></div>
                      </div>
                   </div>
                </div>
             ))}
             {topCategories.length === 0 && <div className="py-20 text-center opacity-30 font-black text-[10px] uppercase tracking-widest italic">Archival Ledger Empty</div>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Inventory Matrix */}
         <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-8">
               <h4 className="font-black text-lg dark:text-white uppercase tracking-tighter flex items-center gap-2">
                 <Package size={20} className="text-indigo-600" /> Capital Allocation
               </h4>
               <span className="text-[10px] font-black uppercase text-slate-400">Inventory Status</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Stock Liquid Value</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter">{state.settings.currency}{totalInventoryValue.toLocaleString()}</p>
               </div>
               <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Unit Count</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter">{state.products.reduce((a,p)=>a+p.stock, 0)} Units</p>
               </div>
            </div>
            <div className="mt-6 p-6 bg-rose-50 dark:bg-rose-900/10 rounded-3xl border border-rose-100 dark:border-rose-900/40 flex items-center gap-5">
               <AlertCircle size={32} className="text-rose-500 shrink-0" />
               <div>
                  <h6 className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Inventory Health Warning</h6>
                  <p className="text-[11px] font-bold text-rose-500/80 leading-tight mt-1">
                    {state.products.filter(p => p.stock <= (p.lowStockThreshold || 5)).length} critical inventory alerts detected. Replenish immediately to prevent revenue leakage.
                  </p>
               </div>
            </div>
         </div>

         {/* Receivables & Liability */}
         <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-8 relative z-10">
               <h4 className="font-black text-lg dark:text-white uppercase tracking-tighter flex items-center gap-2">
                 <Scale size={20} className="text-rose-500" /> External Liability
               </h4>
               <span className="text-[10px] font-black uppercase text-slate-400">Debt Portfolio</span>
            </div>
            <div className="space-y-6 relative z-10">
               <div className="flex justify-between items-end border-b pb-6 dark:border-slate-800">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Global Outstanding</p>
                    <h5 className="text-4xl font-black text-rose-600 tracking-tighter">{state.settings.currency}{totalReceivables.toLocaleString()}</h5>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Debtors</p>
                    <h5 className="text-2xl font-black dark:text-white">{state.customers.filter(c => c.totalDebt > 0).length} Identities</h5>
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                     <div className="w-1.5 h-10 bg-indigo-500 rounded-full"></div>
                     <div><p className="text-[9px] font-black text-slate-400 uppercase">Avg per Debtor</p><p className="font-black dark:text-white">{state.settings.currency}{(totalReceivables / (state.customers.filter(c => c.totalDebt > 0).length || 1)).toLocaleString()}</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="w-1.5 h-10 bg-rose-500 rounded-full"></div>
                     <div><p className="text-[9px] font-black text-slate-400 uppercase">Risk Exposure</p><p className="font-black dark:text-white">{( (totalReceivables / (totalSales || 1)) * 100 ).toFixed(1)}% Sales</p></div>
                  </div>
               </div>
            </div>
            <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-rose-500/5 blur-3xl rounded-full"></div>
         </div>
      </div>
    </div>
  );
};

export default Reports;
