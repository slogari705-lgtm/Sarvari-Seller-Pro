
import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Receipt, 
  Trash2, 
  X, 
  TrendingDown,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { AppState, Expense } from '../types';
import { translations } from '../translations';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  state: AppState;
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
}

const Expenses: React.FC<Props> = ({ state, updateState }) => {
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [trashConfirm, setTrashConfirm] = useState<{id: string} | null>(null);
  
  const t = translations[state.settings.language || 'en'];

  // Data Selectors
  const activeExpenses = useMemo(() => (state.expenses || []).filter(e => !e.isDeleted), [state.expenses]);

  const filteredExpenses = useMemo(() => {
    return activeExpenses.filter(e => {
      const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === 'All' || e.category === activeCategory;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activeExpenses, searchTerm, activeCategory]);

  const totalOutflow = activeExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  // Form States
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    category: 'General', amount: 0, description: '', date: new Date().toISOString().split('T')[0]
  });

  const handleAddExpense = () => {
    if (!newExpense.description || !newExpense.amount) return;
    const expense: Expense = {
      id: Math.random().toString(36).substr(2, 9),
      description: newExpense.description,
      category: newExpense.category || 'General',
      amount: Number(newExpense.amount),
      date: new Date().toISOString(),
      isDeleted: false
    };
    updateState('expenses', [...(state.expenses || []), expense]);
    setIsAddingExpense(false);
    setNewExpense({ category: 'General', amount: 0, description: '', date: new Date().toISOString().split('T')[0] });
  };

  const handleDelete = () => {
    if (!trashConfirm) return;
    updateState('expenses', state.expenses.map(e => e.id === trashConfirm.id ? { ...e, isDeleted: true } : e));
    setTrashConfirm(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 max-w-full">
      <ConfirmDialog 
        isOpen={!!trashConfirm} 
        onClose={() => setTrashConfirm(null)} 
        onConfirm={handleDelete} 
        title="Quarantine Record?" 
        message="This expense will be moved to the Recycle Bin." 
        confirmText="Confirm Delete" 
        type="warning" 
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
         <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-600 rounded-[22px] text-white shadow-xl shadow-rose-200 dark:shadow-none">
               <Receipt size={24} strokeWidth={2.5}/>
            </div>
            <div>
               <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">Fiscal Ledger</h3>
               <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Tracking business expenditures</p>
            </div>
         </div>
         
         <button onClick={() => setIsAddingExpense(true)} className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all">
           <Plus size={18} /> {t.logExpense}
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-rose-600 p-6 rounded-[32px] text-white shadow-xl relative overflow-hidden group">
            <p className="text-[10px] font-black text-rose-200 uppercase tracking-widest mb-1 opacity-80">Aggregate Outflow</p>
            <h3 className="text-3xl font-black tracking-tighter">{state.settings.currency}{totalOutflow.toLocaleString()}</h3>
            <Receipt className="absolute -bottom-4 -right-4 text-white/10 rotate-12 group-hover:scale-110 transition-transform" size={120} />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-50 dark:border-slate-800">
              <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Filter ledger records..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3 pl-12 pr-6 outline-none text-xs font-bold dark:text-white" />
              </div>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-slate-50/50 dark:bg-slate-800/30 border-b">
                    <tr>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Category</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                      <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {filteredExpenses.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 group transition-all">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                                  <Receipt size={18}/>
                                </div>
                                <div className="min-w-0">
                                  <p className="font-black text-sm text-slate-800 dark:text-white truncate tracking-tight">{e.description}</p>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{new Date(e.date).toLocaleDateString()}</p>
                                </div>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <span className="inline-block text-[9px] font-black px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full uppercase tracking-widest">
                                {e.category}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <p className="text-lg font-black text-rose-600">{state.settings.currency}{e.amount.toLocaleString()}</p>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <button onClick={() => setTrashConfirm({id: e.id})} className="p-3 text-slate-300 hover:text-rose-600 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
                          </td>
                      </tr>
                    ))}
                </tbody>
              </table>
          </div>
      </div>

      {isAddingExpense && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col animate-in zoom-in duration-300 max-h-[90vh]">
               <header className="p-8 border-b flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shadow-sm"><Receipt size={24}/></div>
                     <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Expenditure Registry</h3>
                  </div>
                  <button onClick={() => setIsAddingExpense(false)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-rose-600 transition-all"><X size={24}/></button>
               </header>
               <div className="flex-1 overflow-y-auto p-10 space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Detail Description</label>
                    <textarea rows={2} value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-6 font-bold text-sm dark:text-white outline-none resize-none" placeholder="e.g. Electricity Bill Jan, Shop Supplies..." />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Amount</label>
                      <input type="number" value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-6 font-black text-2xl dark:text-white outline-none" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Category</label>
                      <select value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-6 font-black text-[10px] uppercase dark:text-white outline-none">
                         {state.expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
               </div>
               <footer className="p-8 border-t flex gap-4">
                  <button onClick={() => setIsAddingExpense(false)} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-3xl font-black text-[10px] uppercase tracking-widest">Discard</button>
                  <button onClick={handleAddExpense} className="flex-[2] py-5 bg-rose-600 text-white rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3">
                     <CheckCircle2 size={18}/> Finalize Log
                  </button>
               </footer>
            </div>
         </div>
      )}
    </div>
  );
};

export default Expenses;
