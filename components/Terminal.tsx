import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  X, 
  Package, 
  Layers, 
  ScanLine, 
  Boxes,
  Volume2,
  RefreshCw,
  CheckCircle2,
  History,
  Star,
  User,
  ArrowRight,
  Zap,
  CreditCard,
  Banknote,
  Percent,
  PlusCircle,
  Ban,
  Maximize2,
  Flashlight,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Wallet,
  AlertCircle,
  Printer,
  FileDown,
  Receipt as ReceiptIcon,
  CheckCircle,
  Tag,
  DollarSign,
  Coins,
  Layout,
  Smartphone,
  UserMinus,
  SearchCode,
  Clock
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { AppState, Product, CartItem, Invoice, Customer, ProductVariation } from '../types';
import { translations } from '../translations';
import ConfirmDialog from './ConfirmDialog';
import { generatePrintHTML, PrintLayout } from '../printService';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export default function Terminal({ state, updateState }: { state: AppState; updateState: any }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(state.settings.defaultCustomerId || '');
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerSearchFocused, setIsCustomerSearchFocused] = useState(false);
  
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [paymentTerm, setPaymentTerm] = useState<string>('Immediate');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [isVoidConfirmOpen, setIsVoidConfirmOpen] = useState(false);
  
  const [cashReceived, setCashReceived] = useState<number | ''>('');
  const [isCustomItemOpen, setIsCustomItemOpen] = useState(false);
  const [customItemForm, setCustomItemForm] = useState({ name: '', price: 0 });
  const [finishedInvoice, setFinishedInvoice] = useState<Invoice | null>(null);
  const [isExportingReceipt, setIsExportingReceipt] = useState(false);
  const [receiptPrintMode, setReceiptPrintMode] = useState<PrintLayout>('thermal');
  const [pickingProduct, setPickingProduct] = useState<Product | null>(null);
  
  const t = translations[state.settings.language || 'en'];

  const selectedCustomer = useMemo(() => 
    state.customers.find(c => c.id === selectedCustomerId), 
  [state.customers, selectedCustomerId]);

  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.buyPrice * item.quantity), 0);
  }, [cart]);

  const taxAmount = subtotal * (state.settings.taxRate / 100);
  const total = Math.max(0, subtotal + taxAmount - discountValue);

  // Automatic Payment Term Logic
  useEffect(() => {
    if (!isCheckoutOpen) return;
    
    if (paymentMethod !== 'cash') {
      setPaymentTerm('Immediate');
      return;
    }

    const received = cashReceived === '' ? total : Number(cashReceived);
    if (received < total) {
      setPaymentTerm('On Credit');
    } else {
      setPaymentTerm('Immediate');
    }
  }, [cashReceived, total, paymentMethod, isCheckoutOpen]);

  const changeDue = useMemo(() => {
    if (cashReceived === '' || paymentMethod !== 'cash') return 0;
    return Math.max(0, Number(cashReceived) - total);
  }, [cashReceived, total, paymentMethod]);

  const filteredProducts = useMemo(() => {
    return state.products.filter(p => !p.isDeleted && (
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    ));
  }, [state.products, searchTerm]);

  const addToCart = (product: Product, variation?: ProductVariation) => {
    const target = variation || product;
    if (target.stock <= 0) return;
    const itemPrice = target.salePrice ?? target.price;
    const itemName = variation ? `${product.name} (${variation.name})` : product.name;

    setCart(prev => {
      const uniqueId = variation ? `${product.id}-${variation.id}` : product.id;
      const existing = prev.find(item => (item.variationId ? `${item.id}-${item.variationId}` : item.id) === uniqueId);
      if (existing) {
        if (existing.quantity >= target.stock) return prev;
        return prev.map(item => (item.variationId ? `${item.id}-${item.variationId}` : item.id) === uniqueId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { 
        ...product, name: itemName, sku: target.sku, price: itemPrice, costPrice: target.costPrice, stock: target.stock, quantity: 1, buyPrice: itemPrice, variationId: variation?.id, variationName: variation?.name
      }];
    });
    if (!isCartOpen) setIsCartOpen(true);
  };

  const finalizeSale = () => {
    if (cart.length === 0) return;
    const profit = cart.reduce((acc, it) => acc + ((it.price - it.costPrice) * it.quantity), 0) - discountValue;
    const invoiceId = Math.random().toString(36).substr(2, 9);
    
    const paidAmount = paymentMethod === 'cash' 
      ? (cashReceived === '' ? total : Math.min(total, Number(cashReceived))) 
      : total;

    const invoice: Invoice = {
      id: invoiceId, 
      date: new Date().toISOString(), 
      customerId: selectedCustomerId, 
      items: cart,
      subtotal, 
      tax: taxAmount, 
      discount: discountValue, 
      total, 
      profit,
      paidAmount: paidAmount,
      status: paidAmount >= total ? 'paid' : (paidAmount > 0 ? 'partial' : 'unpaid'), 
      paymentMethod,
      paymentTerm,
      exchangeRate: state.settings.exchangeRate
    };

    const updatedProducts = state.products.map(p => {
      const lineItems = cart.filter(ci => ci.id === p.id);
      if (lineItems.length === 0) return p;
      let newStock = p.stock;
      let newVariations = p.variations;
      lineItems.forEach(ci => {
        if (ci.variationId && newVariations) {
          newVariations = newVariations.map(v => v.id === ci.variationId ? { ...v, stock: v.stock - ci.quantity } : v);
        }
        newStock -= ci.quantity;
      });
      return { ...p, stock: newStock, variations: newVariations };
    });

    if (selectedCustomerId) {
      const unpaidBalance = total - paidAmount;
      updateState('customers', state.customers.map(c => c.id === selectedCustomerId ? { 
        ...c, 
        totalSpent: c.totalSpent + total, 
        totalDebt: c.totalDebt + unpaidBalance,
        loyaltyPoints: (c.loyaltyPoints || 0) + Math.floor(total * state.settings.loyaltySettings.pointsPerUnit),
        transactionCount: (c.transactionCount || 0) + 1, 
        lastVisit: new Date().toISOString()
      } : c));
    }
    updateState('products', updatedProducts);
    updateState('invoices', [...state.invoices, invoice]);
    setFinishedInvoice(invoice);
    setCart([]); setIsCheckoutOpen(false); setIsCartOpen(false); setDiscountValue(0); setCashReceived('');
  };

  const handlePrintReceipt = (inv: Invoice, layout: PrintLayout) => {
    const html = generatePrintHTML(state, inv, layout);
    const holder = document.getElementById('print-holder');
    if (holder) { 
      holder.innerHTML = html; 
      setTimeout(() => {
        window.print(); 
        holder.innerHTML = ''; 
      }, 100);
    }
  };

  const handleDownloadReceiptPDF = async (inv: Invoice) => {
    if (isExportingReceipt) return;
    setIsExportingReceipt(true);
    try {
      const layout = receiptPrintMode === 'thermal' ? 'thermal' : 'a4';
      const html = generatePrintHTML(state, inv, layout);
      const container = document.getElementById('pdf-render-container');
      if (!container) return;
      
      // Strict pixel-based width for capture consistency
      const pixelWidth = layout === 'thermal' ? 350 : 1200; 
      container.style.width = `${pixelWidth}px`;
      container.innerHTML = html;
      
      // Delay for CSS synchronization & font loading
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const canvas = await html2canvas(container, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: pixelWidth
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ 
        orientation: 'portrait', 
        unit: 'mm', 
        format: layout === 'thermal' ? [72, 250] : 'a4' 
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Sarvari_Receipt_#${inv.id}.pdf`);
    } catch (e) { 
      console.error("PDF generation failed:", e); 
    } finally {
      const container = document.getElementById('pdf-render-container');
      if (container) {
        container.innerHTML = '';
        container.style.width = '210mm';
      }
      setIsExportingReceipt(false);
    }
  };

  const CartContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 border-l dark:border-slate-800">
      <header className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><ShoppingCart size={24} /></div>
          <div><h4 className="font-black text-lg dark:text-white uppercase tracking-tighter leading-tight">Live Session</h4><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Ledger State</p></div>
        </div>
        <button onClick={() => setIsCartOpen(false)} className="xl:hidden p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"><X size={20}/></button>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-6 space-y-4 bg-slate-50 dark:bg-slate-900/30 border-b dark:border-slate-800 relative">
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Identity Selection</label>
          {selectedCustomer ? (
            <div className="p-4 bg-indigo-600 rounded-[28px] text-white shadow-xl flex items-center justify-between animate-in zoom-in-95 duration-200">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center font-black text-lg backdrop-blur-md border border-white/20">{selectedCustomer.name.charAt(0)}</div>
                  <div>
                     <p className="text-sm font-black uppercase tracking-tight truncate max-w-[120px]">{selectedCustomer.name}</p>
                     <p className="text-[8px] font-bold opacity-70 uppercase tracking-widest flex items-center gap-1"><Star size={8} fill="white"/> {selectedCustomer.loyaltyPoints || 0} Credits</p>
                  </div>
               </div>
               <button onClick={() => { setSelectedCustomerId(''); setCustomerSearch(''); }} className="p-2 hover:bg-white/20 rounded-xl transition-all"><UserMinus size={18}/></button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input 
                type="text" 
                value={customerSearch}
                onFocus={() => setIsCustomerSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsCustomerSearchFocused(false), 200)}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Identify client..." 
                className="w-full bg-white dark:bg-slate-800 border-none rounded-2xl py-3.5 pl-12 pr-6 outline-none font-bold text-[12px] dark:text-white shadow-sm transition-all"
              />
              {isCustomerSearchFocused && customerSearch && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border z-[100] overflow-hidden">
                   {state.customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).slice(0, 5).map(c => (
                     <button key={c.id} onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch(''); }} className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-left">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center font-black text-indigo-600">{c.name.charAt(0)}</div>
                        <div><p className="text-sm font-black dark:text-white uppercase leading-none">{c.name}</p><p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{c.phone}</p></div>
                     </button>
                   ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 space-y-3">
          {cart.map(item => (
            <div key={item.variationId ? `${item.id}-${item.variationId}` : item.id} className="p-4 bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm group">
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-[20px] bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 border overflow-hidden">
                  {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <Package size={22}/>}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                  <div><p className="font-black text-xs dark:text-white uppercase truncate tracking-tight">{item.name}</p><p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{state.settings.currency}{item.buyPrice.toLocaleString()} ea</p></div>
                  <div className="flex items-center justify-between mt-2"><p className="font-black text-sm text-indigo-600 leading-none">{state.settings.currency}{(item.buyPrice * item.quantity).toLocaleString()}</p>
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 items-center scale-90">
                      <button onClick={() => setCart(prev => prev.map(it => (it.id === item.id && it.variationId === item.variationId) ? { ...it, quantity: Math.max(0, it.quantity - 1) } : it).filter(it => it.quantity > 0))} className="p-1.5 hover:text-rose-500 transition-all"><Minus size={12}/></button>
                      <span className="w-8 text-center font-black text-[11px] dark:text-white">{item.quantity}</span>
                      <button onClick={() => item.quantity < item.stock && setCart(prev => prev.map(it => (it.id === item.id && it.variationId === item.variationId) ? { ...it, quantity: it.quantity + 1 } : it))} className="p-1.5 hover:text-emerald-500 transition-all"><Plus size={12}/></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="p-8 bg-slate-50 dark:bg-slate-900 border-t dark:border-slate-800 space-y-6 shrink-0">
        <div className="space-y-2">
           <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase"><span>Current Invoice</span><span>{state.settings.currency}{total.toLocaleString()}</span></div>
           {selectedCustomer && selectedCustomer.totalDebt > 0 && (
             <div className="flex justify-between text-[10px] font-black text-rose-500 uppercase"><span>Previous Debt</span><span>{state.settings.currency}{selectedCustomer.totalDebt.toLocaleString()}</span></div>
           )}
        </div>
        <div className="flex items-center justify-between mb-6"><div><p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">AGGREGATE DUE</p><h3 className="text-4xl font-black dark:text-white tracking-tighter tabular-nums">{state.settings.currency}{(total + (selectedCustomer?.totalDebt || 0)).toLocaleString()}</h3></div></div>
        <button onClick={() => setIsCheckoutOpen(true)} disabled={cart.length === 0} className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-4">Authorize Settlement <ChevronRight size={18} strokeWidth={3}/></button>
      </footer>
    </div>
  );

  return (
    <div className="h-full flex flex-row overflow-hidden animate-in fade-in duration-500 gap-4">
      <ConfirmDialog isOpen={isVoidConfirmOpen} onClose={() => setIsVoidConfirmOpen(false)} onConfirm={() => { setCart([]); setIsCartOpen(false); setIsVoidConfirmOpen(false); }} title="Void Session?" message="Discard all items in current terminal?" confirmText="Void" type="danger" />
      
      <aside className="hidden xl:flex w-72 flex-col bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 p-6 shrink-0 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-amber-600"><Star size={20} fill="currentColor"/></div><h4 className="font-black text-xs uppercase tracking-widest dark:text-white">Priority Assets</h4></div>
        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
           {state.products.filter(p => p.isFavorite && !p.isDeleted).slice(0, 15).map(p => (
             <button key={p.id} onClick={() => p.variations?.length ? setPickingProduct(p) : addToCart(p)} className="w-full p-4 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-transparent hover:border-indigo-400 hover:bg-white transition-all text-left flex items-center gap-3">
                <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center shrink-0 shadow-sm">{p.image ? <img src={p.image} className="w-full h-full object-cover rounded-xl" /> : <Package size={20}/>}</div>
                <div className="min-w-0"><p className="font-black text-[11px] dark:text-white truncate uppercase leading-none">{p.name}</p><p className="text-[10px] font-bold text-indigo-600 uppercase mt-1">{state.settings.currency}{p.price.toLocaleString()}</p></div>
             </button>
           ))}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white dark:bg-slate-900 p-6 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm mb-4 shrink-0">
          <div className="flex flex-col md:flex-row items-center gap-4"><div className="relative flex-1 w-full"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input type="text" placeholder="Locate asset UID or label..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 pl-14 pr-6 outline-none font-bold text-sm dark:text-white" /></div>
            <div className="flex gap-2 w-full md:w-auto"><button onClick={() => setIsCustomItemOpen(true)} className="p-4 bg-slate-50 dark:bg-slate-800 text-slate-600 rounded-2xl border flex items-center justify-center gap-3 active:scale-95 transition-all"><PlusCircle size={20} /><span className="font-black text-[10px] uppercase tracking-widest">Custom Entry</span></button><button onClick={() => setIsCartOpen(true)} className="xl:hidden p-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 rounded-2xl border shadow-sm flex items-center justify-center relative"><ShoppingCart size={20} />{cart.length > 0 && <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[9px] rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">{cart.length}</div>}</button></div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map(p => (
              <button key={p.id} disabled={p.stock <= 0} onClick={() => p.variations?.length ? setPickingProduct(p) : addToCart(p)} className={`group bg-white dark:bg-slate-900 p-4 rounded-[36px] border border-slate-100 dark:border-slate-800 hover:border-indigo-400 transition-all text-left relative shadow-sm hover:shadow-xl ${p.stock <= 0 ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}>
                <div className="w-full aspect-square rounded-3xl bg-slate-50 dark:bg-slate-800 mb-4 overflow-hidden flex items-center justify-center relative shadow-inner">{p.image ? <img src={p.image} className="w-full h-full object-cover transition-transform group-hover:scale-105" /> : <Package size={32} strokeWidth={1}/>}</div>
                <div className="space-y-1"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{p.category}</p><h5 className="font-black text-[14px] text-slate-800 dark:text-white truncate uppercase tracking-tight leading-tight mb-2">{p.name}</h5><div className="flex items-center justify-between"><div><p className="text-indigo-600 font-black text-base">{state.settings.currency}{p.price.toLocaleString()}</p></div><div className={`px-2 py-1 rounded-lg text-[9px] font-black ${p.stock < 5 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{p.stock} QTY</div></div></div>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="hidden xl:block w-96 shrink-0 animate-in slide-in-from-right duration-300"><CartContent /></div>
      {isCartOpen && <div className="fixed inset-0 z-[90] flex justify-end xl:hidden"><div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" onClick={() => setIsCartOpen(false)}/><div className="relative w-full max-w-xl h-full shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-in slide-in-from-right"><CartContent /></div></div>}
      
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[56px] w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col border border-white/10 animate-in zoom-in-95 duration-300">
              <header className="p-10 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between"><div className="flex items-center gap-5"><div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center shadow-lg"><Wallet size={28}/></div><div><h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Settlement Module</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized Fiscal Protocol</p></div></div><button onClick={() => setIsCheckoutOpen(false)} className="p-3 bg-slate-100 rounded-2xl text-slate-400 hover:text-rose-500 transition-all"><X size={24}/></button></header>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-8">
                 <div className="grid grid-cols-2 gap-6">
                    <div className="p-8 bg-slate-50 dark:bg-slate-800 rounded-[40px] border border-slate-100 dark:border-slate-700 shadow-inner flex flex-col items-center justify-center">
                       <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Invoice Total</p>
                       <h2 className="text-4xl font-black dark:text-white tracking-tighter">{state.settings.currency}{total.toLocaleString()}</h2>
                    </div>
                    <div className={`p-8 rounded-[40px] border border-dashed flex flex-col items-center justify-center transition-all ${selectedCustomer?.totalDebt ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                       <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Previous Debt</p>
                       <h2 className={`text-4xl font-black tracking-tighter ${selectedCustomer?.totalDebt ? 'text-rose-600' : 'text-slate-400'}`}>{state.settings.currency}{(selectedCustomer?.totalDebt || 0).toLocaleString()}</h2>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                       <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Transaction Type</label><div className="grid grid-cols-3 gap-2">{[{ id: 'cash', icon: Banknote },{ id: 'card', icon: CreditCard },{ id: 'transfer', icon: RefreshCw }].map(method => (<button key={method.id} onClick={() => setPaymentMethod(method.id as any)} className={`p-4 rounded-2xl border-4 transition-all flex flex-col items-center gap-2 ${paymentMethod === method.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'border-slate-50 dark:border-slate-800 opacity-60 grayscale'}`}><method.icon size={20}/><span className="text-[8px] font-black uppercase">{method.id}</span></button>))}</div></div>
                       <div>
                         <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Payment Term (System Managed)</label>
                         <div className="grid grid-cols-2 gap-2">
                           {['Immediate', 'On Credit'].map(term => (
                             <div key={term} className={`p-4 rounded-2xl border-4 font-black text-[9px] uppercase transition-all flex items-center justify-center ${paymentTerm === term ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-50 dark:border-slate-800 text-slate-300 grayscale'}`}>
                               {term}
                             </div>
                           ))}
                         </div>
                         <p className="text-[8px] font-bold text-indigo-500 uppercase mt-2 ml-2 italic tracking-tighter">Term updates automatically based on amount received</p>
                       </div>
                    </div>

                    <div className="p-8 bg-slate-900 rounded-[40px] text-white flex items-center justify-between relative overflow-hidden group">
                       <div className="relative z-10"><p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Total Liability Post-Sale</p><h3 className="text-5xl font-black tracking-tighter">{state.settings.currency}{((total + (selectedCustomer?.totalDebt || 0)) - (paymentMethod === 'cash' ? (Number(cashReceived) || 0) : total)).toLocaleString()}</h3></div>
                       <ShieldCheck size={120} className="absolute -bottom-4 -right-4 opacity-5 group-hover:scale-110 transition-transform" />
                    </div>

                    {paymentMethod === 'cash' && (<div className="space-y-4 animate-in slide-in-from-top-4">
                       <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-2 flex items-center gap-2"><Coins size={14}/> Amount Received (Receipt)</label>
                       <div className="relative"><span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-2xl text-slate-300">{state.settings.currency}</span><input type="number" value={cashReceived} onChange={e => setCashReceived(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-white dark:bg-slate-800 border-4 border-indigo-100 focus:border-indigo-500 rounded-[32px] py-6 pl-14 pr-8 font-black text-4xl dark:text-white outline-none shadow-xl transition-all" placeholder="Enter amount..." autoFocus /></div>
                    </div>)}
                 </div>
              </div>
              <footer className="p-10 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-4"><button onClick={() => setIsCheckoutOpen(false)} className="flex-1 py-7 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-[32px] font-black text-xs uppercase tracking-[0.2em]">Abort</button><button onClick={finalizeSale} className="flex-[2] py-7 bg-indigo-600 text-white rounded-[32px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-4"><CheckCircle2 size={24}/> Finalize Transaction</button></footer>
           </div>
        </div>
      )}

      {finishedInvoice && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-2xl animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[64px] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col border border-white/10 animate-in zoom-in-95 duration-500">
              <header className="p-10 pb-6 text-center shrink-0"><div className="w-20 h-20 bg-emerald-500 text-white rounded-[32px] flex items-center justify-center mx-auto shadow-2xl mb-6"><CheckCircle size={40} strokeWidth={3} /></div><h2 className="text-4xl font-black dark:text-white uppercase tracking-tighter">Sale Authenticated!</h2></header>
              <div className="flex-1 overflow-y-auto custom-scrollbar px-10 py-6">
                 <div className="bg-slate-50 dark:bg-slate-800 rounded-[48px] border p-8 space-y-6">
                    <div className="flex justify-between items-center pb-6 border-b border-dashed">
                       <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Receipt Summary</p><h4 className="text-3xl font-black text-indigo-600">{state.settings.currency}{finishedInvoice.paidAmount.toLocaleString()}</h4></div>
                       <div className="text-right"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Liability</p><h4 className="text-2xl font-black text-rose-500">{state.settings.currency}{(finishedInvoice.total - finishedInvoice.paidAmount + (selectedCustomer?.totalDebt || 0)).toLocaleString()}</h4></div>
                    </div>
                    <div className="space-y-4">
                       <label className="block text-[11px] font-black text-indigo-600 uppercase tracking-[0.3em] ml-2">Dispatch Mode / Size Selection</label>
                       <div className="grid grid-cols-2 gap-4">
                          <button onClick={() => setReceiptPrintMode('thermal')} className={`p-6 rounded-[32px] border-4 transition-all text-left flex items-center gap-4 ${receiptPrintMode === 'thermal' ? 'border-indigo-600 bg-white dark:bg-slate-700 shadow-lg' : 'bg-white dark:bg-slate-800 border-transparent opacity-60'}`}><Smartphone size={24} className={receiptPrintMode === 'thermal' ? 'text-indigo-600' : 'text-slate-400'} /><div><p className="font-black text-sm dark:text-white uppercase">Thermal (72mm)</p><p className="text-[8px] font-bold text-slate-400 uppercase">POS Tape Optimized</p></div></button>
                          <button onClick={() => setReceiptPrintMode('a4')} className={`p-6 rounded-[32px] border-4 transition-all text-left flex items-center gap-4 ${receiptPrintMode === 'a4' ? 'border-indigo-600 bg-white dark:bg-slate-700 shadow-lg' : 'bg-white dark:bg-slate-800 border-transparent opacity-60'}`}><Layout size={24} className={receiptPrintMode === 'a4' ? 'text-indigo-600' : 'text-slate-400'} /><div><p className="font-black text-sm dark:text-white uppercase">Full A4 (210mm)</p><p className="text-[8px] font-bold text-slate-400 uppercase">Professional Ledger</p></div></button>
                       </div>
                    </div>
                 </div>
              </div>
              <footer className="p-10 border-t bg-white dark:bg-slate-900 flex flex-col gap-4 shrink-0"><div className="flex gap-4"><button onClick={() => handlePrintReceipt(finishedInvoice, receiptPrintMode)} className="flex-1 py-5 bg-indigo-600 text-white rounded-[28px] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-indigo-700 transition-all active:scale-95"><Printer size={20}/> Dispatch Print</button><button onClick={() => handleDownloadReceiptPDF(finishedInvoice)} disabled={isExportingReceipt} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white rounded-[28px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-200 transition-all active:scale-95">{isExportingReceipt ? <RefreshCw size={20} className="animate-spin"/> : <FileDown size={20}/>} Download PDF</button></div><button onClick={() => setFinishedInvoice(null)} className="w-full py-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[32px] font-black text-xs uppercase tracking-[0.3em] hover:opacity-90 transition-all active:scale-[0.98]">New Transaction</button></footer>
           </div>
        </div>
      )}
    </div>
  );
}