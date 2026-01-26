
import React, { useState, useMemo } from 'react';
import { 
  Trash2, 
  RotateCcw, 
  Package, 
  Users, 
  FileText, 
  Receipt, 
  X, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { AppState, Product, Customer, Invoice, Expense } from '../types';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  state: AppState;
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
}

type TrashTab = 'products' | 'customers' | 'invoices' | 'expenses';

const Trash: React.FC<Props> = ({ state, updateState }) => {
  const [activeTab, setActiveTab] = useState<TrashTab>('products');
  const [purgeConfirm, setPurgeConfirm] = useState<{ type: TrashTab; id?: string; mode: 'single' | 'all' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const trashedProducts = useMemo(() => state.products.filter(p => p.isDeleted), [state.products]);
  const trashedCustomers = useMemo(() => state.customers.filter(c => c.isDeleted), [state.customers]);
  const trashedInvoices = useMemo(() => state.invoices.filter(i => i.isDeleted), [state.invoices]);
  const trashedExpenses = useMemo(() => state.expenses.filter(e => e.isDeleted), [state.expenses]);

  const handleRestore = (type: TrashTab, id: string) => {
    updateState(type, (state[type] as any[]).map(item => item.id === id ? { ...item, isDeleted: false } : item));
  };

  const handlePurgePermanent = () => {
    if (!purgeConfirm) return;
    const { type, id, mode } = purgeConfirm;
    
    if (mode === 'all') {
      updateState(type, (state[type] as any[]).filter(item => !item.isDeleted));
    } else if (id) {
      updateState(type, (state[type] as any[]).filter(item => item.id !== id));
    }
    setPurgeConfirm(null);
  };

  const tabs = [
    { id: 'products', icon: Package, count: trashedProducts.length, label: 'Products' },
    { id: 'customers', icon: Users, count: trashedCustomers.length, label: 'Customers' },
    { id: 'invoices', icon: FileText, count: trashedInvoices.length, label: 'Invoices' },
    { id: 'expenses', icon: Receipt, count: trashedExpenses.length, label: 'Expenses' },
  ];

  const currentList = {
    products: trashedProducts,
    customers: trashedCustomers,
    invoices: trashedInvoices,
    expenses: trashedExpenses
  }[activeTab];

  const filteredList = currentList.filter((item: any) => 
    (item.name || item.description || item.id || '').toString().toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <ConfirmDialog 
        isOpen={!!purgeConfirm}
        onClose={() => setPurgeConfirm(null)}
        onConfirm={handlePurgePermanent}
        title={purgeConfirm?.mode === 'all' ? "Empty This Trash Bin?" : "Purge Permanently?"}
        message="This action is irreversible. The data will be physically removed from your local archive forever."
        confirmText="Confirm Purge"
        type="danger"
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-rose-50 dark:bg-rose-900/10 p-8 rounded-[40px] border border-rose-100 dark:border-rose-900/30">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 bg-rose-600 rounded-[24px] flex items-center justify-center text-white shadow-xl shadow-rose-200 dark:shadow-none shrink-0"><Trash2 size={32} /></div>
           <div>
             <h3 className="text-3xl font-black uppercase tracking-tighter dark:text-white">Recycle Bin</h3>
             <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mt-1">Global Quarantine for Deleted Archives</p>
           </div>
        </div>
        {currentList.length > 0 && (
          <button 
            onClick={() => setPurgeConfirm({ type: activeTab, mode: 'all' })}
            className="px-8 py-4 bg-rose-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-rose-700 transition-all flex items-center gap-3 active:scale-95"
          >
            <ShieldAlert size={18} /> Empty {activeTab} Bin
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as TrashTab); setSearchTerm(''); }}
            className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 transition-all border shrink-0 ${
              activeTab === tab.id 
                ? 'bg-rose-600 border-rose-600 text-white shadow-lg' 
                : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            <span className={`px-2 py-0.5 rounded-lg text-[9px] ${activeTab === tab.id ? 'bg-white text-rose-600' : 'bg-slate-100 text-slate-400'}`}>{tab.count}</span>
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
         <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={`Search deleted ${activeTab}...`} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 pl-12 pr-6 outline-none text-xs font-bold dark:text-white"
            />
         </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entity Identity</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Secondary Data</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Value</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Restore / Purge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredList.map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-rose-500/5 group transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-black text-xs">
                          {item.id.toString().slice(-2)}
                       </div>
                       <div className="min-w-0">
                          <p className="font-black text-sm dark:text-white truncate uppercase tracking-tight">{item.name || item.description || `#INV-${item.id}`}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{item.sku || item.phone || item.category || 'System Log'}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                     Deleted Archive Point
                  </td>
                  <td className="px-8 py-5 text-right font-black text-slate-900 dark:text-white text-base">
                     {state.settings.currency}{(item.price || item.amount || item.total || 0).toLocaleString()}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                       <button 
                        onClick={() => handleRestore(activeTab, item.id)}
                        className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center gap-2 font-black text-[10px] uppercase"
                       >
                         <RotateCcw size={16}/> Restore
                       </button>
                       <button 
                        onClick={() => setPurgeConfirm({ type: activeTab, id: item.id, mode: 'single' })}
                        className="p-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                       >
                         <X size={16}/>
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredList.length === 0 && (
             <div className="py-32 text-center flex flex-col items-center gap-4 border-t border-dashed">
                <Trash2 size={48} className="text-slate-200" />
                <p className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-300">Quarantine zone is clear</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Trash;
