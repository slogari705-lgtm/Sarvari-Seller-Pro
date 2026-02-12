
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  X, 
  Package, 
  ScanLine, 
  RefreshCw,
  CheckCircle2,
  Star,
  CreditCard,
  Banknote,
  Tag,
  Wallet,
  Printer,
  CheckCircle,
  Layout,
  Smartphone,
  UserMinus,
  ChevronRight,
  UserPlus,
  Phone,
  Barcode,
  Camera,
  Activity,
  LineChart as LineChartIcon,
  Layers,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { AppState, Product, CartItem, Invoice, Customer, ProductVariation } from '../types';
import { translations } from '../translations';
import ConfirmDialog from './ConfirmDialog';
import { generatePrintHTML, PrintLayout } from '../printService';
import { AreaChart, Area, ResponsiveContainer, YAxis, XAxis, Tooltip, CartesianGrid } from 'recharts';
import { queueSyncAction } from '../syncService';

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
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isVoidConfirmOpen, setIsVoidConfirmOpen] = useState(false);
  
  const [cashReceived, setCashReceived] = useState<number | ''>('');
  const [finishedInvoice, setFinishedInvoice] = useState<Invoice | null>(null);
  const [receiptPrintMode, setReceiptPrintMode] = useState<PrintLayout>('thermal');
  const [pickingProduct, setPickingProduct] = useState<Product | null>(null);
  
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [quickCustForm, setQuickCustForm] = useState({ name: '', phone: '' });

  const [sidebarTab, setSidebarTab] = useState<'picks' | 'stats'>('picks');

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  
  const productsRef = useRef(state.products);
  useEffect(() => {
    productsRef.current = state.products;
  }, [state.products]);

  const barcodeBuffer = useRef('');
  const lastKeyTime = useRef(0);
  const [lastScannedSku, setLastScannedSku] = useState('');

  const findProductByBarcode = (code: string) => {
    const products = productsRef.current;
    for (const p of products) {
      if (p.isDeleted) continue;
      const variation = p.variations?.find(v => v.sku === code);
      if (variation) return { product: p, variation };
    }
    const parentProduct = products.find(p => p.sku === code && !p.isDeleted);
    if (parentProduct) return { product: parentProduct };
    return null;
  };

  const handleBarcodeMatch = (code: string) => {
    const match = findProductByBarcode(code);
    if (match) {
      if (match.variation) {
        addToCart(match.product, match.variation);
        setLastScannedSku(`${match.product.name} (${match.variation.name})`);
      } else if (match.product.variations && match.product.variations.length > 0) {
        setPickingProduct(match.product);
      } else {
        addToCart(match.product);
        setLastScannedSku(match.product.name);
      }
      setTimeout(() => setLastScannedSku(''), 2500);
      return true;
    }
    return false;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      const now = Date.now();
      if (now - lastKeyTime.current > 50) barcodeBuffer.current = '';
      if (e.key === 'Enter') {
        const scannedCode = barcodeBuffer.current.trim();
        if (scannedCode.length > 2) {
          handleBarcodeMatch(scannedCode);
          barcodeBuffer.current = '';
          e.preventDefault();
        }
      } else if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
      }
      lastKeyTime.current = now;
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    let scanner: Html5Qrcode | null = null;
    const startScanner = async () => {
      try {
        scanner = new Html5Qrcode("camera-reader");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (handleBarcodeMatch(decodedText)) {
              setIsCameraOpen(false);
            }
          },
          () => {}
        );
      } catch (err) {
        console.error("Camera failed to start:", err);
        setIsCameraOpen(false);
      }
    };
    const stopScanner = async () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) await scannerRef.current.stop();
          await scannerRef.current.clear();
        } catch (err) { console.error("Error stopping scanner:", err); }
        scannerRef.current = null;
      }
    };
    if (isCameraOpen) startScanner();
    else stopScanner();
    return () => { if (scannerRef.current?.isScanning) scannerRef.current.stop().catch(console.error); };
  }, [isCameraOpen]);

  const t = translations[state.settings.language || 'en'];
  const selectedCustomer = useMemo(() => state.customers.find(c => c.id === selectedCustomerId), [state.customers, selectedCustomerId]);
  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + (item.buyPrice * item.quantity), 0), [cart]);
  const taxAmount = subtotal * (state.settings.taxRate / 100);
  const total = Math.max(0, subtotal + taxAmount - discountValue);

  const sessionData = useMemo(() => {
    const data = state.invoices
      .filter(i => !i.isVoided)
      .slice(-10)
      .map((inv, idx) => ({
        index: idx + 1,
        value: inv.total
      }));
    return data.length > 0 ? data : [{ index: 0, value: 0 }];
  }, [state.invoices]);

  useEffect(() => {
    if (!isCheckoutOpen) return;
    if (paymentMethod !== 'cash') { 
      setPaymentTerm('Immediate'); 
      return; 
    }
    const received = cashReceived === '' ? total : Number(cashReceived);
    setPaymentTerm(received < total ? 'On Credit' : 'Immediate');
  }, [cashReceived, total, paymentMethod, isCheckoutOpen]);

  const filteredProducts = useMemo(() => {
    return state.products.filter(p => !p.isDeleted && (
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    ));
  }, [state.products, searchTerm]);

  const addToCart = (product: Product, variation?: ProductVariation) => {
    const target = variation || product;
    // Stock is usually handled as 0 or undefined, ensure it's a number
    const availableStock = Number(target.stock) || 0;
    if (availableStock <= 0) return;

    const itemPrice = Number(target.salePrice ?? target.price) || 0;
    const itemCost = Number(target.costPrice) || 0;
    const itemName = variation ? `${product.name} (${variation.name})` : product.name;
    
    setCart(prev => {
      const uniqueId = variation ? `${product.id}-${variation.id}` : product.id;
      const existing = prev.find(item => {
        const itemUniqueId = item.variationId ? `${item.id}-${item.variationId}` : item.id;
        return itemUniqueId === uniqueId;
      });
      
      if (existing) {
        if (existing.quantity >= availableStock) return prev;
        return prev.map(item => {
          const itemUniqueId = item.variationId ? `${item.id}-${item.variationId}` : item.id;
          return itemUniqueId === uniqueId 
            ? { ...item, quantity: item.quantity + 1 } 
            : item;
        });
      }
      
      return [...prev, { 
        ...product, 
        name: itemName, 
        sku: target.sku, 
        price: itemPrice, 
        costPrice: itemCost, 
        stock: availableStock, 
        quantity: 1, 
        buyPrice: itemPrice, 
        variationId: variation?.id, 
        variationName: variation?.name 
      }];
    });
    if (!isCartOpen) setIsCartOpen(true);
  };

  const handleQuickCustomer = () => {
    if (!quickCustForm.name || !quickCustForm.phone) return;
    const nextId = (state.customers.reduce((max: number, c: Customer) => Math.max(max, parseInt(c.id) || 0), 0) + 1).toString();
    const newCust: Customer = { 
      id: nextId, 
      name: quickCustForm.name, 
      phone: quickCustForm.phone, 
      email: '', 
      totalSpent: 0, 
      totalDebt: 0, 
      lastVisit: 'New Member', 
      joinedDate: new Date().toISOString(), 
      isDeleted: false 
    };
    updateState('customers', [...state.customers, newCust]);
    setSelectedCustomerId(newCust.id);
    setIsQuickCustomerOpen(false);
    setQuickCustForm({ name: '', phone: '' });
    queueSyncAction('UPDATE_CUSTOMER', newCust);
  };

  const finalizeSale = () => {
    if (cart.length === 0) return;
    const profit = cart.reduce((acc, it) => acc + ((it.price - it.costPrice) * it.quantity), 0) - discountValue;
    const invoiceId = Math.random().toString(36).substr(2, 9);
    const paidAmount = paymentMethod === 'cash' ? (cashReceived === '' ? total : Math.min(total, Number(cashReceived))) : total;
    
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
      paidAmount, 
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
    queueSyncAction('CREATE_INVOICE', invoice);
    queueSyncAction('UPDATE_PRODUCT', updatedProducts.filter(p => cart.some(it => it.id === p.id)));

    setFinishedInvoice(invoice);
    setCart([]); 
    setIsCheckoutOpen(false); 
    setIsCartOpen(false); 
    setDiscountValue(0); 
    setCashReceived('');
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

  const CartContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 border-l dark:border-slate-800">
      <header className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><ShoppingCart size={24} /></div>
          <div><h4 className="font-black text-lg dark:text-white uppercase tracking-tighter leading-tight">Terminal Cart</h4><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Settlement</p></div>
        </div>
        <button onClick={() => setIsCartOpen(false)} className="xl:hidden p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"><X size={20}/></button>
      </header>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-6 space-y-4 bg-slate-50 dark:bg-slate-900/30 border-b dark:border-slate-800 relative">
          <div className="flex items-center justify-between mb-1">
             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Holder</label>
             <button onClick={() => setIsQuickCustomerOpen(true)} className="text-[9px] font-black text-indigo-600 uppercase hover:underline flex items-center gap-1"><UserPlus size={10}/> Enrollment</button>
          </div>
          {selectedCustomer ? (
            <div className="p-4 bg-indigo-600 rounded-[28px] text-white shadow-xl flex items-center justify-between animate-in zoom-in-95 duration-200">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center font-black text-lg backdrop-blur-md border border-white/20">{selectedCustomer.name.charAt(0)}</div>
                  <div className="min-w-0">
                     <p className="text-sm font-black uppercase tracking-tight truncate max-w-[120px]">{selectedCustomer.name}</p>
                     <p className="text-[8px] font-bold opacity-70 uppercase tracking-widest flex items-center gap-1">{selectedCustomer.phone}</p>
                  </div>
               </div>
               <button onClick={() => { setSelectedCustomerId(''); setCustomerSearch(''); }} className="p-2 hover:bg-white/20 rounded-xl transition-all"><UserMinus size={18}/></button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input type="text" value={customerSearch} onFocus={() => setIsCustomerSearchFocused(true)} onBlur={() => setTimeout(() => setIsCustomerSearchFocused(false), 200)} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Find customer record..." className="w-full bg-white dark:bg-slate-800 border-none rounded-2xl py-3.5 pl-12 pr-6 outline-none font-bold text-[12px] dark:text-white shadow-sm transition-all" />
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
          {cart.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center gap-4 opacity-20"><ScanLine size={64} strokeWidth={1} className="animate-pulse" /><p className="font-black text-xs uppercase tracking-widest">Waiting for Scans...</p></div>
          )}
        </div>
      </div>
      <footer className="p-8 bg-slate-50 dark:bg-slate-900 border-t dark:border-slate-800 space-y-6 shrink-0">
        <div className="space-y-2">
           <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase"><span>Subtotal</span><span>{state.settings.currency}{subtotal.toLocaleString()}</span></div>
           {discountValue > 0 && <div className="flex justify-between text-[10px] font-black text-emerald-600 uppercase"><span>Markdown</span><span>-{state.settings.currency}{discountValue.toLocaleString()}</span></div>}
           {selectedCustomer && selectedCustomer.totalDebt > 0 && <div className="flex justify-between text-[10px] font-black text-rose-500 uppercase"><span>Acct. Balance</span><span>{state.settings.currency}{selectedCustomer.totalDebt.toLocaleString()}</span></div>}
        </div>
        <div className="flex items-center justify-between mb-4"><div><p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">TOTAL PAYABLE</p><h3 className="text-4xl font-black dark:text-white tracking-tighter tabular-nums">{state.settings.currency}{total.toLocaleString()}</h3></div></div>
        <button onClick={() => setIsCheckoutOpen(true)} disabled={cart.length === 0} className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-4">Settlement Hub <ChevronRight size={18} strokeWidth={3}/></button>
      </footer>
    </div>
  );

  return (
    <div className="h-full flex flex-row overflow-hidden animate-in fade-in duration-500 gap-4">
      <ConfirmDialog isOpen={isVoidConfirmOpen} onClose={() => setIsVoidConfirmOpen(false)} onConfirm={() => { setCart([]); setIsCartOpen(false); setIsVoidConfirmOpen(false); setDiscountValue(0); }} title="Clear Ledger?" message="All items in the current terminal will be purged." confirmText="Void Session" type="danger" />
      
      <aside className="hidden xl:flex w-72 flex-col bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 p-6 shrink-0 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 mb-6 p-1 bg-slate-50 dark:bg-slate-800 rounded-2xl">
           <button onClick={() => setSidebarTab('picks')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${sidebarTab === 'picks' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}><Star size={14}/> Picks</button>
           <button onClick={() => setSidebarTab('stats')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${sidebarTab === 'stats' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}><LineChartIcon size={14}/> Stats</button>
        </div>

        {sidebarTab === 'picks' ? (
          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
             {state.products.filter(p => p.isFavorite && !p.isDeleted).map(p => (
               <button key={p.id} onClick={() => p.variations && p.variations.length > 0 ? setPickingProduct(p) : addToCart(p)} className="w-full p-4 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-transparent hover:border-indigo-400 hover:bg-white transition-all text-left flex items-center gap-3 group">
                  <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center shrink-0 shadow-sm overflow-hidden group-hover:scale-110 transition-transform">
                    {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <Package size={20}/>}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-[11px] dark:text-white truncate uppercase leading-none">{p.name}</p>
                    <p className="text-[10px] font-bold text-indigo-600 uppercase mt-1">{state.settings.currency}{p.price.toLocaleString()}</p>
                  </div>
               </button>
             ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col animate-in fade-in">
             <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-[32px] border border-indigo-100 dark:border-indigo-900/30 mb-6">
                <p className="text-[9px] font-black text-indigo-600 uppercase mb-4 tracking-widest flex items-center gap-2"><Activity size={12}/> Shift Revenue</p>
                <div className="h-32 w-full relative">
                  {state.invoices.filter(i => !i.isVoided).length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sessionData}>
                        <defs><linearGradient id="sessionGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/><stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/></linearGradient></defs>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }} labelStyle={{ display: 'none' }} />
                        <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#sessionGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center opacity-30 text-indigo-600">
                      <Activity size={32} className="mb-2" />
                      <p className="text-[8px] font-black uppercase">No Sales</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center mt-4">
                   <div><p className="text-[8px] font-black text-slate-400 uppercase">Agg. Value</p><p className="text-xl font-black dark:text-white">{state.settings.currency}{state.invoices.filter(i => !i.isVoided && !i.isDeleted).slice(-10).reduce((a,b) => a + b.total, 0).toLocaleString()}</p></div>
                   <div className="text-right"><p className="text-[8px] font-black text-slate-400 uppercase">Count</p><p className="text-xl font-black dark:text-white">{state.invoices.filter(i => !i.isVoided && !i.isDeleted).length > 10 ? 10 : state.invoices.filter(i => !i.isVoided && !i.isDeleted).length}</p></div>
                </div>
             </div>
             <div className="flex-1 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[32px] border border-slate-100 dark:border-slate-800 overflow-hidden">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Recent Audit</p>
                <div className="space-y-4">
                   {state.invoices.filter(i => !i.isDeleted).slice(-4).reverse().map(inv => (
                     <div key={inv.id} className="flex justify-between items-center">
                        <div className="min-w-0"><p className="text-[10px] font-black dark:text-white truncate">#INV-{inv.id.padStart(3,'0')}</p><p className="text-[8px] text-slate-400 uppercase">{new Date(inv.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p></div>
                        <p className="text-xs font-black text-indigo-600">{state.settings.currency}{inv.total.toLocaleString()}</p>
                     </div>
                   ))}
                   {state.invoices.filter(i => !i.isDeleted).length === 0 && (
                     <div className="flex items-center gap-2 opacity-20 py-4"><AlertCircle size={14}/><span className="text-[10px] font-black uppercase">No records found</span></div>
                   )}
                </div>
             </div>
          </div>
        )}

        <div className="mt-6 p-6 bg-slate-900 rounded-[32px] text-white flex flex-col items-center gap-4 relative overflow-hidden">
           <Barcode size={32} className="relative z-10 animate-pulse" />
           <div className="text-center relative z-10">
              <p className="text-[10px] font-black uppercase tracking-widest">Scanner Engaged</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 leading-tight">Ready for hardware input</p>
           </div>
           {lastScannedSku && (
             <div className="absolute inset-0 bg-indigo-600 flex items-center justify-center animate-in fade-in zoom-in">
               <p className="font-black text-xs uppercase tracking-widest flex items-center gap-2">
                 <CheckCircle2 size={16}/> Added Asset
               </p>
             </div>
           )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white dark:bg-slate-900 p-6 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm mb-4 shrink-0">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
               <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
               <input type="text" placeholder="Locate asset via label, SKU or UID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 pl-14 pr-6 outline-none font-bold text-sm dark:text-white focus:ring-4 ring-indigo-500/10 transition-all" />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button onClick={() => setIsCameraOpen(true)} className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all"><Camera size={20} /><span className="font-black text-[10px] uppercase tracking-widest">Scan QR</span></button>
              <button onClick={() => setIsDiscountModalOpen(true)} className={`p-4 rounded-2xl border flex items-center justify-center gap-3 active:scale-95 transition-all ${discountValue > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 border-transparent'}`} title="Adjustment Markdown">
                <Tag size={20} /><span className="font-black text-[10px] uppercase tracking-widest">{discountValue > 0 ? `-${state.settings.currency}${discountValue}` : 'Markdown'}</span>
              </button>
              <button onClick={() => setIsVoidConfirmOpen(true)} className="p-4 bg-slate-50 dark:bg-slate-800 text-rose-500 rounded-2xl border border-transparent flex items-center justify-center gap-3 active:scale-95 transition-all"><X size={20} /><span className="font-black text-[10px] uppercase tracking-widest">Void</span></button>
              <button onClick={() => setIsCartOpen(true)} className="xl:hidden p-4 bg-indigo-600 text-white rounded-2xl shadow-lg flex items-center justify-center relative"><ShoppingCart size={20} />{cart.length > 0 && <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[9px] rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">{cart.length}</div>}</button>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map(p => (
              <div 
                key={p.id} 
                onClick={() => p.stock > 0 ? (p.variations && p.variations.length > 0 ? setPickingProduct(p) : addToCart(p)) : null} 
                className={`group bg-white dark:bg-slate-900 p-4 rounded-[36px] border border-slate-100 dark:border-slate-800 hover:border-indigo-400 transition-all text-left relative shadow-sm hover:shadow-xl cursor-pointer ${p.stock <= 0 ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
              >
                <div className="w-full aspect-square rounded-3xl bg-slate-50 dark:bg-slate-800 mb-4 overflow-hidden flex items-center justify-center relative shadow-inner pointer-events-none">
                   {p.image ? <img src={p.image} className="w-full h-full object-cover transition-transform group-hover:scale-105" /> : <Package size={32} strokeWidth={1}/>}
                   <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"><div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg"><Plus size={16}/></div></div>
                </div>
                <div className="space-y-1 pointer-events-none">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{p.category}</p>
                  <h5 className="font-black text-[13px] text-slate-800 dark:text-white truncate uppercase tracking-tight leading-tight mb-2">{p.name}</h5>
                  <div className="flex items-center justify-between">
                    <p className="text-indigo-600 font-black text-base">{state.settings.currency}{p.price.toLocaleString()}</p>
                    <div className={`px-2 py-1 rounded-lg text-[9px] font-black ${p.stock < 5 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{p.stock} Unit</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="hidden xl:block w-[420px] shrink-0 animate-in slide-in-from-right duration-300"><CartContent /></div>
      
      {/* Variation Picker Modal */}
      {pickingProduct && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[56px] w-full max-w-2xl shadow-2xl overflow-hidden border border-white/10 flex flex-col animate-in zoom-in-95">
              <header className="p-10 border-b flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center shadow-xl"><Layers size={32}/></div>
                    <div>
                       <h3 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Variant Selection</h3>
                       <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Target: {pickingProduct.name}</p>
                    </div>
                 </div>
                 <button onClick={() => setPickingProduct(null)} className="p-4 bg-slate-100 dark:bg-slate-800 rounded-3xl text-slate-400 hover:text-rose-500 transition-all"><X size={28}/></button>
              </header>
              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-4">
                 {pickingProduct.variations?.map(v => (
                   <button 
                    key={v.id} 
                    disabled={v.stock <= 0}
                    onClick={() => { addToCart(pickingProduct, v); setPickingProduct(null); }}
                    className={`p-6 rounded-[36px] border-4 transition-all text-left flex flex-col justify-between group h-48 relative overflow-hidden ${v.stock > 0 ? 'bg-slate-50 dark:bg-slate-800 border-transparent hover:border-indigo-600 hover:bg-white dark:hover:bg-slate-700' : 'opacity-40 grayscale cursor-not-allowed'}`}
                   >
                      <div className="relative z-10 pointer-events-none">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">SKU: {v.sku}</p>
                        <h4 className="text-xl font-black dark:text-white uppercase tracking-tight leading-tight">{v.name}</h4>
                      </div>
                      <div className="relative z-10 flex items-center justify-between mt-auto pointer-events-none">
                        <div>
                          <p className="text-indigo-600 font-black text-2xl">{state.settings.currency}{v.price.toLocaleString()}</p>
                          <p className={`text-[9px] font-black uppercase ${v.stock < 5 ? 'text-rose-500' : 'text-slate-400'}`}>Availability: {v.stock} Items</p>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-600 rounded-2xl shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all"><ArrowRight size={20}/></div>
                      </div>
                      <Layers className="absolute -bottom-6 -right-6 text-indigo-500/5 group-hover:scale-125 transition-transform pointer-events-none" size={140} />
                   </button>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* Camera and Other Modals ... (Unchanged but ensuring IDs exist) */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[64px] w-full max-w-xl shadow-2xl overflow-hidden border border-white/10 flex flex-col animate-in zoom-in-95">
              <header className="p-10 pb-6 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-6"><div className="w-16 h-16 bg-indigo-600 text-white rounded-3xl flex items-center justify-center shadow-2xl"><Camera size={32}/></div><div><h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Optical Scanner</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Ready for SKU/QR Detection</p></div></div>
                 <button onClick={() => setIsCameraOpen(false)} className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-rose-500 transition-all"><X size={28}/></button>
              </header>
              <div className="p-10 pt-0 flex flex-col items-center">
                 <div id="camera-reader" className="w-full aspect-square rounded-[48px] overflow-hidden border-8 border-indigo-600 shadow-2xl bg-black relative">
                    <div className="absolute inset-0 pointer-events-none border-2 border-white/20 z-10" />
                 </div>
              </div>
              <footer className="p-10 border-t bg-slate-50 dark:bg-slate-950 flex gap-4 shrink-0"><button onClick={() => setIsCameraOpen(false)} className="w-full py-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[32px] font-black text-xs uppercase tracking-[0.3em] active:scale-[0.98]">Abort Scanning</button></footer>
           </div>
        </div>
      )}
    </div>
  );
}
