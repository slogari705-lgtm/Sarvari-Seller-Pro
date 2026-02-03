import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Printer,
  X, 
  Trash2,
  TrendingUp,
  FileCheck,
  FileDown,
  Scale,
  Plus,
  RotateCcw,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  CheckCircle2,
  Package,
  User,
  History
} from 'lucide-react';
import { AppState, Invoice, View, Product, CartItem, Customer, LoanTransaction } from '../types';
import { translations } from '../translations';
import { generatePrintHTML, PrintLayout } from '../printService';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  state: AppState;
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
  setCurrentView: (view: View) => void;
}

type SortKey = 'id' | 'date' | 'total' | 'status';
type SortOrder = 'asc' | 'desc';

export default function Invoices({ state, updateState, setCurrentView }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [trashConfirm, setTrashConfirm] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  
  // Advanced State
  const [isCreating, setIsCreating] = useState(false);
  const [draftItems, setDraftItems] = useState<CartItem[]>([]);
  const [draftCustomerId, setDraftCustomerId] = useState('');
  const [draftPaidAmount, setDraftPaidAmount] = useState<number | ''>('');
  const [paymentStatusMode, setPaymentStatusMode] = useState<'paid' | 'partial' | 'unpaid'>('paid');
  const [productSearch, setProductSearch] = useState('');
  const [returningInvoice, setReturningInvoice] = useState<Invoice | null>(null);
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});

  const t = translations[state.settings.language || 'en'];
  const activeInvoices = useMemo(() => state.invoices.filter(i => !i.isDeleted), [state.invoices]);

  const filteredInvoices = useMemo(() => {
    let result = activeInvoices.filter(inv => {
      const customer = state.customers.find(c => c.id === inv.customerId);
      const matchesSearch = inv.id.toString().includes(searchTerm) || 
                            customer?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
    result.sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'id') comparison = Number(a.id) - Number(b.id);
      else if (sortKey === 'date') comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      else if (sortKey === 'total') comparison = a.total - b.total;
      else if (sortKey === 'status') comparison = a.status.localeCompare(b.status);
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return result;
  }, [activeInvoices, searchTerm, statusFilter, state.customers, sortKey, sortOrder]);

  const totals = useMemo(() => {
    const nonVoided = filteredInvoices.filter(i => !i.isVoided);
    return nonVoided.reduce((acc, inv) => ({
      total: acc.total + Number(inv.total),
      collected: acc.collected + (Number(inv.paidAmount) || 0),
      balance: acc.balance + (Number(inv.total) - (Number(inv.paidAmount) || 0)),
      profit: acc.profit + (Number(inv.profit) || 0)
    }), { total: 0, collected: 0, balance: 0, profit: 0 });
  }, [filteredInvoices]);

  const draftSubtotal = useMemo(() => draftItems.reduce((acc, it) => acc + (it.price * it.quantity), 0), [draftItems]);
  const draftTax = draftSubtotal * (state.settings.taxRate / 100);
  const draftTotal = draftSubtotal + draftTax;

  useEffect(() => {
    if (paymentStatusMode === 'paid') setDraftPaidAmount(draftTotal);
    else if (paymentStatusMode === 'unpaid') setDraftPaidAmount(0);
  }, [paymentStatusMode, draftTotal]);

  const handleAuthorizeInvoice = () => {
    if (draftItems.length === 0) return;
    const paidAmount = Number(draftPaidAmount) || 0;
    const debtIncurred = draftTotal - paidAmount;
    const profit = draftItems.reduce((acc, it) => acc + ((it.price - it.costPrice) * it.quantity), 0);
    const newId = (state.invoices.reduce((max, i) => Math.max(max, parseInt(i.id) || 0), 0) + 1).toString();

    let finalStatus: 'paid' | 'partial' | 'unpaid' = 'paid';
    if (paidAmount === 0) finalStatus = 'unpaid';
    else if (paidAmount < draftTotal) finalStatus = 'partial';

    const invoice: Invoice = {
      id: newId,
      date: new Date().toISOString(),
      customerId: draftCustomerId || undefined,
      items: draftItems,
      subtotal: draftSubtotal,
      tax: draftTax,
      discount: 0,
      total: draftTotal,
      paidAmount: paidAmount,
      profit: profit,
      status: finalStatus,
      paymentMethod: 'cash',
      pointsEarned: Math.floor(draftTotal * state.settings.loyaltySettings.pointsPerUnit)
    };

    const updatedProducts = state.products.map((p: Product) => {
      const lineItem = draftItems.find(it => it.id === p.id);
      return lineItem ? { ...p, stock: p.stock - lineItem.quantity } : p;
    });

    if (draftCustomerId) {
      const updatedCustomers = state.customers.map((c: Customer) => {
        if (c.id === draftCustomerId) {
          return { 
            ...c, 
            totalSpent: (Number(c.totalSpent) || 0) + draftTotal,
            totalDebt: (Number(c.totalDebt) || 0) + debtIncurred,
            transactionCount: (c.transactionCount || 0) + 1,
            lastVisit: new Date().toISOString()
          };
        }
        return c;
      });
      updateState('customers', updatedCustomers);
      if (debtIncurred > 0) {
        const newDebtTrans: LoanTransaction = {
          id: Math.random().toString(36).substr(2, 9),
          customerId: draftCustomerId,
          invoiceId: newId,
          date: new Date().toISOString(),
          amount: debtIncurred,
          type: 'debt',
          note: `Manual Draft #${newId}`
        };
        updateState('loanTransactions', [...state.loanTransactions, newDebtTrans]);
      }
    }
    updateState('products', updatedProducts);
    updateState('invoices', [...state.invoices, invoice]);
    setIsCreating(false);
    setDraftItems([]);
  };

  const handleOpenReturn = (inv: Invoice) => {
    setReturningInvoice(inv);
    const initialQtys: Record<string, number> = {};
    inv.items.forEach(item => {
      initialQtys[item.id] = item.quantity - (item.returnedQuantity || 0);
    });
    setReturnQtys(initialQtys);
  };

  const handleProcessReturn = () => {
    if (!returningInvoice) return;
    let totalRefundValue = 0;
    const updatedItems: CartItem[] = returningInvoice.items.map(item => {
      const returning = Number(returnQtys[item.id]) || 0;
      totalRefundValue += returning * item.price;
      return { ...item, returnedQuantity: (item.returnedQuantity || 0) + returning };
    });
    const updatedInvoices = state.invoices.map((inv: Invoice) => {
      if (inv.id === returningInvoice.id) {
        const isFullyReturned = updatedItems.every(i => (Number(i.returnedQuantity) || 0) >= i.quantity);
        return { 
          ...inv, 
          items: updatedItems,
          status: isFullyReturned ? 'returned' : inv.status,
          returnHistory: [
            ...(inv.returnHistory || []),
            { 
              date: new Date().toISOString(), 
              items: Object.entries(returnQtys)
                .filter(([_, q]) => (q as number) > 0)
                .map(([id, q]) => ({ productId: id, quantity: Number(q) })),
              refundAmount: totalRefundValue
            }
          ]
        } as Invoice;
      }
      return inv;
    });
    const updatedProducts = state.products.map((p: Product) => {
      const returnedCount = returnQtys[p.id] || 0;
      return returnedCount > 0 ? { ...p, stock: p.stock + returnedCount } : p;
    });
    if (returningInvoice.customerId) {
      const updatedCustomers = state.customers.map((c: Customer) => {
        if (c.id === returningInvoice.customerId) {
          return { 
            ...c, 
            totalSpent: Math.max(0, (Number(c.totalSpent) || 0) - totalRefundValue),
            totalDebt: Math.max(0, (Number(c.totalDebt) || 0) - totalRefundValue)
          };
        }
        return c;
      });
      updateState('customers', updatedCustomers);
    }
    updateState('invoices', updatedInvoices);
    updateState('products', updatedProducts);
    setReturningInvoice(null);
  };

  const moveToTrash = (id: string) => {
    const inv = state.invoices.find(i => i.id === id);
    if (!inv) return;
    const updatedInvoices = state.invoices.map((i: Invoice) => 
      i.id === id ? { ...i, isDeleted: true, isVoided: true, status: 'voided' as const } : i
    );
    const updatedProducts = state.products.map((p: Product) => {
      const item = inv.items.find(it => it.id === p.id);
      return item ? { ...p, stock: p.stock + item.quantity } : p;
    });
    updateState('invoices', updatedInvoices);
    updateState('products', updatedProducts);
    setTrashConfirm(null);
  };

  const handlePrint = async (inv: Invoice, overrideLayout: PrintLayout = 'auto') => {
    try {
      const html = generatePrintHTML(state, inv, overrideLayout);
      const holder = document.getElementById('print-holder');
      if (holder) {
        holder.innerHTML = html;
        window.print();
        holder.innerHTML = '';
      }
    } catch (e) { console.error(e); }
  };

  const handleDownloadPDF = async (inv: Invoice) => {
    if (isDownloading) return;
    setIsDownloading(inv.id);
    try {
      const html = generatePrintHTML(state, inv, 'a4');
      const container = document.getElementById('pdf-render-container');
      if (!container) return;
      container.innerHTML = html;
      await new Promise(resolve => setTimeout(resolve, 800));
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_#${inv.id}.pdf`);
    } finally { 
      const container = document.getElementById('pdf-render-container');
      if (container) container.innerHTML = ''; 
      setIsDownloading(null); 
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase rounded-lg border border-emerald-100">Paid</span>;
      case 'returned': return <span className="px-3 py-1 bg-rose-50 text-rose-600 text-[10px] font-black uppercase rounded-lg border border-rose-100">Returned</span>;
      case 'partial': return <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase rounded-lg border border-amber-100">Partial</span>;
      case 'voided': return <span className="px-3 py-1 bg-slate-100 text-slate-400 text-[10px] font-black uppercase rounded-lg border border-slate-200">Voided</span>;
      default: return <span className="px-3 py-1 bg-slate-50 text-slate-500 text-[10px] font-black uppercase rounded-lg border border-slate-100">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <ConfirmDialog 
        isOpen={!!trashConfirm} 
        onClose={() => setTrashConfirm(null)} 
        onConfirm={() => trashConfirm && moveToTrash(trashConfirm)} 
        title="Move to Trash?" 
        message="This will void the invoice and return items to stock." 
        confirmText="Confirm" 
        type="warning" 
      />

      {isCreating && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
           <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-5xl h-[90vh] shadow-2xl flex flex-col border border-white/10 animate-in zoom-in-95">
              <header className="p-8 border-b flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><FileText size={24}/></div>
                    <div>
                       <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Draft Invoice Builder</h3>
                       <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Manual Ledger Entry</p>
                    </div>
                 </div>
                 <button onClick={() => setIsCreating(false)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-rose-600 transition-all"><X size={24}/></button>
              </header>
              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                 <div className="lg:w-[350px] border-r border-slate-100 dark:border-slate-800 p-8 space-y-8 overflow-y-auto custom-scrollbar">
                    <section className="space-y-4">
                       <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><User size={14}/> Client Assignment</label>
                       <select value={draftCustomerId} onChange={e => setDraftCustomerId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl py-4 px-6 font-bold text-sm outline-none">
                          <option value="">Guest Account</option>
                          {state.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                       </select>
                    </section>
                    <section className="space-y-4">
                       <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><Package size={14}/> Asset Discovery</label>
                       <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl py-4 px-6 font-bold text-sm outline-none" placeholder="Search product..." />
                       <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
                          {state.products.filter(p => !p.isDeleted && p.name.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 8).map(p => (
                             <button key={p.id} onClick={() => setDraftItems([...draftItems, { ...p, quantity: 1, buyPrice: p.price }])} className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border text-left hover:border-indigo-500 transition-all flex justify-between items-center group">
                                <div><p className="font-black text-xs dark:text-white uppercase truncate w-32">{p.name}</p><p className="text-[9px] text-slate-400 font-bold">{state.settings.currency}{p.price.toLocaleString()}</p></div>
                                <Plus size={16} className="text-slate-300 group-hover:text-indigo-600" />
                             </button>
                          ))}
                       </div>
                    </section>
                 </div>
                 <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-950/20">
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                       <table className="w-full text-left">
                          <thead className="border-b">
                             <tr>
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase">Description</th>
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase text-center">Qty</th>
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase text-right">Sum</th>
                                <th className="pb-4"></th>
                             </tr>
                          </thead>
                          <tbody className="divide-y">
                             {draftItems.map((it, idx) => (
                                <tr key={idx}>
                                   <td className="py-4 font-black text-xs uppercase dark:text-white">{it.name}</td>
                                   <td className="py-4">
                                      <div className="flex items-center justify-center gap-2 bg-white dark:bg-slate-800 rounded-xl p-1 w-24 mx-auto border shadow-sm">
                                         <button onClick={() => setDraftItems(draftItems.map((item, i) => i === idx ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item))}><MinusCircle size={14}/></button>
                                         <span className="font-black text-xs dark:text-white">{it.quantity}</span>
                                         <button onClick={() => setDraftItems(draftItems.map((item, i) => i === idx ? { ...item, quantity: item.quantity + 1 } : item))}><PlusCircle size={14}/></button>
                                      </div>
                                   </td>
                                   <td className="py-4 text-right font-black text-xs dark:text-white">{state.settings.currency}{(it.price * it.quantity).toLocaleString()}</td>
                                   <td className="py-4 text-right"><button onClick={() => setDraftItems(draftItems.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-rose-500"><X size={16}/></button></td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                    <footer className="p-8 bg-white dark:bg-slate-900 border-t space-y-6">
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div>
                             <p className="text-[10px] font-black text-slate-400 uppercase mb-2 px-1">Settlement Mode</p>
                             <div className="grid grid-cols-3 gap-1 p-1 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                {['paid', 'partial', 'unpaid'].map(m => (
                                   <button key={m} onClick={() => setPaymentStatusMode(m as any)} className={`py-2 rounded-lg text-[8px] font-black uppercase transition-all ${paymentStatusMode === m ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{m}</button>
                                ))}
                             </div>
                          </div>
                          {paymentStatusMode === 'partial' && (
                             <div><p className="text-[10px] font-black text-slate-400 uppercase mb-2 px-1">Amount Paid</p><input type="number" value={draftPaidAmount} onChange={e => setDraftPaidAmount(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl py-2 px-4 font-black text-xs dark:text-white" /></div>
                          )}
                          <div className="col-start-4 text-right">
                             <p className="text-[10px] font-black text-indigo-600 uppercase mb-1">Authorization Total</p>
                             <h4 className="text-4xl font-black dark:text-white tracking-tighter">{state.settings.currency}{draftTotal.toLocaleString()}</h4>
                          </div>
                       </div>
                       <button onClick={handleAuthorizeInvoice} disabled={draftItems.length === 0} className="w-full py-5 bg-indigo-600 text-white rounded-[28px] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-4"><CheckCircle2 size={24}/> Authorize Transaction</button>
                    </footer>
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">Invoices</h3>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Registry history node</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsCreating(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center gap-2"><Plus size={18} /> Manual Invoice</button>
          <button onClick={() => setCurrentView('terminal')} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-sm flex items-center gap-2 hover:bg-slate-200 transition-all"><History size={18} /> POS Terminal</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Revenue Pool', value: totals.total, icon: TrendingUp, color: 'text-indigo-600' },
          { label: 'Net Profit', value: totals.profit, icon: FileCheck, color: 'text-emerald-500' },
          { label: 'Receivables', value: totals.balance, icon: Scale, color: 'text-rose-500' },
          { label: 'Archive Volume', value: filteredInvoices.length, icon: FileText, color: 'text-slate-600' }
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border shadow-sm flex items-center gap-4 transition-all hover:shadow-lg">
             <div className={`${stat.color} p-3 rounded-2xl bg-slate-50 dark:bg-slate-800`}><stat.icon size={20}/></div>
             <div className="min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{stat.label}</p>
                <h4 className="text-lg font-black dark:text-white truncate">{i < 3 ? state.settings.currency : ''}{stat.value.toLocaleString()}</h4>
             </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[40px] border shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b flex flex-col md:flex-row gap-4 items-center">
           <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
              <input type="text" placeholder="Search invoices by ID or customer..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl py-2.5 pl-12 pr-4 text-sm font-bold dark:text-white outline-none" />
           </div>
           <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2 text-xs font-black uppercase outline-none cursor-pointer dark:text-white">
             <option value="all">All Status</option>
             <option value="paid">Paid</option>
             <option value="partial">Partial</option>
             <option value="unpaid">Unpaid</option>
             <option value="returned">Returned</option>
             <option value="voided">Voided</option>
           </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Document ID</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Entity</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Temporal Log</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Value</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredInvoices.map((inv) => {
                const customer = state.customers.find(c => c.id === inv.customerId);
                return (
                  <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 group transition-all">
                    <td className="px-6 py-4 font-black text-xs text-slate-500">#INV-{inv.id.padStart(4, '0')}</td>
                    <td className="px-6 py-4 text-xs font-bold dark:text-slate-200">{customer?.name || 'Walk-in Account'}</td>
                    <td className="px-6 py-4 text-xs text-slate-400">{new Date(inv.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-black text-slate-900 dark:text-white text-right">{state.settings.currency}{inv.total.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">{getStatusBadge(inv.status)}</td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => handleOpenReturn(inv)} className="p-2 text-slate-400 hover:text-amber-600 transition-all" title="Return Items"><RotateCcw size={18}/></button>
                          <button onClick={() => handlePrint(inv)} className="p-2 text-slate-400 hover:text-indigo-600 transition-all"><Printer size={18}/></button>
                          <button onClick={() => handleDownloadPDF(inv)} className="p-2 text-slate-400 hover:text-indigo-600 transition-all"><FileDown size={18}/></button>
                          <button onClick={() => setTrashConfirm(inv.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-all"><Trash2 size={18}/></button>
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {returningInvoice && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
           <div className="bg-white dark:bg-slate-900 rounded-[48px] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col border border-white/10 animate-in zoom-in-95">
              <header className="p-10 border-b flex items-center justify-between">
                 <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center"><RotateCcw size={28}/></div>
                    <div><h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Process Return</h3><p className="text-[10px] font-black text-slate-400 uppercase">Document #INV-{returningInvoice.id}</p></div>
                 </div>
                 <button onClick={() => setReturningInvoice(null)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-rose-50 transition-all"><X size={24}/></button>
              </header>
              <div className="flex-1 overflow-y-auto p-10 space-y-4">
                 {returningInvoice.items.map(item => {
                    const maxReturnable = item.quantity - (item.returnedQuantity || 0);
                    const returning = returnQtys[item.id] || 0;
                    return (
                       <div key={item.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border flex items-center justify-between">
                          <div><p className="font-black text-xs uppercase dark:text-white">{item.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{maxReturnable} available to return</p></div>
                          <div className="flex items-center gap-4 bg-white dark:bg-slate-900 rounded-xl p-1 border">
                             <button onClick={() => setReturnQtys({...returnQtys, [item.id]: Math.max(0, returning - 1)})}><MinusCircle size={16} className="text-slate-300 hover:text-rose-500"/></button>
                             <span className="w-8 text-center font-black text-sm dark:text-white">{returning}</span>
                             <button onClick={() => setReturnQtys({...returnQtys, [item.id]: Math.min(maxReturnable, returning + 1)})}><PlusCircle size={16} className="text-slate-300 hover:text-emerald-500"/></button>
                          </div>
                       </div>
                    );
                 })}
                 <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-3xl border border-amber-100 text-center"><p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Estimated Credit</p><h3 className="text-4xl font-black text-amber-600">{state.settings.currency}{Object.entries(returnQtys).reduce((acc, [id, q]) => acc + (Number(q) * (returningInvoice.items.find(i => i.id === id)?.price || 0)), 0).toLocaleString()}</h3></div>
              </div>
              <footer className="p-10 border-t bg-white dark:bg-slate-900 flex gap-4"><button onClick={() => setReturningInvoice(null)} className="flex-1 py-6 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-3xl font-black text-xs uppercase tracking-widest">Discard</button><button onClick={handleProcessReturn} className="flex-[2] py-6 bg-amber-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3"><RefreshCw size={18}/> Execute Restock</button></footer>
           </div>
        </div>
      )}
    </div>
  );
}