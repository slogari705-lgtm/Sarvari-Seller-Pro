
import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Eye, 
  Printer,
  Calendar,
  CreditCard,
  Banknote,
  Plus,
  X,
  User,
  Trash2,
  CheckCircle2,
  Package,
  PlusCircle,
  Minus,
  Calculator,
  Wallet,
  Scale,
  DollarSign,
  AlertCircle,
  PenTool,
  Clock,
  Palette,
  Layout,
  StickyNote
} from 'lucide-react';
import { AppState, Product, Customer, CartItem, Invoice, InvoiceTemplate, LoanTransaction } from '../types';
import { translations } from '../translations';

interface Props {
  state: AppState;
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
}

const Invoices: React.FC<Props> = ({ state, updateState }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  
  const [activeTemplateId, setActiveTemplateId] = useState<string>(state.settings.invoiceTemplate);

  const t = translations[state.settings.language || 'en'];

  // Invoice Builder State
  const [builderCustomer, setBuilderCustomer] = useState<Customer | null>(null);
  const [builderItems, setBuilderItems] = useState<CartItem[]>([]);
  const [builderPayment, setBuilderPayment] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [builderDiscount, setBuilderDiscount] = useState<number>(0);
  const [builderPaidAmount, setBuilderPaidAmount] = useState<number | ''>(''); 
  const [builderNotes, setBuilderNotes] = useState('');
  const [builderDate, setBuilderDate] = useState(new Date().toISOString().split('T')[0]);
  const [itemSearch, setItemSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  const availableCustomers = useMemo(() => {
    if (!customerSearch) return [];
    return state.customers.filter(c => 
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
      c.phone.includes(customerSearch)
    ).slice(0, 5);
  }, [state.customers, customerSearch]);

  const availableProducts = useMemo(() => {
    if (!itemSearch) return [];
    return state.products.filter(p => 
      p.name.toLowerCase().includes(itemSearch.toLowerCase()) || 
      p.sku.toLowerCase().includes(itemSearch.toLowerCase())
    ).slice(0, 5);
  }, [state.products, itemSearch]);

  const addToInvoice = (product: Product) => {
    setBuilderItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
        );
      }
      return [...prev, { ...product, quantity: 1, buyPrice: product.costPrice || 0 }];
    });
    setItemSearch('');
  };

  const removeBuilderItem = (productId: string) => {
    setBuilderItems(prev => prev.filter(item => item.id !== productId));
  };

  const updateBuilderQty = (productId: string, delta: number) => {
    setBuilderItems(prev => prev.map(item => {
      if (item.id === productId) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const filteredInvoices = useMemo(() => {
    return state.invoices.filter(inv => {
      const customer = state.customers.find(c => c.id === inv.customerId);
      return inv.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
             customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             customer?.phone.includes(searchTerm);
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.invoices, searchTerm, state.customers]);

  const subtotal = builderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalCost = builderItems.reduce((acc, item) => acc + ((item.buyPrice || 0) * item.quantity), 0);
  const tax = (subtotal * state.settings.taxRate) / 100;
  const total = subtotal + tax - builderDiscount;
  const invoiceProfit = total - tax - totalCost;

  const finalPaid = builderPaidAmount === '' ? total : builderPaidAmount;
  const balanceDue = Math.max(0, total - finalPaid);

  // Fix: Completed the saveInvoice logic which was truncated
  const saveInvoice = () => {
    if (builderItems.length === 0) return;
    const invoiceId = Math.random().toString(36).substr(2, 6).toUpperCase();
    const status: Invoice['status'] = finalPaid >= total ? 'paid' : (finalPaid > 0 ? 'partial' : 'unpaid');
    
    const invoiceDateObj = new Date(builderDate);
    const now = new Date();
    if (invoiceDateObj.toDateString() === now.toDateString()) {
       invoiceDateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    } else {
       invoiceDateObj.setHours(12, 0, 0);
    }

    const newInvoice: Invoice = {
      id: invoiceId,
      date: invoiceDateObj.toISOString(),
      customerId: builderCustomer?.id,
      items: builderItems,
      subtotal,
      tax,
      discount: builderDiscount,
      total,
      paidAmount: finalPaid,
      profit: invoiceProfit,
      status,
      paymentMethod: builderPayment,
      notes: builderNotes
    };

    updateState('invoices', [...state.invoices, newInvoice]);

    // Update product stock
    const updatedProducts = state.products.map(p => {
      const cartItem = builderItems.find(item => item.id === p.id);
      return cartItem ? { ...p, stock: Math.max(0, p.stock - cartItem.quantity) } : p;
    });
    updateState('products', updatedProducts);

    // Update customer debt and lifetime value
    if (builderCustomer) {
      const updatedCustomers = state.customers.map(c => {
        if (c.id === builderCustomer.id) {
          return {
            ...c,
            totalSpent: c.totalSpent + total,
            totalDebt: (c.totalDebt || 0) + balanceDue,
            lastVisit: new Date().toISOString().split('T')[0],
            transactionCount: (c.transactionCount || 0) + 1
          };
        }
        return c;
      });
      updateState('customers', updatedCustomers);

      // Record loan transaction if there is balance due
      if (balanceDue > 0) {
        const loanTrans: LoanTransaction = {
          id: Math.random().toString(36).substr(2, 9),
          customerId: builderCustomer.id,
          invoiceId: invoiceId,
          date: new Date().toISOString(),
          amount: balanceDue,
          type: 'debt',
          note: `Loan from invoice #${invoiceId}`
        };
        updateState('loanTransactions', [...state.loanTransactions, loanTrans]);
      }
    }

    setIsCreating(false);
    resetBuilder();
  };

  const resetBuilder = () => {
    setBuilderCustomer(null);
    setBuilderItems([]);
    setBuilderDiscount(0);
    setBuilderPaidAmount('');
    setBuilderNotes('');
    setBuilderDate(new Date().toISOString().split('T')[0]);
  };

  const deleteInvoice = (id: string) => {
    if (window.confirm(t.delete + '?')) {
      updateState('invoices', state.invoices.filter(inv => inv.id !== id));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">{t.invoices}</h3>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest">Archive of business billing and historical records</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Plus size={18} strokeWidth={3} />
          {t.createTemplate.replace('Template', 'Invoice')}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={t.search} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-xl py-2.5 pl-12 pr-4 outline-none font-bold text-sm dark:text-white transition-all shadow-inner"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.customers}</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.total}</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredInvoices.map((inv) => {
                const customer = state.customers.find(c => c.id === inv.customerId);
                return (
                  <tr key={inv.id} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-500/5 transition-colors group">
                    <td className="px-8 py-5 font-black text-sm dark:text-white">INV-#{inv.id}</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center font-black text-xs text-slate-400 border border-slate-100 dark:border-slate-700">
                          {customer ? customer.name.charAt(0) : <User size={14}/>}
                        </div>
                        <span className="font-bold text-slate-700 dark:text-slate-300 text-sm truncate max-w-[150px]">{customer?.name || t.walkInCustomer}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-xs font-bold text-slate-400 uppercase">{new Date(inv.date).toLocaleDateString()}</td>
                    <td className="px-8 py-5 font-black text-indigo-600 dark:text-indigo-400">{state.settings.currency}{inv.total.toLocaleString()}</td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                        inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        inv.status === 'partial' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                        'bg-rose-50 text-rose-600 border border-rose-100'
                      }`}>
                        {t[inv.status]}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setSelectedInvoice(inv)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Eye size={18}/></button>
                        <button onClick={() => deleteInvoice(inv.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredInvoices.length === 0 && (
            <div className="py-24 text-center flex flex-col items-center justify-center text-slate-300 gap-6">
              <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center opacity-40">
                <FileText size={56} strokeWidth={1} />
              </div>
              <p className="font-black text-sm uppercase tracking-widest">No historical records match your search</p>
            </div>
          )}
        </div>
      </div>

      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-5xl h-[90vh] shadow-2xl relative flex flex-col overflow-hidden animate-in zoom-in duration-300">
            <header className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900 z-10">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><PenTool size={24}/></div>
                  <div>
                    <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter">New Invoice Builder</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Manual transaction entry</p>
                  </div>
               </div>
               <button onClick={() => setIsCreating(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-400 transition-colors"><X size={24}/></button>
            </header>
            
            <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row custom-scrollbar">
               <div className="flex-1 p-8 space-y-10 border-r border-slate-100 dark:border-slate-800">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Search Products</label>
                       <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                          <input 
                            type="text" 
                            value={itemSearch}
                            onChange={(e) => setItemSearch(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 pl-12 pr-4 outline-none font-bold text-sm dark:text-white transition-all shadow-inner"
                            placeholder="Type product name or scan SKU..."
                          />
                          {availableProducts.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 py-2 z-20 overflow-hidden">
                              {availableProducts.map(p => (
                                <button key={p.id} onClick={() => addToInvoice(p)} className="w-full p-4 text-left hover:bg-indigo-50 dark:hover:bg-indigo-500/10 flex items-center justify-between group">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-400 shrink-0">{p.image ? <img src={p.image} className="w-full h-full object-cover rounded-xl"/> : <Package size={20}/>}</div>
                                    <div>
                                      <p className="font-bold text-sm dark:text-white">{p.name}</p>
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SKU: {p.sku}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                     <span className="font-black text-indigo-600 text-xs">{state.settings.currency}{p.price.toFixed(2)}</span>
                                     <Plus size={18} className="text-slate-300 group-hover:text-indigo-600"/>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                       </div>
                    </div>

                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Transaction Date</label>
                       <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                          <input 
                            type="date" 
                            value={builderDate}
                            onChange={(e) => setBuilderDate(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 pl-12 pr-4 outline-none font-bold text-sm dark:text-white transition-all shadow-inner"
                          />
                       </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bill of Materials ({builderItems.length})</label>
                     <div className="space-y-4">
                        {builderItems.map(item => (
                          <div key={item.id} className="p-5 bg-white dark:bg-slate-800/50 rounded-3xl flex items-center justify-between border border-slate-100 dark:border-slate-800 shadow-sm animate-in slide-in-from-right-4">
                             <div className="flex items-center gap-5 flex-1 min-w-0">
                                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 shrink-0 border border-slate-100 dark:border-slate-800">{item.image ? <img src={item.image} className="w-full h-full object-cover rounded-2xl"/> : <Package size={24}/>}</div>
                                <div className="min-w-0 flex-1">
                                   <p className="text-sm font-black dark:text-white truncate uppercase tracking-tight">{item.name}</p>
                                   <p className="text-[10px] font-black text-indigo-500">{state.settings.currency}{item.price.toFixed(2)} unit price</p>
                                </div>
                             </div>
                             <div className="flex items-center gap-6">
                                <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-900 rounded-2xl p-1 shadow-inner border border-slate-100 dark:border-slate-800">
                                   <button onClick={() => updateBuilderQty(item.id, -1)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><Minus size={16} strokeWidth={3}/></button>
                                   <span className="text-xs font-black w-6 text-center dark:text-white">{item.quantity}</span>
                                   <button onClick={() => updateBuilderQty(item.id, 1)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Plus size={16} strokeWidth={3}/></button>
                                </div>
                                <div className="text-right w-24">
                                   <p className="font-black text-sm dark:text-white">{state.settings.currency}{(item.price * item.quantity).toFixed(2)}</p>
                                </div>
                                <button onClick={() => removeBuilderItem(item.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-all hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl"><Trash2 size={20}/></button>
                             </div>
                          </div>
                        ))}
                        {builderItems.length === 0 && (
                          <div className="py-24 text-center border-4 border-dashed border-slate-50 dark:border-slate-800 rounded-[48px] text-slate-300">
                             <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 opacity-30">
                                <PlusCircle size={48} strokeWidth={1}/>
                             </div>
                             <p className="font-black text-xs uppercase tracking-[0.2em] opacity-40">Scan or search for items to add to bill</p>
                          </div>
                        )}
                     </div>
                  </div>
               </div>

               <div className="w-full lg:w-[420px] bg-slate-50/50 dark:bg-slate-950/20 p-8 lg:p-10 space-y-10 flex flex-col shrink-0">
                  <div className="space-y-8 flex-1">
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Customer Association</label>
                       {builderCustomer ? (
                         <div className="p-5 bg-white dark:bg-slate-900 rounded-[28px] flex items-center justify-between border-4 border-indigo-600 shadow-2xl animate-in zoom-in-95">
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 bg-indigo-600 text-white rounded-[18px] flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-200 dark:shadow-none">{builderCustomer.name.charAt(0)}</div>
                               <div>
                                  <p className="text-sm font-black dark:text-white truncate max-w-[150px]">{builderCustomer.name}</p>
                                  <p className="text-[10px] font-bold text-slate-400">{builderCustomer.phone}</p>
                               </div>
                            </div>
                            <button onClick={() => setBuilderCustomer(null)} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-rose-600 transition-colors"><X size={18}/></button>
                         </div>
                       ) : (
                         <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                            <input 
                              type="text" 
                              value={customerSearch}
                              onChange={(e) => setCustomerSearch(e.target.value)}
                              className="w-full bg-white dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 pl-12 pr-4 outline-none font-bold text-sm dark:text-white shadow-inner"
                              placeholder="Find or scan customer..."
                            />
                            {availableCustomers.length > 0 && (
                              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 py-2 z-20 overflow-hidden">
                                {availableCustomers.map(c => (
                                  <button key={c.id} onClick={() => { setBuilderCustomer(c); setCustomerSearch(''); }} className="w-full p-4 text-left hover:bg-indigo-50 dark:hover:bg-indigo-500/10 flex items-center gap-4 group">
                                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center font-black text-xs text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">{c.name.charAt(0)}</div>
                                    <div className="flex-1">
                                       <p className="text-sm font-black dark:text-white">{c.name}</p>
                                       <p className="text-[10px] font-bold text-slate-400">{c.phone}</p>
                                    </div>
                                    <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-600"/>
                                  </button>
                                ))}
                              </div>
                            )}
                         </div>
                       )}
                    </div>

                    <div className="h-px bg-slate-200 dark:bg-slate-800"></div>

                    <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 space-y-6 shadow-sm border border-slate-100 dark:border-slate-800/50">
                       <div className="flex justify-between items-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
                          <span>{t.subtotal}</span>
                          <span className="text-slate-600 dark:text-slate-300">{state.settings.currency}{subtotal.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between items-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
                          <span>{t.tax} ({state.settings.taxRate}%)</span>
                          <span className="text-slate-600 dark:text-slate-300">{state.settings.currency}{tax.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between items-center pt-6 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Payable Amount</span>
                          <span className="text-4xl font-black dark:text-white tracking-tighter">{state.settings.currency}{total.toLocaleString()}</span>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">{t.amountPaid}</label>
                          <div className="relative">
                             <div className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-400 font-black text-xl">{state.settings.currency}</div>
                             <input 
                                type="number" 
                                value={builderPaidAmount}
                                onChange={(e) => setBuilderPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full bg-white dark:bg-slate-900 border-4 border-transparent focus:border-indigo-600 rounded-[28px] py-6 pl-14 pr-6 outline-none font-black text-2xl dark:text-white transition-all shadow-xl"
                                placeholder={total.toFixed(0)}
                             />
                          </div>
                       </div>
                       
                       {balanceDue > 0 && (
                          <div className={`p-5 rounded-[24px] border-2 flex items-center justify-between animate-in slide-in-from-top-4 ${builderCustomer ? 'bg-rose-50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-900/30' : 'bg-slate-100 border-slate-200 dark:bg-slate-800'}`}>
                             <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${builderCustomer ? 'bg-rose-100 text-rose-600' : 'text-slate-400'}`}><Scale size={24}/></div>
                                <div>
                                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.loan} Recognition</p>
                                   <p className={`text-xl font-black ${builderCustomer ? 'text-rose-600' : 'text-slate-400'}`}>{state.settings.currency}{balanceDue.toLocaleString()}</p>
                                </div>
                             </div>
                          </div>
                       )}
                    </div>
                  </div>

                  <div className="pt-8">
                    <button 
                      onClick={saveInvoice}
                      disabled={builderItems.length === 0 || (balanceDue > 0 && !builderCustomer)}
                      className="w-full py-6 bg-indigo-600 text-white rounded-[32px] font-black text-xl hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-100 dark:shadow-none disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:shadow-none active:scale-[0.98] flex items-center justify-center gap-4"
                    >
                      {t.processPrint.split('&')[0].trim()}
                      <CheckCircle2 size={28} strokeWidth={3}/>
                    </button>
                    {balanceDue > 0 && !builderCustomer && (
                       <p className="text-[10px] text-center font-black text-rose-500 uppercase mt-4 animate-pulse">Assign customer to register partial credit</p>
                    )}
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[48px] w-full max-w-2xl p-0 shadow-2xl relative animate-in zoom-in duration-300 overflow-hidden flex flex-col max-h-[90vh]">
            <header className="p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0 sticky top-0 z-10">
               <div>
                  <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter">{t.invoiceDetails}</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Ref: INV-#{selectedInvoice.id}</p>
               </div>
               <button onClick={() => setSelectedInvoice(null)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-400 transition-colors"><X size={24}/></button>
            </header>
            
            <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
               <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-1.5">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.customers}</p>
                     <p className="text-lg font-black text-slate-800 dark:text-white truncate">
                        {state.customers.find(c => c.id === selectedInvoice.customerId)?.name || t.walkInCustomer}
                     </p>
                     {selectedInvoice.customerId && (
                       <p className="text-xs font-bold text-slate-400">{state.customers.find(c => c.id === selectedInvoice.customerId)?.phone}</p>
                     )}
                  </div>
                  <div className="text-right space-y-1.5">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</p>
                     <p className="text-lg font-black text-slate-800 dark:text-white">
                        {new Date(selectedInvoice.date).toLocaleDateString()}
                     </p>
                     <p className="text-xs font-bold text-slate-400">{new Date(selectedInvoice.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
               </div>

               <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3"><ShoppingCart size={14}/> {t.purchasedItems}</h4>
                  <div className="space-y-4">
                     {selectedInvoice.items.map((item, idx) => (
                       <div key={idx} className="flex justify-between items-center py-4 px-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all">
                          <div className="flex items-center gap-4">
                             <span className="w-8 h-8 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center font-black text-indigo-600 shadow-sm text-xs">{item.quantity}x</span>
                             <span className="font-bold text-slate-800 dark:text-white text-sm">{item.name}</span>
                          </div>
                          <span className="font-black text-slate-800 dark:text-white">{state.settings.currency}{(item.price * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                       </div>
                     ))}
                  </div>
               </div>

               <div className="bg-slate-900 dark:bg-black p-10 rounded-[40px] shadow-2xl space-y-6 text-white relative overflow-hidden group">
                  <div className="flex justify-between items-center text-xs font-black uppercase text-slate-400">
                     <span>{t.subtotal}</span>
                     <span>{state.settings.currency}{selectedInvoice.subtotal.toLocaleString()}</span>
                  </div>
                  {selectedInvoice.tax > 0 && (
                    <div className="flex justify-between items-center text-xs font-black uppercase text-slate-400">
                       <span>{t.tax}</span>
                       <span>{state.settings.currency}{selectedInvoice.tax.toLocaleString()}</span>
                    </div>
                  )}
                  {selectedInvoice.discount > 0 && (
                    <div className="flex justify-between items-center text-xs font-black uppercase text-rose-400">
                       <span>{t.discount}</span>
                       <span>-{state.settings.currency}{selectedInvoice.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="pt-6 border-t border-white/10 flex justify-between items-center">
                     <span className="text-indigo-400 font-black uppercase tracking-[0.2em] text-xs">Final Settlement</span>
                     <span className="text-4xl font-black tracking-tighter">{state.settings.currency}{selectedInvoice.total.toLocaleString()}</span>
                  </div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full"></div>
               </div>

               <div className="grid grid-cols-2 gap-6">
                  <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-[32px] border border-emerald-100 dark:border-emerald-900/30">
                     <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Total Paid</p>
                     <p className="text-2xl font-black text-emerald-600">{state.settings.currency}{selectedInvoice.paidAmount.toLocaleString()}</p>
                  </div>
                  <div className={`p-6 rounded-[32px] border ${selectedInvoice.total - selectedInvoice.paidAmount > 0 ? 'bg-rose-50 border-rose-100 dark:bg-rose-900/20' : 'bg-slate-50 border-slate-100 dark:bg-slate-800'}`}>
                     <p className={`text-[10px] font-black uppercase mb-1 ${selectedInvoice.total - selectedInvoice.paidAmount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>Balance Due</p>
                     <p className={`text-2xl font-black ${selectedInvoice.total - selectedInvoice.paidAmount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{state.settings.currency}{(selectedInvoice.total - selectedInvoice.paidAmount).toLocaleString()}</p>
                  </div>
               </div>
            </div>

            <footer className="p-10 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-6 shrink-0 sticky bottom-0 z-10">
               <button onClick={() => window.print()} className="flex-1 py-5 bg-white dark:bg-slate-800 text-slate-800 dark:text-white border-2 border-slate-100 dark:border-slate-700 rounded-3xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-100 transition-all shadow-sm">
                  <Printer size={20}/> {t.printAgain}
               </button>
               <button onClick={() => setSelectedInvoice(null)} className="flex-1 py-5 bg-indigo-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all active:scale-[0.98]">
                  {t.closeView}
               </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
