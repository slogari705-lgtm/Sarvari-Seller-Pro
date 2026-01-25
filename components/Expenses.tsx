
import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Receipt, 
  Trash2, 
  DollarSign, 
  Calendar as CalendarIcon,
  Tag,
  X,
  Filter,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Settings,
  PlusCircle,
  PlusSquare,
  ArrowRight,
  TrendingDown,
  FileText
} from 'lucide-react';
import { AppState, Expense } from '../types';
import { translations } from '../translations';

interface Props {
  state: AppState;
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
}

const Expenses: React.FC<Props> = ({ state, updateState }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCatInput, setNewCatInput] = useState('');
  const [showQuickAddCat, setShowQuickAddCat] = useState(false);
  
  const t = translations[state.settings.language || 'en'];

  // Advanced Filter State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');

  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    category: state.expenseCategories[0] || 'General',
    amount: 0,
    date: new Date().toISOString().split('T')[0]
  });

  const filteredExpenses = useMemo(() => {
    return state.expenses.filter(e => {
      const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || e.category === categoryFilter;
      const matchesStartDate = !startDate || e.date >= startDate;
      const matchesEndDate = !endDate || e.date <= endDate;
      const matchesMinAmount = !minAmount || e.amount >= Number(minAmount);
      const matchesMaxAmount = !maxAmount || e.amount <= Number(maxAmount);
      
      return matchesSearch && matchesCategory && matchesStartDate && matchesEndDate && matchesMinAmount && matchesMaxAmount;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.expenses, searchTerm, categoryFilter, startDate, endDate, minAmount, maxAmount]);

  const handleAddExpense = () => {
    if (!newExpense.description || !newExpense.amount) return;
    
    // Precise Date & Time Logic
    let finalDate = new Date().toISOString();
    if (newExpense.date) {
        const selectedDate = new Date(newExpense.date);
        const now = new Date();
        // If the selected date is today, retain the current time for accuracy
        if (selectedDate.toDateString() === now.toDateString()) {
            finalDate = now.toISOString();
        } else {
            // If it's a past/future date, set to noon to avoid timezone issues shifting the day
            selectedDate.setHours(12, 0, 0, 0);
            finalDate = selectedDate.toISOString();
        }
    }

    const expense: Expense = {
      id: Math.random().toString(36).substr(2, 9),
      description: newExpense.description,
      category: newExpense.category || 'General',
      amount: Number(newExpense.amount),
      date: finalDate
    };

    updateState('expenses', [...state.expenses, expense]);
    setIsAdding(false);
    resetNewExpense();
  };

  const resetNewExpense = () => {
    setNewExpense({ 
      category: state.expenseCategories[0] || 'General', 
      amount: 0, 
      date: new Date().toISOString().split('T')[0],
      description: ''
    });
    setShowQuickAddCat(false);
  };

  const deleteExpense = (id: string) => {
    if (confirm(t.delete + '?')) {
      updateState('expenses', state.expenses.filter(e => e.id !== id));
    }
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setCategoryFilter('All');
    setMinAmount('');
    setMaxAmount('');
    setSearchTerm('');
  };

  const addCategory = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (state.expenseCategories.includes(trimmed)) return;
    updateState('expenseCategories', [...state.expenseCategories, trimmed]);
    return trimmed;
  };

  const handleInlineAddCategory = () => {
    const cat = addCategory(newCatInput);
    if (cat) {
      setNewExpense({ ...newExpense, category: cat });
      setNewCatInput('');
      setShowQuickAddCat(false);
    }
  };

  const totalExpenseAmount = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div>
            <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">{t.expenses}</h3>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest">Track business outflows and operational costs</p>
         </div>
         <button 
           onClick={() => setIsAdding(true)}
           className="flex items-center justify-center gap-3 px-8 py-4 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-100 dark:shadow-none hover:bg-rose-700 transition-all active:scale-95"
         >
           <Plus size={18} strokeWidth={3} />
           {t.logExpense}
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder={t.search} 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-6 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-sm dark:text-white transition-all shadow-sm"
                />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-5 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all border ${
                    showFilters 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' 
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Filter size={18} />
                  {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-2xl animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-between mb-8">
                  <h4 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                    <Filter size={16} className="text-indigo-600" />
                    {t.advancedFilters}
                  </h4>
                  <button onClick={clearFilters} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 flex items-center gap-2 transition-colors">
                    <RotateCcw size={14} />
                    Reset Parameters
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.dateRange}</label>
                    <div className="flex items-center gap-3">
                      <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold dark:text-white focus:border-indigo-500 outline-none"/>
                      <span className="text-slate-300 font-bold">-</span>
                      <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold dark:text-white focus:border-indigo-500 outline-none"/>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.category}</label>
                    <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold dark:text-white focus:border-indigo-500 outline-none appearance-none">
                      <option value="All">{t.all} Categories</option>
                      {state.expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.min} {state.settings.currency}</label>
                       <input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold dark:text-white focus:border-indigo-500 outline-none" placeholder="0.00"/>
                    </div>
                    <div className="space-y-3">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.max} {state.settings.currency}</label>
                       <input type="number" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold dark:text-white focus:border-indigo-500 outline-none" placeholder="Any"/>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                   <tr>
                     <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.notes}</th>
                     <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.category}</th>
                     <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date & Time</th>
                     <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">{t.price}</th>
                     <th className="px-8 py-5 w-20"></th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                   {filteredExpenses.map((e) => (
                     <tr key={e.id} className="hover:bg-rose-50/20 dark:hover:bg-rose-500/5 transition-colors group">
                       <td className="px-8 py-5">
                         <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-[14px] bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0"><Receipt size={20} /></div>
                           <span className="font-bold text-slate-800 dark:text-white text-sm">{e.description}</span>
                         </div>
                       </td>
                       <td className="px-8 py-5">
                         <span className="text-[10px] font-black px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg uppercase tracking-widest">{e.category}</span>
                       </td>
                       <td className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                         {new Date(e.date).toLocaleDateString()} <span className="text-slate-300 dark:text-slate-600 mx-1">|</span> {new Date(e.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                       </td>
                       <td className="px-8 py-5 text-right font-black text-rose-600 dark:text-rose-400 text-base">{state.settings.currency}{e.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                       <td className="px-8 py-5 text-right">
                         <button onClick={() => deleteExpense(e.id)} className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-2xl transition-all"><Trash2 size={18} /></button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
            {filteredExpenses.length === 0 && (
                <div className="py-20 text-center text-slate-300">
                   <Receipt size={48} className="mx-auto mb-4 opacity-20" />
                   <p className="font-black text-xs uppercase tracking-widest">{t.noExpensesFound}</p>
                </div>
             )}
          </div>
        </div>
        
        {/* Right Sidebar (Quick Stats & Categories) */}
        <div className="space-y-6">
            {/* Total Expense Widget */}
            <div className="bg-rose-600 p-8 rounded-[40px] text-white shadow-xl shadow-rose-200 dark:shadow-none relative overflow-hidden">
               <div className="relative z-10">
                  <p className="text-[10px] font-black text-rose-200 uppercase tracking-widest mb-2">{t.totalOutflow}</p>
                  <h3 className="text-4xl font-black tracking-tighter">{state.settings.currency}{totalExpenseAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                  <p className="text-xs font-bold text-rose-200 mt-4 uppercase tracking-widest flex items-center gap-2">
                     <Filter size={14} /> {filteredExpenses.length} records found
                  </p>
               </div>
               <TrendingDown className="absolute -bottom-4 -right-4 text-white/10" size={120} />
            </div>

            {/* Categories Widget */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm">
               <div className="flex items-center justify-between mb-6">
                  <h4 className="font-black text-sm dark:text-white uppercase tracking-widest flex items-center gap-2">
                     <Tag size={16} className="text-indigo-600" /> Categories
                  </h4>
                  <button onClick={() => setShowQuickAddCat(!showQuickAddCat)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-all">
                     <Plus size={18} />
                  </button>
               </div>
               
               {showQuickAddCat && (
                  <div className="mb-4 flex gap-2 animate-in slide-in-from-top-2">
                     <input 
                        value={newCatInput}
                        onChange={(e) => setNewCatInput(e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                        placeholder="New category..."
                        autoFocus
                     />
                     <button onClick={handleInlineAddCategory} className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg">
                        <ArrowRight size={14} />
                     </button>
                  </div>
               )}

               <div className="flex flex-wrap gap-2">
                  {state.expenseCategories.map(cat => (
                     <span key={cat} className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100 dark:border-slate-700 hover:border-indigo-200 transition-colors cursor-default">
                        {cat}
                     </span>
                  ))}
               </div>
            </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-lg p-8 shadow-2xl relative animate-in zoom-in duration-300">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-100 dark:bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-600"><PlusSquare size={24}/></div>
                    <div>
                       <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter">{t.logExpense}</h3>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Record business outflow</p>
                    </div>
                 </div>
                 <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"><X size={24}/></button>
              </div>

              <div className="space-y-6">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Description</label>
                    <input 
                      type="text" 
                      value={newExpense.description || ''}
                      onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-6 outline-none font-bold text-sm dark:text-white"
                      placeholder="e.g. Office Rent"
                      autoFocus
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Category</label>
                       <select 
                          value={newExpense.category}
                          onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                          className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-6 outline-none font-bold text-sm dark:text-white appearance-none"
                       >
                          {state.expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                       </select>
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Amount</label>
                       <div className="relative">
                          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <input 
                            type="number" 
                            value={newExpense.amount}
                            onChange={(e) => setNewExpense({...newExpense, amount: Number(e.target.value)})}
                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 pl-12 pr-4 outline-none font-black text-lg dark:text-white"
                          />
                       </div>
                    </div>
                 </div>

                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Date</label>
                    <input 
                      type="date" 
                      value={newExpense.date ? new Date(newExpense.date).toISOString().split('T')[0] : ''}
                      onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-6 outline-none font-bold text-sm dark:text-white"
                    />
                 </div>

                 <button 
                    onClick={handleAddExpense}
                    disabled={!newExpense.description || !newExpense.amount}
                    className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black text-lg hover:bg-rose-700 transition-all shadow-xl shadow-rose-100 dark:shadow-none uppercase tracking-widest text-xs active:scale-95 disabled:opacity-50"
                 >
                    Save Record
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
