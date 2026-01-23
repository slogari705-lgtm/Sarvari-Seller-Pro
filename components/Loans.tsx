
import React, { useState, useMemo } from 'react';
import { 
  Scale, 
  Search, 
  ArrowUpRight, 
  User, 
  Phone, 
  Calendar,
  ChevronRight,
  Filter,
  DollarSign,
  AlertCircle,
  Clock,
  History,
  CheckCircle2,
  MoreVertical,
  ArrowRight,
  X,
  Wallet,
  ArrowDownLeft,
  Settings,
  ArrowUp,
  Plus,
  PlusCircle,
  AlertOctagon,
  MinusCircle,
  Calculator,
  FileText,
  ExternalLink,
  Tag
} from 'lucide-react';
import { AppState, Customer, View, Invoice, LoanTransaction } from '../types';
import { translations } from '../translations';

interface Props {
  state: AppState;
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
  setCurrentView: (view: View) => void;
}

const Loans: React.FC<Props> = ({ state, updateState, setCurrentView }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [payingCustomer, setPayingCustomer] = useState<Customer | null>(null);
  const [viewingDebtor, setViewingDebtor] = useState<Customer | null>(null);
  const [isManualLogOpen, setIsManualLogOpen] = useState(false);
  const [repaymentAmount, setRepaymentAmount] = useState<number | ''>('');
  
  // Manual Log Form State
  const [manualCustomer, setManualCustomer] = useState<Customer | null>(null);
  const [manualSearch, setManualSearch] = useState('');
  const [manualType, setManualType] = useState<'debt' | 'repayment' | 'adjustment'>('debt');
  const [manualAmount, setManualAmount] = useState<number | ''>('');
  const [manualNote, setManualNote] = useState('');
  const [manualDueDate, setManualDueDate] = useState('');

  const t = translations[state.settings.language || 'en'];

  const debtors = useMemo(() => {
    return state.customers
      .filter(c => c.totalDebt > 0)
      .filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.phone.includes(searchTerm)
      )
      .sort((a, b) => b.totalDebt - a.totalDebt);
  }, [state.customers, searchTerm]);

  const availableCustomers = useMemo(() => {
    if (!manualSearch) return [];
    return state.customers.filter(c => 
      c.name.toLowerCase().includes(manualSearch.toLowerCase()) || 
      c.phone.includes(manualSearch)
    ).slice(0, 5);
  }, [state.customers, manualSearch]);

  const totalOutstanding = state.customers.reduce((acc, c) => acc + (c.totalDebt || 0), 0);
  const totalDebtors = debtors.length;

  const handleProcessRepayment = (targetCustomer: Customer, amount: number, note: string = "Manual repayment in Loans system") => {
    if (!targetCustomer || amount <= 0) return;
    
    let remainingPayment = amount;
    const updatedInvoices = state.invoices.map(inv => ({ ...inv }));
    
    const customerInvoices = updatedInvoices
      .filter(inv => inv.customerId === targetCustomer.id && (inv.status === 'partial' || inv.status === 'unpaid'))
      .sort((a, b) => new Date(a.date).getTime() - new Date(a.date).getTime());

    for (const inv of customerInvoices) {
      if (remainingPayment <= 0) break;
      
      const invBalance = inv.total - inv.paidAmount;
      const paymentToApply = Math.min(remainingPayment, invBalance);
      
      inv.paidAmount += paymentToApply;
      remainingPayment -= paymentToApply;
      
      if (inv.paidAmount >= inv.total) inv.status = 'paid';
      else if (inv.paidAmount > 0) inv.status = 'partial';
    }

    const actualReduction = amount - remainingPayment;
    
    const updatedCustomers = state.customers.map(c => {
      if (c.id === targetCustomer.id) {
        return { 
          ...c, 
          totalDebt: Math.max(0, (c.totalDebt || 0) - actualReduction),
          lastVisit: new Date().toISOString().split('T')[0]
        };
      }
      return c;
    });

    const newTrans: LoanTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      customerId: targetCustomer.id,
      date: new Date().toISOString(),
      amount: actualReduction,
      type: 'repayment',
      note: note
    };

    updateState('invoices', updatedInvoices);
    updateState('customers', updatedCustomers);
    updateState('loanTransactions', [...state.loanTransactions, newTrans]);
    
    setPayingCustomer(null);
    setRepaymentAmount('');
    if (viewingDebtor?.id === targetCustomer.id) {
      setViewingDebtor(updatedCustomers.find(c => c.id === targetCustomer.id) || null);
    }
  };

  const handleManualTransaction = () => {
    if (!manualCustomer || !manualAmount || manualAmount <= 0) return;

    if (manualType === 'repayment') {
      handleProcessRepayment(manualCustomer, Number(manualAmount), manualNote || "Direct manual repayment");
    } else {
      const updatedCustomers = state.customers.map(c => {
        if (c.id === manualCustomer.id) {
          const newDebt = manualType === 'debt' 
            ? (c.totalDebt || 0) + Number(manualAmount)
            : Math.max(0, (c.totalDebt || 0) + Number(manualAmount)); 
          
          return { 
            ...c, 
            totalDebt: newDebt,
            lastVisit: new Date().toISOString().split('T')[0]
          };
        }
        return c;
      });

      const newTrans: LoanTransaction = {
        id: Math.random().toString(36).substr(2, 9),
        customerId: manualCustomer.id,
        date: new Date().toISOString(),
        amount: Number(manualAmount),
        type: manualType,
        note: manualNote || `Manual ${manualType} recorded`,
        dueDate: manualType === 'debt' && manualDueDate ? manualDueDate : undefined
      };

      updateState('customers', updatedCustomers);
      updateState('loanTransactions', [...state.loanTransactions, newTrans]);
    }

    setIsManualLogOpen(false);
    setManualCustomer(null);
    setManualAmount('');
    setManualNote('');
    setManualDueDate('');
    setManualType('debt');
  };

  const getChronologicalHistory = (customerId: string) => {
    return state.loanTransactions
      .filter(t => t.customerId === customerId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const navigateToInvoice = (invoiceId: string) => {
    setViewingDebtor(null);
    setCurrentView('invoices');
    // Note: In a real app we'd trigger a filter or search in the invoice view here
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div>
            <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">{t.loan} System</h3>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest">Global debt tracking and repayment reconciliation</p>
         </div>
         <button 
           onClick={() => setIsManualLogOpen(true)}
           className="flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95"
         >
           <Plus size={18} />
           Log Manual Transaction
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
             <div className="relative z-10">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.outstandingLoans}</p>
                <h3 className="text-5xl font-black text-rose-600 dark:text-rose-400 tracking-tighter">
                   {state.settings.currency}{totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-4 uppercase tracking-widest flex items-center gap-2">
                   <AlertCircle size={14} className="text-rose-500" />
                   {totalDebtors} Active debtors recorded
                </p>
             </div>
             <div className="w-24 h-24 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[32px] flex items-center justify-center shadow-inner relative z-10 shrink-0">
                <Scale size={48} />
             </div>
             <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 blur-3xl rounded-full"></div>
          </div>

          <div className="flex items-center gap-4">
             <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Find debtor by name or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-6 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 font-bold text-sm dark:text-white transition-all shadow-sm"
                />
             </div>
          </div>

          <div className="space-y-4">
            {debtors.map((c) => (
              <div 
                key={c.id} 
                className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group flex flex-col sm:flex-row items-center justify-between gap-4"
              >
                <div 
                  className="flex items-center gap-5 flex-1 min-w-0 cursor-pointer"
                  onClick={() => setViewingDebtor(c)}
                >
                  <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center font-black text-xl group-hover:bg-rose-50 dark:group-hover:bg-rose-900/20 group-hover:text-rose-600 transition-colors shrink-0">
                    {c.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-lg text-slate-800 dark:text-white truncate">{c.name}</h4>
                    <div className="flex items-center gap-3 mt-1">
                       <span className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1"><Phone size={10}/> {c.phone}</span>
                       <span className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1"><Calendar size={10}/> Last activity: {c.lastVisit}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 w-full sm:w-auto">
                  <div className="text-center sm:text-right shrink-0">
                     <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">{t.debt}</p>
                     <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{state.settings.currency}{c.totalDebt.toLocaleString()}</p>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-auto sm:ml-0">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setPayingCustomer(c); }}
                      className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"
                    >
                      <DollarSign size={18} />
                      <span className="hidden lg:inline">{t.repay}</span>
                    </button>
                    <button 
                      onClick={() => setViewingDebtor(c)}
                      className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-300 group-hover:text-rose-50 group-hover:bg-rose-50 dark:group-hover:bg-rose-900/30 transition-all"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {debtors.length === 0 && (
              <div className="py-20 text-center flex flex-col items-center justify-center text-slate-300 gap-4">
                 <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-500 rounded-full flex items-center justify-center animate-pulse">
                    <CheckCircle2 size={40} />
                 </div>
                 <p className="font-black text-sm uppercase tracking-widest">No outstanding debts found</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <Clock size={14} /> Global Activity Log
              </h4>
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                 {state.loanTransactions.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8).map(trans => {
                    const cust = state.customers.find(c => c.id === trans.customerId);
                    return (
                       <div key={trans.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/30 transition-all">
                          <div className="flex justify-between items-start mb-2">
                             <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-sm ${
                                  trans.type === 'debt' ? 'bg-rose-100 text-rose-600' : 
                                  trans.type === 'repayment' ? 'bg-emerald-100 text-emerald-600' : 
                                  'bg-amber-100 text-amber-600'
                                }`}>
                                   {trans.type === 'debt' ? <ArrowDownLeft size={14} /> : trans.type === 'repayment' ? <ArrowUpRight size={14} /> : <Calculator size={14} />}
                                </div>
                                <p className="text-[10px] font-black dark:text-white truncate max-w-[100px]">{cust?.name}</p>
                             </div>
                             <span className="text-[8px] font-black text-slate-400 uppercase">{new Date(trans.date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                             <p className="text-[9px] text-slate-400 font-bold italic truncate max-w-[120px]">{trans.note}</p>
                             <p className={`text-xs font-black ${trans.type === 'debt' ? 'text-rose-600' : trans.type === 'repayment' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {trans.type === 'debt' ? '+' : '-'}{state.settings.currency}{trans.amount.toFixed(0)}
                             </p>
                          </div>
                          {trans.dueDate && (
                             <p className="text-[8px] font-bold text-amber-500 uppercase mt-1 text-right">Due: {new Date(trans.dueDate).toLocaleDateString()}</p>
                          )}
                       </div>
                    )
                 })}
                 {state.loanTransactions.length === 0 && (
                    <p className="text-center py-10 text-xs font-bold text-slate-400 italic">No global activity yet</p>
                 )}
              </div>
           </div>

           <div className="bg-gradient-to-br from-rose-500 to-rose-600 p-8 rounded-[40px] shadow-2xl text-white relative overflow-hidden">
              <div className="relative z-10">
                 <h4 className="font-black text-lg uppercase tracking-tighter mb-4">Debt Analytics</h4>
                 <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs font-black uppercase text-rose-100">
                       <span>Total Active Debtors</span>
                       <span>{totalDebtors}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-black uppercase text-rose-100">
                       <span>Largest Exposure</span>
                       <span>{state.settings.currency}{(debtors[0]?.totalDebt || 0).toLocaleString()}</span>
                    </div>
                 </div>
              </div>
              <Scale className="absolute -bottom-4 -right-4 text-white/10" size={120} />
           </div>
        </div>
      </div>

      {/* Manual Transaction Log Modal */}
      {isManualLogOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-lg p-0 shadow-2xl relative animate-in zoom-in duration-200 max-h-[90vh] overflow-hidden flex flex-col">
             <header className="p-8 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600"><PlusCircle size={24}/></div>
                   <div>
                      <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Manual Transaction</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Adjust customer balance directly</p>
                   </div>
                </div>
                <button onClick={() => { setIsManualLogOpen(false); setManualCustomer(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"><X size={20}/></button>
             </header>

             <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                <div className="space-y-6">
                   <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Target Customer</label>
                      {manualCustomer ? (
                        <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl animate-in zoom-in-95">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-black text-xs">{manualCustomer.name.charAt(0)}</div>
                              <div>
                                 <p className="text-sm font-black dark:text-white">{manualCustomer.name}</p>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase">Balance: {state.settings.currency}{manualCustomer.totalDebt.toLocaleString()}</p>
                              </div>
                           </div>
                           <button onClick={() => setManualCustomer(null)} className="p-2 hover:bg-indigo-100 dark:hover:bg-indigo-800 rounded-full text-indigo-600"><X size={16}/></button>
                        </div>
                      ) : (
                        <div className="relative">
                           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                           <input 
                              type="text" 
                              value={manualSearch}
                              onChange={(e) => setManualSearch(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-indigo-500 font-bold text-sm dark:text-white"
                              placeholder="Search customer by name or phone..."
                           />
                           {manualSearch && (
                              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 py-2 z-20 overflow-hidden">
                                 {availableCustomers.map(c => (
                                    <button key={c.id} onClick={() => { setManualCustomer(c); setManualSearch(''); }} className="w-full p-4 text-left hover:bg-indigo-50 dark:hover:bg-indigo-500/10 flex items-center justify-between group">
                                       <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-400">{c.name.charAt(0)}</div>
                                          <div>
                                             <p className="text-sm font-black dark:text-white">{c.name}</p>
                                             <p className="text-[10px] text-slate-400 font-bold">{c.phone}</p>
                                          </div>
                                       </div>
                                       <ArrowRight size={16} className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"/>
                                    </button>
                                 ))}
                              </div>
                           )}
                        </div>
                      )}
                   </div>

                   <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'debt', label: 'Add Debt', icon: PlusCircle, color: 'text-rose-500' },
                        { id: 'repayment', label: 'Repay', icon: CheckCircle2, color: 'text-emerald-500' },
                        { id: 'adjustment', label: 'Adjust', icon: Settings, color: 'text-amber-500' }
                      ].map(type => (
                        <button 
                           key={type.id}
                           onClick={() => setManualType(type.id as any)}
                           className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${manualType === type.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40' : 'border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
                        >
                           <type.icon size={20} className={manualType === type.id ? type.color : 'text-slate-400'}/>
                           <span className={`text-[9px] font-black uppercase tracking-widest mt-1 ${manualType === type.id ? 'text-indigo-600' : 'text-slate-400'}`}>{type.label}</span>
                        </button>
                      ))}
                   </div>

                   <div className="grid grid-cols-1 gap-6">
                      <div>
                         <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Amount</label>
                         <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
                            <input 
                              type="number" 
                              value={manualAmount}
                              onChange={(e) => setManualAmount(e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-indigo-500 font-black text-2xl dark:text-white"
                              placeholder="0.00"
                            />
                         </div>
                      </div>
                      
                      {manualType === 'debt' && (
                        <div>
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Due Date</label>
                           <input 
                             type="date" 
                             value={manualDueDate}
                             onChange={(e) => setManualDueDate(e.target.value)}
                             className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 outline-none focus:border-indigo-500 font-bold text-sm dark:text-white"
                           />
                        </div>
                      )}

                      <div>
                         <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Notes / Reason</label>
                         <input 
                           type="text" 
                           value={manualNote}
                           onChange={(e) => setManualNote(e.target.value)}
                           className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 outline-none focus:border-indigo-500 font-bold text-sm dark:text-white"
                           placeholder="e.g. Manual correction, special loan..."
                         />
                      </div>
                   </div>
                </div>
             </div>

             <footer className="p-8 pt-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky bottom-0 z-10">
                <button 
                  onClick={handleManualTransaction}
                  disabled={!manualCustomer || !manualAmount || manualAmount <= 0}
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none disabled:opacity-50 active:scale-[0.98]"
                >
                  Record Transaction
                </button>
             </footer>
          </div>
        </div>
      )}

      {/* Customer Detail View - Chronological Transaction List */}
      {viewingDebtor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-10 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-5xl h-full lg:max-h-[85vh] shadow-2xl relative flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <header className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center font-black text-2xl shadow-xl">{viewingDebtor.name.charAt(0)}</div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter">{viewingDebtor.name}</h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs font-bold text-slate-400">{viewingDebtor.phone}</span>
                    <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[8px] font-black rounded-full uppercase">Active Debtor</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                 <button 
                  onClick={() => setPayingCustomer(viewingDebtor)}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2"
                 >
                   <DollarSign size={16}/> Record Repayment
                 </button>
                 <button onClick={() => setViewingDebtor(null)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"><X size={28} /></button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30 dark:bg-slate-800/20 custom-scrollbar">
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="space-y-6">
                    <div className="p-8 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                       <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Current Balance Due</p>
                       <h5 className="text-4xl font-black text-rose-600 tracking-tighter relative z-10">{state.settings.currency}{viewingDebtor.totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h5>
                       <Scale className="absolute -bottom-2 -right-2 text-rose-500/5 group-hover:scale-110 transition-transform" size={100}/>
                    </div>
                    <div className="p-8 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                       <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Total Customer Lifetime Value</p>
                       <h5 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter relative z-10">{state.settings.currency}{viewingDebtor.totalSpent.toLocaleString()}</h5>
                       <ArrowUpRight className="absolute -bottom-2 -right-2 text-indigo-500/5 group-hover:scale-110 transition-transform" size={100}/>
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                     <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg"><History size={20}/></div>
                              <h4 className="font-black text-sm uppercase tracking-widest dark:text-white">Transaction Chronology</h4>
                           </div>
                           <span className="text-[10px] font-black text-slate-400 px-3 py-1 bg-white dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-700">{getChronologicalHistory(viewingDebtor.id).length} Active records</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                           {getChronologicalHistory(viewingDebtor.id).length > 0 ? (
                              <div className="relative">
                                 {/* Timeline vertical bar */}
                                 <div className="absolute left-6 top-0 bottom-0 w-1 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
                                 <div className="space-y-10">
                                    {getChronologicalHistory(viewingDebtor.id).map((trans) => (
                                       <div key={trans.id} className="relative pl-14 group">
                                          {/* Timeline Node */}
                                          <div className={`absolute left-3.5 top-2 w-6 h-6 rounded-full border-4 border-white dark:border-slate-900 z-10 shadow-md transition-all group-hover:scale-125 ${
                                            trans.type === 'debt' ? 'bg-rose-500' : 
                                            trans.type === 'repayment' ? 'bg-emerald-500' : 
                                            'bg-amber-500'
                                          }`}></div>
                                          
                                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-slate-800/40 rounded-[28px] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-indigo-100 dark:hover:border-indigo-900/30 transition-all">
                                             <div className="space-y-3">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                   <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-wider ${
                                                     trans.type === 'debt' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 
                                                     trans.type === 'repayment' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                                                     'bg-amber-50 text-amber-600 border border-amber-100'
                                                   }`}>
                                                      {trans.type}
                                                   </span>
                                                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md">
                                                      <Clock size={12}/> {new Date(trans.date).toLocaleDateString()} at {new Date(trans.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                   </span>
                                                </div>
                                                
                                                <div>
                                                   <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-tight">{trans.note}</p>
                                                   <div className="flex items-center gap-4 mt-2">
                                                      {trans.invoiceId && (
                                                         <button 
                                                            onClick={() => navigateToInvoice(trans.invoiceId!)}
                                                            className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md text-[9px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100 dark:border-indigo-800"
                                                         >
                                                            <FileText size={10}/> Invoice #{trans.invoiceId} <ExternalLink size={8}/>
                                                         </button>
                                                      )}
                                                      {trans.dueDate && (
                                                         <span className="text-[9px] font-black text-amber-600 dark:text-amber-500 uppercase flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md border border-amber-100 dark:border-amber-800">
                                                            <Calendar size={10}/> Due {new Date(trans.dueDate).toLocaleDateString()}
                                                         </span>
                                                      )}
                                                   </div>
                                                </div>
                                             </div>
                                             <div className="text-right shrink-0">
                                                <p className={`text-2xl font-black ${trans.type === 'debt' ? 'text-rose-600' : trans.type === 'repayment' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                   {trans.type === 'debt' ? '+' : '-'}{state.settings.currency}{trans.amount.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                                                </p>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Transaction Ref: {trans.id.slice(-6)}</p>
                                             </div>
                                          </div>
                                       </div>
                                    ))}
                                 </div>
                              </div>
                           ) : (
                              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6 opacity-40 py-24 text-center">
                                 <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700">
                                    <History size={48} strokeWidth={1}/>
                                 </div>
                                 <div>
                                    <p className="font-black text-sm uppercase tracking-widest text-slate-500">Historical Archive Empty</p>
                                    <p className="text-xs font-bold text-slate-400 mt-2 max-w-[250px] mx-auto">All current balance is likely carried from legacy data or initial profile configuration.</p>
                                 </div>
                              </div>
                           )}
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Repayment Modal */}
      {payingCustomer && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-md p-8 shadow-2xl relative">
            <button onClick={() => setPayingCustomer(null)} className="absolute top-6 right-6 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"><X size={20}/></button>
            <div className="flex items-center gap-4 mb-8">
               <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600"><Wallet size={24}/></div>
               <div>
                  <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">{t.repay}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{payingCustomer.name}</p>
               </div>
            </div>

            <div className="space-y-6 mb-8">
               <div className="p-6 bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                  <p className="text-[10px] font-black text-rose-400 uppercase mb-1">{t.totalDebt}</p>
                  <p className="text-3xl font-black text-rose-600">{state.settings.currency}{payingCustomer.totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
               </div>

               <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Payment Amount</label>
                  <div className="relative">
                     <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                     <input 
                        type="number" 
                        value={repaymentAmount}
                        onChange={(e) => setRepaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-indigo-500 font-black text-xl dark:text-white transition-all shadow-inner"
                        placeholder="0.00"
                        autoFocus
                     />
                  </div>
               </div>
            </div>

            <button 
               onClick={() => handleProcessRepayment(payingCustomer, Number(repaymentAmount))}
               disabled={repaymentAmount === '' || repaymentAmount <= 0}
               className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 dark:shadow-none disabled:opacity-50 active:scale-95"
            >
               Record Repayment
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Loans;
