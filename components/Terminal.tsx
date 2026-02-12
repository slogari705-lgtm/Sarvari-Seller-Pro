
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
  AlertCircle,
  Trash2,
  MinusCircle,
  PlusCircle,
  // Added missing Check icon import
  Check
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

  const t = translations[state.settings.language || 'en'];

  // Enhanced Cart Key Logic
  const getCartItemKey = (item: CartItem | { id: string; variationId?: string }) => {
    return item.variationId ? `${item.id}-${item.variationId}` : item.id;
  };

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

  const filteredProducts = useMemo(() => {
    return state.products.filter(p => !p.isDeleted && (
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    ));
  }, [state.products, searchTerm]);

  // Robust addToCart Logic
  const addToCart = (product: Product, variation?: ProductVariation) => {
    const target = variation || product;
    const availableStock = Number(target.stock) || 0;
    
    // Calculate current quantity in cart for this specific variation/product
    const existingInCart = cart.find(item => 
      item.id === product.id && item.variationId === variation?.id
    );
    const currentQtyInCart = existingInCart?.quantity || 0;

    if (currentQtyInCart >= availableStock) {
      // Visual alert or snackbar could go here
      return;
    }

    const itemPrice = Number(target.salePrice ?? target.price) || 0;
    const itemCost = Number(target.costPrice) || 0;
    const itemName = variation ? `${product.name} (${variation.name})` : product.name;
    
    setCart(prev => {
      const matchIndex = prev.findIndex(item => 
        item.id === product.id && item.variationId === variation?.id
      );

      if (matchIndex > -1) {
        const newCart = [...prev];
        newCart[matchIndex] = { ...newCart[matchIndex], quantity: newCart[matchIndex].quantity + 1 };
        return newCart;
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

  const updateCartItemQuantity = (id: string, variationId: string | undefined, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === id && item.variationId === variationId) {
          const newQty = Math.max(0, item.quantity + delta);
          // Check stock limit
          if (newQty > item.stock) return item;
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const finalizeSale = () => {
    if (cart.length === 0) return;
    const profit = cart.reduce((acc, it) => acc + ((it.price - it.costPrice) * it.quantity), 0) - discountValue;
    const invoiceId = (state.invoices.reduce((max, i) => Math.max(max, parseInt(i.id) || 0), 0) + 1).toString();
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
      let newVariations = p.variations ? [...p.variations] : undefined;
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
      <header className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 text-white rounded-[20px] flex items-center justify-center shadow-lg shadow-indigo-100 dark:shadow-none">
            <ShoppingCart size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h4 className="font-black text-lg dark:text-white uppercase tracking-tighter leading-tight">Registry Cart</h4>
            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em]">{cart.length} LINE ITEMS</p>
          </div>
        </div>
        <button onClick={() => setIsCartOpen(false)} className="xl:hidden p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-rose-500 transition-all">
          <X size={20}/>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Customer Assignment Sub-Header */}
        <div className="p-6 bg-slate-50/50 dark:bg-slate-900/30 border-b dark:border-slate-800 relative">
          <div className="flex items-center justify-between mb-3">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Client Authorization</label>
             <button onClick={() => setIsQuickCustomerOpen(true)} className="text-[10px] font-black text-indigo-600 uppercase hover:underline flex items-center gap-2">
               <UserPlus size={12}/> New Enrollment
             </button>
          </div>
          {selectedCustomer ? (
            <div className="p-5 bg-white dark:bg-slate-800 rounded-[32px] border-2 border-indigo-100 dark:border-indigo-900 shadow-sm flex items-center justify-between animate-in zoom-in-95 duration-200">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-lg shadow-lg">
                    {selectedCustomer.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                     <p className="text-sm font-black uppercase tracking-tight truncate max-w-[140px] dark:text-white">{selectedCustomer.name}</p>
                     <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{selectedCustomer.phone}</p>
                  </div>
               </div>
               <button onClick={() => setSelectedCustomerId('')} className="p-3 bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-rose-600 rounded-2xl transition-all">
                  <UserMinus size={18}/>
               </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="text" 
                value={customerSearch} 
                onFocus={() => setIsCustomerSearchFocused(true)} 
                onBlur={() => setTimeout(() => setIsCustomerSearchFocused(false), 200)} 
                onChange={(e) => setCustomerSearch(e.target.value)} 
                placeholder="Locate client identity..." 
                className="w-full bg-white dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[28px] py-4 pl-12 pr-6 outline-none font-bold text-sm dark:text-white shadow-sm transition-all" 
              />
              {isCustomerSearchFocused && customerSearch && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl border dark:border-slate-700 z-[100] overflow-hidden animate-in slide-in-from-top-2">
                   {state.customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch)).slice(0, 5).map(c => (
                     <button key={c.id} onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch(''); }} className="w-full p-5 flex items-center gap-5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-left border-b last:border-none">
                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center font-black">{c.name.charAt(0)}</div>
                        <div><p className="text-sm font-black dark:text-white uppercase leading-none">{c.name}</p><p className="text-[10px] text-slate-400 font-bold mt-2 uppercase">{c.phone}</p></div>
                     </button>
                   ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart Item List */}
        <div className="p-6 space-y-4">
          {cart.map(item => (
            <div key={getCartItemKey(item)} className="p-5 bg-white dark:bg-slate-900 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm group hover:border-indigo-200 transition-all">
              <div className="flex gap-5">
                <div className="w-20 h-20 rounded-[24px] bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 border overflow-hidden relative">
                  {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <Package size={32} strokeWidth={1} />}
                  <div className="absolute top-0 right-0 p-1">
                     <div className="bg-white dark:bg-slate-700 rounded-lg px-2 py-0.5 border shadow-sm text-[8px] font-black uppercase text-indigo-600">STOCK: {item.stock}</div>
                  </div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <p className="font-black text-xs dark:text-white uppercase truncate tracking-tight">{item.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">UNIT: {state.settings.currency}{item.buyPrice.toLocaleString()}</p>
                    </div>
                    <button onClick={() => updateCartItemQuantity(item.id, item.variationId, -999)} className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                       <Trash2 size={16}/>
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <p className="font-black text-lg text-indigo-600 leading-none">{state.settings.currency}{(item.buyPrice * item.quantity).toLocaleString()}</p>
                    <div className="flex bg-slate-50 dark:bg-slate-800 rounded-[18px] p-1 items-center border border-slate-100 dark:border-slate-700">
                      <button onClick={() => updateCartItemQuantity(item.id, item.variationId, -1)} className="p-2 text-slate-400 hover:text-rose-500 transition-all active:scale-75">
                         <MinusCircle size={18}/>
                      </button>
                      <span className="w-10 text-center font-black text-sm dark:text-white tabular-nums">{item.quantity}</span>
                      <button onClick={() => updateCartItemQuantity(item.id, item.variationId, 1)} className="p-2 text-indigo-600 hover:text-emerald-500 transition-all active:scale-75">
                         <PlusCircle size={18}/>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="py-24 text-center flex flex-col items-center gap-6 opacity-30">
               <div className="w-24 h-24 rounded-[40px] bg-slate-100 dark:bg-slate-800 flex items-center justify-center animate-pulse">
                 <ShoppingCart size={48} strokeWidth={1} className="text-slate-400" />
               </div>
               <div className="space-y-2">
                 <p className="font-black text-sm uppercase tracking-[0.3em] dark:text-white">Terminal Idle</p>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-[200px] mx-auto leading-relaxed">Ready for SKU hardware scan or manual selection</p>
               </div>
            </div>
          )}
        </div>
      </div>

      <footer className="p-8 bg-slate-50 dark:bg-slate-900 border-t dark:border-slate-800 space-y-6 shrink-0 z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <div className="space-y-3">
           <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
             <span>Registry Subtotal</span>
             <span className="dark:text-white">{state.settings.currency}{subtotal.toLocaleString()}</span>
           </div>
           {discountValue > 0 && (
             <div className="flex justify-between text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-800">
               <span>Discretionary Markdown</span>
               <span>-{state.settings.currency}{discountValue.toLocaleString()}</span>
             </div>
           )}
           {selectedCustomer && selectedCustomer.totalDebt > 0 && (
             <div className="flex justify-between text-[10px] font-black text-rose-500 uppercase tracking-widest">
               <span>Historical Balance</span>
               <span>{state.settings.currency}{selectedCustomer.totalDebt.toLocaleString()}</span>
             </div>
           )}
        </div>
        
        <div className="flex items-center justify-between pb-2">
           <div>
             <p className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-1">AGGREGATE DUE</p>
             <h3 className="text-5xl font-black dark:text-white tracking-tighter tabular-nums leading-none">
               {state.settings.currency}{total.toLocaleString()}
             </h3>
           </div>
           <div className="text-right">
              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Exchange (AFN)</p>
              <p className="text-xl font-black dark:text-indigo-400 tabular-nums">{(total * state.settings.exchangeRate).toLocaleString()}</p>
           </div>
        </div>

        <button 
          onClick={() => setIsCheckoutOpen(true)} 
          disabled={cart.length === 0} 
          className="w-full py-6 bg-indigo-600 text-white rounded-[32px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-4 group"
        >
          Authorize Settlement 
          <ChevronRight size={20} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </footer>
    </div>
  );

  return (
    <div className="h-full flex flex-row overflow-hidden animate-in fade-in duration-500 gap-4">
      <ConfirmDialog 
        isOpen={isVoidConfirmOpen} 
        onClose={() => setIsVoidConfirmOpen(false)} 
        onConfirm={() => { setCart([]); setIsCartOpen(false); setIsVoidConfirmOpen(false); setDiscountValue(0); }} 
        title="Quarantine Session?" 
        message="All items in the current terminal buffer will be purged. This action cannot be undone." 
        confirmText="Void Buffer" 
        type="danger" 
      />
      
      {/* Sidebar - Left: Analytics & Quick Picks */}
      <aside className="hidden xl:flex w-80 flex-col bg-white dark:bg-slate-900 rounded-[48px] border border-slate-100 dark:border-slate-800 p-6 shrink-0 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 mb-8 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-[24px]">
           <button onClick={() => setSidebarTab('picks')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${sidebarTab === 'picks' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>
              <Star size={14} fill={sidebarTab === 'picks' ? "currentColor" : "none"}/> Quick Assets
           </button>
           <button onClick={() => setSidebarTab('stats')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${sidebarTab === 'stats' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>
              <LineChartIcon size={14}/> Performance
           </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
          {sidebarTab === 'picks' ? (
             <div className="space-y-3">
                {state.products.filter(p => p.isFavorite && !p.isDeleted).map(p => {
                  const currentInCart = cart.find(it => it.id === p.id && !it.variationId)?.quantity || 0;
                  const available = p.stock - currentInCart;
                  return (
                    <button 
                      key={p.id} 
                      disabled={available <= 0}
                      onClick={() => p.variations && p.variations.length > 0 ? setPickingProduct(p) : addToCart(p)} 
                      className={`w-full p-4 rounded-[32px] border-2 transition-all text-left flex items-center gap-4 group relative overflow-hidden ${available > 0 ? 'bg-slate-50 dark:bg-slate-800 border-transparent hover:border-indigo-400 hover:bg-white dark:hover:bg-slate-700' : 'opacity-40 grayscale cursor-not-allowed border-transparent'}`}
                    >
                       <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center shrink-0 shadow-sm overflow-hidden group-hover:scale-110 transition-transform">
                         {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <Package size={20}/>}
                       </div>
                       <div className="min-w-0">
                         <p className="font-black text-[12px] dark:text-white truncate uppercase tracking-tight leading-none mb-1.5">{p.name}</p>
                         <p className="text-[10px] font-black text-indigo-600 uppercase">{state.settings.currency}{p.price.toLocaleString()}</p>
                       </div>
                       {currentInCart > 0 && <div className="absolute top-2 right-2 bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black animate-in zoom-in">{currentInCart}</div>}
                    </button>
                  );
                })}
                {state.products.filter(p => p.isFavorite && !p.isDeleted).length === 0 && (
                  <div className="py-20 text-center space-y-4 opacity-20">
                     <Star size={40} className="mx-auto" />
                     <p className="text-[10px] font-black uppercase tracking-widest">No Favorites Configured</p>
                  </div>
                )}
             </div>
          ) : (
             <div className="space-y-8 animate-in fade-in">
                <div className="p-8 bg-indigo-600 rounded-[40px] text-white shadow-2xl relative overflow-hidden group">
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 opacity-70">Vault Pulse</p>
                   <div className="h-28 w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={sessionData}>
                            <defs><linearGradient id="glowGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#fff" stopOpacity={0.4}/><stop offset="95%" stopColor="#fff" stopOpacity={0}/></linearGradient></defs>
                            <Area type="monotone" dataKey="value" stroke="#fff" strokeWidth={4} fillOpacity={1} fill="url(#glowGrad)" />
                         </AreaChart>
                      </ResponsiveContainer>
                   </div>
                   <div className="mt-6 flex justify-between items-end relative z-10">
                      <div><p className="text-[8px] font-black uppercase opacity-60">Avg. Basket</p><p className="text-2xl font-black">{state.settings.currency}{(sessionData.reduce((a,b)=>a+b.value,0)/(sessionData.length||1)).toLocaleString(undefined, {maximumFractionDigits:0})}</p></div>
                      <div className="text-right"><p className="text-[8px] font-black uppercase opacity-60">Success Rate</p><p className="text-2xl font-black">98.2%</p></div>
                   </div>
                   <Activity size={100} className="absolute -bottom-4 -right-4 opacity-10 group-hover:scale-125 transition-transform" />
                </div>
                
                <div className="space-y-4 p-2">
                   <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-3">Temporal Logs</h5>
                   {state.invoices.filter(i => !i.isDeleted).slice(-5).reverse().map(inv => (
                     <div key={inv.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-transparent hover:border-indigo-100 transition-all">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black dark:text-white uppercase tracking-tighter">#INV-{inv.id.padStart(4,'0')}</p>
                          <p className="text-[8px] text-slate-400 font-black uppercase mt-0.5">{new Date(inv.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        </div>
                        <p className="text-sm font-black text-indigo-600">{state.settings.currency}{inv.total.toLocaleString()}</p>
                     </div>
                   ))}
                </div>
             </div>
          )}
        </div>

        {/* Hardware Status Lockup */}
        <div className="mt-8 p-8 bg-slate-950 rounded-[40px] text-white flex flex-col items-center gap-5 relative overflow-hidden group">
           <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center animate-pulse border border-white/20">
              <Barcode size={32} />
           </div>
           <div className="text-center relative z-10">
              <p className="text-[11px] font-black uppercase tracking-[0.3em]">Scanner Online</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase mt-2 leading-relaxed">System monitoring HID hardware inputs for rapid registration</p>
           </div>
           <div className="absolute inset-0 bg-indigo-600 opacity-0 group-hover:opacity-10 transition-opacity" />
           {lastScannedSku && (
             <div className="absolute inset-0 bg-emerald-600 flex items-center justify-center animate-in fade-in zoom-in duration-300">
               <p className="font-black text-xs uppercase tracking-widest flex items-center gap-3">
                 <CheckCircle2 size={20}/> Product Verified
               </p>
             </div>
           )}
        </div>
      </aside>

      {/* Main Terminal View - Center: Grid & Search */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white dark:bg-slate-900 p-6 rounded-[48px] border border-slate-100 dark:border-slate-800 shadow-sm mb-6 shrink-0 relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
            <div className="relative flex-1 w-full">
               <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
               <input 
                type="text" 
                placeholder="Locate inventory by designation or SKU..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-[28px] py-5 pl-16 pr-8 outline-none font-bold text-base dark:text-white focus:ring-4 ring-indigo-500/10 transition-all placeholder:text-slate-400" 
               />
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <button onClick={() => setIsCameraOpen(true)} className="p-5 bg-indigo-600 text-white rounded-[24px] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3">
                <Camera size={24} />
                <span className="font-black text-[10px] uppercase tracking-widest hidden lg:block">Optical Scan</span>
              </button>
              <button 
                onClick={() => setIsDiscountModalOpen(true)} 
                className={`p-5 rounded-[24px] border-2 flex items-center justify-center gap-3 active:scale-95 transition-all ${discountValue > 0 ? 'bg-emerald-50 border-emerald-400 text-emerald-600' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400'}`}
              >
                <Tag size={24} />
                <span className="font-black text-[10px] uppercase tracking-widest hidden lg:block">
                  {discountValue > 0 ? `MARKDOWN: ${state.settings.currency}${discountValue}` : 'Adjustment'}
                </span>
              </button>
              <button onClick={() => setIsVoidConfirmOpen(true)} className="p-5 bg-slate-50 dark:bg-slate-800 text-rose-500 rounded-[24px] border-2 border-transparent hover:border-rose-200 transition-all active:scale-95 flex items-center justify-center gap-3">
                <X size={24} />
                <span className="font-black text-[10px] uppercase tracking-widest hidden lg:block">Clear Cart</span>
              </button>
              <button onClick={() => setIsCartOpen(true)} className="xl:hidden p-5 bg-indigo-600 text-white rounded-[24px] shadow-2xl flex items-center justify-center relative active:scale-95">
                <ShoppingCart size={24} />
                {cart.length > 0 && <div className="absolute -top-1 -right-1 w-7 h-7 bg-rose-600 text-white text-[11px] font-black rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 animate-in bounce-in">{cart.length}</div>}
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Product Matrix */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-6">
            {filteredProducts.map(p => {
              const currentInCart = cart.filter(it => it.id === p.id).reduce((acc, curr) => acc + curr.quantity, 0);
              const available = p.stock - currentInCart;
              return (
                <div 
                  key={p.id} 
                  onClick={() => available > 0 ? (p.variations && p.variations.length > 0 ? setPickingProduct(p) : addToCart(p)) : null} 
                  className={`group bg-white dark:bg-slate-900 p-5 rounded-[48px] border-2 border-slate-100 dark:border-slate-800 hover:border-indigo-400 transition-all text-left relative shadow-sm hover:shadow-2xl cursor-pointer ${available <= 0 ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                >
                  <div className="w-full aspect-square rounded-[36px] bg-slate-50 dark:bg-slate-800 mb-6 overflow-hidden flex items-center justify-center relative shadow-inner pointer-events-none">
                     {p.image ? <img src={p.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" /> : <Package size={48} strokeWidth={1} className="text-slate-300"/>}
                     <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                        <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl"><Plus size={20} strokeWidth={3} /></div>
                     </div>
                     {currentInCart > 0 && (
                        <div className="absolute bottom-4 left-4 bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg animate-in fade-in slide-in-from-bottom-2">
                           In Cart: {currentInCart}
                        </div>
                     )}
                  </div>
                  <div className="px-1 pointer-events-none">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{p.category}</p>
                    <h5 className="font-black text-sm text-slate-800 dark:text-white truncate uppercase tracking-tight leading-tight mb-4">{p.name}</h5>
                    <div className="flex items-center justify-between mt-auto">
                      <p className="text-indigo-600 font-black text-xl leading-none">
                        {state.settings.currency}{p.price.toLocaleString()}
                      </p>
                      <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${available < 5 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-500'}`}>
                        {available} Units
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {filteredProducts.length === 0 && (
             <div className="py-32 text-center space-y-6 opacity-20">
                <Search size={80} strokeWidth={1} className="mx-auto" />
                <p className="font-black text-xl uppercase tracking-[0.4em]">Resource Not Found</p>
             </div>
          )}
        </div>
      </div>

      {/* Cart Container - Right Desktop Sidebar */}
      <div className={`fixed inset-y-0 right-0 z-[100] w-full max-w-md xl:static xl:block ${isCartOpen ? 'translate-x-0' : 'translate-x-full xl:translate-x-0'} transition-transform duration-500 shadow-2xl xl:shadow-none`}>
         <CartContent />
      </div>

      {/* Variation Selection Modal */}
      {pickingProduct && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-2xl animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[64px] w-full max-w-2xl shadow-2xl overflow-hidden border border-white/10 flex flex-col animate-in zoom-in-95">
              <header className="p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-indigo-600 text-white rounded-[28px] flex items-center justify-center shadow-xl shadow-indigo-100 dark:shadow-none">
                      <Layers size={32} strokeWidth={2.5}/>
                    </div>
                    <div>
                       <h3 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Choose Variant</h3>
                       <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">Designation: {pickingProduct.name}</p>
                    </div>
                 </div>
                 <button onClick={() => setPickingProduct(null)} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400 hover:text-rose-500 transition-all active:scale-90">
                    <X size={28}/>
                 </button>
              </header>
              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/30 dark:bg-slate-950/20">
                 {pickingProduct.variations?.map(v => {
                   const currentInCart = cart.find(it => it.id === pickingProduct.id && it.variationId === v.id)?.quantity || 0;
                   const available = v.stock - currentInCart;
                   return (
                     <button 
                      key={v.id} 
                      disabled={available <= 0}
                      onClick={() => { addToCart(pickingProduct, v); setPickingProduct(null); }}
                      className={`p-8 rounded-[48px] border-4 transition-all text-left flex flex-col justify-between group h-56 relative overflow-hidden ${available > 0 ? 'bg-white dark:bg-slate-800 border-white dark:border-slate-800 hover:border-indigo-600 hover:shadow-2xl' : 'opacity-40 grayscale cursor-not-allowed border-transparent'}`}
                     >
                        <div className="relative z-10">
                          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">UID: {v.sku}</p>
                          <h4 className="text-2xl font-black dark:text-white uppercase tracking-tight leading-tight group-hover:text-indigo-600 transition-colors">{v.name}</h4>
                        </div>
                        <div className="relative z-10 flex items-center justify-between mt-auto">
                          <div>
                            <p className="text-indigo-600 font-black text-2xl tabular-nums">{state.settings.currency}{v.price.toLocaleString()}</p>
                            <p className={`text-[9px] font-black uppercase tracking-widest mt-2 ${available < 5 ? 'text-rose-500' : 'text-slate-400'}`}>
                               Available Nodes: {available}
                            </p>
                          </div>
                          <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-3xl shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all">
                             <ArrowRight size={22} strokeWidth={3}/>
                          </div>
                        </div>
                        <Layers className="absolute -bottom-8 -right-8 text-indigo-500 opacity-[0.03] group-hover:scale-125 transition-transform duration-1000" size={180} />
                     </button>
                   );
                 })}
              </div>
           </div>
        </div>
      )}

      {/* Manual Markdown Discount Modal */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[48px] w-full max-md shadow-2xl p-10 border border-white/10 animate-in zoom-in-95">
              <div className="flex flex-col items-center text-center space-y-6">
                 <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-[32px] flex items-center justify-center shadow-lg"><Tag size={36}/></div>
                 <div>
                    <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Price Markdown</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Authorized Discretionary Discount</p>
                 </div>
                 <div className="w-full space-y-3">
                    <div className="flex justify-between px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       <span>Apply Reduction</span>
                       <span className="text-indigo-600">Max: {state.settings.currency}{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="relative">
                       <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-2xl text-slate-300">{state.settings.currency}</span>
                       <input 
                        type="number" 
                        value={discountValue || ''} 
                        onChange={e => setDiscountValue(Math.min(subtotal, Number(e.target.value)))} 
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[28px] py-6 px-14 font-black text-4xl text-center dark:text-white outline-none" 
                        placeholder="0.00" 
                        autoFocus 
                       />
                    </div>
                 </div>
                 <button onClick={() => setIsDiscountModalOpen(false)} className="w-full py-6 bg-indigo-600 text-white rounded-[28px] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">
                    Commit Adjustment
                 </button>
                 <button onClick={() => { setDiscountValue(0); setIsDiscountModalOpen(false); }} className="text-[10px] font-black text-rose-500 uppercase hover:underline">Reset Discount</button>
              </div>
           </div>
        </div>
      )}

      {/* Checkout Selection Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[56px] w-full max-w-2xl shadow-2xl overflow-hidden border border-white/10 flex flex-col animate-in zoom-in-95">
              <header className="p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-emerald-600 text-white rounded-[24px] flex items-center justify-center shadow-xl shadow-emerald-100 dark:shadow-none">
                      <Wallet size={32} />
                    </div>
                    <div>
                       <h3 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Settlement Module</h3>
                       <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">Finalizing transaction ledger</p>
                    </div>
                 </div>
                 <button onClick={() => setIsCheckoutOpen(false)} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400 hover:text-rose-500 transition-all">
                    <X size={28}/>
                 </button>
              </header>

              <div className="flex-1 overflow-y-auto p-12 custom-scrollbar space-y-10">
                 <div className="p-10 bg-slate-50 dark:bg-slate-950 rounded-[48px] border border-slate-100 dark:border-slate-800 text-center space-y-2 relative overflow-hidden group">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] relative z-10">Total Aggregate Payable</p>
                    <h2 className="text-6xl font-black dark:text-white tracking-tighter tabular-nums relative z-10">{state.settings.currency}{total.toLocaleString()}</h2>
                    <CheckCircle className="absolute -bottom-10 -right-10 text-emerald-500 opacity-[0.03] group-hover:scale-125 transition-transform duration-700" size={240} />
                 </div>

                 <div className="space-y-6">
                    <label className="block text-[11px] font-black text-indigo-600 uppercase tracking-[0.3em] ml-2">Settlement Protocol</label>
                    <div className="grid grid-cols-3 gap-4">
                       {[
                         { id: 'cash', label: 'Cash', icon: Banknote, color: 'text-emerald-500' },
                         { id: 'card', label: 'Card', icon: CreditCard, color: 'text-blue-500' },
                         { id: 'transfer', label: 'Transfer', icon: RefreshCw, color: 'text-indigo-500' }
                       ].map(method => (
                         <button 
                           key={method.id} 
                           onClick={() => setPaymentMethod(method.id as any)}
                           className={`p-6 rounded-[36px] border-4 transition-all flex flex-col items-center gap-4 group ${paymentMethod === method.id ? 'border-indigo-600 bg-white dark:bg-slate-800 shadow-xl' : 'bg-slate-50 dark:bg-slate-950 border-transparent opacity-60 hover:opacity-100'}`}
                         >
                            <method.icon size={32} className={paymentMethod === method.id ? method.color : 'text-slate-400'} />
                            <span className="font-black text-xs uppercase tracking-widest dark:text-white">{method.label}</span>
                         </button>
                       ))}
                    </div>
                 </div>

                 {paymentMethod === 'cash' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4">
                       <label className="block text-[11px] font-black text-indigo-600 uppercase tracking-[0.3em] ml-2">Remittance Magnitude (Optional)</label>
                       <div className="relative">
                          <input 
                            type="number" 
                            value={cashReceived} 
                            onChange={e => setCashReceived(e.target.value === '' ? '' : Number(e.target.value))} 
                            placeholder="Enter amount received..." 
                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[32px] py-6 px-10 font-black text-3xl text-center dark:text-white outline-none" 
                          />
                       </div>
                       {typeof cashReceived === 'number' && cashReceived > total && (
                          <div className="p-8 bg-emerald-50 dark:bg-emerald-950/20 rounded-[36px] border-2 border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between animate-in zoom-in">
                             <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Return Balance Change</p>
                             <p className="text-3xl font-black text-emerald-600">{state.settings.currency}{(cashReceived - total).toLocaleString()}</p>
                          </div>
                       )}
                    </div>
                 )}
              </div>

              <footer className="p-10 border-t bg-slate-50 dark:bg-slate-950 shrink-0">
                 <button 
                  onClick={finalizeSale} 
                  className="w-full py-7 bg-indigo-600 text-white rounded-[32px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-4"
                 >
                    <CheckCircle2 size={24}/> Authorize Transaction
                 </button>
              </footer>
           </div>
        </div>
      )}

      {/* Invoice Success Screen */}
      {finishedInvoice && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-3xl animate-in fade-in duration-500">
           <div className="bg-white dark:bg-slate-900 rounded-[64px] w-full max-xl shadow-2xl overflow-hidden border border-white/10 flex flex-col animate-in zoom-in-95 duration-500">
              <div className="p-12 text-center flex-1 flex flex-col items-center justify-center space-y-8">
                 <div className="w-28 h-28 bg-emerald-500 text-white rounded-[40px] flex items-center justify-center shadow-2xl shadow-emerald-500/20 animate-bounce">
                    <Check size={56} strokeWidth={4} />
                 </div>
                 <div className="space-y-3">
                    <h2 className="text-4xl font-black dark:text-white uppercase tracking-tighter">Settlement Complete</h2>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em]">Ledger Record #INV-{finishedInvoice.id.padStart(4, '0')} Synchronized</p>
                 </div>
                 <div className="w-full p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[40px] border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center mb-6 border-b dark:border-slate-800 pb-6">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Remitted</p>
                       <p className="text-3xl font-black dark:text-white">{state.settings.currency}{finishedInvoice.paidAmount.toLocaleString()}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <button 
                        onClick={() => handlePrintReceipt(finishedInvoice, 'thermal')} 
                        className="py-5 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-3xl font-black text-[10px] uppercase tracking-widest hover:border-indigo-500 transition-all flex items-center justify-center gap-3 active:scale-95"
                       >
                          <Printer size={18}/> Thermal Tape
                       </button>
                       <button 
                        onClick={() => handlePrintReceipt(finishedInvoice, 'a4')} 
                        className="py-5 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-3xl font-black text-[10px] uppercase tracking-widest hover:border-indigo-500 transition-all flex items-center justify-center gap-3 active:scale-95"
                       >
                          <Layout size={18}/> Formal A4
                       </button>
                    </div>
                 </div>
              </div>
              <footer className="p-12 border-t bg-slate-50 dark:bg-slate-950 shrink-0">
                 <button onClick={() => setFinishedInvoice(null)} className="w-full py-7 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-[32px] font-black text-xs uppercase tracking-[0.3em] shadow-xl active:scale-95 transition-all">
                    Return to Terminal
                 </button>
              </footer>
           </div>
        </div>
      )}
    </div>
  );
}
