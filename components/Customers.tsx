
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users as UsersIcon, 
  Search, 
  Plus, 
  Phone, 
  X, 
  Trash2, 
  Edit, 
  ShoppingCart,
  Scale,
  CheckCircle2,
  DollarSign,
  History,
  Printer,
  FileText,
  TrendingUp,
  Award,
  Calendar,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Crown,
  ChevronRight,
  UserPlus,
  MessageCircle,
  PhoneCall,
  MapPin,
  Mail,
  MoreHorizontal,
  Cake,
  IdCard
} from 'lucide-react';
import { AppState, Customer, Invoice, LoanTransaction, View } from '../types';
import { translations } from '../translations';

interface Props {
  state: AppState;
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
  setCurrentView?: (view: View) => void;
}

type CustomerTab = 'overview' | 'history' | 'info';

const Customers: React.FC<Props> = ({ state, updateState, setCurrentView }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDebt, setFilterDebt] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  
  // Tab state with persistence
  const [activeTab, setActiveTab] = useState<CustomerTab>(() => {
    const saved = localStorage.getItem('sarvari_customer_active_tab');
    return (saved as CustomerTab) || 'overview';
  });

  // Save tab preference whenever it changes
  useEffect(() => {
    localStorage.setItem('sarvari_customer_active_tab', activeTab);
  }, [activeTab]);
  
  const [repayModal, setRepayModal] = useState<{customer: Customer, mode: 'debt' | 'repayment'} | null>(null);
  const [repayAmount, setRepayAmount] = useState<number | ''>('');
  const [repayNote, setRepayNote] = useState('');

  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({ 
    name: '', phone: '', email: '', address: '', company: '', notes: '', dob: '' 
  });

  const t = translations[state.settings.language || 'en'];

  const getTier = (spent: number) => {
    if (spent >= 5000) return { label: 'Gold VIP', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: Crown };
    if (spent >= 1500) return { label: 'Silver', color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800/50', icon: Award };
    return { label: 'Bronze', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', icon: Award };
  };

  const filteredCustomers = state.customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.phone.includes(searchTerm) || 
                          (c.company?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesDebt = filterDebt ? c.totalDebt > 0 : true;
    return matchesSearch && matchesDebt;
  }).sort((a, b) => b.totalSpent - a.totalSpent);

  const handleSaveCustomer = () => {
    if (!newCustomer.name || !newCustomer.phone) return alert("Required: Name & Phone");
    if (editingCustomer) {
      updateState('customers', state.customers.map(c => c.id === editingCustomer.id ? { ...c, ...newCustomer } as Customer : c));
    } else {
      const customer: Customer = { 
        id: Math.random().toString(36).substr(2, 9), 
        name: newCustomer.name || '', 
        email: newCustomer.email || '', 
        phone: newCustomer.phone || '', 
        address: newCustomer.address || '', 
        dob: newCustomer.dob || '',
        totalSpent: 0, 
        totalDebt: 0, 
        lastVisit: 'Never', 
        transactionCount: 0,
        loyaltyPoints: 0,
        notes: newCustomer.notes || '',
        company: newCustomer.company || ''
      };
      updateState('customers', [...state.customers, customer]);
    }
    setIsAdding(false); setEditingCustomer(null); setNewCustomer({ name: '', phone: '', email: '', address: '', company: '', notes: '', dob: '' });
  };

  const handleManualAdjustment = () => {
    if (!repayModal || !repayAmount || Number(repayAmount) <= 0) return;
    const amount = Number(repayAmount);
    const { customer, mode } = repayModal;
    
    const adjustment = mode === 'debt' ? amount : -amount;
    
    updateState('customers', state.customers.map(c => 
      c.id === customer.id ? { ...c, totalDebt: Math.max(0, (c.totalDebt || 0) + adjustment) } : c
    ));

    const trans: LoanTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      customerId: customer.id,
      date: new Date().toISOString(),
      amount: amount,
      type: mode === 'debt' ? 'debt' : 'repayment',
      note: repayNote || `Manual ${mode} entry`
    };
    updateState('loanTransactions', [...state.loanTransactions, trans]);
    
    setRepayModal(null); setRepayAmount(''); setRepayNote('');
    if (viewingCustomer?.id === customer.id) {
        setViewingCustomer({ ...viewingCustomer, totalDebt: Math.max(0, (viewingCustomer.totalDebt || 0) + adjustment) });
    }
  };

  const deleteCustomer = (id: string) => { 
    if (confirm(t.delete + '?')) updateState('customers', state.customers.filter(c => c.id !== id)); 
  };

  const getHistory = (cid: string) => {
    const invs = state.invoices.filter(i => i.customerId === cid).map(i => ({ date: i.date, type: 'Sale', amount: i.total, ref: i.id, status: i.status }));
    const trans = state.loanTransactions.filter(t => t.customerId === cid).map(t => ({ date: t.date, type: t.type === 'debt' ? 'Manual Debt' : 'Repayment', amount: t.amount, ref: t.id, status: 'complete' }));
    return [...invs, ...trans].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const handlePrintCard = (c: Customer) => {
    const printSection = document.getElementById('print-section');
    if (!printSection) return;

    const tier = getTier(c.totalSpent);
    const html = `
      <div style="width: 85mm; height: 55mm; padding: 6mm; font-family: 'Inter', sans-serif; border: 2px solid #4f46e5; border-radius: 12px; background: white; color: black; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; position: relative; margin: 0 auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 10;">
          <div style="font-weight: 900; font-size: 14px; color: #4f46e5; text-transform: uppercase; letter-spacing: 1px;">${state.settings.shopName}</div>
          <div style="font-size: 8px; font-weight: 800; color: ${tier.label.includes('Gold') ? '#b45309' : '#64748b'}; background: ${tier.label.includes('Gold') ? '#fef3c7' : '#f1f5f9'}; padding: 2px 8px; border-radius: 100px; text-transform: uppercase;">${tier.label} Member</div>
        </div>
        
        <div style="margin-top: 4mm; position: relative; z-index: 10;">
          <div style="font-size: 20px; font-weight: 900; line-height: 1.1; margin-bottom: 2px; color: #1e293b;">${c.name}</div>
          <div style="font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">${c.company || 'Preferred Customer'}</div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: flex-end; position: relative; z-index: 10;">
          <div style="font-size: 10px; line-height: 1.5; color: #334155;">
            <div style="font-weight: 700; display: flex; align-items: center; gap: 4px;">📞 ${c.phone}</div>
            <div style="font-weight: 500; opacity: 0.8;">${c.email || ''}</div>
            <div style="font-size: 8px; color: #94a3b8; text-transform: uppercase; margin-top: 4px; font-family: monospace;">ID: ${c.id.substring(0, 12).toUpperCase()}</div>
          </div>
          <div style="text-align: right;">
             <div style="width: 12mm; height: 12mm; background: #4f46e5; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; color: white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                SSP
             </div>
          </div>
        </div>
        
        <div style="position: absolute; right: -15mm; bottom: -15mm; width: 50mm; height: 50mm; background: #4f46e5; opacity: 0.03; border-radius: 50%;"></div>
        <div style="position: absolute; left: -10mm; top: -10mm; width: 30mm; height: 30mm; background: #4f46e5; opacity: 0.02; border-radius: 50%;"></div>
      </div>
    `;

    printSection.innerHTML = html;
    window.print();
    printSection.innerHTML = '';
  };

  const handlePrintStatement = (c: Customer) => {
    const history = getHistory(c.id);
    const printSection = document.getElementById('print-section');
    if (!printSection) return;

    const html = `
      <div style="padding: 20mm; font-family: 'Inter', sans-serif;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
          <div>
            <h1 style="margin: 0; color: #4f46e5; font-size: 24px;">${state.settings.shopName}</h1>
            <p style="margin: 5px 0; color: #64748b; font-size: 12px;">Customer Financial Statement</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-weight: bold;">Date: ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 30px;">
          <h2 style="margin: 0 0 10px 0; font-size: 18px;">${c.name}</h2>
          <p style="margin: 0; color: #64748b; font-size: 14px;">${c.phone}</p>
          <p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px;">${c.address || 'No address provided'}</p>
        </div>
        <div style="display: flex; gap: 20px; margin-bottom: 30px;">
          <div style="flex: 1; padding: 15px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <p style="margin: 0; font-size: 10px; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.1em;">Current Debt</p>
            <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: 900; color: #ef4444;">${state.settings.currency}${c.totalDebt.toLocaleString()}</p>
          </div>
          <div style="flex: 1; padding: 15px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <p style="margin: 0; font-size: 10px; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.1em;">Lifetime Value</p>
            <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: 900; color: #4f46e5;">${state.settings.currency}${c.totalSpent.toLocaleString()}</p>
          </div>
        </div>
        <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin-bottom: 15px;">Transaction History</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead style="background: #f1f5f9;">
            <tr>
              <th style="padding: 10px; text-align: left;">Date</th>
              <th style="padding: 10px; text-align: left;">Type</th>
              <th style="padding: 10px; text-align: left;">Reference</th>
              <th style="padding: 10px; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${history.map(h => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px;">${new Date(h.date).toLocaleDateString()}</td>
                <td style="padding: 10px;">${h.type}</td>
                <td style="padding: 10px;">#${h.ref}</td>
                <td style="padding: 10px; text-align: right; font-weight: bold;">${state.settings.currency}${h.amount.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    printSection.innerHTML = html;
    window.print();
    printSection.innerHTML = '';
  };

  const detailTabs: { id: CustomerTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'history', label: 'Transaction History' },
    { id: 'info', label: 'Detailed Info' }
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-500 max-w-full">
      {/* Search and Quick Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Find clients by name, phone or company..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-2.5 pl-10 pr-4 outline-none text-xs dark:text-white" 
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto shrink-0">
          <button 
            onClick={() => setFilterDebt(!filterDebt)} 
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl font-black text-[10px] uppercase border transition-all flex items-center justify-center gap-2 ${filterDebt ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white dark:bg-slate-900 text-slate-400'}`}
          >
            <Scale size={14}/> Debtors
          </button>
          <button 
            onClick={() => { setEditingCustomer(null); setIsAdding(true); }} 
            className="flex-1 md:flex-none px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-indigo-100 dark:shadow-none transition-all flex items-center justify-center gap-2"
          >
            <UserPlus size={16} /> <span className="hidden sm:inline">Add Client</span>
          </button>
        </div>
      </div>

      {/* Main Grid/List */}
      <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Client Identity</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Volume</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Balance</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCustomers.map((c) => {
                const tier = getTier(c.totalSpent);
                return (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all cursor-pointer group" onClick={() => { setViewingCustomer(c); }}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-sm group-hover:scale-110 transition-transform">
                          {c.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-[12px] dark:text-slate-200 truncate">{c.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black uppercase ${tier.bg} ${tier.color}`}>
                         <tier.icon size={10}/> {tier.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                       <p className="font-black text-indigo-600 text-[13px]">{state.settings.currency}{c.totalSpent.toLocaleString()}</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase">{c.transactionCount || 0} Transactions</p>
                    </td>
                    <td className="px-6 py-4">
                       {c.totalDebt > 0 ? (
                         <span className="text-rose-600 font-black text-[12px] bg-rose-50 dark:bg-rose-900/20 px-2.5 py-1 rounded-lg border border-rose-100 dark:border-rose-900/50">
                           {state.settings.currency}{c.totalDebt.toLocaleString()}
                         </span>
                       ) : (
                         <span className="text-emerald-500 font-black text-[9px] uppercase tracking-widest">Paid Up</span>
                       )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all" onClick={e => e.stopPropagation()}>
                        <button onClick={() => handlePrintCard(c)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl" title="Print Membership Card"><IdCard size={16}/></button>
                        <button onClick={() => setRepayModal({customer: c, mode: 'repayment'})} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl" title="Payment"><DollarSign size={16}/></button>
                        <button onClick={() => {setEditingCustomer(c); setNewCustomer(c); setIsAdding(true);}} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl"><Edit size={16}/></button>
                        <button onClick={() => deleteCustomer(c.id)} className="p-2 text-slate-300 hover:text-rose-600"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredCustomers.length === 0 && (
          <div className="py-24 text-center">
             <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4"><UsersIcon size={32} className="text-slate-200" /></div>
             <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">Zero clients matched the pulse</p>
          </div>
        )}
      </div>

      {/* Manual Entry Modal */}
      {repayModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in duration-200">
              <div className="flex items-center gap-4 mb-8">
                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${repayModal.mode === 'debt' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {repayModal.mode === 'debt' ? <ArrowDownLeft size={24}/> : <DollarSign size={24}/>}
                 </div>
                 <div>
                    <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">{repayModal.mode === 'debt' ? 'Manual Debt' : 'Record Payment'}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{repayModal.customer.name}</p>
                 </div>
              </div>
              <div className="space-y-4 mb-8">
                 <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Current Balance</p>
                    <p className={`text-2xl font-black ${repayModal.customer.totalDebt > 0 ? 'text-rose-600' : 'text-emerald-500'}`}>
                      {state.settings.currency}{repayModal.customer.totalDebt.toLocaleString()}
                    </p>
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Adjustment Amount</label>
                    <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-black">{state.settings.currency}</span>
                       <input autoFocus type="number" value={repayAmount} onChange={e => setRepayAmount(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3.5 pl-10 pr-4 font-black text-lg dark:text-white" placeholder="0.00" />
                    </div>
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Reference Note</label>
                    <input type="text" value={repayNote} onChange={e => setRepayNote(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 font-bold text-xs dark:text-white" placeholder="Reason for adjustment..." />
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                 <button onClick={() => setRepayModal(null)} className="py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-black text-[10px] uppercase dark:text-slate-400">Cancel</button>
                 <button onClick={handleManualAdjustment} className={`py-4 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg ${repayModal.mode === 'debt' ? 'bg-rose-600' : 'bg-emerald-600'}`}>Confirm Entry</button>
              </div>
           </div>
        </div>
      )}

      {/* Advanced Profile Modal */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-t-[40px] sm:rounded-[48px] w-full max-w-5xl h-[92vh] sm:h-[85vh] shadow-2xl relative flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-300">
              {/* Header */}
              <header className="p-6 sm:p-8 lg:p-10 border-b flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-slate-900 z-10 shrink-0 gap-6">
                 <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center font-black text-2xl shadow-xl shadow-indigo-100 dark:shadow-none shrink-0 border-4 border-white dark:border-slate-800">
                      {viewingCustomer.name.charAt(0)}
                    </div>
                    <div className="text-center sm:text-left">
                       <h4 className="font-black text-2xl dark:text-white leading-tight">{viewingCustomer.name}</h4>
                       <div className="flex items-center justify-center sm:justify-start gap-3 mt-1.5">
                          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{viewingCustomer.phone}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${getTier(viewingCustomer.totalSpent).bg} ${getTier(viewingCustomer.totalSpent).color}`}>
                            {getTier(viewingCustomer.totalSpent).label}
                          </span>
                       </div>
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                    <button onClick={() => handlePrintCard(viewingCustomer)} className="p-3 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100" title="Membership Card"><IdCard size={20}/></button>
                    <button onClick={() => handlePrintStatement(viewingCustomer)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 hover:text-indigo-600 transition-all" title="Financial Statement"><Printer size={20}/></button>
                    <button onClick={() => setViewingCustomer(null)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all ml-4"><X size={24}/></button>
                 </div>
              </header>

              {/* Tabs */}
              <div className="px-6 sm:px-10 border-b flex gap-6 shrink-0 bg-white dark:bg-slate-900">
                 {detailTabs.map(t => (
                   <button 
                     key={t.id} 
                     onClick={() => setActiveTab(t.id)} 
                     className={`py-4 text-[11px] font-black uppercase tracking-widest relative transition-all ${activeTab === t.id ? 'text-indigo-600' : 'text-slate-400'}`}
                   >
                     {t.label}
                     {activeTab === t.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full" />}
                   </button>
                 ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/20">
                 {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-2 duration-300">
                       <div className="lg:col-span-1 space-y-6">
                          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border shadow-sm relative overflow-hidden group">
                             <p className="text-[10px] font-black text-rose-400 uppercase mb-2 tracking-widest">Active Balance</p>
                             <h5 className="text-4xl font-black text-rose-600 tracking-tighter relative z-10">{state.settings.currency}{viewingCustomer.totalDebt.toLocaleString()}</h5>
                             <Scale className="absolute -bottom-2 -right-2 text-rose-500/5 group-hover:scale-110 transition-transform" size={120}/>
                          </div>
                          <div className="bg-indigo-600 p-8 rounded-[32px] text-white shadow-xl relative overflow-hidden group">
                             <div className="relative z-10">
                                <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Loyalty Wallet</p>
                                <p className="text-4xl font-black">{(viewingCustomer.loyaltyPoints || 0).toLocaleString()} <span className="text-xs text-indigo-200">PTS</span></p>
                             </div>
                             <Award className="absolute -bottom-4 -right-4 text-white/10 group-hover:scale-110 transition-transform" size={120} />
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border shadow-sm grid grid-cols-2 gap-2">
                             <button onClick={() => setRepayModal({customer: viewingCustomer, mode: 'repayment'})} className="flex flex-col items-center justify-center p-4 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all"><DollarSign size={20}/><span className="text-[9px] font-black uppercase mt-1">Payment</span></button>
                             <button onClick={() => setRepayModal({customer: viewingCustomer, mode: 'debt'})} className="flex flex-col items-center justify-center p-4 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-600 hover:text-white transition-all"><ArrowDownLeft size={20}/><span className="text-[9px] font-black uppercase mt-1">Add Debt</span></button>
                             <button onClick={() => { updateState('settings', {...state.settings, defaultCustomerId: viewingCustomer.id}); if(setCurrentView) setCurrentView('terminal'); setViewingCustomer(null); }} className="col-span-2 flex items-center justify-center gap-3 py-4 bg-slate-900 text-white dark:bg-indigo-600 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:opacity-90 transition-all"><ShoppingCart size={18}/> Initiate Sale for {viewingCustomer.name.split(' ')[0]}</button>
                          </div>
                       </div>

                       <div className="lg:col-span-2 space-y-6">
                          <h5 className="font-black text-[12px] uppercase tracking-widest dark:text-white flex items-center gap-2"><TrendingUp size={18} className="text-indigo-600" /> Executive Summary</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div className="p-6 bg-white dark:bg-slate-900 border rounded-[28px]"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Lifetime Spent</p><p className="text-2xl font-black dark:text-white">{state.settings.currency}{viewingCustomer.totalSpent.toLocaleString()}</p></div>
                             <div className="p-6 bg-white dark:bg-slate-900 border rounded-[28px]"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Order Frequency</p><p className="text-2xl font-black dark:text-white">{viewingCustomer.transactionCount} Visits</p></div>
                             <div className="p-6 bg-white dark:bg-slate-900 border rounded-[28px]"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Average Ticket</p><p className="text-2xl font-black dark:text-white">{state.settings.currency}{(viewingCustomer.totalSpent / (viewingCustomer.transactionCount || 1)).toLocaleString(undefined, {maximumFractionDigits: 0})}</p></div>
                             <div className="p-6 bg-white dark:bg-slate-900 border rounded-[28px]"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Recent Activity</p><p className="text-2xl font-black dark:text-white">{viewingCustomer.lastVisit}</p></div>
                          </div>
                          <div className="p-8 bg-white dark:bg-slate-900 border rounded-[32px]"><h6 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Internal Notes</h6><p className="text-sm font-medium dark:text-slate-300 italic">"{viewingCustomer.notes || 'No historical behavioral notes logged for this profile.'}"</p></div>
                       </div>
                    </div>
                 )}

                 {activeTab === 'history' && (
                    <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                       <div className="flex items-center justify-between mb-2">
                          <h5 className="font-black text-[12px] uppercase tracking-widest dark:text-white flex items-center gap-2"><History size={18} className="text-indigo-600" /> Chronological Timeline</h5>
                          <button onClick={() => handlePrintStatement(viewingCustomer)} className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">Export Statement</button>
                       </div>
                       <div className="space-y-3">
                          {getHistory(viewingCustomer.id).map((h, i) => (
                             <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-[24px] border shadow-sm flex items-center justify-between hover:border-indigo-100 transition-all group">
                                <div className="flex items-center gap-5">
                                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${h.type === 'Sale' ? 'bg-indigo-50 text-indigo-600' : h.type === 'Manual Debt' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                      {h.type === 'Sale' ? <FileText size={18}/> : h.type === 'Manual Debt' ? <ArrowDownLeft size={18}/> : <ArrowUpRight size={18}/>}
                                   </div>
                                   <div>
                                      <p className="text-sm font-black dark:text-white">{h.type} <span className="text-slate-400 font-bold ml-1 opacity-60">#{h.ref}</span></p>
                                      <div className="flex items-center gap-2 mt-0.5">
                                         <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(h.date).toLocaleDateString()} at {new Date(h.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                         <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase ${h.status === 'paid' || h.status === 'complete' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{h.status}</span>
                                      </div>
                                   </div>
                                </div>
                                <div className="text-right">
                                   <p className={`text-lg font-black ${h.type === 'Repayment' ? 'text-emerald-600' : h.type === 'Manual Debt' ? 'text-rose-600' : 'dark:text-white'}`}>
                                      {h.type === 'Repayment' ? '-' : h.type === 'Manual Debt' ? '+' : ''}{state.settings.currency}{h.amount.toLocaleString()}
                                   </p>
                                </div>
                             </div>
                          ))}
                          {getHistory(viewingCustomer.id).length === 0 && <div className="py-24 text-center opacity-30 text-[11px] font-black uppercase tracking-[0.2em]">Archival Ledger Empty</div>}
                       </div>
                    </div>
                 )}

                 {activeTab === 'info' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-2 duration-300">
                       <div className="space-y-6">
                          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border shadow-sm space-y-6">
                             <h6 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">Contact Channels</h6>
                             <div className="space-y-4">
                                <a href={`tel:${viewingCustomer.phone}`} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-indigo-50 transition-all group">
                                   <PhoneCall size={20} className="text-slate-400 group-hover:text-indigo-600" />
                                   <div><p className="text-[10px] font-black text-slate-400 uppercase">Primary Phone</p><p className="font-bold dark:text-white">{viewingCustomer.phone}</p></div>
                                </a>
                                <a href={`https://wa.me/${viewingCustomer.phone.replace(/\s+/g, '')}`} target="_blank" className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-emerald-50 transition-all group">
                                   <MessageCircle size={20} className="text-slate-400 group-hover:text-emerald-600" />
                                   <div><p className="text-[10px] font-black text-slate-400 uppercase">WhatsApp Link</p><p className="font-bold dark:text-white">Encrypted Chat</p></div>
                                </a>
                                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl group">
                                   <Mail size={20} className="text-slate-400" />
                                   <div><p className="text-[10px] font-black text-slate-400 uppercase">Email Index</p><p className="font-bold dark:text-white truncate max-w-[150px]">{viewingCustomer.email || 'None Indexed'}</p></div>
                                </a>
                                {viewingCustomer.dob && (
                                   <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl group">
                                      <Cake size={20} className="text-slate-400" />
                                      <div><p className="text-[10px] font-black text-slate-400 uppercase">Birthday</p><p className="font-bold dark:text-white">{new Date(viewingCustomer.dob).toLocaleDateString()}</p></div>
                                   </div>
                                )}
                             </div>
                          </div>
                       </div>
                       <div className="space-y-6">
                          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border shadow-sm space-y-6">
                             <h6 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">Identity Location</h6>
                             <div className="flex items-start gap-4 p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                                <MapPin size={24} className="text-slate-400 mt-1 shrink-0" />
                                <div><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Registered Address</p><p className="text-sm font-bold dark:text-slate-200 leading-relaxed">{viewingCustomer.address || 'Address information not registered for this profile.'}</p></div>
                             </div>
                             {viewingCustomer.company && (
                               <div className="flex items-start gap-4 p-5 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100/50">
                                  <UsersIcon size={24} className="text-indigo-600 mt-1 shrink-0" />
                                  <div><p className="text-[10px] font-black text-indigo-600 uppercase mb-1">Organization</p><p className="text-sm font-bold dark:text-slate-200">{viewingCustomer.company}</p></div>
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

      {/* Add/Edit Client Modal */}
      {isAdding && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-xl shadow-2xl relative p-8 sm:p-12 animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
               <h3 className="text-3xl font-black mb-8 dark:text-white uppercase tracking-tighter">{editingCustomer ? "Update Client" : "Register Client"}</h3>
               <div className="space-y-6 mb-10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                     <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Identity Name</label><input autoFocus type="text" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-3.5 px-6 font-bold text-sm dark:text-white shadow-inner outline-none transition-all" placeholder="Legal Name" /></div>
                     <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Phone Number</label><input type="text" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-3.5 px-6 font-bold text-sm dark:text-white shadow-inner outline-none transition-all" placeholder="07XX XXX XXX" /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                     <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Organization</label><input type="text" value={newCustomer.company} onChange={e => setNewCustomer({...newCustomer, company: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-3.5 px-6 font-bold text-sm dark:text-white shadow-inner outline-none transition-all" placeholder="Optional Company" /></div>
                     <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Birthday (DOB)</label><input type="date" value={newCustomer.dob} onChange={e => setNewCustomer({...newCustomer, dob: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-3.5 px-6 font-bold text-sm dark:text-white shadow-inner outline-none transition-all" /></div>
                  </div>
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email Index</label><input type="text" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-3.5 px-6 font-bold text-sm dark:text-white shadow-inner outline-none transition-all" placeholder="client@sarvari.pro" /></div>
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Physical Address</label><input type="text" value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-3.5 px-6 font-bold text-sm dark:text-white shadow-inner outline-none transition-all" placeholder="City / Street / Landmark" /></div>
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Behavioral Notes</label><textarea rows={3} value={newCustomer.notes} onChange={e => setNewCustomer({...newCustomer, notes: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-6 font-bold text-sm dark:text-white shadow-inner outline-none transition-all resize-none" placeholder="Special requirements or credit history notes..." /></div>
               </div>
               <div className="flex gap-4">
                  <button onClick={() => setIsAdding(false)} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-3xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-200 transition-all">Discard</button>
                  <button onClick={handleSaveCustomer} className="flex-[2] py-5 bg-indigo-600 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-[0.98]">Confirm Profile</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default Customers;
