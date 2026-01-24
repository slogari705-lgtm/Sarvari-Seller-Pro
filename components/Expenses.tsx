
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
                         <button onClick={() => deleteExpense(e.id)} className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
            {filteredExpenses.length === 0 && (
              <div className="py-24 text-center flex flex-col items-center justify-center text-slate-300 gap-6">
                <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center opacity-40"><Receipt size={56} strokeWidth={1} /></div>
                <p className="font-black text-sm uppercase tracking-widest">{t.noExpensesFound}</p>
                <button onClick={clearFilters} className="text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-[0.2em] hover:underline transition-all">Clear All Parameters</button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><TrendingDown size={14} className="text-rose-500" /> Outflow Statistics</h3>
            
            <div className="space-y-6">
               <div className="p-6 bg-rose-50 dark:bg-rose-950/20 rounded-[32px] border border-rose-100 dark:border-rose-900/30">
                 <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Filtered Outflow</p>
                 <p className="text-4xl font-black text-rose-600 dark:text-rose-400 tracking-tighter">{state.settings.currency}{totalExpenseAmount.toLocaleString(undefined, { minimumFractionDigits: 0 })}</p>
                 <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-rose-400 uppercase">
                    <FileText size={12}/> {filteredExpenses.length} Records found
                 </div>
               </div>

               <button 
                  onClick={() => setIsManagingCategories(true)}
                  className="w-full flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl group hover:bg-white dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
               >
                  <div className="flex items-center gap-3">
                     <Settings size={18} className="text-slate-400 group-hover:text-indigo-600 transition-colors"/>
                     <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Config Categories</span>
                  </div>
                  <ArrowRight size={16} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all"/>
               </button>
            </div>
          </div>

          <div className="bg-indigo-600 p-8 rounded-[40px] text-white shadow-2xl shadow-indigo-100 dark:shadow-none relative overflow-hidden group">
             <div className="relative z-10">
                <h4 className="font-black text-lg uppercase tracking-tighter mb-4">Expense Analysis</h4>
                <p className="text-indigo-100 text-xs font-medium leading-relaxed opacity-80">Track where your capital is moving. Use categories like Rent, Salaries, and Inventory to optimize your business margins.</p>
                <button onClick={() => setIsAdding(true)} className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] bg-white text-indigo-600 px-6 py-3 rounded-xl shadow-lg hover:shadow-2xl transition-all active:scale-95">Record Now <Plus size={14}/></button>
             </div>
             <DollarSign className="absolute -bottom-6 -right-6 text-white/10 group-hover:scale-110 transition-transform" size={160}/>
          </div>
        </div>
      </div>

      {/* Log Expense Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-lg p-0 shadow-2xl relative animate-in zoom-in duration-300 max-h-[90vh] overflow-hidden flex flex-col">
            <header className="p-8 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200 dark:shadow-none"><PlusSquare size={24}/></div>
                  <div>
                     <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter">{t.logExpense}</h3>
                     <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Entry manual expense record</p>
                  </div>
               </div>
               <button onClick={() => { setIsAdding(false); resetNewExpense(); }} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-400 transition-colors"><X size={24}/></button>
            </header>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
              <div className="space-y-8 mb-4">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.notes} (Description) *</label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                    <input 
                      type="text" 
                      autoFocus
                      value={newExpense.description || ''} 
                      onChange={(e) => setNewExpense({...newExpense, description: e.target.value})} 
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-rose-500 rounded-2xl py-4 pl-12 pr-4 outline-none font-bold text-sm dark:text-white transition-all shadow-inner" 
                      placeholder="e.g. Monthly Electricity Bill"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.price} ({state.settings.currency}) *</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-500 font-black text-lg">{state.settings.currency}</div>
                      <input 
                        type="number" 
                        value={newExpense.amount || ''} 
                        onChange={(e) => setNewExpense({...newExpense, amount: Number(e.target.value)})} 
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-rose-500 rounded-2xl py-4 pl-10 pr-4 outline-none font-black text-xl dark:text-white transition-all shadow-inner"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center justify-between">
                       {t.category}
                       <button onClick={() => setShowQuickAddCat(!showQuickAddCat)} className="text-indigo-600 hover:text-indigo-700 transition-colors"><PlusCircle size={14}/></button>
                    </label>
                    {showQuickAddCat ? (
                      <div className="flex gap-2 animate-in slide-in-from-right-2">
                        <input 
                          type="text" 
                          value={newCatInput} 
                          onChange={(e) => setNewCatInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleInlineAddCategory()}
                          placeholder="New Cat..."
                          className="flex-1 bg-white dark:bg-slate-800 border-2 border-indigo-500 rounded-xl py-3 px-4 text-xs font-bold dark:text-white outline-none"
                        />
                        <button onClick={handleInlineAddCategory} className="p-3 bg-indigo-600 text-white rounded-xl"><Plus size={16}/></button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                        <select 
                          value={newExpense.category} 
                          onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                          className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-rose-500 rounded-2xl py-4 pl-12 pr-4 outline-none font-bold text-sm dark:text-white shadow-inner appearance-none"
                        >
                          {state.expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expense Date</label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                    <input 
                      type="date" 
                      value={newExpense.date ? new Date(newExpense.date).toISOString().split('T')[0] : ''} 
                      onChange={(e) => setNewExpense({...newExpense, date: e.target.value})} 
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-rose-500 rounded-2xl py-4 pl-12 pr-6 outline-none font-bold text-sm dark:text-white transition-all shadow-inner"
                    />
                  </div>
                </div>
              </div>
            </div>

            <footer className="p-8 lg:p-10 pt-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky bottom-0 z-10 flex gap-4">
              <button onClick={() => { setIsAdding(false); resetNewExpense(); }} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-3xl uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all">{t.discard}</button>
              <button onClick={handleAddExpense} className="flex-[2] py-5 bg-rose-600 text-white font-black rounded-3xl hover:bg-rose-700 transition-all shadow-2xl shadow-rose-100 dark:shadow-none uppercase tracking-widest text-[10px] active:scale-[0.98]">{t.save} Record</button>
            </footer>
          </div>
        </div>
      )}

      {/* Manage Categories Modal */}
      {isManagingCategories && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-md p-10 shadow-2xl relative animate-in zoom-in duration-300">
            <button onClick={() => setIsManagingCategories(false)} className="absolute top-8 right-8 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-400 transition-colors"><X size={24}/></button>
            <h3 className="text-2xl font-black mb-8 text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3">
              <Tag size={28} className="text-indigo-600" />
              {t.manageCategories}
            </h3>
            
            <div className="space-y-6 mb-10">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newCatInput} 
                  onChange={(e) => setNewCatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCategory(newCatInput)}
                  placeholder="New category name..."
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 font-bold dark:text-white text-sm"
                />
                <button 
                  onClick={() => addCategory(newCatInput)}
                  className="p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all active:scale-95 shadow-lg"
                >
                  <Plus size={24} />
                </button>
              </div>

              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {state.expenseCategories.map((cat) => (
                  <div key={cat} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl group border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/30 transition-all">
                    <span className="font-black text-slate-700 dark:text-slate-200 text-sm uppercase tracking-widest">{cat}</span>
                    <button 
                      onClick={() => {
                        if (confirm(`Remove category "${cat}"?`)) {
                           updateState('expenseCategories', state.expenseCategories.filter(c => c !== cat));
                        }
                      }}
                      className="p-2.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={() => setIsManagingCategories(false)}
              className="w-full py-5 bg-slate-900 dark:bg-slate-700 text-white font-black rounded-3xl hover:bg-black transition-all uppercase tracking-widest text-xs"
            >
              Close Categories
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
