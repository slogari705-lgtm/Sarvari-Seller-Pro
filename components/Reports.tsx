
import React, { useMemo } from 'react';
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
  Area
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
  Award
} from 'lucide-react';
import { AppState } from '../types';
import { translations } from '../translations';

interface Props {
  state: AppState;
}

const Reports: React.FC<Props> = ({ state }) => {
  const t = translations[state.settings.language || 'en'];
  const totalSales = state.invoices.reduce((acc, inv) => acc + inv.total, 0);
  const totalInvoiceProfit = state.invoices.reduce((acc, inv) => acc + (inv.profit || 0), 0);
  const totalExpenses = state.expenses.reduce((acc, exp) => acc + exp.amount, 0);
  // Net Profit = Gross Profit - Expenses
  const netProfit = totalInvoiceProfit - totalExpenses;
  
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#475569'];

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    state.products.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [state.products]);

  const expenseBreakdownData = useMemo(() => {
    const categories: Record<string, number> = {};
    state.expenses.forEach(e => {
      categories[e.category] = (categories[e.category] || 0) + e.amount;
    });
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [state.expenses]);

  const topSellingProducts = useMemo(() => {
    const productSales: Record<string, { name: string, total: number, count: number, profit: number }> = {};
    state.invoices.forEach(inv => {
      inv.items.forEach(item => {
        if (!productSales[item.id]) {
          productSales[item.id] = { name: item.name, total: 0, count: 0, profit: 0 };
        }
        productSales[item.id].total += item.price * item.quantity;
        productSales[item.id].count += item.quantity;
        // Approx profit calculation for item: Sell - Buy
        const itemProfit = (item.price - (item.buyPrice || 0)) * item.quantity;
        productSales[item.id].profit += itemProfit;
      });
    });
    return Object.values(productSales)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [state.invoices]);

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
      const grossProfit = invoicesInMonth.reduce((sum, inv) => sum + (inv.profit || 0), 0);

      const expenses = state.expenses
        .filter(exp => {
          const expDate = new Date(exp.date);
          return expDate.getMonth() === monthIndex && expDate.getFullYear() === year;
        })
        .reduce((sum, exp) => sum + exp.amount, 0);

      data.push({
        name: monthName,
        fullDate: `${monthName} ${year}`,
        sales,
        expenses,
        profit: grossProfit
      });
    }
    return data;
  }, [state.invoices, state.expenses]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">{t.businessAnalytics}</h3>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest">In-depth financial intelligence & performance metrics</p>
        </div>
        <button 
          onClick={() => window.print()}
          className="flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Download size={18} />
          {t.downloadPDF}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: t.totalRevenue, value: totalSales, color: 'text-indigo-600', icon: DollarSign },
          { label: 'Gross Profit', value: totalInvoiceProfit, color: 'text-emerald-500', icon: TrendingUp },
          { label: t.expenses, value: totalExpenses, color: 'text-rose-500', icon: Receipt },
          { label: 'Net Profit', value: netProfit, color: netProfit >= 0 ? 'text-violet-500' : 'text-rose-600', icon: TrendingUp },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md group">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{stat.label}</p>
              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl group-hover:scale-110 transition-transform">
                <stat.icon size={16} className={stat.color} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h4 className={`text-3xl font-black tracking-tighter dark:text-white ${stat.label === 'Net Profit' ? stat.color : ''}`}>
                {state.settings.currency}{stat.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h4>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance Chart */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <h4 className="font-black text-lg dark:text-white uppercase tracking-tighter flex items-center gap-2">
              <BarChart3 size={20} className="text-indigo-600" />
              {t.revenue} vs Profit vs Expenses (L12M)
            </h4>
          </div>
          <div className="h-[350px]">
            {monthlyData.some(m => m.sales > 0 || m.expenses > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyData} barGap={4}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={state.settings.theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                  <Tooltip 
                    cursor={{fill: state.settings.theme === 'dark' ? '#1e293b' : '#f8fafc'}} 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                      backgroundColor: state.settings.theme === 'dark' ? '#0f172a' : '#fff',
                      color: state.settings.theme === 'dark' ? '#fff' : '#000',
                      fontWeight: 'bold'
                    }} 
                  />
                  <Area type="monotone" dataKey="sales" name="Sales" stroke="#6366f1" fill="url(#colorSales)" strokeWidth={3} />
                  <Area type="monotone" dataKey="profit" name="Gross Profit" stroke="#10b981" fill="url(#colorProfit)" strokeWidth={3} />
                  <Bar dataKey="expenses" name="Expenses" fill="#fb7185" radius={[4, 4, 0, 0]} barSize={12} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                <BarChart3 className="opacity-10" size={64}/>
                <p className="font-black text-xs uppercase tracking-widest">Insufficient data for charting</p>
              </div>
            )}
          </div>
        </div>

        {/* Expense Breakdown Pie Chart */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <h4 className="font-black text-lg dark:text-white uppercase tracking-tighter flex items-center gap-2">
              <PieIcon size={20} className="text-rose-500" />
              {t.expenseSummary}
            </h4>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">By Category</span>
          </div>
          <div className="h-[350px]">
            {expenseBreakdownData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseBreakdownData}
                    cx="50%"
                    cy="45%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {expenseBreakdownData.map((entry, index) => (
                      <Cell key={`cell-expense-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${state.settings.currency}${value.toLocaleString()}`, 'Total']}
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      backgroundColor: state.settings.theme === 'dark' ? '#0f172a' : '#fff',
                      color: state.settings.theme === 'dark' ? '#fff' : '#000',
                      fontWeight: 'bold'
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={40} 
                    iconType="circle" 
                    wrapperStyle={{fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', paddingLeft: '10px'}}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                <PieIcon className="opacity-10" size={64}/>
                <p className="font-black text-xs uppercase tracking-widest">No expenses recorded yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Products Leaderboard with Profit */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-black text-lg dark:text-white uppercase tracking-tighter flex items-center gap-2">
              <Award size={20} className="text-amber-500" />
              Top Products
            </h4>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">By Revenue</span>
          </div>
          <div className="space-y-6">
            {topSellingProducts.length > 0 ? topSellingProducts.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-indigo-100 dark:hover:border-indigo-500/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center font-black text-indigo-600 shadow-sm border border-slate-100 dark:border-slate-700 shrink-0">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-sm text-slate-800 dark:text-white truncate">{p.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{p.count} Units Sold</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-base text-indigo-600 dark:text-indigo-400">{state.settings.currency}{p.total.toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-emerald-500 uppercase">Profit: {state.settings.currency}{p.profit.toLocaleString()}</p>
                </div>
              </div>
            )) : (
               <div className="py-20 text-center text-slate-300">
                  <Award className="mx-auto opacity-10 mb-4" size={48} />
                  <p className="font-black text-xs uppercase tracking-widest">No sales data found</p>
               </div>
            )}
          </div>
        </div>

        {/* Stock Insights / Inventory Distribution */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-black text-lg dark:text-white uppercase tracking-tighter flex items-center gap-2">
              <Layers size={20} className="text-emerald-500" />
              {t.inventoryBy} {t.category}
            </h4>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Item Distribution</span>
          </div>
          <div className="h-[350px]">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="45%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[idxToColor(index)]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      backgroundColor: state.settings.theme === 'dark' ? '#0f172a' : '#fff',
                      color: state.settings.theme === 'dark' ? '#fff' : '#000',
                      fontWeight: 'bold'
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={40} 
                    iconType="circle" 
                    wrapperStyle={{fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', paddingLeft: '10px'}}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                <Package className="opacity-10" size={64}/>
                <p className="font-black text-xs uppercase tracking-widest">Inventory catalog empty</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const idxToColor = (i: number) => i % 8;

export default Reports;
