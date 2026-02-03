import React, { useState, useMemo } from 'react';
import { 
  Scale, 
  Search, 
  DollarSign, 
  X, 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  History,
  PlusCircle,
  Calculator,
  ArrowRight
} from 'lucide-react';
import { AppState, Customer, View, LoanTransaction, Invoice } from '../types';
import { translations } from '../translations';

interface Props {
  state: AppState;
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
  setCurrentView: (view: View) => void;
}

const Loans: React.FC<Props> = ({ state, updateState, setCurrentView }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [payingCustomer, setPayingCustomer] = useState<Customer | null>(null);
  const [repaymentAmount, setRepaymentAmount] = useState<number | ''>('');
  const [isManualLogOpen, setIsManualLogOpen] = useState(false);
  
  // Manual Log Form
  const [manualCustomer, setManualCustomer] = useState<Customer | null>(null);
  const [manualSearch, setManualSearch] = useState('');
  const [manualType, setManualType] = useState<'debt' | 'repayment' | 'adjustment'>('debt');
  const [manualAmount, setManualAmount] = useState<number | ''>('');
  const [manualNote, setManualNote] = useState('');

  const t = translations[state.settings.language || 'en'];
  const debtors = useMemo(() => {
    return state.customers
      .filter(c => Number(c.totalDebt) > 0)
      .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm))
      .sort((a, b) => Number(b.totalDebt) - Number(a.totalDebt));
  }, [state.customers, searchTerm]);

  const totalOutstanding = state.customers.reduce((acc, c) => acc + (Number(c.totalDebt) || 0), 0);

  const handleProcessRepayment = (targetCustomer: Customer, amount: number, note: string = "Manual repayment registry") => {
    if (!targetCustomer || amount <= 0) return;
    let remainingPayment = amount;
    const updatedInvoices = state.invoices.map((inv: Invoice) => {
      if (inv.customerId === targetCustomer.id && inv.status !== 'paid' && !inv.isVoided) {
        const balance = Number(inv.total) - (Number(inv.paidAmount) || 0);
        const toPay = Math.min(remainingPayment, balance);
        remainingPayment -= toPay;
        const newPaid = (Number(inv.paidAmount) || 0) + toPay;
        return { ...inv, paidAmount: newPaid, status: newPaid >= Number(inv.total) ? 'paid' : 'partial' } as Invoice;
      }
      return inv;
    });
    const actualReduction = amount - remainingPayment;
    const updatedCustomers = state.customers.map((c: Customer) => {
      if (c.id === targetCustomer.id) {
        return { ...c, totalDebt: Math.max(0, (Number(c.totalDebt) || 0) - actualReduction), lastVisit: new Date().toISOString() };
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
  };

  const handleManualTransaction = () => {
    if (!manualCustomer || !manualAmount || Number(manualAmount) <= 0) return;
    if (manualType === 'repayment') {
      handleProcessRepayment(manualCustomer, Number(manualAmount), manualNote || "Manual entry settlement");
    } else {
      const updatedCustomers = state.customers.map((c: Customer) => {
        if (c.id === manualCustomer.id) {
          const adj = manualType === 'debt' ? Number(manualAmount) : -Number(manualAmount);
          return { ...c, totalDebt: Math.max(0, (Number(c.totalDebt) || 0) + adj), lastVisit: new Date().toISOString() };
        }
        return c;
      });
      const newTrans: LoanTransaction = {
        id: Math.random().toString(36).substr(2, 9),
        customerId: manualCustomer.id,
        date: new Date().toISOString(),
        amount: Number(manualAmount),
        type: manualType,
        note: manualNote || `Manual ${manualType} adjustment`
      };
      updateState('customers', updatedCustomers);
      updateState('loanTransactions', [...state.loanTransactions, newTrans]);
    }
    setIsManualLogOpen(false);
    setManualCustomer(null);
    setManualAmount('');
    setManualNote('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div><h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">Debt Master</h3><p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Outstanding account receivables</p></div>
         <button onClick={() => setIsManualLogOpen(true)} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-3 active:scale-95"><PlusCircle size={18} /> New Ledger Entry</button>
      </div>
      <div className="bg-rose-600 p-10 rounded-[40px] text-white shadow-xl flex items-center justify-between relative overflow-hidden group">
         <div className="relative z-10"><p className="text-[10px] font-black text-rose-200 uppercase tracking-widest mb-1 opacity-80">Portfolio Exposure</p><h3 className="text-5xl font-black">{state.settings.currency}{totalOutstanding.toLocaleString()}</h3></div>
         <Scale size={120} className="absolute -bottom-4 -right-4 opacity-10 group-hover:scale-110 transition-transform" />
      </div>
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border shadow-sm">
         <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Locate debtor..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3.5 pl-12 pr-6 outline-none font-bold text-sm dark:text-white" /></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {debtors.map((c) => (
          <div key={c.id} className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border shadow-sm transition-all hover:shadow-xl group">
            <div className="flex items-center justify-between mb-6">
               <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center font-black text-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">{c.name.charAt(0)}</div>
                  <div className="min-w-0"><h4 className="font-black text-lg dark:text-white uppercase truncate tracking-tight">{c.name}</h4><p className="text-[10px] text-slate-400 font-bold tracking-widest">{c.phone}</p></div>
               </div>
               <div className="text-right"><p className="text-2xl font-black text-rose-600">{state.settings.currency}{c.totalDebt.toLocaleString()}</p><span className="text-[8px] font-black text-slate-300 uppercase">Exposure</span></div>
            </div>
            <div className="flex gap-2">
               <button onClick={() => setPayingCustomer(c)} className="flex-1 py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2"><DollarSign size={14}/> Settle</button>
               <button onClick={() => setCurrentView('customers')} className="px-4 py-4 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-2xl hover:bg-slate-100 transition-all"><History size={16}/></button>
            </div>
          </div>
        ))}
      </div>
      {isManualLogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 rounded-[48px] w-full max-w-lg shadow-2xl relative border border-white/10 overflow-hidden flex flex-col animate-in zoom-in-95">
             <header className="p-8 border-b flex items-center justify-between">
                <div className="flex items-center gap-4"><div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm"><Calculator size={24}/></div><div><h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Adjustment Panel</h3><p className="text-[10px] font-bold text-slate-400 uppercase">Manual Balance Modulation</p></div></div>
                <button onClick={() => { setIsManualLogOpen(false); setManualCustomer(null); }} className="p-2 text-slate-400 hover:text-rose-500"><X size={24}/></button>
             </header>
             <div className="p-10 space-y-8 flex-1 overflow-y-auto">
                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Target Account</label>
                   {manualCustomer ? (
                     <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl animate-in zoom-in-95">
                        <div className="flex items-center gap-4"><div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-xs">{manualCustomer.name.charAt(0)}</div><div><p className="text-sm font-black dark:text-white uppercase">{manualCustomer.name}</p><p className="text-[10px] font-bold text-slate-400">Current Balance: {state.settings.currency}{manualCustomer.totalDebt.toLocaleString()}</p></div></div>
                        <button onClick={() => setManualCustomer(null)} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all"><X size={16}/></button>
                     </div>
                   ) : (
                     <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/><input type="text" value={manualSearch} onChange={e => setManualSearch(e.target.value)} placeholder="Locate client..." className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl py-4 pl-12 pr-6 font-bold text-sm outline-none focus:border-indigo-500 transition-all dark:text-white"/>
                        {manualSearch && (
                           <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border z-20 py-2">
                              {state.customers.filter(c => c.name.toLowerCase().includes(manualSearch.toLowerCase())).slice(0, 5).map(c => (
                                 <button key={c.id} onClick={() => { setManualCustomer(c); setManualSearch(''); }} className="w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex justify-between items-center group"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-slate-100 dark:bg-slate-600 rounded-lg flex items-center justify-center font-black text-xs">{c.name.charAt(0)}</div><span className="text-sm font-black dark:text-white uppercase">{c.name}</span></div><ArrowRight size={14} className="text-slate-200 group-hover:text-indigo-600"/></button>
                              ))}
                           </div>
                        )}
                     </div>
                   )}
                </div>
                <div className="grid grid-cols-3 gap-2">{['debt', 'repayment', 'adjustment'].map(m => (<button key={m} onClick={() => setManualType(m as any)} className={`py-4 rounded-2xl border-4 font-black text-[9px] uppercase transition-all ${manualType === m ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-50 dark:border-slate-800 text-slate-400'}`}>{m}</button>))}</div>
                <div className="space-y-4"><div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Flow Amount</label><input type="number" value={manualAmount} onChange={e => setManualAmount(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-800 rounded-3xl py-6 px-8 font-black text-4xl outline-none dark:text-white" placeholder="0.00" /></div><input type="text" value={manualNote} onChange={e => setManualNote(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl py-4 px-6 font-bold text-sm outline-none dark:text-white" placeholder="Adjustment reason..." /></div>
             </div>
             <footer className="p-8 border-t bg-slate-50 dark:bg-slate-900"><button onClick={handleManualTransaction} disabled={!manualCustomer || !manualAmount} className="w-full py-6 bg-indigo-600 text-white rounded-[28px] font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-50">Authorize Registry Entry</button></footer>
          </div>
        </div>
      )}

      {payingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 rounded-[48px] w-full max-w-md p-10 shadow-2xl relative border border-white/10 animate-in zoom-in duration-200">
            <button onClick={() => setPayingCustomer(null)} className="absolute top-8 right-8 p-2 text-slate-400 hover:text-rose-500 transition-all"><X size={24}/></button>
            <div className="flex flex-col items-center text-center space-y-6">
               <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-[32px] flex items-center justify-center shadow-lg"><Wallet size={36}/></div>
               <div><h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Financial Settlement</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{payingCustomer.name}</p></div>
               <div className="w-full p-8 bg-slate-50 dark:bg-slate-950 rounded-[36px] border border-dashed text-center"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Exposure Pending</p><p className="text-5xl font-black text-rose-600 tracking-tighter">{state.settings.currency}{payingCustomer.totalDebt.toLocaleString()}</p></div>
               <div className="w-full space-y-4"><label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest text-left px-4">Remittance Magnitude</label><input type="number" value={repaymentAmount} onChange={e => setRepaymentAmount(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-800 rounded-[28px] py-6 px-10 font-black text-4xl outline-none focus:ring-8 ring-emerald-500/5 text-center dark:text-white shadow-inner" placeholder="0.00" autoFocus /></div>
               <button onClick={() => handleProcessRepayment(payingCustomer, Number(repaymentAmount))} disabled={!repaymentAmount || Number(repaymentAmount) <= 0} className="w-full py-6 bg-emerald-600 text-white rounded-[32px] font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50">Execute Repayment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Loans;