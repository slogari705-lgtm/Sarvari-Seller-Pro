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
  SearchCode
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { AppState, Product, CartItem, Invoice, Customer, ProductVariation } from '../types';
import { translations } from '../translations';
import ConfirmDialog from './ConfirmDialog';
import { generatePrintHTML, PrintLayout } from '../printService';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const playBeep = (type: 'success' | 'error' = 'success') => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = type === 'success' ? 880 : 220;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + (type === 'success' ? 0.1 : 0.3));
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + (type === 'success' ? 0.1 : 0.3));
    setTimeout(() => ctx.close(), 500);
  } catch (e) { console.warn("Audio feedback failed"); }
};

export default function Terminal({ state, updateState }: { state: AppState; updateState: any }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(state.settings.defaultCustomerId || '');
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerSearchFocused, setIsCustomerSearchFocused] = useState(false);
  
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerLog, setScannerLog] = useState<{name: string, time: string, status: 'ok' | 'fail'}[]>([]);
  const [scannerFeedback, setScannerFeedback] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [showScannerFlash, setShowScannerFlash] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('fixed');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [isVoidConfirmOpen, setIsVoidConfirmOpen] = useState(false);
  
  const [cashReceived, setCashReceived] = useState<number | ''>('');
  const [isCustomItemOpen, setIsCustomItemOpen] = useState(false);
  const [customItemForm, setCustomItemForm] = useState({ name: '', price: 0 });
  const [finishedInvoice, setFinishedInvoice] = useState<Invoice | null>(null);
  const [isExportingReceipt, setIsExportingReceipt] = useState(false);
  const [receiptPrintMode, setReceiptPrintMode] = useState<PrintLayout>('thermal');
  const [pickingProduct, setPickingProduct] = useState<Product | null>(null);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStoppingScanner = useRef(false);
  const lastScannedSku = useRef<{sku: string, time: number} | null>(null);
  const t = translations[state.settings.language || 'en'];

  const selectedCustomer = useMemo(() => 
    state.customers.find(c => c.id === selectedCustomerId), 
  [state.customers, selectedCustomerId]);

  const filteredCustomerList = useMemo(() => {
    if (!customerSearch) return [];
    return state.customers.filter(c => 
      !c.isDeleted && !c.isArchived && (
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
        c.phone.includes(customerSearch) ||
        c.id.toString().includes(customerSearch)
      )
    ).slice(0, 5);
  }, [state.customers, customerSearch]);

  const getResolvedPrice = (p: Product | ProductVariation | any) => p.salePrice ?? p.price;

  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (getResolvedPrice(item) * item.quantity), 0);
  }, [cart]);

  const taxAmount = subtotal * (state.settings.taxRate / 100);
  const discountAmount = discountType === 'percent' ? (subtotal * (discountValue / 100)) : discountValue;
  const total = Math.max(0, subtotal + taxAmount - discountAmount);

  const changeDue = useMemo(() => {
    if (cashReceived === '' || paymentMethod !== 'cash') return 0;
    return Math.max(0, Number(cashReceived) - total);
  }, [cashReceived, total, paymentMethod]);

  const filteredProducts = useMemo(() => {
    return state.products.filter(p => !p.isDeleted && (
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
    ));
  }, [state.products, searchTerm]);

  const favorites = useMemo(() => {
    return state.products.filter(p => !p.isDeleted && p.isFavorite).slice(0, 15);
  }, [state.products]);

  const addToCart = (product: Product, variation?: ProductVariation) => {
    const target = variation || product;
    if (target.stock <= 0) return;
    const itemPrice = getResolvedPrice(target);
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
    if (variation) setPickingProduct(null);
    if (!isCartOpen) setIsCartOpen(true);
  };

  const finalizeSale = () => {
    if (cart.length === 0) return;
    const profit = cart.reduce((acc, it) => acc + ((it.price - it.costPrice) * it.quantity), 0) - discountAmount;
    const invoiceId = Math.random().toString(36).substr(2, 9);
    const invoice: Invoice = {
      id: invoiceId, date: new Date().toISOString(), customerId: selectedCustomerId, items: cart,
      subtotal, tax: taxAmount, discount: discountAmount, total, profit,
      paidAmount: paymentMethod === 'cash' ? (cashReceived === '' ? total : Number(cashReceived)) : total,
      status: 'paid', paymentMethod, pointsEarned: Math.floor(total * state.settings.loyaltySettings.pointsPerUnit)
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
      updateState('customers', state.customers.map(c => c.id === selectedCustomerId ? { 
        ...c, totalSpent: c.totalSpent + total, loyaltyPoints: (c.loyaltyPoints || 0) + (invoice.pointsEarned || 0),
        transactionCount: (c.transactionCount || 0) + 1, lastVisit: new Date().toISOString()
      } : c));
    }
    updateState('products', updatedProducts);
    updateState('invoices', [...state.invoices, invoice]);
    setFinishedInvoice(invoice);
    setCart([]); setIsCheckoutOpen(false); setIsCartOpen(false); setDiscountValue(0); setCashReceived('');
  };

  // Fix: Implement addCustomItem for uncataloged items
  const addCustomItem = () => {
    if (!customItemForm.name || customItemForm.price <= 0) return;
    const customProduct: CartItem = {
      id: `custom-${Date.now()}`,
      name: customItemForm.name,
      category: 'Custom',
      price: customItemForm.price,
      costPrice: 0,
      stock: 9999,
      sku: 'CUSTOM',
      quantity: 1,
      buyPrice: customItemForm.price,
      isDeleted: false
    };
    setCart(prev => [...prev, customProduct]);
    setIsCustomItemOpen(false);
    setCustomItemForm({ name: '', price: 0 });
    if (!isCartOpen) setIsCartOpen(true);
  };

  // Fix: Implement handlePrintReceipt to handle document dispatch
  const handlePrintReceipt = (inv: Invoice, layout: PrintLayout) => {
    const html = generatePrintHTML(state, inv, layout);
    const holder = document.getElementById('print-holder');
    if (holder) {
      holder.innerHTML = html;
      window.print();
      holder.innerHTML = '';
    }
  };

  // Fix: Implement handleDownloadReceiptPDF for digital export
  const handleDownloadReceiptPDF = async (inv: Invoice) => {
    if (isExportingReceipt) return;
    setIsExportingReceipt(true);
    try {
      const html = generatePrintHTML(state, inv, receiptPrintMode === 'thermal' ? 'thermal' : 'a4');
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
    } catch (e) {
      console.error(e);
    } finally {
      const container = document.getElementById('pdf-render-container');
      if (container) container.innerHTML = '';
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
        <div className="flex items-center gap-2">
          {cart.length > 0 && <button onClick={() => setIsVoidConfirmOpen(true)} className="p-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"><Ban size={20}/></button>}
          <button onClick={() => setIsCartOpen(false)} className="xl:hidden p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"><X size={20}/></button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* IMPROVED SEARCHABLE CUSTOMER LOOKUP */}
        <div className="p-6 space-y-4 bg-slate-50 dark:bg-slate-900/30 border-b dark:border-slate-800 relative">
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Identity Selection</label>
          
          {selectedCustomer ? (
            <div className="p-4 bg-indigo-600 rounded-[28px] text-white shadow-xl flex items-center justify-between animate-in zoom-in-95 duration-200">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center font-black text-lg backdrop-blur-md border border-white/20">
                     {selectedCustomer.name.charAt(0)}
                  </div>
                  <div>
                     <p className="text-sm font-black uppercase tracking-tight truncate max-w-[120px]">{selectedCustomer.name}</p>
                     <p className="text-[8px] font-bold opacity-70 uppercase tracking-widest flex items-center gap-1"><Star size={8} fill="white"/> {selectedCustomer.loyaltyPoints || 0} Credits</p>
                  </div>
               </div>
               <button onClick={() => { setSelectedCustomerId(''); setCustomerSearch(''); }} className="p-2 hover:bg-white/20 rounded-xl transition-all"><UserMinus size={18}/></button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative group">
                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isCustomerSearchFocused ? 'text-indigo-600' : 'text-slate-300'}`} size={16} />
                <input 
                  type="text" 
                  value={customerSearch}
                  onFocus={() => setIsCustomerSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsCustomerSearchFocused(false), 200)}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Identify client by name, phone..." 
                  className="w-full bg-white dark:bg-slate-800 border-2 border-transparent focus:border-indigo-600 rounded-2xl py-3.5 pl-12 pr-6 outline-none font-bold text-[12px] dark:text-white shadow-sm transition-all"
                />
                {customerSearch && <button onClick={() => setCustomerSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300"><X size={14}/></button>}
              </div>

              {/* PREDICIVE RESULTS OVERLAY */}
              {isCustomerSearchFocused && customerSearch && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 z-[100] overflow-hidden animate-in slide-in-from-top-2">
                   {filteredCustomerList.length > 0 ? (
                     <div className="divide-y divide-slate-50 dark:divide-slate-700">
                        {filteredCustomerList.map(c => (
                          <button 
                            key={c.id} 
                            onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch(''); setIsCustomerSearchFocused(false); }}
                            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-left"
                          >
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center font-black text-indigo-600">{c.name.charAt(0)}</div>
                                <div>
                                   <p className="text-sm font-black dark:text-white uppercase leading-none">{c.name}</p>
                                   <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{c.phone}</p>
                                </div>
                             </div>
                             {c.totalDebt > 0 && <span className="px-2 py-0.5 bg-rose-50 text-rose-500 text-[8px] font-black uppercase rounded-md border border-rose-100">Debt Present</span>}
                          </button>
                        ))}
                     </div>
                   ) : (
                     <div className="p-10 text-center flex flex-col items-center gap-2">
                        <SearchCode size={32} className="text-slate-200" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No matching identity in ledger</p>
                     </div>
                   )}
                </div>
              )}
            </div>
          )}

          {selectedCustomer?.totalDebt > 0 && (
             <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 dark:border-rose-800 flex items-center gap-3 animate-pulse">
                <AlertCircle size={14} className="text-rose-600" />
                <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Selected Client has {state.settings.currency}{selectedCustomer.totalDebt.toLocaleString()} Outstanding Debt</p>
             </div>
          )}
        </div>

        <div className="p-6 space-y-3">
          {cart.map(item => {
            const uniqueId = item.variationId ? `${item.id}-${item.variationId}` : item.id;
            const price = getResolvedPrice(item);
            return (
              <div key={uniqueId} className="p-4 bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm group">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-[20px] bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 border dark:border-slate-700 overflow-hidden">
                    {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <Package size={22}/>}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                    <div><p className="font-black text-xs dark:text-white uppercase truncate tracking-tight">{item.name}</p><p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{state.settings.currency}{price.toLocaleString()} ea</p></div>
                    <div className="flex items-center justify-between mt-2"><p className="font-black text-sm text-indigo-600 leading-none">{state.settings.currency}{(price * item.quantity).toLocaleString()}</p>
                      <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border dark:border-slate-700 items-center scale-90">
                        <button onClick={() => {
                          setCart(prev => prev.map(it => {
                            const id = it.variationId ? `${it.id}-${it.variationId}` : it.id;
                            if (id === uniqueId) return { ...it, quantity: Math.max(0, it.quantity - 1) };
                            return it;
                          }).filter(it => it.quantity > 0));
                        }} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-400 hover:text-rose-500 rounded-lg transition-all"><Minus size={12}/></button>
                        <span className="w-8 text-center font-black text-[11px] dark:text-white">{item.quantity}</span>
                        <button onClick={() => {
                          if (item.quantity < item.stock) {
                            setCart(prev => prev.map(it => {
                              const id = it.variationId ? `${it.id}-${it.variationId}` : it.id;
                              if (id === uniqueId) return { ...it, quantity: it.quantity + 1 };
                              return it;
                            }));
                          }
                        }} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-400 hover:text-emerald-500 rounded-lg transition-all"><Plus size={12}/></button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {cart.length === 0 && <div className="py-24 text-center flex flex-col items-center justify-center gap-4 opacity-30 grayscale"><ShoppingCart size={64} strokeWidth={1}/><p className="font-black text-[10px] uppercase tracking-[0.4em]">Empty Ledger State</p></div>}
        </div>
      </div>

      <footer className="p-8 bg-slate-50 dark:bg-slate-900 border-t dark:border-slate-800 space-y-6 shrink-0">
        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6"><div><p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Final Settlement</p><h3 className="text-4xl font-black dark:text-white tracking-tighter tabular-nums">{state.settings.currency}{total.toLocaleString()}</h3></div></div>
          <button onClick={() => setIsCheckoutOpen(true)} disabled={cart.length === 0} className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-4">Authorize Payment <ChevronRight size={18} strokeWidth={3}/></button>
        </div>
      </footer>
    </div>
  );

  return (
    <div className="h-full flex flex-row overflow-hidden animate-in fade-in duration-500 gap-4">
      <ConfirmDialog isOpen={isVoidConfirmOpen} onClose={() => setIsVoidConfirmOpen(false)} onConfirm={() => { setCart([]); setIsCartOpen(false); setIsVoidConfirmOpen(false); }} title="Void Ledger Buffer?" message="This will immediately clear all items from the current terminal session. This action cannot be undone." confirmText="Void Transaction" type="danger" />
      <aside className="hidden xl:flex w-72 flex-col bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 p-6 shrink-0 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-amber-600"><Star size={20} fill="currentColor"/></div><h4 className="font-black text-xs uppercase tracking-widest dark:text-white">Priority Assets</h4></div>
        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
           {favorites.map(p => (
             <button key={p.id} onClick={() => p.variations?.length ? setPickingProduct(p) : addToCart(p)} className="w-full p-4 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-transparent hover:border-indigo-400 hover:bg-white dark:hover:bg-slate-800 transition-all text-left flex items-center gap-3 group">
                <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-slate-100 shrink-0 shadow-sm">{p.image ? <img src={p.image} className="w-full h-full object-cover rounded-xl" /> : <Package size={20}/>}</div>
                <div className="min-w-0"><p className="font-black text-[11px] dark:text-white truncate uppercase leading-none">{p.name}</p><p className="text-[10px] font-bold text-indigo-600 uppercase mt-1">{state.settings.currency}{getResolvedPrice(p).toLocaleString()}</p></div>
             </button>
           ))}
           {favorites.length === 0 && <div className="py-24 text-center opacity-20 flex flex-col items-center grayscale"><Zap size={40} className="mb-4" /><p className="font-black text-[10px] uppercase tracking-widest">No Priority Inventory</p></div>}
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white dark:bg-slate-900 p-6 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm mb-4 shrink-0">
          <div className="flex flex-col md:flex-row items-center gap-4"><div className="relative flex-1 w-full"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input type="text" placeholder="Locate registry entity by UID or label..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 pl-14 pr-6 outline-none font-bold text-sm dark:text-white focus:ring-4 ring-indigo-500/5 transition-all" /></div>
            <div className="flex gap-2 w-full md:w-auto"><button onClick={() => setIsCustomItemOpen(true)} className="p-4 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl border flex items-center justify-center gap-3 active:scale-95 transition-all" title="Add Uncataloged Item"><PlusCircle size={20} /><span className="font-black text-[10px] uppercase tracking-widest">Custom Entry</span></button><button onClick={() => setIsScannerOpen(true)} className="flex-1 md:flex-none p-4 bg-indigo-600 text-white rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all border border-indigo-500"><ScanLine size={20} /><span className="font-black text-[10px] uppercase tracking-widest">Active Scan</span></button><button onClick={() => setIsCartOpen(true)} className="xl:hidden p-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 rounded-2xl border shadow-sm flex items-center justify-center relative"><ShoppingCart size={20} />{cart.length > 0 && <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[9px] rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">{cart.length}</div>}</button></div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map(p => {
              const hasSale = p.salePrice !== undefined;
              return (
                <button key={p.id} disabled={p.stock <= 0} onClick={() => p.variations?.length ? setPickingProduct(p) : addToCart(p)} className={`group bg-white dark:bg-slate-900 p-4 rounded-[36px] border border-slate-100 dark:border-slate-800 hover:border-indigo-400 transition-all text-left relative shadow-sm hover:shadow-xl ${p.stock <= 0 ? 'opacity-50 grayscale scale-95 cursor-not-allowed' : ''}`}>
                  <div className="w-full aspect-square rounded-3xl bg-slate-50 dark:bg-slate-800 mb-4 overflow-hidden flex items-center justify-center text-slate-100 relative shadow-inner">{p.image ? <img src={p.image} className="w-full h-full object-cover transition-transform group-hover:scale-105" /> : <Package size={32} strokeWidth={1}/>}{hasSale && <div className="absolute top-3 left-3 bg-rose-600 text-white px-3 py-1 rounded-xl shadow-lg font-black text-[8px] uppercase tracking-tighter">Promo Tier</div>}{p.variations?.length > 0 && <div className="absolute top-3 right-3 bg-indigo-600 text-white p-2 rounded-xl shadow-lg"><Layers size={14}/></div>}</div>
                  <div className="space-y-1"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{p.category}</p><h5 className="font-black text-[14px] text-slate-800 dark:text-white truncate uppercase tracking-tight leading-tight mb-2">{p.name}</h5><div className="flex items-center justify-between mt-auto"><div>{hasSale ? (<div className="flex flex-col"><span className="text-[9px] text-slate-400 line-through font-bold">{state.settings.currency}{p.price.toLocaleString()}</span><span className="text-rose-600 font-black text-base">{state.settings.currency}{p.salePrice?.toLocaleString()}</span></div>) : (<p className="text-indigo-600 font-black text-base">{state.settings.currency}{p.price.toLocaleString()}</p>)}</div><div className={`px-2 py-1 rounded-lg flex flex-col items-center justify-center min-w-[32px] ${p.stock < 5 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}><span className="text-[9px] font-black">{p.stock}</span><span className="text-[6px] font-black uppercase">Qty</span></div></div></div>
                </button>
              );
            })}
          </div>
          {filteredProducts.length === 0 && <div className="py-40 text-center opacity-20 flex flex-col items-center grayscale"><Boxes size={100} strokeWidth={1} /><p className="font-black text-xs uppercase tracking-[0.4em] mt-6">Catalog Index Mismatch</p></div>}
        </div>
      </div>
      <div className="hidden xl:block w-96 shrink-0 animate-in slide-in-from-right duration-300"><CartContent /></div>
      {isCartOpen && <div className="fixed inset-0 z-[90] flex justify-end xl:hidden"><div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsCartOpen(false)}/><div className="relative w-full max-w-xl h-full shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-in slide-in-from-right duration-400"><CartContent /></div></div>}
      
      {/* TRANSACTION SUCCESS & MODALS (REMAIN UNCHANGED OR MINIMAL POLISH) */}
      {isCustomItemOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden flex flex-col border border-white/10 animate-in zoom-in duration-300">
              <header className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl flex items-center justify-center"><PlusCircle size={24}/></div><h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Custom Product Entry</h3></div><button onClick={() => setIsCustomItemOpen(false)} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400"><X size={20}/></button></header>
              <div className="p-8 space-y-6"><div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Description / Name</label><input type="text" value={customItemForm.name} onChange={e => setCustomItemForm({...customItemForm, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-600 rounded-2xl py-4 px-6 font-black text-sm dark:text-white outline-none shadow-inner" placeholder="e.g. Miscellaneous Service Fee" autoFocus /></div><div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Unit Price</label><div className="relative"><span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-2xl text-slate-300">{state.settings.currency}</span><input type="number" value={customItemForm.price || ''} onChange={e => setCustomItemForm({...customItemForm, price: Number(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-600 rounded-2xl py-4 pl-14 pr-6 font-black text-3xl dark:text-white outline-none shadow-inner" placeholder="0.00" /></div></div></div>
              <footer className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex gap-4"><button onClick={() => setIsCustomItemOpen(false)} className="flex-1 py-4 bg-white dark:bg-slate-800 text-slate-500 rounded-2xl font-black text-[10px] uppercase">Cancel</button><button onClick={addCustomItem} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">Inject Item</button></footer>
           </div>
        </div>
      )}
      
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[56px] w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col border border-white/10 animate-in zoom-in-95 duration-300">
              <header className="p-10 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10"><div className="flex items-center gap-5"><div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center shadow-lg"><Wallet size={28}/></div><div><h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Settlement Module</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized Fiscal Protocol</p></div></div><button onClick={() => setIsCheckoutOpen(false)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-rose-500 transition-all"><X size={24}/></button></header>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-8"><div className="p-8 bg-slate-50 dark:bg-slate-800 rounded-[40px] text-center border border-slate-100 dark:border-slate-700 shadow-inner"><p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Aggregate Value Due</p><h2 className="text-6xl font-black dark:text-white tracking-tighter">{state.settings.currency}{total.toLocaleString()}</h2></div>
                 <div className="space-y-4"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Channel of Remittance</label><div className="grid grid-cols-3 gap-3">{[{ id: 'cash', label: 'Cash Entry', icon: Banknote },{ id: 'card', label: 'Digital Token', icon: CreditCard },{ id: 'transfer', label: 'Wire Link', icon: RefreshCw }].map(method => (<button key={method.id} onClick={() => setPaymentMethod(method.id as any)} className={`flex flex-col items-center justify-center p-6 rounded-[32px] border-4 transition-all gap-3 ${paymentMethod === method.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900 grayscale opacity-60'}`}><method.icon size={32} className={paymentMethod === method.id ? 'text-indigo-600' : 'text-slate-400'} /><span className={`text-[10px] font-black uppercase tracking-widest ${paymentMethod === method.id ? 'text-indigo-600' : 'text-slate-400'}`}>{method.label}</span></button>))}</div></div>
                 {paymentMethod === 'cash' && (<div className="space-y-6 animate-in slide-in-from-top-4"><div className="flex items-center justify-between mb-2"><label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-2 flex items-center gap-2"><Coins size={14}/> Cash Flow Manager</label>{total > 0 && (<div className="flex gap-1">{[total, 10, 20, 50, 100].map((val, i) => (<button key={i} onClick={() => setCashReceived(val)} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[9px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all">{i === 0 ? 'Exact' : `${state.settings.currency}${val}`}</button>))}</div>)}</div><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="relative"><span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-2xl text-slate-300">{state.settings.currency}</span><input type="number" value={cashReceived} onChange={e => setCashReceived(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-white dark:bg-slate-800 border-4 border-indigo-100 dark:border-indigo-900/50 focus:border-indigo-500 rounded-[32px] py-6 pl-14 pr-8 font-black text-4xl dark:text-white outline-none shadow-xl transition-all" placeholder="Received..." autoFocus /><p className="absolute -top-3 left-6 bg-white dark:bg-slate-800 px-2 text-[9px] font-black text-indigo-600 uppercase">Remittance In</p></div><div className={`relative flex flex-col justify-center px-10 rounded-[32px] border-4 border-dashed transition-all ${changeDue > 0 ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 text-emerald-600' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 text-slate-300'}`}><p className="text-[9px] font-black uppercase mb-1">Return Surplus (Change)</p><h4 className="text-4xl font-black tabular-nums">{state.settings.currency}{changeDue.toLocaleString()}</h4>{changeDue > 0 && <Sparkles size={20} className="absolute top-4 right-4 text-emerald-400 animate-pulse" />}</div></div></div>)}
              </div>
              <footer className="p-10 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-4"><button onClick={() => setIsCheckoutOpen(false)} className="flex-1 py-7 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-[32px] font-black text-xs uppercase tracking-[0.2em]">Abort Process</button><button onClick={finalizeSale} className="flex-[2] py-7 bg-indigo-600 text-white rounded-[32px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-[0.98] flex items-center justify-center gap-4"><CheckCircle2 size={24}/> Finalize Authorized Sale</button></footer>
           </div>
        </div>
      )}

      {finishedInvoice && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-2xl animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[64px] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col border border-white/10 animate-in zoom-in-95 duration-500">
              <header className="p-10 pb-6 text-center shrink-0"><div className="w-20 h-20 bg-emerald-500 text-white rounded-[32px] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-200 dark:shadow-none mb-6 animate-bounce"><CheckCircle size={40} strokeWidth={3} /></div><h2 className="text-4xl font-black dark:text-white uppercase tracking-tighter">Sale Authenticated!</h2><p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">Ledger Reference #INV-{finishedInvoice.id.padStart(4, '0')}</p></header>
              <div className="flex-1 overflow-y-auto custom-scrollbar px-10 py-6"><div className="bg-slate-50 dark:bg-slate-800/50 rounded-[48px] border border-slate-100 dark:border-slate-800 p-8 space-y-8"><div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-6"><div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fiscal Finality</p><h4 className="text-3xl font-black text-emerald-600">{state.settings.currency}{finishedInvoice.total.toLocaleString()}</h4></div><div className="text-right"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Channel</p><p className="text-sm font-black text-slate-800 dark:text-white uppercase">{finishedInvoice.paymentMethod} • AUTHORIZED</p></div></div><div className="space-y-4"><label className="block text-[11px] font-black text-indigo-600 uppercase tracking-[0.3em] ml-2">Dispatch Mode</label><div className="grid grid-cols-2 gap-4"><button onClick={() => setReceiptPrintMode('thermal')} className={`p-6 rounded-[32px] border-4 transition-all text-left flex items-center gap-4 ${receiptPrintMode === 'thermal' ? 'border-indigo-600 bg-white dark:bg-slate-700 shadow-lg' : 'bg-white dark:bg-slate-800 border-transparent opacity-60'}`}><Smartphone size={24} className={receiptPrintMode === 'thermal' ? 'text-indigo-600' : 'text-slate-400'} /><div><p className="font-black text-sm dark:text-white uppercase">Thermal</p><p className="text-[8px] font-bold text-slate-400 uppercase">POS Tape</p></div></button><button onClick={() => setReceiptPrintMode('a4')} className={`p-6 rounded-[32px] border-4 transition-all text-left flex items-center gap-4 ${receiptPrintMode === 'a4' ? 'border-indigo-600 bg-white dark:bg-slate-700 shadow-lg' : 'bg-white dark:bg-slate-800 border-transparent opacity-60'}`}><Layout size={24} className={receiptPrintMode === 'a4' ? 'text-indigo-600' : 'text-slate-400'} /><div><p className="font-black text-sm dark:text-white uppercase">Formal A4</p><p className="text-[8px] font-bold text-slate-400 uppercase">Ledger Spec</p></div></button></div></div>{finishedInvoice.customerId && (<div className="p-6 bg-indigo-600 rounded-[32px] text-white flex items-center justify-between shadow-xl relative overflow-hidden group"><div className="flex items-center gap-4 relative z-10"><div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center"><Star size={24} fill="white"/></div><div><p className="text-[9px] font-black text-indigo-100 uppercase tracking-widest">Rewards Sychronized</p><p className="text-base font-black uppercase">{state.customers.find(c => c.id === finishedInvoice.customerId)?.name}</p></div></div><div className="text-right relative z-10"><p className="text-2xl font-black">+{finishedInvoice.pointsEarned} <span className="text-[10px]">PTS</span></p></div><Zap className="absolute -bottom-6 -right-6 text-white/10 rotate-12 group-hover:scale-125 transition-transform" size={100} /></div>)}</div></div>
              <footer className="p-10 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col gap-4 shrink-0"><div className="flex gap-4"><button onClick={() => handlePrintReceipt(finishedInvoice, receiptPrintMode)} className="flex-1 py-5 bg-indigo-600 text-white rounded-[28px] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-indigo-700 transition-all active:scale-95"><Printer size={20}/> Dispatch Print</button><button onClick={() => handleDownloadReceiptPDF(finishedInvoice)} disabled={isExportingReceipt} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white rounded-[28px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-200 transition-all active:scale-95">{isExportingReceipt ? <RefreshCw size={20} className="animate-spin"/> : <FileDown size={20}/>} Download PDF</button></div><button onClick={() => setFinishedInvoice(null)} className="w-full py-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[32px] font-black text-xs uppercase tracking-[0.3em] hover:opacity-90 transition-all active:scale-[0.98]">Next Transaction Cycle</button></footer>
           </div>
        </div>
      )}
    </div>
  );
}
