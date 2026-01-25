
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  Banknote, 
  ArrowRight,
  UserPlus,
  CheckCircle2,
  X,
  Package,
  Star,
  PlusCircle,
  Wallet,
  Scale,
  Edit3,
  Filter,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  ChevronDown,
  Layers,
  AlertCircle,
  Printer,
  Smartphone,
  FileText,
  FileSpreadsheet,
  Eye,
  Check
} from 'lucide-react';
import { AppState, Product, CartItem, Invoice, Customer } from '../types';
import { translations } from '../translations';
import { generatePrintHTML, PrintLayout } from '../services/printService';

const QuickAddCustInline = ({ t, onClose, onSave }: any) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X size={20}/></button>
        <h3 className="text-xl font-black mb-6 dark:text-white uppercase tracking-tighter">Sarvari: New Customer</h3>
        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t.fullName}</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)} type="text" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-3 px-4 outline-none font-bold text-sm dark:text-white shadow-inner" placeholder="Sarvari Client" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t.phone}</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} type="text" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-3 px-4 outline-none font-bold text-sm dark:text-white shadow-inner" placeholder="07XX XXX XXX" />
          </div>
        </div>
        <button onClick={() => onSave(name, phone)} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase tracking-widest text-[10px]">Add & Select</button>
      </div>
    </div>
  );
};

interface Props {
  state: AppState;
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
}

type SortKey = 'name' | 'price' | 'stock';
type SortOrder = 'asc' | 'desc';

const Terminal: React.FC<Props> = ({ state, updateState }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; order: SortOrder }>({ key: 'name', order: 'asc' });
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(() => state.customers.find(c => c.id === state.settings.defaultCustomerId) || null);
  const [paymentModal, setPaymentModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<Invoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [paidAmountInput, setPaidAmountInput] = useState<number | ''>(''); 
  const [showCartMobile, setShowCartMobile] = useState(false);
  const [showQuickAddCust, setShowQuickAddCust] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<PrintLayout>('thermal');
  
  const t = translations[state.settings.language || 'en'];

  const categories = useMemo(() => ['All', ...Array.from(new Set(state.products.map(p => p.category)))].sort(), [state.products]);

  const filteredProducts = useMemo(() => {
    let result = state.products.filter(p => (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase())) && (categoryFilter === 'All' || p.category === categoryFilter));
    result.sort((a, b) => {
      const aVal = a[sortConfig.key], bVal = b[sortConfig.key];
      if (typeof aVal === 'string' && typeof bVal === 'string') return sortConfig.order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortConfig.order === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return result;
  }, [state.products, searchTerm, categoryFilter, sortConfig]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item);
      return [...prev, { ...product, quantity: 1, buyPrice: product.costPrice || 0 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: Math.max(1, Math.min(item.quantity + delta, item.stock)) } : item));
  const removeFromCart = (id: string) => setCart(prev => prev.filter(item => item.id !== id));

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const tax = (subtotal * state.settings.taxRate) / 100;
  const total = subtotal + tax;
  const finalPaid = paidAmountInput === '' ? total : Number(paidAmountInput);
  const balanceDue = Math.max(0, total - finalPaid);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const nextId = (state.invoices.reduce((max, inv) => Math.max(max, parseInt(inv.id) || 0), 0) + 1).toString();
    const newInvoice: Invoice = { id: nextId, date: new Date().toISOString(), customerId: selectedCustomer?.id, items: cart, subtotal, tax, discount: 0, total, profit: total - tax - cart.reduce((a, b) => a + (b.buyPrice * b.quantity), 0), paidAmount: finalPaid, status: finalPaid >= total ? 'paid' : (finalPaid > 0 ? 'partial' : 'unpaid'), paymentMethod };
    updateState('invoices', [...state.invoices, newInvoice]);
    updateState('products', state.products.map(p => { const it = cart.find(c => c.id === p.id); return it ? { ...p, stock: p.stock - it.quantity } : p; }));
    if (selectedCustomer) updateState('customers', state.customers.map(c => c.id === selectedCustomer.id ? { ...c, totalSpent: c.totalSpent + total, totalDebt: (c.totalDebt || 0) + balanceDue, lastVisit: new Date().toISOString().split('T')[0], transactionCount: (c.transactionCount || 0) + 1 } : c));
    setLastInvoice(newInvoice); setCart([]); setPaymentModal(false); setSuccessModal(true); setShowCartMobile(false);
    setPaidAmountInput('');
  };

  const handlePreview = (layout: PrintLayout) => {
    const invToPreview = lastInvoice || { 
      id: 'DRAFT', 
      date: new Date().toISOString(), 
      customerId: selectedCustomer?.id, 
      items: cart, 
      total, 
      subtotal, 
      tax, 
      discount: 0,
      paidAmount: finalPaid,
      profit: 0,
      paymentMethod: paymentMethod, 
      status: finalPaid >= total ? 'paid' : (finalPaid > 0 ? 'partial' : 'unpaid')
    };
    setPreviewHtml(generatePrintHTML(state, invToPreview as Invoice, layout)); 
    setPreviewType(layout);
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 relative max-w-full">
      <div className="flex-1 flex flex-col gap-3 min-h-0">
        <div className="bg-white dark:bg-slate-900 p-3 lg:p-4 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-3 sticky top-0 z-20">
          <div className="flex gap-2">
             <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
               <input type="text" placeholder={t.search} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-xl py-2 pl-9 pr-3 outline-none font-bold text-xs dark:text-white" />
             </div>
             <button onClick={() => setShowQuickAddCust(true)} className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg"><UserPlus size={18} /></button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
             {categories.map(cat => (
               <button key={cat} onClick={() => setCategoryFilter(cat)} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap border-2 ${categoryFilter === cat ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400'}`}>
                 {cat}
               </button>
             ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 lg:gap-4 pb-20 custom-scrollbar pr-1">
          {filteredProducts.map((p) => {
             const isOut = p.stock <= 0, isLow = p.stock <= (p.lowStockThreshold || state.settings.lowStockThreshold);
             return (
              <button key={p.id} onClick={() => addToCart(p)} disabled={isOut} className={`bg-white dark:bg-slate-900 p-3 rounded-[24px] border text-left flex flex-col justify-between hover:border-indigo-500 transition-all active:scale-95 ${isOut ? 'opacity-50 grayscale' : 'border-slate-100 dark:border-slate-800'}`}>
                <div>
                  <div className="w-full aspect-square rounded-[18px] mb-3 flex items-center justify-center bg-slate-50 dark:bg-slate-800 border shadow-inner overflow-hidden">
                    {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <Package size={24} className="text-slate-300" />}
                  </div>
                  <h4 className="font-black text-[11px] text-slate-800 dark:text-white leading-tight truncate">{p.name}</h4>
                  <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">{p.category}</p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-2">
                  <span className="font-black text-indigo-600 text-[13px]">{state.settings.currency}{p.price}</span>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-lg font-black uppercase ${isOut ? 'bg-rose-100 text-rose-600' : isLow ? 'bg-amber-100 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>{p.stock}</span>
                </div>
              </button>
             );
          })}
        </div>
      </div>

      <div className={`fixed inset-0 lg:static z-40 flex flex-col lg:w-[320px] 2xl:w-[380px] bg-white dark:bg-slate-900 lg:rounded-3xl shadow-2xl border-l border-slate-100 dark:border-slate-800 h-full transition-transform duration-300 ${showCartMobile ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}`}>
        <div className="p-4 border-b flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2"><ShoppingCart size={18} className="text-indigo-600" /><h3 className="font-black text-sm uppercase tracking-widest dark:text-white">{t.cart}</h3></div>
          <button onClick={() => setShowCartMobile(false)} className="lg:hidden p-2 text-slate-400"><X size={20}/></button>
        </div>
        <div className="p-4 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
           <select value={selectedCustomer?.id || ''} onChange={(e) => setSelectedCustomer(state.customers.find(c => c.id === e.target.value) || null)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-2 px-3 font-bold text-[11px] dark:text-white">
              <option value="">{t.walkInCustomer}</option>
              {state.customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
           </select>
           {cart.length === 0 ? <div className="py-20 text-center text-slate-300 text-[10px] font-black uppercase tracking-widest opacity-40">Cart Empty</div> : cart.map((it) => (
             <div key={it.id} className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl animate-in slide-in-from-right-4">
               <div className="w-10 h-10 rounded-lg overflow-hidden bg-white shrink-0">{it.image ? <img src={it.image} className="w-full h-full object-cover" /> : <Package size={16} className="m-3 text-slate-300"/>}</div>
               <div className="flex-1 min-w-0">
                 <div className="flex justify-between items-start"><h5 className="font-black text-[10px] truncate pr-1 dark:text-white">{it.name}</h5><button onClick={() => removeFromCart(it.id)} className="text-slate-300 hover:text-rose-500"><Trash2 size={12}/></button></div>
                 <div className="mt-1 flex items-center justify-between">
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-lg px-2 py-0.5 border"><span className="text-[8px] text-slate-400">{state.settings.currency}</span><span className="font-black text-[10px] dark:text-white">{it.price}</span></div>
                    <div className="flex items-center gap-2 bg-indigo-600 rounded-lg px-1.5 py-0.5 text-white"><button onClick={() => updateQuantity(it.id, -1)}><Minus size={10}/></button><span className="text-[10px] font-black w-4 text-center">{it.quantity}</span><button onClick={() => updateQuantity(it.id, 1)}><Plus size={10}/></button></div>
                 </div>
               </div>
             </div>
           ))}
        </div>
        <div className="p-4 border-t bg-slate-50 dark:bg-slate-900 space-y-3 shrink-0">
           <div className="flex justify-between items-center"><span className="text-[10px] font-black text-indigo-600 uppercase">Payable Total</span><span className="font-black text-2xl tracking-tighter dark:text-white">{state.settings.currency}{total.toFixed(2)}</span></div>
           <div className="grid grid-cols-2 gap-2">
              <button disabled={cart.length === 0} onClick={() => handlePreview('thermal')} className="py-3 bg-white dark:bg-slate-800 border rounded-xl font-black text-[9px] uppercase hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5"><Eye size={14}/> Preview</button>
              <button disabled={cart.length === 0} onClick={() => setPaymentModal(true)} className="py-3 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase shadow-lg hover:bg-indigo-700 transition-all">Checkout</button>
           </div>
        </div>
      </div>

      <button onClick={() => setShowCartMobile(true)} className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl z-30 flex items-center justify-center"><ShoppingCart size={24}/><span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">{cart.length}</span></button>

      {paymentModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-6 shadow-2xl relative animate-in slide-in-from-bottom sm:zoom-in">
            <button onClick={() => setPaymentModal(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X size={20}/></button>
            <h3 className="text-xl font-black mb-6 text-center uppercase tracking-tighter dark:text-white">Checkout</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Amount Paid</label>
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 font-black text-sm">{state.settings.currency}</span><input type="number" value={paidAmountInput} onChange={(e) => setPaidAmountInput(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-xl py-3 pl-8 pr-4 outline-none font-black text-lg dark:text-white" placeholder={total.toFixed(2)} autoFocus /></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[{ id: 'cash', label: t.cash, icon: Banknote }, { id: 'card', label: t.card, icon: CreditCard }, { id: 'transfer', label: t.transfer, icon: ArrowRight }].map((m) => (
                  <button key={m.id} onClick={() => setPaymentMethod(m.id as any)} className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${paymentMethod === m.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-400'}`}><m.icon size={18}/><span className="text-[8px] font-black uppercase mt-1">{m.label}</span></button>
                ))}
              </div>
            </div>
            <button onClick={handleCheckout} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">Confirm Sale</button>
          </div>
        </div>
      )}

      {successModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in zoom-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-sm p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce"><CheckCircle2 size={32} /></div>
            <h3 className="text-xl font-black mb-2 uppercase dark:text-white">Sale Successful!</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6 text-[10px] uppercase font-bold">Logged in terminal archive</p>
            <div className="grid grid-cols-3 gap-2 mb-6">
               <button onClick={() => handlePreview('thermal')} className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${previewType === 'thermal' ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-slate-50 border-transparent text-slate-400'}`}><Smartphone size={18}/><span className="text-[8px] font-black uppercase">POS</span></button>
               <button onClick={() => handlePreview('advice')} className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${previewType === 'advice' ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-slate-50 border-transparent text-slate-400'}`}><FileText size={18}/><span className="text-[8px] font-black uppercase">Advice</span></button>
               <button onClick={() => handlePreview('a4')} className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${previewType === 'a4' ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-slate-50 border-transparent text-slate-400'}`}><Layers size={18}/><span className="text-[8px] font-black uppercase">Invoice</span></button>
            </div>
            <div className="flex gap-2">
               <button onClick={() => {const f = document.getElementById('preview-frame') as HTMLIFrameElement; if (previewHtml) { f?.contentWindow?.print(); } else { handlePreview(previewType); setTimeout(() => { (document.getElementById('preview-frame') as HTMLIFrameElement)?.contentWindow?.print(); }, 200); } }} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl flex items-center justify-center gap-2"><Printer size={16}/> Print Now</button>
               <button onClick={() => { setSuccessModal(false); setLastInvoice(null); setPreviewHtml(null); }} className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase"><Check size={20}/></button>
            </div>
          </div>
        </div>
      )}

      {previewHtml && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl h-[85vh] shadow-2xl relative flex flex-col overflow-hidden animate-in zoom-in duration-200">
              <header className="p-4 border-b flex items-center justify-between bg-white dark:bg-slate-900 z-10">
                 <h3 className="text-sm font-black dark:text-white uppercase tracking-widest">Billing Output Preview</h3>
                 <div className="flex gap-2">
                    <button onClick={() => {const f = document.getElementById('preview-frame') as HTMLIFrameElement; f?.contentWindow?.print();}} className="p-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 font-black text-[10px] uppercase px-4"><Printer size={16}/> Print</button>
                    <button onClick={() => setPreviewHtml(null)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><X size={20}/></button>
                 </div>
              </header>
              <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-4 overflow-y-auto flex justify-center custom-scrollbar">
                 <div className="bg-white shadow-xl h-fit" style={{ width: previewType === 'thermal' ? '80mm' : '100%', minHeight: '100%' }}>
                    <iframe id="preview-frame" srcDoc={previewHtml} className="w-full h-full border-none pointer-events-none" style={{ minHeight: previewType === 'thermal' ? '150mm' : '297mm' }} title="Invoice Preview" />
                 </div>
              </div>
           </div>
        </div>
      )}

      {showQuickAddCust && <QuickAddCustInline t={t} onClose={() => setShowQuickAddCust(false)} onSave={(name: string, phone: string) => { const newCust: Customer = { id: Math.random().toString(36).substr(2, 9), name, phone, email: '', totalSpent: 0, totalDebt: 0, lastVisit: 'Just joined', transactionCount: 0 }; updateState('customers', [...state.customers, newCust]); setSelectedCustomer(newCust); setShowQuickAddCust(false); }} />}
    </div>
  );
};

export default Terminal;
