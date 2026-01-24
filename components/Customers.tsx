
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
      // Update viewing state if currently looking at this profile
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
    const updatedInvoices = state.invoices.map(inv => ({...inv})); // Deep copy needed for mutation
    
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
          // Directly reduce total debt by the payment amount to ensure accuracy regardless of invoice matching
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
    
    // UI Updates
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
    
    // UI Updates
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

  // Print Logic
  const generatePrintHTML = (inv: Invoice, layout: 'a4' | 'thermal') => {
    const customer = state.customers.find(c => c.id === inv.customerId);
    const dateStr = new Date(inv.date).toLocaleDateString();
    const timeStr = new Date(inv.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const currency = state.settings.currency;

    const itemsHTML = inv.items.map((item, idx) => `
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 6px 4px; text-align: center; border-right: 1px solid #eee; font-size: 11px;">${idx + 1}</td>
        <td style="padding: 6px 8px; border-right: 1px solid #eee;">
          <div style="font-weight: 700; font-size: 12px;">${item.name}</div>
          <div style="font-size: 9px; text-transform: uppercase; color: #555;">${item.sku}</div>
        </td>
        <td style="padding: 6px 4px; text-align: center; font-weight: 600; border-right: 1px solid #eee; font-size: 11px;">${item.quantity}</td>
        <td style="padding: 6px 8px; text-align: right; font-weight: 600; border-right: 1px solid #eee; font-size: 11px;">${currency}${item.price.toLocaleString()}</td>
        <td style="padding: 6px 8px; text-align: right; font-weight: 700; font-size: 11px;">${currency}${(item.price * item.quantity).toLocaleString()}</td>
      </tr>
    `).join('');

    if (layout === 'thermal') {
        return `
          <div style="width: 80mm; padding: 5mm 2mm; font-family: 'Courier New', Courier, monospace; color: #000; line-height: 1.2; text-align: center;">
            <h2 style="margin: 0; font-size: 18px; font-weight: 800; text-transform: uppercase;">${state.settings.shopName}</h2>
            <p style="margin: 4px 0; font-size: 10px;">${state.settings.shopAddress || ''}</p>
            <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 8px 0; margin: 10px 0; font-size: 10px; text-align: left;">
              <div>INV: #${inv.id}</div>
              <div>DATE: ${dateStr} ${timeStr}</div>
              <div>USER: ${customer?.name || 'WALK-IN'}</div>
            </div>
            <div style="text-align: left; margin-bottom: 10px;">
              ${inv.items.map(i => `<div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 10px;"><span>${i.quantity}x ${i.name.substring(0,20)}</span><span>${currency}${(i.price * i.quantity).toLocaleString()}</span></div>`).join('')}
            </div>
            <div style="border-top: 1px solid #000; padding-top: 8px; font-weight: 800; font-size: 14px; display: flex; justify-content: space-between; text-align: left;">
              <span>TOTAL</span>
              <span>${currency}${inv.total.toLocaleString()}</span>
            </div>
            <p style="margin-top: 20px; font-size: 10px; border-top: 1px dashed #000; padding-top: 8px;">THANK YOU FOR YOUR VISIT</p>
          </div>
        `;
    }

    // Compact A4
    return `
        <div style="width: 210mm; padding: 12mm; font-family: 'Inter', Arial, sans-serif; color: #000; background: #fff; box-sizing: border-box;">
          <div style="display: flex; justify-content: space-between; border-bottom: 3px solid #000; padding-bottom: 15px; margin-bottom: 20px;">
            <div style="display: flex; gap: 15px; align-items: center;">
              <div style="width: 50px; height: 50px; background: #000; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 28px;">S</div>
              <div>
                <h1 style="margin: 0; font-size: 22px; font-weight: 900; text-transform: uppercase;">${state.settings.shopName}</h1>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: #444;">${state.settings.shopAddress || 'Authorized Dealer'} | ${state.settings.shopPhone || ''}</p>
              </div>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; font-size: 28px; font-weight: 900; text-transform: uppercase; color: #000;">INVOICE</h2>
              <p style="margin: 5px 0 0 0; font-size: 12px; font-weight: 700;">#${inv.id.padStart(6, '0')} | ${dateStr}</p>
            </div>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 25px; gap: 20px;">
            <div style="flex: 1; padding: 15px; border: 1px solid #ddd; border-radius: 12px; background: #f9f9f9;">
              <h4 style="margin: 0 0 8px 0; font-size: 9px; text-transform: uppercase; font-weight: 800; color: #666;">Bill To</h4>
              <p style="margin: 0; font-size: 16px; font-weight: 800; color: #000;">${customer?.name || 'Walk-in Guest'}</p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #444;">${customer?.phone || ''} ${customer?.address ? ' | ' + customer.address : ''}</p>
            </div>
            <div style="flex: 1; padding: 15px; border: 1px solid #ddd; border-radius: 12px; background: #f9f9f9;">
              <h4 style="margin: 0 0 8px 0; font-size: 9px; text-transform: uppercase; font-weight: 800; color: #666;">Payment Info</h4>
              <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;"><span style="font-weight: 600;">Method:</span><span style="font-weight: 800; text-transform: uppercase;">${inv.paymentMethod}</span></div>
              <div style="display: flex; justify-content: space-between; font-size: 11px;"><span style="font-weight: 600;">Status:</span><span style="font-weight: 800; text-transform: uppercase;">${inv.status}</span></div>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; border: 1px solid #000;">
            <thead style="background: #f0f0f0;">
              <tr style="border-bottom: 2px solid #000;">
                <th style="padding: 10px 8px; border-right: 1px solid #ccc; font-size: 10px; font-weight: 900; text-align: center; width: 40px;">#</th>
                <th style="padding: 10px 8px; text-align: left; border-right: 1px solid #ccc; font-size: 10px; font-weight: 900;">DESCRIPTION</th>
                <th style="padding: 10px 8px; border-right: 1px solid #ccc; font-size: 10px; font-weight: 900; text-align: center; width: 60px;">QTY</th>
                <th style="padding: 10px 8px; text-align: right; border-right: 1px solid #ccc; font-size: 10px; font-weight: 900; width: 100px;">PRICE</th>
                <th style="padding: 10px 8px; text-align: right; font-size: 10px; font-weight: 900; width: 110px;">TOTAL</th>
              </tr>
            </thead>
            <tbody>${itemsHTML}</tbody>
          </table>

          <div style="display: flex; justify-content: flex-end;">
            <div style="width: 280px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px; font-weight: 600; color: #555;">
                <span>SUBTOTAL</span>
                <span>${currency}${inv.subtotal.toLocaleString()}</span>
              </div>
              <div style="border-top: 3px solid #000; margin-top: 10px; padding-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 16px; font-weight: 900; color: #000;">TOTAL DUE</span>
                <span style="font-size: 24px; font-weight: 900;">${currency}${inv.total.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 15px; font-size: 10px; color: #666; text-align: center;">
             This document is computer generated and valid without signature.
          </div>
        </div>
    `;
  };

  const handlePrint = (layout: 'a4' | 'thermal') => {
    if (!invoiceToPrint) return;
    const printSection = document.getElementById('print-section');
    if (!printSection) return;
    
    printSection.innerHTML = '';
    const frame = document.createElement('div');
    frame.innerHTML = generatePrintHTML(invoiceToPrint, layout);
    printSection.appendChild(frame);
    
    // Slight delay to allow DOM to render
    setTimeout(() => {
      window.print();
      printSection.innerHTML = '';
      setInvoiceToPrint(null);
    }, 500);
  };

  const recentInvoicesForViewing = useMemo(() => {
    if (!viewingCustomer) return [];
    return state.invoices
      .filter(inv => inv.customerId === viewingCustomer.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);
  }, [viewingCustomer, state.invoices]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Toolbar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row gap-3 flex-1 max-w-4xl w-full">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={t.search} 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all shadow-sm dark:text-white" 
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setFilterDebt(!filterDebt)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black transition-all border ${
                filterDebt 
                ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-900/20 dark:border-rose-800' 
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Scale size={18} className={filterDebt ? 'text-rose-600' : 'text-slate-400'} />
              {t.debt}
            </button>
          </div>
        </div>
        
        <button 
          onClick={() => {
            setEditingCustomer(null);
            setNewCustomer({ tags: [], skills: [], loyaltyPoints: 0 });
            setIsAdding(true);
          }} 
          className="flex items-center justify-center gap-3 px-8 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Plus size={20} strokeWidth={3} />
          {t.createCustomer}
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
        {filteredCustomers.map((c) => {
          const tier = getLoyaltyTier(c.totalSpent);
          const hasDebt = c.totalDebt > 0;
          return (
            <div 
              key={c.id} 
              className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group overflow-hidden flex flex-col h-full"
            >
              <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                       <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-[22px] flex items-center justify-center font-black text-2xl group-hover:scale-105 transition-transform shrink-0 border border-slate-100 dark:border-slate-700">
                        {c.name.charAt(0)}
                       </div>
                       <div className={`absolute -bottom-1 -right-1 w-7 h-7 ${tier.bg} rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-sm`}>
                         <tier.icon size={12} className={tier.color} fill="currentColor" />
                       </div>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-black text-xl text-slate-800 dark:text-white truncate tracking-tight">{c.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                         <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${tier.bg} ${tier.color} border border-current opacity-70`}>{tier.name}</span>
                         <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                           <Zap size={10} className="text-amber-500 fill-amber-500"/> {c.loyaltyPoints || 0} pts
                         </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                     {hasDebt && (
                       <div className="flex items-center gap-1 bg-rose-50 text-rose-600 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase animate-pulse">
                         <AlertOctagon size={12}/>
                         {t.unpaid}
                       </div>
                     )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-transparent group-hover:border-indigo-100 dark:group-hover:border-indigo-900/30 transition-all">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.lifetimeValue}</p>
                     <div className="flex items-baseline gap-1">
                        <span className="text-xs font-black text-indigo-400">{state.settings.currency}</span>
                        <span className="text-xl font-black text-slate-800 dark:text-white">{c.totalSpent.toLocaleString()}</span>
                     </div>
                  </div>
                  <div className={`p-4 rounded-2xl border transition-all ${hasDebt ? 'bg-rose-50/50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-900/40' : 'bg-slate-50 dark:bg-slate-800/50 border-transparent'}`}>
                     <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${hasDebt ? 'text-rose-400' : 'text-slate-400'}`}>{t.debt}</p>
                     <div className="flex items-baseline gap-1">
                        <span className={`text-xs font-black ${hasDebt ? 'text-rose-400' : 'text-slate-300'}`}>{state.settings.currency}</span>
                        <span className={`text-xl font-black ${hasDebt ? 'text-rose-600 dark:text-rose-400' : 'text-slate-300'}`}>{(c.totalDebt || 0).toLocaleString()}</span>
                     </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
                   <div className="flex items-center gap-1.5"><History size={14}/> {c.transactionCount || 0} {t.transactions}</div>
                   <div className="flex items-center gap-1.5"><Calendar size={14}/> {t.lastVisit}: {c.lastVisit}</div>
                </div>
              </div>

              <div className="p-3 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex gap-1">
                   <button onClick={() => setViewingCustomer(c)} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all" title="View Profile"><Eye size={20}/></button>
                   <button onClick={() => handleOpenEdit(c)} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all" title="Edit Customer"><Edit size={20}/></button>
                   <button onClick={() => handleCreateNewInvoiceForCustomer(c.id)} className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all" title="New Sale"><ShoppingBag size={20}/></button>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => deleteCustomer(c.id)} className="p-3 text-slate-400 hover:text-rose-50 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"><Trash2 size={20}/></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Register/Edit Customer Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-4xl p-0 shadow-2xl relative animate-in zoom-in duration-300 max-h-[90vh] flex flex-col overflow-hidden">
            <header className="p-8 lg:p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0 sticky top-0 z-10">
              <h3 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                {editingCustomer ? t.editProduct.replace('Product', 'Customer') : t.createCustomer}
              </h3>
              <button onClick={() => { setIsAdding(false); setEditingCustomer(null); }} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-400 transition-colors"><X size={24} /></button>
            </header>
            
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div className="space-y-6">
                    <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                      <User size={14}/> {t.basicInfo}
                    </h4>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">{t.fullName} *</label>
                      <input autoFocus type="text" value={newCustomer.name || ''} onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-6 py-4 outline-none font-bold dark:text-white shadow-inner" placeholder="John Doe"/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">{t.phone} *</label>
                      <input type="text" value={newCustomer.phone || ''} onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-6 py-4 outline-none font-bold dark:text-white shadow-inner" placeholder="+1 234 567 890"/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">{t.email}</label>
                      <input type="email" value={newCustomer.email || ''} onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-6 py-4 outline-none font-bold dark:text-white shadow-inner" placeholder="john@example.com"/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Loyalty Points</label>
                      <input type="number" value={newCustomer.loyaltyPoints || ''} onChange={(e) => setNewCustomer({...newCustomer, loyaltyPoints: Number(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-6 py-4 outline-none font-bold dark:text-white shadow-inner" placeholder="0"/>
                    </div>
                 </div>
                 
                 <div className="space-y-6">
                    <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                      <Cpu size={14}/> Advanced Intelligence
                    </h4>
                    
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">{t.segmentationTags}</label>
                      <div className="flex gap-2 mb-3">
                         <div className="relative flex-1">
                            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16}/>
                            <input 
                              type="text" 
                              value={tagInput}
                              onChange={(e) => setTagInput(e.target.value)}
                              onKeyDown={handleAddTag}
                              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-xl py-3 pl-10 pr-4 outline-none font-bold text-xs dark:text-white" 
                              placeholder="Type & press Enter..."
                            />
                         </div>
                      </div>
                      <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                         {newCustomer.tags?.map(tag => (
                           <span key={tag} className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-3 py-1.5 rounded-lg text-[10px] font-black text-indigo-600 uppercase shadow-sm group">
                             {tag}
                             <button onClick={() => handleRemoveTag(tag)} className="text-slate-300 hover:text-rose-500"><X size={12}/></button>
                           </span>
                         ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">{t.organization}</label>
                      <div className="relative">
                         <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                         <input type="text" value={newCustomer.company || ''} onChange={(e) => setNewCustomer({...newCustomer, company: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 pl-12 pr-6 outline-none font-bold text-sm dark:text-white shadow-inner" placeholder="Company name"/>
                      </div>
                    </div>

                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">{t.notes}</label>
                       <textarea 
                          value={newCustomer.notes || ''}
                          onChange={(e) => setNewCustomer({...newCustomer, notes: e.target.value})}
                          className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-6 py-4 outline-none font-bold text-sm dark:text-white shadow-inner h-32 resize-none"
                          placeholder="Internal business notes..."
                       />
                    </div>
                 </div>
              </div>
            </div>

            <footer className="p-8 lg:p-10 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 flex gap-6 sticky bottom-0 z-10">
              <button onClick={() => { setIsAdding(false); setEditingCustomer(null); }} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-[24px] uppercase tracking-widest text-xs">{t.discard}</button>
              <button onClick={handleSaveCustomer} className="flex-[2] py-5 bg-indigo-600 text-white font-black rounded-[24px] hover:bg-indigo-700 transition-all shadow-xl uppercase tracking-widest text-xs active:scale-95">
                {editingCustomer ? 'Update Profile' : t.saveProfile}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* 360 Rich Profile View */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 p-0 lg:p-8">
          <div className="bg-white dark:bg-slate-900 w-full h-full lg:rounded-[48px] shadow-2xl flex flex-col lg:flex-row overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Sidebar info */}
            <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800 flex flex-col bg-slate-50/30 dark:bg-slate-950/20 shrink-0">
               <div className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                  <div className="flex justify-between items-start">
                     <button onClick={() => setViewingCustomer(null)} className="p-3 bg-white dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-rose-500 transition-colors shadow-sm border border-slate-100 dark:border-slate-800"><X size={24}/></button>
                     <div className="flex gap-2">
                        <button onClick={() => handleOpenEdit(viewingCustomer)} className="p-3 bg-white dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-indigo-600 transition-colors shadow-sm border border-slate-100 dark:border-slate-800"><Edit size={20}/></button>
                        <button onClick={() => deleteCustomer(viewingCustomer.id)} className="p-3 bg-white dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-rose-600 transition-colors shadow-sm border border-slate-100 dark:border-slate-800"><Trash2 size={20}/></button>
                     </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="relative inline-block">
                       <div className="w-32 h-32 bg-indigo-600 text-white rounded-[42px] flex items-center justify-center font-black text-5xl shadow-2xl mx-auto mb-6">
                         {viewingCustomer.name.charAt(0)}
                       </div>
                       <div className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800">
                         {(() => {
                           const tier = getLoyaltyTier(viewingCustomer.totalSpent);
                           const Icon = tier.icon;
                           return <Icon size={24} className={tier.color} fill="currentColor" />;
                         })()}
                       </div>
                    </div>
                    <h3 className="text-3xl font-black dark:text-white tracking-tighter">{viewingCustomer.name}</h3>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">{viewingCustomer.company || t.walkInCustomer}</p>
                  </div>

                  <div className="space-y-4">
                     <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center"><Phone size={18}/></div>
                        <div>
                           <p className="text-[9px] font-black text-slate-400 uppercase">{t.phone}</p>
                           <p className="text-sm font-bold dark:text-white">{viewingCustomer.phone}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center"><Mail size={18}/></div>
                        <div>
                           <p className="text-[9px] font-black text-slate-400 uppercase">{t.email}</p>
                           <p className="text-sm font-bold dark:text-white">{viewingCustomer.email || '—'}</p>
                        </div>
                     </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center gap-2">
                          <Zap size={14} className="text-amber-500 fill-amber-500"/>
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.loyalty} Balance</h5>
                       </div>
                       <span className="px-2 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-lg">{viewingCustomer.loyaltyPoints || 0} Points</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden mb-2">
                       <div className="bg-indigo-600 h-full transition-all duration-1000" style={{ width: `${Math.min(100, ((viewingCustomer.loyaltyPoints || 0) % 1000) / 10)}%` }}></div>
                    </div>
                  </div>
               </div>

               <div className="p-8 border-t border-slate-100 dark:border-slate-800">
                  <button onClick={() => setViewingCustomer(null)} className="w-full py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all shadow-xl">{t.closeProfile}</button>
               </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900">
               <header className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-20">
                  <div className="flex gap-8">
                     <button className="text-sm font-black text-indigo-600 border-b-4 border-indigo-600 pb-6 -mb-6 tracking-tight uppercase">Profile 360 View</button>
                  </div>
                  <button onClick={() => setViewingCustomer(null)} className="hidden lg:block p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400"><X size={28}/></button>
               </header>

               <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-slate-50/30 dark:bg-slate-950/20">
                  {/* Action Center */}
                  <div className="bg-white dark:bg-slate-900 rounded-[40px] p-6 lg:p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
                     <div className="flex items-center gap-3 mb-6">
                        <Zap size={18} className="text-indigo-600" fill="currentColor"/>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Quick Action Center</h4>
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <button 
                           onClick={() => handleCreateNewInvoiceForCustomer(viewingCustomer.id)}
                           className="flex flex-col items-center justify-center p-6 bg-indigo-600 text-white rounded-[32px] shadow-xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all group hover:-translate-y-1 active:translate-y-0"
                        >
                           <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                              <ShoppingBasket size={24} />
                           </div>
                           <span className="text-xs font-black uppercase tracking-widest">New Sale</span>
                        </button>

                        <button 
                           onClick={() => {
                             setAmountInput('');
                             setNoteInput('');
                             setShowRepaymentModal(true);
                           }}
                           className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm hover:border-emerald-500 transition-all group hover:-translate-y-1 active:translate-y-0"
                        >
                           <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                              <Wallet size={24} />
                           </div>
                           <span className="text-xs font-black uppercase tracking-widest">Record Repayment</span>
                        </button>

                        <button 
                           onClick={() => {
                             setAmountInput('');
                             setNoteInput('');
                             setShowDebtModal(true);
                           }}
                           className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm hover:border-rose-500 transition-all group hover:-translate-y-1 active:translate-y-0"
                        >
                           <div className="w-12 h-12 bg-rose-50 dark:bg-rose-500/10 text-rose-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                              <AlertOctagon size={24} />
                           </div>
                           <span className="text-xs font-black uppercase tracking-widest">Add Debt</span>
                        </button>

                        <button 
                           onClick={() => { if(setCurrentView) setCurrentView('invoices'); }}
                           className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm hover:border-amber-500 transition-all group hover:-translate-y-1 active:translate-y-0"
                        >
                           <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                              <FileText size={24} />
                           </div>
                           <span className="text-xs font-black uppercase tracking-widest">View Archives</span>
                        </button>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.lifetimeValue}</p>
                       <h5 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">{state.settings.currency}{viewingCustomer.totalSpent.toLocaleString()}</h5>
                       <TrendingUp className="absolute -bottom-2 -right-2 text-emerald-500/10 group-hover:scale-110 transition-transform" size={80} />
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.transactions}</p>
                       <h5 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">
                         {viewingCustomer.transactionCount || 0} <span className="text-xs text-slate-400 font-bold uppercase">Orders</span>
                       </h5>
                       <ShoppingBag className="absolute -bottom-2 -right-2 text-indigo-500/10 group-hover:scale-110 transition-transform" size={80} />
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.lastVisit}</p>
                       <h5 className="text-xl font-black text-slate-800 dark:text-white tracking-tighter mt-1">
                         {viewingCustomer.lastVisit}
                       </h5>
                       <Calendar className="absolute -bottom-2 -right-2 text-amber-500/10 group-hover:scale-110 transition-transform" size={80} />
                    </div>
                    <div className={`bg-white dark:bg-slate-900 p-8 rounded-[40px] border shadow-sm relative overflow-hidden group transition-all ${viewingCustomer.totalDebt > 0 ? 'border-rose-200 ring-4 ring-rose-50 dark:ring-rose-900/10' : 'border-slate-100 dark:border-slate-800'}`}>
                       <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${viewingCustomer.totalDebt > 0 ? 'text-rose-500' : 'text-slate-400'}`}>{t.totalDebt}</p>
                       <h5 className={`text-3xl font-black tracking-tighter ${viewingCustomer.totalDebt > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-white'}`}>
                        {state.settings.currency}{viewingCustomer.totalDebt.toLocaleString()}
                       </h5>
                       <Scale className="absolute -bottom-2 -right-2 text-rose-500/10 group-hover:scale-110 transition-transform" size={80} />
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row gap-8">
                     {/* History Timeline */}
                     <div className="flex-1 space-y-6">
                        <div className="flex items-center justify-between mb-2">
                           <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Activity size={18} className="text-indigo-600"/> Engagement Timeline</h4>
                        </div>
                        
                        <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-1 before:bg-slate-100 dark:before:bg-slate-800 before:rounded-full">
                           {state.loanTransactions
                             .filter(t => t.customerId === viewingCustomer.id)
                             .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                             .map((trans) => (
                              <div key={trans.id} className="relative group">
                                 <div className={`absolute -left-[30px] top-1.5 w-3 h-3 rounded-full border-4 border-white dark:border-slate-900 z-10 ${
                                   trans.type === 'debt' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 
                                   trans.type === 'repayment' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 
                                   'bg-amber-500'
                                 }`}></div>
                                 <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm group-hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-3">
                                       <div className="space-y-1">
                                          <div className="flex items-center gap-2">
                                             <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                                               trans.type === 'debt' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                                             }`}>
                                                {trans.type}
                                             </span>
                                             <span className="text-[10px] font-bold text-slate-400">{new Date(trans.date).toLocaleDateString()}</span>
                                          </div>
                                          <p className="text-sm font-bold text-slate-700 dark:text-white">{trans.note}</p>
                                       </div>
                                       <div className={`text-xl font-black ${trans.type === 'debt' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                          {trans.type === 'debt' ? '+' : '-'}{state.settings.currency}{trans.amount.toLocaleString()}
                                       </div>
                                    </div>
                                    {trans.invoiceId && (
                                       <div className="flex gap-2">
                                          <button onClick={() => setCurrentView?.('invoices')} className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase hover:underline">
                                             <Eye size={12}/> View Associated Invoice #{trans.invoiceId}
                                          </button>
                                          <button 
                                            onClick={() => {
                                               const inv = state.invoices.find(i => i.id === trans.invoiceId);
                                               if(inv) setInvoiceToPrint(inv);
                                            }} 
                                            className="flex items-center gap-2 text-[10px] font-black text-slate-500 hover:text-indigo-600 uppercase hover:underline ml-2"
                                          >
                                             <Printer size={12}/> Print Record
                                          </button>
                                       </div>
                                    )}
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>

                     {/* Right Panel Actions */}
                     <div className="w-full lg:w-[320px] space-y-8">
                        {/* Quick Document Access */}
                        <section className="bg-white dark:bg-slate-800 p-8 rounded-[40px] border border-slate-100 dark:border-slate-700 space-y-6 shadow-sm">
                           <div className="flex items-center justify-between">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Printer size={14}/> Recent Receipts</h4>
                           </div>
                           <div className="space-y-3">
                              {recentInvoicesForViewing.map(inv => (
                                 <div key={inv.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl flex items-center justify-between group hover:bg-white dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                                    <div>
                                       <p className="text-[10px] font-black dark:text-white">#{inv.id}</p>
                                       <p className="text-[8px] font-bold text-slate-400 uppercase">{new Date(inv.date).toLocaleDateString()}</p>
                                    </div>
                                    <button 
                                      onClick={() => setInvoiceToPrint(inv)}
                                      className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                      title="Print Receipt"
                                    >
                                       <Printer size={14}/>
                                    </button>
                                 </div>
                              ))}
                           </div>
                        </section>

                        <section className="bg-white dark:bg-slate-800 p-8 rounded-[40px] border border-slate-100 dark:border-slate-700 space-y-6 shadow-sm">
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><StickyNote size={14}/> Internal Dossier</h4>
                           <div className="w-full bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 text-sm font-medium dark:text-white h-40 overflow-y-auto custom-scrollbar">
                             {viewingCustomer.notes || "No internal notes recorded."}
                           </div>
                        </section>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Repayment Modal */}
      {showRepaymentModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in duration-200">
              <button onClick={() => setShowRepaymentModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={20}/></button>
              <h3 className="text-xl font-black mb-6 text-center dark:text-white uppercase tracking-tighter">Record Repayment</h3>
              <div className="space-y-4">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Amount</label>
                    <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-black">{state.settings.currency}</span>
                       <input 
                         type="number" 
                         autoFocus
                         value={amountInput}
                         onChange={e => setAmountInput(e.target.value === '' ? '' : Number(e.target.value))}
                         className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-lg dark:text-white"
                         placeholder="0.00"
                       />
                    </div>
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Note</label>
                    <input 
                      type="text" 
                      value={noteInput}
                      onChange={e => setNoteInput(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-sm dark:text-white"
                      placeholder="Optional details..."
                    />
                 </div>
                 <button 
                   onClick={handleRepayDebt}
                   disabled={!amountInput || Number(amountInput) <= 0}
                   className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 dark:shadow-none uppercase tracking-widest text-xs disabled:opacity-50 active:scale-95"
                 >
                   Confirm Payment
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Add Debt Modal */}
      {showDebtModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in duration-200">
              <button onClick={() => setShowDebtModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={20}/></button>
              <h3 className="text-xl font-black mb-6 text-center dark:text-white uppercase tracking-tighter">Add Manual Debt</h3>
              <div className="space-y-4">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Amount</label>
                    <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-600 font-black">{state.settings.currency}</span>
                       <input 
                         type="number" 
                         autoFocus
                         value={amountInput}
                         onChange={e => setAmountInput(e.target.value === '' ? '' : Number(e.target.value))}
                         className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-rose-500 outline-none font-bold text-lg dark:text-white"
                         placeholder="0.00"
                       />
                    </div>
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Reason</label>
                    <input 
                      type="text" 
                      value={noteInput}
                      onChange={e => setNoteInput(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-rose-500 outline-none font-bold text-sm dark:text-white"
                      placeholder="e.g. Store Credit Adjustment"
                    />
                 </div>
                 <button 
                   onClick={handleAddDebt}
                   disabled={!amountInput || Number(amountInput) <= 0}
                   className="w-full py-4 bg-rose-600 text-white font-black rounded-xl hover:bg-rose-700 transition-all shadow-xl shadow-rose-100 dark:shadow-none uppercase tracking-widest text-xs disabled:opacity-50 active:scale-95"
                 >
                   Add to Balance
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Print Selection Modal */}
      {invoiceToPrint && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in duration-200">
              <button onClick={() => setInvoiceToPrint(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={20}/></button>
              <h3 className="text-xl font-black mb-6 text-center dark:text-white uppercase tracking-tighter">Select Format</h3>
              <div className="space-y-3">
                 <button 
                   onClick={() => handlePrint('a4')}
                   className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center gap-4 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border-2 border-transparent hover:border-indigo-600 transition-all group"
                 >
                    <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 shadow-sm"><FileText size={24}/></div>
                    <div className="text-left">
                       <p className="font-black text-sm dark:text-white">Standard A4</p>
                       <p className="text-[10px] text-slate-400 font-bold uppercase">For Office Printers</p>
                    </div>
                 </button>
                 <button 
                   onClick={() => handlePrint('thermal')}
                   className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center gap-4 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border-2 border-transparent hover:border-indigo-600 transition-all group"
                 >
                    <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 shadow-sm"><Smartphone size={24}/></div>
                    <div className="text-left">
                       <p className="font-black text-sm dark:text-white">Thermal Receipt</p>
                       <p className="text-[10px] text-slate-400 font-bold uppercase">For Mobile/POS</p>
                    </div>
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
