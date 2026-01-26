
import React, { useState, useMemo } from 'react';
import { 
  RotateCcw, 
  Search, 
  ArrowUpRight, 
  Package, 
  Calendar, 
  User, 
  FileText, 
  TrendingDown,
  RefreshCw,
  Clock,
  ArrowRight,
  Filter,
  CheckCircle2,
  X,
  History,
  ShieldCheck,
  PackageCheck
} from 'lucide-react';
import { AppState, View, Invoice } from '../types';
import { translations } from '../translations';

interface Props {
  state: AppState;
  setCurrentView: (view: View) => void;
}

interface ReturnEntry {
  date: string;
  invoiceId: string;
  customerId?: string;
  items: { productId: string; quantity: number }[];
  refundAmount: number;
}

export default function Returns({ state, setCurrentView }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const t = translations[state.settings.language || 'en'];

  // Flatten return history from all invoices
  const allReturns = useMemo(() => {
    const returns: ReturnEntry[] = [];
    state.invoices.forEach(inv => {
      if (inv.returnHistory && inv.returnHistory.length > 0) {
        inv.returnHistory.forEach(rh => {
          returns.push({
            ...rh,
            invoiceId: inv.id,
            customerId: inv.customerId
          });
        });
      }
    });
    return returns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.invoices]);

  const filteredReturns = useMemo(() => {
    return allReturns.filter(r => {
      const cust = state.customers.find(c => c.id === r.customerId);
      const searchStr = searchTerm.toLowerCase();
      return (
        r.invoiceId.includes(searchTerm) ||
        (cust?.name.toLowerCase().includes(searchStr)) ||
        r.items.some(it => {
          const prod = state.products.find(p => p.id === it.productId);
          return prod?.name.toLowerCase().includes(searchStr);
        })
      );
    });
  }, [allReturns, searchTerm, state.customers, state.products]);

  const stats = {
    totalRefunded: filteredReturns.reduce((acc, r) => acc + r.refundAmount, 0),
    totalItems: filteredReturns.reduce((acc, r) => acc + r.items.reduce((sum, i) => sum + i.quantity, 0), 0),
    count: filteredReturns.length
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-amber-600 p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden group">
           <p className="text-[10px] font-black text-amber-200 uppercase tracking-widest mb-1 opacity-80">Aggregate Refund Value</p>
           <h3 className="text-4xl font-black tracking-tighter">{state.settings.currency}{stats.totalRefunded.toLocaleString()}</h3>
           <TrendingDown className="absolute -bottom-4 -right-4 text-white/10 rotate-12 group-hover:scale-110 transition-transform" size={120} />
        </div>
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border shadow-sm flex flex-col justify-center">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Restocked Assets</p>
           <h3 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">{stats.totalItems.toLocaleString()} Units</h3>
           <div className="flex items-center gap-1.5 mt-2"><PackageCheck size={12} className="text-indigo-500"/><span className="text-[8px] font-black text-slate-400 uppercase">Across {stats.count} events</span></div>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-8 rounded-[40px] border border-indigo-100 dark:border-indigo-800 flex items-center gap-6">
           <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm"><RotateCcw size={32}/></div>
           <div>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Accounting Protocol</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase leading-relaxed">Returns automatically reconcile customer debt and adjust inventory levels.</p>
           </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search returns by customer, invoice ID, or product..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3 pl-12 pr-6 outline-none text-xs font-bold dark:text-white"
          />
        </div>
        <button 
          onClick={() => setCurrentView('invoices')}
          className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2 hover:bg-indigo-700 transition-all active:scale-95"
        >
           <History size={16}/> Start New Return
        </button>
      </div>

      {/* Returns List */}
      <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Return Timeline</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Source Document</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Restocked Items</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Refund Value</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredReturns.map((rh, idx) => {
                const cust = state.customers.find(c => c.id === rh.customerId);
                return (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                    <td className="px-8 py-5">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 flex items-center justify-center"><Calendar size={18}/></div>
                          <div>
                             <p className="text-[12px] font-black dark:text-white uppercase">{new Date(rh.date).toLocaleDateString()}</p>
                             <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{new Date(rh.date).toLocaleTimeString()}</p>
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-5">
                       <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                             <FileText size={12} className="text-indigo-500"/>
                             <span className="text-[12px] font-black dark:text-slate-200">#INV-{rh.invoiceId.padStart(4, '0')}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase truncate max-w-[150px]">{cust?.name || 'Walk-in Customer'}</p>
                       </div>
                    </td>
                    <td className="px-8 py-5">
                       <div className="flex flex-wrap gap-1">
                          {rh.items.map((it, i) => {
                             const product = state.products.find(p => p.id === it.productId);
                             return (
                               <span key={i} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[8px] font-black uppercase rounded-lg border border-slate-200 dark:border-slate-700">
                                  {it.quantity}x {product?.name || 'Unknown'}
                               </span>
                             );
                          })}
                       </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <p className="text-base font-black text-amber-600">{state.settings.currency}{rh.refundAmount.toLocaleString()}</p>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <button 
                         onClick={() => setCurrentView('invoices')}
                         className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                       >
                          <ArrowRight size={18}/>
                       </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredReturns.length === 0 && (
             <div className="py-32 text-center flex flex-col items-center justify-center gap-4 opacity-30">
                <RotateCcw size={64} strokeWidth={1} />
                <p className="font-black text-xs uppercase tracking-widest">No return events logged in system</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
