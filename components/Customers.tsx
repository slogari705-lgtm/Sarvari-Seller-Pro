import React, { useState, useMemo } from 'react';
import { 
  Users as UsersIcon, 
  Search, 
  Plus, 
  Mail, 
  Phone, 
  Calendar,
  MessageSquare, 
  MapPin, 
  X, 
  History, 
  CreditCard, 
  ChevronRight, 
  Building2, 
  Tag, 
  User, 
  PlusCircle, 
  Scale, 
  DollarSign, 
  CheckCircle2, 
  Eye, 
  Trash2, 
  Star, 
  Edit, 
  TrendingUp, 
  Crown, 
  Wallet, 
  Printer, 
  FileText, 
  ShoppingCart,
  ArrowUpRight,
  ExternalLink,
  Filter,
  Download
} from 'lucide-react';
import { AppState, Customer, Invoice, LoanTransaction, View } from '../types';
import { translations } from '../translations';

interface Props {
  state: AppState;
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
  setCurrentView?: (view: View) => void;
}

const Customers: React.FC<Props> = ({ state, updateState, setCurrentView }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDebt, setFilterDebt] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<'overview' | 'history'>('overview');
  
  // Action Modals State
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [amountInput, setAmountInput] = useState<number | ''>('');
  const [noteInput, setNoteInput] = useState('');
  
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({
    tags: [],
    skills: [],
    loyaltyPoints: 0
  });

  const t = translations[state.settings.language || 'en'];

  const filteredCustomers = useMemo(() => {
    return state.customers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.phone.includes(searchTerm) ||
        (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesDebt = filterDebt ? c.totalDebt > 0 : true;
      return matchesSearch && matchesDebt;
    }).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [state.customers, searchTerm, filterDebt]);

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setNewCustomer({ ...customer });
    setIsAdding(true);
    setViewingCustomer(null);
  };

  const handleSaveCustomer = () => {
    if (!newCustomer.name || !newCustomer.phone) {
      alert("Name and Phone are required.");
      return;
    }
    
    if (editingCustomer) {
      const updatedCustomers = state.customers.map(c => 
        c.id === editingCustomer.id ? { ...c, ...newCustomer } as Customer : c
      );
      updateState('customers', updatedCustomers);
    } else {
      const customer: Customer = {
        id: Math.random().toString(36).substr(2, 9),
        name: newCustomer.name,
        email: newCustomer.email || '',
        phone: newCustomer.phone,
        address: newCustomer.address || '',
        company: newCustomer.company || '',
        notes: newCustomer.notes || '',
        tags: newCustomer.tags || [],
        skills: newCustomer.skills || [],
        totalSpent: 0,
        totalDebt: 0,
        lastVisit: 'New Client',
        transactionCount: 0,
        loyaltyPoints: 0
      };
      updateState('customers', [...state.customers, customer]);
    }

    setIsAdding(false);
    setEditingCustomer(null);
    setNewCustomer({ tags: [], skills: [], loyaltyPoints: 0 });
  };

  const deleteCustomer = (id: string) => {
    if (window.confirm(t.delete + '?')) {
      const customer = state.customers.find(c => c.id === id);
      if (customer && customer.totalDebt > 0) {
        if (!window.confirm("CRITICAL: This customer has outstanding debt. Deleting will remove balance records. Proceed?")) {
          return;
        }
      }
      updateState('customers', state.customers.filter(c => c.id !== id));
      if (viewingCustomer?.id === id) setViewingCustomer(null);
    }
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const handleRepayDebt = () => {
    if (!viewingCustomer || !amountInput || Number(amountInput) <= 0) return;
    
    const paymentAmount = Number(amountInput);
    const updatedCustomers = state.customers.map(c => {
      if (c.id === viewingCustomer.id) {
        return { 
          ...c, 
          totalDebt: Math.max(0, (c.totalDebt || 0) - paymentAmount),
          loyaltyPoints: (c.loyaltyPoints || 0) + Math.floor(paymentAmount / 10)
        };
      }
      return c;
    });

    const newTrans: LoanTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      customerId: viewingCustomer.id,
      date: new Date().toISOString(),
      amount: paymentAmount,
      type: 'repayment',
      note: noteInput || 'Manual repayment'
    };

    updateState('customers', updatedCustomers);
    updateState('loanTransactions', [...state.loanTransactions, newTrans]);
    
    setAmountInput('');
    setNoteInput('');
    setShowRepaymentModal(false);
    setViewingCustomer(updatedCustomers.find(c => c.id === viewingCustomer.id) || null);
  };

  const getTier = (spent: number) => {
    if (spent > 50000) return { label: 'VIP', color: 'bg-indigo-600', icon: Crown };
    if (spent > 10000) return { label: 'Gold', color: 'bg-amber-500', icon: Star };
    return { label: 'Silver', color: 'bg-slate-400', icon: Award };
  };

  const exportCustomers = () => {
    const headers = ["ID", "Name", "Phone", "Email", "Debt", "Total Spent", "Company"];
    const rows = state.customers.map(c => [c.id, c.name, c.phone, c.email, c.totalDebt, c.totalSpent, c.company]);
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sarvari_customers.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
           <h3 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">Customer HQ</h3>
           <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Management suite for {state.customers.length} business partners</p>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={exportCustomers}
             className="p-4 bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
             title="Export CSV"
           >
             <Download size={20} />
           </button>
           <button 
            onClick={() => {
              setEditingCustomer(null);
              setNewCustomer({ tags: [], skills: [], loyaltyPoints: 0 });
              setIsAdding(true);
            }}
            className="flex items-center justify-center gap-3 px-10 py-5 bg-indigo-600 text-white rounded-[24px] font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95"
          >
            <Plus size={20} strokeWidth={3} />
            Add New Client
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-center gap-4">
         <div className="relative flex-1 w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Filter by name, organization or phone (+93...)" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[24px] py-4.5 pl-14 pr-6 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-sm dark:text-white transition-all shadow-sm"
            />
         </div>
         <div className="flex items-center gap-3 w-full lg:w-auto">
            <button 
                onClick={() => setFilterDebt(!filterDebt)}
                className={`flex-1 lg:flex-none flex items-center justify-center gap-3 px-8 py-4.5 rounded-[24px] text-xs font-black uppercase tracking-widest transition-all border ${
                filterDebt 
                    ? 'bg-rose-600 border-rose-600 text-white shadow-xl shadow-rose-100 dark:shadow-none' 
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50'
                }`}
            >
                <Scale size={18} />
                {filterDebt ? 'Viewing Debtors' : 'Show Debtors'}
            </button>
         </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
         <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 rounded-2xl flex items-center justify-center"><UsersIcon size={24}/></div>
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Active Clients</p>
               <h5 className="text-xl font-black dark:text-white">{state.customers.length}</h5>
            </div>
         </div>
         <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center"><TrendingUp size={24}/></div>
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg. Customer Value</p>
               <h5 className="text-xl font-black dark:text-white">{state.settings.currency}{(state.customers.reduce((a, b) => a + b.totalSpent, 0) / (state.customers.length || 1)).toFixed(0)}</h5>
            </div>
         </div>
         <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-500/10 text-rose-600 rounded-2xl flex items-center justify-center"><Scale size={24}/></div>
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Credit Exposure</p>
               <h5 className="text-xl font-black dark:text-white">{state.settings.currency}{state.customers.reduce((a, b) => a + b.totalDebt, 0).toLocaleString()}</h5>
            </div>
         </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identity & Tier</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Info</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Lifetime Volume</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Credit Health</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Quick Connect</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCustomers.map((c) => {
                const tier = getTier(c.totalSpent);
                const riskPercent = Math.min(100, (c.totalDebt / (c.totalSpent || 1)) * 100);
                return (
                  <tr key={c.id} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-500/5 transition-all group cursor-pointer" onClick={() => setViewingCustomer(c)}>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                         <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-xl group-hover:scale-110 transition-transform shadow-sm relative">
                            {c.name.charAt(0)}
                            <div className={`absolute -top-1 -right-1 p-1 rounded-full text-white shadow-lg ${tier.color}`}>
                               <tier.icon size={10} fill="currentColor" />
                            </div>
                         </div>
                         <div>
                            <p className="font-black text-slate-800 dark:text-slate-200 text-sm">{c.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter flex items-center gap-1.5 mt-0.5"><Building2 size={10}/> {c.company || 'Private Client'}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <p className="text-xs font-black text-slate-700 dark:text-slate-400 font-mono tracking-tight">{c.phone}</p>
                       <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{c.email || 'No email'}</p>
                    </td>
                    <td className="px-8 py-6 text-right font-black text-slate-800 dark:text-slate-300">
                       <span className="text-xs text-slate-400 font-bold mr-1">{state.settings.currency}</span>
                       {c.totalSpent.toLocaleString()}
                    </td>
                    <td className="px-8 py-6">
                       {c.totalDebt > 0 ? (
                          <div className="space-y-1.5">
                             <div className="flex justify-between items-center text-[9px] font-black uppercase">
                                <span className="text-rose-600">{state.settings.currency}{c.totalDebt.toLocaleString()}</span>
                                <span className="text-slate-400">{riskPercent.toFixed(0)}% Risk</span>
                             </div>
                             <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-1000 ${riskPercent > 50 ? 'bg-rose-600' : riskPercent > 20 ? 'bg-amber-500' : 'bg-indigo-500'}`} 
                                  style={{ width: `${riskPercent}%` }}
                                ></div>
                             </div>
                          </div>
                       ) : (
                          <div className="flex items-center gap-2 text-emerald-600">
                             <CheckCircle2 size={14} />
                             <span className="text-[9px] font-black uppercase">Clear Account</span>
                          </div>
                       )}
                    </td>
                    <td className="px-8 py-6 text-right">
                       <button 
                        onClick={(e) => { e.stopPropagation(); openWhatsApp(c.phone); }} 
                        className="inline-flex items-center justify-center p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all group/wa"
                       >
                         <MessageSquare size={18} />
                         <span className="max-w-0 overflow-hidden group-hover/wa:max-w-[80px] group-hover/wa:ml-2 transition-all text-[10px] font-black uppercase">WhatsApp</span>
                       </button>
                    </td>
                    <td className="px-8 py-6 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                         <button onClick={() => setViewingCustomer(c)} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="View Profile"><Eye size={18}/></button>
                         <button onClick={() => handleOpenEdit(c)} className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all" title="Edit"><Edit size={18}/></button>
                         <button onClick={() => deleteCustomer(c.id)} className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100" title="Delete"><Trash2 size={18}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredCustomers.length === 0 && (
           <div className="py-40 text-center">
              <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200 dark:text-slate-700">
                 <UsersIcon size={48} strokeWidth={1} />
              </div>
              <p className="font-black text-sm uppercase tracking-[0.3em] text-slate-300 dark:text-slate-600">No matching accounts found</p>
              <button onClick={() => {setSearchTerm(''); setFilterDebt(false);}} className="mt-4 text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:underline">Reset Directory Filter</button>
           </div>
        )}
      </div>

      {/* Customer Profile Intelligence Modal */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[48px] w-full max-w-5xl h-full lg:h-[85vh] shadow-2xl relative flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white/5">
              <header className="p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900 z-10">
                 <div className="flex items-center gap-8">
                    <div className="w-24 h-24 bg-indigo-600 text-white rounded-[32px] flex items-center justify-center font-black text-4xl shadow-2xl shadow-indigo-500/20 relative">
                       {viewingCustomer.name.charAt(0)}
                       <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-amber-400 text-white rounded-2xl flex items-center justify-center shadow-lg border-4 border-white dark:border-slate-900">
                          <Crown size={20} fill="currentColor"/>
                       </div>
                    </div>
                    <div>
                       <h3 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">{viewingCustomer.name}</h3>
                       <div className="flex items-center gap-6 mt-3">
                          <div className="flex items-center gap-2 text-sm font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-1.5 rounded-full cursor-pointer hover:scale-105 transition-transform" onClick={() => openWhatsApp(viewingCustomer.phone)}>
                             <MessageSquare size={16}/> {viewingCustomer.phone}
                          </div>
                          <span className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400"><Building2 size={14}/> {viewingCustomer.company || 'Private Portfolio'}</span>
                       </div>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <button onClick={() => handleOpenEdit(viewingCustomer)} className="p-4 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-[24px] transition-all"><Edit size={24}/></button>
                    <button onClick={() => setViewingCustomer(null)} className="p-4 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-[24px] transition-all"><X size={24}/></button>
                 </div>
              </header>

              <div className="flex items-center px-10 gap-10 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
                 {[
                   { id: 'overview', label: 'Financial Performance', icon: TrendingUp },
                   { id: 'history', label: 'Audit Timeline', icon: History }
                 ].map(tab => (
                   <button 
                     key={tab.id}
                     onClick={() => setActiveProfileTab(tab.id as any)}
                     className={`py-6 flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative ${activeProfileTab === tab.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                   >
                     <tab.icon size={16}/> {tab.label}
                     {activeProfileTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full shadow-[0_-4px_10px_rgba(99,102,241,0.5)]"></div>}
                   </button>
                 ))}
              </div>

              <div className="flex-1 overflow-y-auto p-10 bg-slate-50/40 dark:bg-slate-950/20 custom-scrollbar">
                 {activeProfileTab === 'overview' ? (
                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="space-y-8">
                         <div className="p-10 bg-white dark:bg-slate-900 rounded-[48px] shadow-sm relative overflow-hidden group border-2 border-transparent hover:border-rose-100 transition-all">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Live Credit Balance</p>
                            <h5 className={`text-5xl font-black tracking-tighter ${viewingCustomer.totalDebt > 0 ? 'text-rose-600' : 'text-emerald-500'}`}>
                               {state.settings.currency}{viewingCustomer.totalDebt.toLocaleString()}
                            </h5>
                            <div className="grid grid-cols-2 gap-3 mt-10">
                               <button onClick={() => setShowRepaymentModal(true)} className="py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-200 dark:shadow-none hover:bg-emerald-700 transition-all active:scale-95">Collect Pay</button>
                               <button onClick={() => { setViewingCustomer(null); setCurrentView!('terminal'); }} className="py-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all">New Order</button>
                            </div>
                            <Scale className="absolute -bottom-6 -right-6 text-slate-50 dark:text-white/5" size={160} />
                         </div>

                         <div className="p-8 bg-white dark:bg-slate-900 rounded-[40px] shadow-sm space-y-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Connect Logistics</p>
                            <div className="space-y-4">
                               <div className="flex items-center gap-4 text-sm font-bold text-slate-600 dark:text-slate-300">
                                  <div className="w-11 h-11 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 shrink-0 shadow-inner"><Mail size={18}/></div>
                                  <span className="truncate">{viewingCustomer.email || 'No email attached'}</span>
                               </div>
                               <div className="flex items-center gap-4 text-sm font-bold text-slate-600 dark:text-slate-300">
                                  <div className="w-11 h-11 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 shrink-0 shadow-inner"><MapPin size={18}/></div>
                                  <span className="leading-tight">{viewingCustomer.address || 'Address not listed'}</span>
                               </div>
                            </div>
                         </div>
                      </div>

                      <div className="lg:col-span-2 space-y-8">
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="p-10 bg-indigo-600 rounded-[48px] text-white shadow-2xl relative overflow-hidden group">
                               <div className="relative z-10">
                                  <div className="flex items-center justify-between mb-4">
                                     <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em]">Gross Lifetime Buy</p>
                                     <TrendingUp size={24} className="text-white/20" />
                                  </div>
                                  <h5 className="text-4xl font-black tracking-tighter">{state.settings.currency}{viewingCustomer.totalSpent.toLocaleString()}</h5>
                                  <p className="text-xs font-bold text-indigo-200 uppercase mt-4">{viewingCustomer.transactionCount} Total Invoices Issued</p>
                               </div>
                               <ShoppingCart className="absolute -bottom-6 -right-6 text-white/5 group-hover:scale-110 transition-transform" size={180} />
                            </div>
                            <div className="p-10 bg-white dark:bg-slate-900 rounded-[48px] shadow-sm border border-slate-100 dark:border-slate-800">
                               <div className="flex items-center justify-between mb-4">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Loyalty Rewards</p>
                                  <Crown size={24} className="text-amber-500" />
                               </div>
                               <h5 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">{viewingCustomer.loyaltyPoints?.toLocaleString() || 0}</h5>
                               <p className="text-xs font-bold text-slate-400 uppercase mt-4">Redeemable Credit Points</p>
                            </div>
                         </div>

                         <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm p-10 border border-slate-100 dark:border-slate-800">
                            <h4 className="font-black text-xs uppercase tracking-[0.2em] mb-8 text-slate-400 flex items-center gap-2"><FileText size={14} className="text-indigo-600"/> Administrator Notes</h4>
                            <p className="text-slate-600 dark:text-slate-400 font-medium italic leading-relaxed text-sm">
                               {viewingCustomer.notes || "No special instructions or internal history recorded for this client profile. Use 'Edit' to add business intelligence notes."}
                            </p>
                         </div>
                      </div>
                   </div>
                 ) : (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4">
                       <div className="bg-white dark:bg-slate-900 rounded-[48px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                          <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 flex items-center justify-between">
                             <h4 className="font-black text-xs uppercase tracking-widest dark:text-slate-400">Transaction Chronology</h4>
                             <span className="text-[9px] font-black px-4 py-1.5 bg-white dark:bg-slate-800 rounded-full border border-slate-100 shadow-sm">Real-time DB Sync</span>
                          </div>
                          <div className="divide-y divide-slate-100 dark:divide-slate-800">
                             {[...state.invoices.filter(i => i.customerId === viewingCustomer.id), ...state.loanTransactions.filter(t => t.customerId === viewingCustomer.id && !t.invoiceId)]
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map((item: any) => {
                                   const isInvoice = 'items' in item;
                                   return (
                                      <div key={item.id} className="p-8 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                                         <div className="flex items-center gap-8">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${isInvoice ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                                               {isInvoice ? <FileText size={24}/> : <Wallet size={24}/>}
                                            </div>
                                            <div>
                                               <p className="font-black text-sm dark:text-white uppercase tracking-tight">{isInvoice ? `Sales Order #${item.id.padStart(4,'0')}` : `Financial Credit Entry`}</p>
                                               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{new Date(item.date).toLocaleDateString()} • {new Date(item.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                            </div>
                                         </div>
                                         <div className="text-right">
                                            <p className={`text-xl font-black ${isInvoice ? 'text-slate-800 dark:text-white' : item.type === 'repayment' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                               {isInvoice ? '' : item.type === 'repayment' ? '-' : '+'}{state.settings.currency}{(isInvoice ? item.total : item.amount).toLocaleString()}
                                            </p>
                                            <div className="flex items-center justify-end gap-3 mt-1.5 opacity-0 group-hover:opacity-100 transition-all">
                                               {isInvoice && <button className="text-[10px] font-black text-indigo-600 uppercase hover:underline">Download Receipt</button>}
                                               <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">REF-{item.id.slice(-6).toUpperCase()}</span>
                                            </div>
                                         </div>
                                      </div>
                                   )
                                })}
                             {state.invoices.filter(i => i.customerId === viewingCustomer.id).length === 0 && (
                                <div className="text-center py-32 text-slate-300 flex flex-col items-center gap-4">
                                   <History size={48} className="opacity-20" />
                                   <p className="font-black text-xs uppercase tracking-widest">Historical Ledger Empty</p>
                                </div>
                             )}
                          </div>
                       </div>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Debt Repayment Modal */}
      {showRepaymentModal && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in duration-300 border border-white/5">
               <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm"><CheckCircle2 size={24}/></div>
                  <div>
                     <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Process Repay</h3>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{viewingCustomer?.name}</p>
                  </div>
               </div>
               
               <div className="space-y-6 mb-10">
                  <div className="p-6 bg-rose-50 dark:bg-rose-900/20 rounded-[28px] border border-rose-100 dark:border-rose-900/30 text-center">
                     <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Total Outstanding</p>
                     <h4 className="text-3xl font-black text-rose-600">{state.settings.currency}{viewingCustomer?.totalDebt.toLocaleString()}</h4>
                  </div>
                  <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Payment Received</label>
                     <div className="relative">
                        <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
                        <input 
                           type="number" 
                           value={amountInput}
                           onChange={(e) => setAmountInput(e.target.value === '' ? '' : Number(e.target.value))}
                           className="w-full bg-slate-50 dark:bg-slate-800 border-4 border-transparent focus:border-indigo-500 rounded-[28px] py-6 pl-14 pr-6 font-black text-2xl outline-none transition-all shadow-inner dark:text-white"
                           placeholder="0.00"
                           autoFocus
                        />
                     </div>
                  </div>
                  <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Memo</label>
                     <input 
                        type="text" 
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-6 font-bold text-sm outline-none shadow-sm dark:text-white"
                        placeholder="e.g. Cash settlement in store"
                     />
                  </div>
               </div>
               <div className="flex gap-4">
                  <button onClick={() => setShowRepaymentModal(false)} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black rounded-[24px] uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all">Cancel</button>
                  <button onClick={handleRepayDebt} className="flex-[2] py-5 bg-emerald-600 text-white font-black rounded-[24px] uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-200 dark:shadow-none hover:bg-emerald-700 transition-all active:scale-95">Confirm Payment</button>
               </div>
            </div>
         </div>
      )}

      {/* Professional Customer Registration Modal */}
      {isAdding && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[48px] w-full max-w-2xl shadow-2xl relative flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-300 border border-white/5">
               <header className="p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10 shrink-0">
                  <div className="flex items-center gap-5">
                     <div className="w-14 h-14 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center shadow-xl shadow-indigo-500/20"><User size={28}/></div>
                     <div>
                        <h3 className="text-3xl font-black dark:text-white uppercase tracking-tighter">{editingCustomer ? 'Update Profile' : 'New Client Registration'}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Official CRM database entry</p>
                     </div>
                  </div>
                  <button onClick={() => setIsAdding(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-400 transition-colors"><X size={28}/></button>
               </header>
               <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                  <div className="space-y-12">
                     <section className="space-y-8">
                        <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.25em] border-b border-indigo-50 dark:border-indigo-900/30 pb-3 flex items-center gap-2">
                           <User size={14}/> Identity & Contact Channels
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                           <div className="sm:col-span-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Full Legal Name *</label>
                              <div className="relative">
                                 <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
                                 <input 
                                    type="text" 
                                    value={newCustomer.name || ''} 
                                    onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[20px] py-4.5 pl-14 pr-6 outline-none font-bold text-lg dark:text-white shadow-inner transition-all"
                                    placeholder="SefatUllah Sarvari"
                                    autoFocus
                                 />
                              </div>
                           </div>
                           <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Mobile Access *</label>
                              <div className="relative">
                                 <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
                                 <input 
                                    type="text" 
                                    value={newCustomer.phone || ''} 
                                    onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[20px] py-4.5 pl-14 pr-6 outline-none font-bold text-base dark:text-white shadow-inner transition-all"
                                    placeholder="+93795950136"
                                 />
                              </div>
                           </div>
                           <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Electronic Mail</label>
                              <div className="relative">
                                 <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
                                 <input 
                                    type="text" 
                                    value={newCustomer.email || ''} 
                                    onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[20px] py-4.5 pl-14 pr-6 outline-none font-bold text-base dark:text-white shadow-inner transition-all"
                                    placeholder="client@sarvari.af"
                                 />
                              </div>
                           </div>
                        </div>
                     </section>

                     <section className="space-y-8">
                        <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.25em] border-b border-indigo-50 dark:border-indigo-900/30 pb-3 flex items-center gap-2">
                           <Building2 size={14}/> Business Logistics & IQ
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                           <div className="sm:col-span-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Headquarters / Physical Address</label>
                              <div className="relative">
                                 <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
                                 <input 
                                    type="text" 
                                    value={newCustomer.address || ''} 
                                    onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[20px] py-4.5 pl-14 pr-6 outline-none font-bold text-base dark:text-white shadow-inner transition-all"
                                    placeholder="Wardak/ Jaghatoo/ Chino"
                                 />
                              </div>
                           </div>
                           <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Company / Organization</label>
                              <div className="relative">
                                 <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
                                 <input 
                                    type="text" 
                                    value={newCustomer.company || ''} 
                                    onChange={(e) => setNewCustomer({...newCustomer, company: e.target.value})}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[20px] py-4.5 pl-14 pr-6 outline-none font-bold text-base dark:text-white shadow-inner transition-all"
                                    placeholder="Sarvari Enterprise"
                                 />
                              </div>
                           </div>
                           <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Classification Tag</label>
                              <div className="relative">
                                 <Tag className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
                                 <input 
                                    type="text" 
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[20px] py-4.5 pl-14 pr-6 outline-none font-bold text-base dark:text-white shadow-inner transition-all"
                                    placeholder="Wholesale Partner"
                                 />
                              </div>
                           </div>
                           <div className="sm:col-span-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Internal Professional Bio / Notes</label>
                              <textarea 
                                 value={newCustomer.notes || ''} 
                                 onChange={(e) => setNewCustomer({...newCustomer, notes: e.target.value})}
                                 className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[24px] py-6 px-8 outline-none font-bold text-sm dark:text-white shadow-inner min-h-[120px] resize-none"
                                 placeholder="Important business history, preferences, and payment habits..."
                              />
                           </div>
                        </div>
                     </section>
                  </div>
               </div>
               <footer className="p-10 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky bottom-0 z-10 flex gap-6 shrink-0">
                  <button onClick={() => setIsAdding(false)} className="flex-1 py-6 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black rounded-[28px] uppercase tracking-widest text-[11px] hover:bg-slate-200 transition-all">Discard Changes</button>
                  <button onClick={handleSaveCustomer} className="flex-[2] py-6 bg-indigo-600 text-white font-black rounded-[28px] uppercase tracking-widest text-[11px] shadow-2xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95">Complete Registration</button>
               </footer>
            </div>
         </div>
      )}
    </div>
  );
};

const Award = ({ size, ...props }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="8" r="6" />
    <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
  </svg>
);

export default Customers;