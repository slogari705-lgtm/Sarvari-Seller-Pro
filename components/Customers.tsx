
import React, { useState, useMemo } from 'react';
import { 
  Users as UsersIcon, 
  Search, 
  Plus, 
  Mail, 
  Phone, 
  Calendar,
  ExternalLink,
  MapPin,
  Cake,
  X,
  History,
  ShoppingBag,
  CreditCard,
  Banknote,
  ChevronRight,
  Package,
  Building2,
  Tag,
  StickyNote,
  Briefcase,
  User,
  ArrowRight,
  PlusCircle,
  Scale,
  DollarSign,
  CheckCircle2,
  Eye,
  Trash2,
  Award,
  Zap,
  Star,
  Activity,
  Filter,
  MoreVertical,
  Edit,
  TrendingUp,
  Crown,
  AlertOctagon,
  Wallet,
  Cpu,
  Bookmark,
  Printer,
  FileText,
  PlusSquare,
  ShoppingBasket,
  Smartphone
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
  const [invoiceToPrint, setInvoiceToPrint] = useState<Invoice | null>(null);
  
  // Action Modals State
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [amountInput, setAmountInput] = useState<number | ''>('');
  const [noteInput, setNoteInput] = useState('');

  // Tag & Skill input state for modal
  const [tagInput, setTagInput] = useState('');
  
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({
    tags: [],
    skills: [],
    loyaltyPoints: 0
  });

  const t = translations[state.settings.language || 'en'];

  const getLoyaltyTier = (spent: number) => {
    if (spent >= 5000) return { name: t.gold, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: Crown };
    if (spent >= 1500) return { name: t.silver, color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800/50', icon: Award };
    return { name: t.bronze, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', icon: Star };
  };

  const filteredCustomers = state.customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.phone.includes(searchTerm) ||
      c.company?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDebt = filterDebt ? c.totalDebt > 0 : true;
    return matchesSearch && matchesDebt;
  });

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setNewCustomer({ ...customer });
    setIsAdding(true);
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
      if (viewingCustomer?.id === editingCustomer.id) {
        setViewingCustomer({ ...viewingCustomer, ...newCustomer } as Customer);
      }
    } else {
      const customer: Customer = {
        id: Math.random().toString(36).substr(2, 9),
        name: newCustomer.name,
        email: newCustomer.email || '',
        phone: newCustomer.phone,
        address: newCustomer.address || '',
        dob: newCustomer.dob,
        company: newCustomer.company || '',
        notes: newCustomer.notes || '',
        tags: newCustomer.tags || [],
        skills: newCustomer.skills || [],
        totalSpent: 0,
        totalDebt: 0,
        lastVisit: 'Never',
        transactionCount: 0,
        loyaltyPoints: Number(newCustomer.loyaltyPoints) || 0
      };
      updateState('customers', [...state.customers, customer]);
    }

    setIsAdding(false);
    setEditingCustomer(null);
    setNewCustomer({ tags: [], skills: [], loyaltyPoints: 0 });
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      const currentTags = newCustomer.tags || [];
      if (!currentTags.includes(tagInput.trim())) {
        setNewCustomer({ ...newCustomer, tags: [...currentTags, tagInput.trim()] });
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setNewCustomer({ ...newCustomer, tags: (newCustomer.tags || []).filter(t => t !== tag) });
  };

  const deleteCustomer = (id: string) => {
    if (confirm(t.delete + '?')) {
      updateState('customers', state.customers.filter(c => c.id !== id));
      if (viewingCustomer?.id === id) setViewingCustomer(null);
    }
  };

  const handleRepayDebt = () => {
    if (!viewingCustomer || !amountInput || Number(amountInput) <= 0) return;
    
    const paymentAmount = Number(amountInput);
    let remainingPayment = paymentAmount;
    const updatedInvoices = state.invoices.map(inv => ({...inv})); 
    
    const customerInvoices = updatedInvoices
      .filter(inv => inv.customerId === viewingCustomer.id && (inv.status === 'partial' || inv.status === 'unpaid'))
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
      note: noteInput || 'Manual repayment via profile'
    };

    updateState('invoices', updatedInvoices);
    updateState('customers', updatedCustomers);
    updateState('loanTransactions', [...state.loanTransactions, newTrans]);
    
    setAmountInput('');
    setNoteInput('');
    setShowRepaymentModal(false);
    setViewingCustomer(updatedCustomers.find(c => c.id === viewingCustomer.id) || null);
  };

  const handleAddDebt = () => {
    if (!viewingCustomer || !amountInput || Number(amountInput) <= 0) return;
    
    const amount = Number(amountInput);
    const updatedCustomers = state.customers.map(c => {
      if (c.id === viewingCustomer.id) {
        return { 
          ...c, 
          totalDebt: (c.totalDebt || 0) + amount,
          lastVisit: new Date().toISOString().split('T')[0]
        };
      }
      return c;
    });

    const newTrans: LoanTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      customerId: viewingCustomer.id,
      date: new Date().toISOString(),
      amount: amount,
      type: 'debt',
      note: noteInput || 'Manual debt addition'
    };

    updateState('customers', updatedCustomers);
    updateState('loanTransactions', [...state.loanTransactions, newTrans]);
    
    setAmountInput('');
    setNoteInput('');
    setShowDebtModal(false);
    setViewingCustomer(updatedCustomers.find(c => c.id === viewingCustomer.id) || null);
  };

  const handleCreateNewInvoiceForCustomer = (customerId: string) => {
    updateState('settings', { ...state.settings, defaultCustomerId: customerId });
    if (setCurrentView) {
      setCurrentView('terminal');
    }
  };

  const generatePrintHTML = (inv: Invoice, layout: 'a4' | 'thermal') => {
    const customer = state.customers.find(c => c.id === inv.customerId);
    const dateStr = new Date(inv.date).toLocaleDateString();
    const timeStr = new Date(inv.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const currency = state.settings.currency;

    return `
      <div style="padding: 20px; font-family: monospace;">
        <h1>${state.settings.shopName}</h1>
        <p>Invoice #${inv.id}</p>
        <p>Date: ${dateStr} ${timeStr}</p>
        <p>Customer: ${customer?.name || 'Walk-in'}</p>
        <hr/>
        ${inv.items.map(i => `<p>${i.name} x${i.quantity} - ${currency}${i.price * i.quantity}</p>`).join('')}
        <hr/>
        <h3>Total: ${currency}${inv.total}</h3>
      </div>
    `;
  };

  const handlePrint = (inv: Invoice) => {
      const printSection = document.getElementById('print-section');
      if (!printSection) return;
      printSection.innerHTML = '';
      const frame = document.createElement('div');
      frame.innerHTML = generatePrintHTML(inv, 'a4');
      printSection.appendChild(frame);
      setTimeout(() => {
        window.print();
        printSection.innerHTML = '';
      }, 600);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h3 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">{t.customers}</h3>
           <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest">Manage client relationships and debts</p>
        </div>
        <button 
          onClick={() => {
            setEditingCustomer(null);
            setNewCustomer({ tags: [], skills: [], loyaltyPoints: 0 });
            setIsAdding(true);
          }}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Plus size={18} strokeWidth={3} />
          {t.createCustomer}
        </button>
      </div>

      <div className="flex items-center gap-4">
         <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={t.search} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm dark:text-white transition-all shadow-sm"
            />
         </div>
         <button 
            onClick={() => setFilterDebt(!filterDebt)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border ${
              filterDebt 
                ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-900/20 dark:border-rose-800' 
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Scale size={18} className={filterDebt ? 'text-rose-600' : 'text-slate-400'} />
            Debtors Only
         </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.fullName}</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.phone}</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.totalSpent}</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.totalDebt}</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.lastVisit}</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCustomers.map((c) => (
                <tr key={c.id} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-500/5 transition-colors group cursor-pointer" onClick={() => setViewingCustomer(c)}>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-600 font-black text-sm">
                          {c.name.charAt(0)}
                       </div>
                       <div>
                          <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">{c.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{c.company}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-xs font-bold text-slate-500 dark:text-slate-400 font-mono">{c.phone}</td>
                  <td className="px-8 py-5 font-black text-slate-700 dark:text-slate-300">{state.settings.currency}{c.totalSpent.toLocaleString()}</td>
                  <td className="px-8 py-5">
                     {c.totalDebt > 0 ? (
                        <span className="text-rose-600 font-black">{state.settings.currency}{c.totalDebt.toLocaleString()}</span>
                     ) : (
                        <span className="text-emerald-500 font-bold text-xs uppercase tracking-wide">Settled</span>
                     )}
                  </td>
                  <td className="px-8 py-5 text-xs font-bold text-slate-400 uppercase">{c.lastVisit}</td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                       <button onClick={() => handleOpenEdit(c)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit size={16}/></button>
                       <button onClick={() => deleteCustomer(c.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredCustomers.length === 0 && (
           <div className="py-20 text-center text-slate-300">
              <UsersIcon size={48} className="mx-auto mb-4 opacity-20"/>
              <p className="font-black text-xs uppercase tracking-widest">No customers match query</p>
           </div>
        )}
      </div>

      {/* Viewing Customer Modal (Details) */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-4xl max-h-[90vh] shadow-2xl relative flex flex-col overflow-hidden animate-in zoom-in duration-300">
              <header className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-indigo-600 text-white rounded-[20px] flex items-center justify-center font-black text-2xl shadow-xl">
                       {viewingCustomer.name.charAt(0)}
                    </div>
                    <div>
                       <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{viewingCustomer.name}</h3>
                       <div className="flex items-center gap-3 mt-1">
                          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-black uppercase text-slate-500">{viewingCustomer.id}</span>
                          <span className="flex items-center gap-1 text-xs font-bold text-slate-400"><Phone size={12}/> {viewingCustomer.phone}</span>
                       </div>
                    </div>
                 </div>
                 <button onClick={() => setViewingCustomer(null)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400"><X size={24}/></button>
              </header>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="space-y-6">
                       <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-[28px] border border-slate-100 dark:border-slate-700">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Financial Status</p>
                          <div className="space-y-4">
                             <div>
                                <span className="text-xs text-slate-400 font-bold block mb-1">Total Debt</span>
                                <span className={`text-3xl font-black ${viewingCustomer.totalDebt > 0 ? 'text-rose-600' : 'text-emerald-500'}`}>
                                   {state.settings.currency}{viewingCustomer.totalDebt.toLocaleString()}
                                </span>
                             </div>
                             <div>
                                <span className="text-xs text-slate-400 font-bold block mb-1">Lifetime Spend</span>
                                <span className="text-xl font-black text-slate-700 dark:text-white">
                                   {state.settings.currency}{viewingCustomer.totalSpent.toLocaleString()}
                                </span>
                             </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 mt-6">
                             <button 
                                onClick={() => { setShowDebtModal(true); setAmountInput(''); }}
                                className="py-3 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-200 transition-colors"
                             >
                                + Add Debt
                             </button>
                             <button 
                                onClick={() => { setShowRepaymentModal(true); setAmountInput(''); }}
                                className="py-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-200 transition-colors"
                             >
                                Repay
                             </button>
                          </div>
                       </div>
                       
                       <div className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px]">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Quick Actions</p>
                          <button 
                             onClick={() => { setViewingCustomer(null); handleCreateNewInvoiceForCustomer(viewingCustomer.id); }}
                             className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                          >
                             <ShoppingCart size={16}/> New Sale
                          </button>
                       </div>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <History size={14}/> Recent Transactions
                       </h4>
                       <div className="space-y-4">
                          {[...state.invoices.filter(i => i.customerId === viewingCustomer.id), ...state.loanTransactions.filter(t => t.customerId === viewingCustomer.id && !t.invoiceId)]
                             .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                             .slice(0, 10)
                             .map((item: any) => {
                                const isInvoice = 'items' in item;
                                return (
                                   <div key={item.id} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-between group hover:border-indigo-200 transition-colors">
                                      <div className="flex items-center gap-4">
                                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isInvoice ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                                            {isInvoice ? <FileText size={18}/> : <Scale size={18}/>}
                                         </div>
                                         <div>
                                            <p className="font-bold text-sm dark:text-white">
                                               {isInvoice ? `Invoice #${item.id}` : `Transaction: ${item.type}`}
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(item.date).toLocaleDateString()}</p>
                                         </div>
                                      </div>
                                      <div className="text-right">
                                         <p className="font-black text-sm dark:text-white">
                                            {state.settings.currency}{(isInvoice ? item.total : item.amount).toLocaleString()}
                                         </p>
                                         {isInvoice && (
                                            <button onClick={() => handlePrint(item)} className="text-[10px] text-indigo-500 font-bold hover:underline flex items-center gap-1 justify-end">
                                               <Printer size={10}/> Print
                                            </button>
                                         )}
                                      </div>
                                   </div>
                                )
                             })}
                             {state.invoices.filter(i => i.customerId === viewingCustomer.id).length === 0 && (
                                <div className="text-center py-10 text-slate-300">
                                   <p className="text-xs font-black uppercase tracking-widest">No history available</p>
                                </div>
                             )}
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Repayment Modal */}
      {showRepaymentModal && viewingCustomer && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in duration-200">
               <h3 className="text-xl font-black mb-6 dark:text-white">Record Repayment</h3>
               <div className="space-y-4 mb-8">
                  <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Amount</label>
                     <input 
                        type="number" 
                        value={amountInput}
                        onChange={(e) => setAmountInput(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 font-black text-xl outline-none focus:border-emerald-500"
                        placeholder="0.00"
                        autoFocus
                     />
                  </div>
                  <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Note</label>
                     <input 
                        type="text" 
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl py-3 px-4 font-bold text-sm outline-none focus:border-emerald-500"
                        placeholder="Optional note"
                     />
                  </div>
               </div>
               <div className="flex gap-3">
                  <button onClick={() => setShowRepaymentModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-xs">Cancel</button>
                  <button onClick={handleRepayDebt} className="flex-1 py-4 bg-emerald-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-lg hover:bg-emerald-700">Confirm</button>
               </div>
            </div>
         </div>
      )}

      {/* Debt Modal */}
      {showDebtModal && viewingCustomer && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in duration-200">
               <h3 className="text-xl font-black mb-6 dark:text-white">Add Debt Adjustment</h3>
               <div className="space-y-4 mb-8">
                  <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Amount</label>
                     <input 
                        type="number" 
                        value={amountInput}
                        onChange={(e) => setAmountInput(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 font-black text-xl outline-none focus:border-rose-500"
                        placeholder="0.00"
                        autoFocus
                     />
                  </div>
                  <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Reason</label>
                     <input 
                        type="text" 
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl py-3 px-4 font-bold text-sm outline-none focus:border-rose-500"
                        placeholder="e.g. Previous balance"
                     />
                  </div>
               </div>
               <div className="flex gap-3">
                  <button onClick={() => setShowDebtModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-xs">Cancel</button>
                  <button onClick={handleAddDebt} className="flex-1 py-4 bg-rose-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-lg hover:bg-rose-700">Add Debt</button>
               </div>
            </div>
         </div>
      )}

      {/* Add Customer Modal */}
      {isAdding && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-2xl shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in duration-300">
               <header className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter">{editingCustomer ? t.edit : t.createCustomer}</h3>
                  <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400"><X size={24}/></button>
               </header>
               <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                     <div className="sm:col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t.fullName} *</label>
                        <input 
                           type="text" 
                           value={newCustomer.name || ''} 
                           onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                           className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-3 px-4 outline-none font-bold text-sm dark:text-white"
                        />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t.phone} *</label>
                        <input 
                           type="text" 
                           value={newCustomer.phone || ''} 
                           onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                           className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-3 px-4 outline-none font-bold text-sm dark:text-white"
                        />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t.email}</label>
                        <input 
                           type="text" 
                           value={newCustomer.email || ''} 
                           onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                           className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-3 px-4 outline-none font-bold text-sm dark:text-white"
                        />
                     </div>
                     <div className="sm:col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t.address}</label>
                        <input 
                           type="text" 
                           value={newCustomer.address || ''} 
                           onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                           className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-3 px-4 outline-none font-bold text-sm dark:text-white"
                        />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t.organization}</label>
                        <input 
                           type="text" 
                           value={newCustomer.company || ''} 
                           onChange={(e) => setNewCustomer({...newCustomer, company: e.target.value})}
                           className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-3 px-4 outline-none font-bold text-sm dark:text-white"
                        />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Tags</label>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                           {(newCustomer.tags || []).map(tag => (
                              <span key={tag} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1">
                                 {tag} <button onClick={() => handleRemoveTag(tag)}><X size={10}/></button>
                              </span>
                           ))}
                        </div>
                        <input 
                           type="text" 
                           value={tagInput}
                           onChange={(e) => setTagInput(e.target.value)}
                           onKeyDown={handleAddTag}
                           className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-3 px-4 outline-none font-bold text-sm dark:text-white"
                           placeholder="Type tag & press Enter"
                        />
                     </div>
                  </div>
               </div>
               <footer className="p-8 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                  <button onClick={() => setIsAdding(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-xs">{t.discard}</button>
                  <button onClick={handleSaveCustomer} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl">{t.save}</button>
               </footer>
            </div>
         </div>
      )}
    </div>
  );
};

export default Customers;
