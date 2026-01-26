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
  Coins
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { AppState, Product, CartItem, Invoice, Customer, ProductVariation } from '../types';
import { translations } from '../translations';
import ConfirmDialog from './ConfirmDialog';
import { generatePrintHTML } from '../printService';
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
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerLog, setScannerLog] = useState<{name: string, time: string, status: 'ok' | 'fail'}[]>([]);
  const [scannerFeedback, setScannerFeedback] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [showScannerFlash, setShowScannerFlash] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('fixed');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [isVoidConfirmOpen, setIsVoidConfirmOpen] = useState(false);
  
  // Cash Handling State
  const [cashReceived, setCashReceived] = useState<number | ''>('');
  
  // Custom Item Modal State
  const [isCustomItemOpen, setIsCustomItemOpen] = useState(false);
  const [customItemForm, setCustomItemForm] = useState({ name: '', price: 0 });

  // Post-sale receipt state
  const [finishedInvoice, setFinishedInvoice] = useState<Invoice | null>(null);
  const [isExportingReceipt, setIsExportingReceipt] = useState(false);
  
  const [pickingProduct, setPickingProduct] = useState<Product | null>(null);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStoppingScanner = useRef(false);
  const lastScannedSku = useRef<{sku: string, time: number} | null>(null);
  const t = translations[state.settings.language || 'en'];

  const selectedCustomer = useMemo(() => 
    state.customers.find(c => c.id === selectedCustomerId), 
  [state.customers, selectedCustomerId]);

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

  const addCustomItem = () => {
    if (!customItemForm.name || customItemForm.price <= 0) return;
    const item: any = {
      id: 'custom-' + Date.now(),
      name: customItemForm.name,
      price: customItemForm.price,
      costPrice: customItemForm.price * 0.7, // Assume 30% margin for custom items if unknown
      quantity: 1,
      sku: 'CUSTOM',
      category: 'Custom',
      stock: 9999
    };
    setCart(prev => [...prev, item]);
    setIsCustomItemOpen(false);
    setCustomItemForm({ name: '', price: 0 });
    if (!isCartOpen) setIsCartOpen(true);
  };

  const addToCart = (product: Product, variation?: ProductVariation) => {
    const target = variation || product;
    const itemStock = target.stock;
    if (itemStock <= 0) return;

    const itemPrice = getResolvedPrice(target);
    const itemName = variation ? `${product.name} (${variation.name})` : product.name;

    setCart(prev => {
      const uniqueId = variation ? `${product.id}-${variation.id}` : product.id;
      const existing = prev.find(item => (item.variationId ? `${item.id}-${item.variationId}` : item.id) === uniqueId);
      
      if (existing) {
        if (existing.quantity >= itemStock) return prev;
        return prev.map(item => (item.variationId ? `${item.id}-${item.variationId}` : item.id) === uniqueId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      
      return [...prev, { 
        ...product, 
        name: itemName,
        sku: target.sku,
        price: itemPrice,
        costPrice: target.costPrice,
        stock: itemStock,
        quantity: 1, 
        buyPrice: itemPrice,
        variationId: variation?.id,
        variationName: variation?.name
      }];
    });

    if (variation) setPickingProduct(null);
    if (!isCartOpen) setIsCartOpen(true);
  };

  useEffect(() => {
    if (isScannerOpen) {
      const startScanner = async () => {
        try {
          const html5QrCode = new Html5Qrcode("scanner-container");
          scannerRef.current = html5QrCode;
          await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 20, qrbox: { width: 280, height: 180 } },
            (decodedText) => {
              const now = Date.now();
              if (lastScannedSku.current?.sku === decodedText && now - lastScannedSku.current.time < 1200) return;
              lastScannedSku.current = { sku: decodedText, time: now };
              
              let foundProduct: Product | null = null;
              let foundVariation: ProductVariation | undefined = undefined;

              for (const p of state.products) {
                if (p.isDeleted) continue;
                if (p.sku === decodedText) { foundProduct = p; break; }
                const vMatch = p.variations?.find(v => v.sku === decodedText);
                if (vMatch) { foundProduct = p; foundVariation = vMatch; break; }
              }

              if (foundProduct) {
                playBeep('success');
                setShowScannerFlash(true);
                setTimeout(() => setShowScannerFlash(false), 150);
                if (foundProduct.variations && foundProduct.variations.length > 0 && !foundVariation) {
                  setPickingProduct(foundProduct);
                  setIsScannerOpen(false); 
                } else {
                  addToCart(foundProduct, foundVariation);
                  const entryName = foundVariation ? `${foundProduct.name} (${foundVariation.name})` : foundProduct.name;
                  setScannerLog(prev => [{name: entryName, time: new Date().toLocaleTimeString(), status: 'ok' as const}, ...prev].slice(0, 8));
                  setScannerFeedback({msg: `IDENTIFIED: ${entryName}`, type: 'success'});
                  setTimeout(() => setScannerFeedback(null), 1500);
                }
              } else {
                playBeep('error');
                setScannerFeedback({msg: `UNKNOWN ENTITY: ${decodedText}`, type: 'error'});
                setScannerLog(prev => [{name: decodedText, time: new Date().toLocaleTimeString(), status: 'fail' as const}, ...prev].slice(0, 8));
                setTimeout(() => setScannerFeedback(null), 1500);
              }
            },
            () => {}
          );
        } catch (err) {
          console.error("Scanner failed:", err);
          setIsScannerOpen(false);
        }
      };
      startScanner();
    }
    return () => {
      if (scannerRef.current && !isStoppingScanner.current) {
        isStoppingScanner.current = true;
        scannerRef.current.stop().then(() => {
          scannerRef.current = null;
          isStoppingScanner.current = false;
        }).catch(() => { isStoppingScanner.current = false; });
      }
    };
  }, [isScannerOpen, state.products]);

  const finalizeSale = () => {
    if (cart.length === 0) return;
    
    // Validate cash received if payment method is cash
    if (paymentMethod === 'cash' && cashReceived !== '' && Number(cashReceived) < total) {
      alert("Insufficient Cash Received");
      return;
    }

    const profit = cart.reduce((acc, it) => acc + ((it.price - it.costPrice) * it.quantity), 0) - discountAmount;
    
    const invoice: Invoice = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      customerId: selectedCustomerId,
      items: cart,
      subtotal,
      tax: taxAmount,
      discount: discountAmount,
      total,
      paidAmount: paymentMethod === 'cash' ? (cashReceived === '' ? total : Number(cashReceived)) : total,
      profit: profit,
      status: 'paid',
      paymentMethod,
      pointsEarned: Math.floor(total * state.settings.loyaltySettings.pointsPerUnit)
    };

    const updatedProducts = state.products.map(p => {
      const cartItemsForThisProduct = cart.filter(ci => ci.id === p.id);
      if (cartItemsForThisProduct.length === 0) return p;
      let newStock = p.stock;
      let newVariations = p.variations;
      cartItemsForThisProduct.forEach(ci => {
        if (ci.variationId && newVariations) {
          newVariations = newVariations.map(v => v.id === ci.variationId ? { ...v, stock: v.stock - ci.quantity } : v);
        }
        newStock -= ci.quantity;
      });
      return { ...p, stock: newStock, variations: newVariations };
    });

    if (selectedCustomerId) {
      const updatedCustomers = state.customers.map(c => {
        if (c.id === selectedCustomerId) {
          return { 
            ...c, 
            totalSpent: c.totalSpent + total,
            loyaltyPoints: (c.loyaltyPoints || 0) + (invoice.pointsEarned || 0),
            transactionCount: (c.transactionCount || 0) + 1,
            lastVisit: new Date().toISOString()
          };
        }
        return c;
      });
      updateState('customers', updatedCustomers);
    }

    updateState('products', updatedProducts);
    updateState('invoices', [...state.invoices, invoice]);
    
    // Switch to Receipt Success State
    setFinishedInvoice(invoice);
    
    // Clear Session State
    setCart([]);
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    setDiscountValue(0);
    setCashReceived('');
    setScannerLog([]);
  };

  const handlePrintReceipt = (inv: Invoice) => {
    const html = generatePrintHTML(state, inv, 'auto');
    const holder = document.getElementById('print-holder');
    if (holder) {
      holder.innerHTML = html;
      window.print();
      holder.innerHTML = '';
    }
  };

  const handleDownloadReceiptPDF = async (inv: Invoice) => {
    if (isExportingReceipt) return;
    setIsExportingReceipt(true);
    const container = document.getElementById('pdf-render-container');
    if (!container) return setIsExportingReceipt(false);

    try {
      const html = generatePrintHTML(state, inv, 'a4');
      container.innerHTML = html;
      await new Promise(r => setTimeout(r, 600));

      const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Receipt_#${inv.id}.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      container.innerHTML = '';
      setIsExportingReceipt(false);
    }
  };

  const CartContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 border-l dark:border-slate-800">
      <header className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><ShoppingCart size={24} /></div>
          <div>
            <h4 className="font-black text-lg dark:text-white uppercase tracking-tighter leading-tight">Live Session</h4>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Ledger State</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <button onClick={() => setIsVoidConfirmOpen(true)} className="p-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"><Ban size={20}/></button>
          )}
          <button onClick={() => setIsCartOpen(false)} className="xl:hidden p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"><X size={20}/></button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Customer Selection Section */}
        <div className="p-6 space-y-4 bg-slate-50 dark:bg-slate-900/30 border-b dark:border-slate-800">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Client Identity</label>
            <div className="relative">
              <select 
                value={selectedCustomerId} 
                onChange={e => setSelectedCustomerId(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border-2 border-transparent focus:border-indigo-600 rounded-2xl py-3 pl-6 pr-10 outline-none font-black text-xs dark:text-white appearance-none shadow-sm transition-all"
              >
                <option value="">Guest Account</option>
                {state.customers.filter(c => !c.isDeleted && !c.isArchived).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none rotate-90" size={16} />
            </div>
          </div>

          {selectedCustomer && (
            <div className="p-4 bg-white dark:bg-slate-800 rounded-[24px] border border-indigo-100 dark:border-indigo-900/30 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 rounded-lg flex items-center justify-center font-black text-[10px]">{selectedCustomer.name.charAt(0)}</div>
                  <div className="min-w-0">
                    <p className="text-xs font-black dark:text-white uppercase truncate">{selectedCustomer.name}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Points: {selectedCustomer.loyaltyPoints || 0}</p>
                  </div>
                </div>
                {selectedCustomer.totalDebt > 0 && <span className="px-2 py-0.5 bg-rose-50 text-rose-500 text-[8px] font-black uppercase rounded-md">Debt Detected</span>}
              </div>
            </div>
          )}
        </div>

        {/* Line Items Container */}
        <div className="p-6 space-y-3">
          {cart.map(item => {
            const uniqueId = item.variationId ? `${item.id}-${item.variationId}` : item.id;
            const price = getResolvedPrice(item);
            return (
              <div key={uniqueId} className="p-4 bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm group animate-in slide-in-from-bottom-2">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-[20px] bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 border dark:border-slate-700 overflow-hidden">
                    {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <Package size={22}/>}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                    <div>
                      <p className="font-black text-xs dark:text-white uppercase truncate tracking-tight">{item.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{state.settings.currency}{price.toLocaleString()} ea</p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="font-black text-sm text-indigo-600 leading-none">{state.settings.currency}{(price * item.quantity).toLocaleString()}</p>
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
          {cart.length === 0 && (
            <div className="py-24 text-center flex flex-col items-center justify-center gap-4 opacity-30 grayscale">
              <ShoppingCart size={64} strokeWidth={1}/>
              <p className="font-black text-[10px] uppercase tracking-[0.4em]">Empty Ledger State</p>
            </div>
          )}
        </div>
      </div>

      {/* Advanced Discount & Checkout Section */}
      <footer className="p-8 bg-slate-50 dark:bg-slate-900 border-t dark:border-slate-800 space-y-6 shrink-0">
        <div className="space-y-3">
          <div className="flex justify-between items-center text-slate-400 font-bold text-[10px] uppercase tracking-widest px-1">
            <span>Aggregate Value</span>
            <span className="font-black text-slate-700 dark:text-slate-200">{state.settings.currency}{subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400 font-bold text-[10px] uppercase tracking-widest px-1">
            <span>Tax Module</span>
            <span className="font-black text-slate-700 dark:text-slate-200">+{state.settings.currency}{taxAmount.toLocaleString()}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between items-center text-rose-500 font-bold text-[10px] uppercase tracking-widest px-1 animate-in slide-in-from-left">
              <span>Applied Concession</span>
              <span className="font-black">-{state.settings.currency}{discountAmount.toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Final Settlement</p>
              <h3 className="text-4xl font-black dark:text-white tracking-tighter tabular-nums">{state.settings.currency}{total.toLocaleString()}</h3>
            </div>
          </div>
          <button 
            onClick={() => setIsCheckoutOpen(true)} 
            disabled={cart.length === 0}
            className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-4"
          >
            Authorize Payment <ChevronRight size={18} strokeWidth={3}/>
          </button>
        </div>
      </footer>
    </div>
  );

  return (
    <div className="h-full flex flex-row overflow-hidden animate-in fade-in duration-500 gap-4">
      <ConfirmDialog 
        isOpen={isVoidConfirmOpen} 
        onClose={() => setIsVoidConfirmOpen(false)} 
        onConfirm={() => { setCart([]); setIsCartOpen(false); setIsVoidConfirmOpen(false); }} 
        title="Void Ledger Buffer?" 
        message="This will immediately clear all items from the current terminal session. This action cannot be undone." 
        confirmText="Void Transaction"
        type="danger" 
      />

      {/* Quick Access Sidebar */}
      <aside className="hidden xl:flex w-72 flex-col bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 p-6 shrink-0 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 mb-6">
           <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-amber-600"><Star size={20} fill="currentColor"/></div>
           <h4 className="font-black text-xs uppercase tracking-widest dark:text-white">Priority Assets</h4>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
           {favorites.map(p => (
             <button 
               key={p.id}
               onClick={() => p.variations?.length ? setPickingProduct(p) : addToCart(p)}
               className="w-full p-4 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-transparent hover:border-indigo-400 hover:bg-white dark:hover:bg-slate-800 transition-all text-left flex items-center gap-3 group"
             >
                <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-slate-100 shrink-0 shadow-sm">
                   {p.image ? <img src={p.image} className="w-full h-full object-cover rounded-xl" /> : <Package size={20}/>}
                </div>
                <div className="min-w-0">
                   <p className="font-black text-[11px] dark:text-white truncate uppercase leading-none">{p.name}</p>
                   <p className="text-[10px] font-bold text-indigo-600 uppercase mt-1">{state.settings.currency}{getResolvedPrice(p).toLocaleString()}</p>
                </div>
             </button>
           ))}
           {favorites.length === 0 && (
             <div className="py-24 text-center opacity-20 flex flex-col items-center grayscale">
                <Zap size={40} className="mb-4" />
                <p className="font-black text-[10px] uppercase tracking-widest">No Priority Inventory</p>
             </div>
           )}
        </div>
      </aside>

      {/* Primary Terminal Core */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white dark:bg-slate-900 p-6 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm mb-4 shrink-0">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="Locate registry entity by UID or label..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 pl-14 pr-6 outline-none font-bold text-sm dark:text-white focus:ring-4 ring-indigo-500/5 transition-all"
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
               <button onClick={() => setIsCustomItemOpen(true)} className="p-4 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl border flex items-center justify-center gap-3 active:scale-95 transition-all" title="Add Uncataloged Item">
                  <PlusCircle size={20} />
                  <span className="font-black text-[10px] uppercase tracking-widest">Custom Entry</span>
               </button>
               <button onClick={() => setIsScannerOpen(true)} className="flex-1 md:flex-none p-4 bg-indigo-600 text-white rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all border border-indigo-500">
                  <ScanLine size={20} />
                  <span className="font-black text-[10px] uppercase tracking-widest">Active Scan</span>
               </button>
               <button onClick={() => setIsCartOpen(true)} className="xl:hidden p-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 rounded-2xl border shadow-sm flex items-center justify-center relative">
                  <ShoppingCart size={20} />
                  {cart.length > 0 && <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[9px] rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">{cart.length}</div>}
               </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map(p => {
              const hasSale = p.salePrice !== undefined;
              return (
                <button 
                  key={p.id} 
                  disabled={p.stock <= 0}
                  onClick={() => p.variations?.length ? setPickingProduct(p) : addToCart(p)} 
                  className={`group bg-white dark:bg-slate-900 p-4 rounded-[36px] border border-slate-100 dark:border-slate-800 hover:border-indigo-400 transition-all text-left relative shadow-sm hover:shadow-xl ${p.stock <= 0 ? 'opacity-50 grayscale scale-95 cursor-not-allowed' : ''}`}
                >
                  <div className="w-full aspect-square rounded-3xl bg-slate-50 dark:bg-slate-800 mb-4 overflow-hidden flex items-center justify-center text-slate-100 relative shadow-inner">
                    {p.image ? <img src={p.image} className="w-full h-full object-cover transition-transform group-hover:scale-105" /> : <Package size={32} strokeWidth={1}/>}
                    {hasSale && <div className="absolute top-3 left-3 bg-rose-600 text-white px-3 py-1 rounded-xl shadow-lg font-black text-[8px] uppercase tracking-tighter">Promo Tier</div>}
                    {p.variations?.length > 0 && <div className="absolute top-3 right-3 bg-indigo-600 text-white p-2 rounded-xl shadow-lg"><Layers size={14}/></div>}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{p.category}</p>
                    <h5 className="font-black text-[14px] text-slate-800 dark:text-white truncate uppercase tracking-tight leading-tight mb-2">{p.name}</h5>
                    <div className="flex items-center justify-between mt-auto">
                      <div>
                        {hasSale ? (
                          <div className="flex flex-col">
                             <span className="text-[9px] text-slate-400 line-through font-bold">{state.settings.currency}{p.price.toLocaleString()}</span>
                             <span className="text-rose-600 font-black text-base">{state.settings.currency}{p.salePrice?.toLocaleString()}</span>
                          </div>
                        ) : (
                          <p className="text-indigo-600 font-black text-base">{state.settings.currency}{p.price.toLocaleString()}</p>
                        )}
                      </div>
                      <div className={`px-2 py-1 rounded-lg flex flex-col items-center justify-center min-w-[32px] ${p.stock < 5 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                         <span className="text-[9px] font-black">{p.stock}</span>
                         <span className="text-[6px] font-black uppercase">Qty</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {filteredProducts.length === 0 && (
            <div className="py-40 text-center opacity-20 flex flex-col items-center grayscale">
               <Boxes size={100} strokeWidth={1} />
               <p className="font-black text-xs uppercase tracking-[0.4em] mt-6">Catalog Index Mismatch</p>
            </div>
          )}
        </div>
      </div>

      {/* PERSISTENT CART SIDEBAR (DESKTOP) */}
      <div className="hidden xl:block w-96 shrink-0 animate-in slide-in-from-right duration-300">
        <CartContent />
      </div>

      {/* MOBILE CART DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[90] flex justify-end xl:hidden">
           <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsCartOpen(false)}/>
           <div className="relative w-full max-w-xl h-full shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-in slide-in-from-right duration-400">
             <CartContent />
           </div>
        </div>
      )}

      {/* Custom Item Modal */}
      {isCustomItemOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden flex flex-col border border-white/10 animate-in zoom-in duration-300">
              <header className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl flex items-center justify-center"><PlusCircle size={24}/></div>
                    <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Custom Product Entry</h3>
                 </div>
                 <button onClick={() => setIsCustomItemOpen(false)} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400"><X size={20}/></button>
              </header>
              <div className="p-8 space-y-6">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Description / Name</label>
                    <input 
                      type="text" 
                      value={customItemForm.name} 
                      onChange={e => setCustomItemForm({...customItemForm, name: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-600 rounded-2xl py-4 px-6 font-black text-sm dark:text-white outline-none shadow-inner"
                      placeholder="e.g. Miscellaneous Service Fee"
                      autoFocus
                    />
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Unit Price</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-2xl text-slate-300">{state.settings.currency}</span>
                      <input 
                        type="number" 
                        value={customItemForm.price || ''} 
                        onChange={e => setCustomItemForm({...customItemForm, price: Number(e.target.value)})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-600 rounded-2xl py-4 pl-14 pr-6 font-black text-3xl dark:text-white outline-none shadow-inner"
                        placeholder="0.00"
                      />
                    </div>
                 </div>
              </div>
              <footer className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex gap-4">
                 <button onClick={() => setIsCustomItemOpen(false)} className="flex-1 py-4 bg-white dark:bg-slate-800 text-slate-500 rounded-2xl font-black text-[10px] uppercase">Cancel</button>
                 <button onClick={addCustomItem} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">Inject Item</button>
              </footer>
           </div>
        </div>
      )}

      {/* Variation Picker Modal */}
      {pickingProduct && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[56px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/10 flex flex-col">
              <header className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
                 <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center shadow-lg"><Layers size={28}/></div>
                    <div>
                       <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Variant Synthesis</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{pickingProduct.name}</p>
                    </div>
                 </div>
                 <button onClick={() => setPickingProduct(null)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-rose-500 transition-all"><X size={24}/></button>
              </header>
              <div className="flex-1 overflow-y-auto p-10 space-y-4 custom-scrollbar">
                 {pickingProduct.variations?.map(v => (
                    <button 
                      key={v.id}
                      disabled={v.stock <= 0}
                      onClick={() => addToCart(pickingProduct, v)}
                      className={`w-full p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[32px] border-4 border-transparent hover:border-indigo-500 hover:bg-white dark:hover:bg-slate-800 transition-all text-left flex items-center justify-between group ${v.stock <= 0 ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                    >
                       <div className="flex items-center gap-5">
                          <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center font-black text-indigo-600 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all">{v.name.charAt(0)}</div>
                          <div>
                             <p className="font-black text-lg dark:text-white uppercase tracking-tight">{v.name}</p>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Serial SKU: {v.sku}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="font-black text-2xl text-indigo-600">{state.settings.currency}{getResolvedPrice(v).toLocaleString()}</p>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${v.stock < 5 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>{v.stock} in stock</span>
                       </div>
                    </button>
                 ))}
              </div>
              <footer className="p-8 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                 <p className="text-[9px] font-black text-slate-400 uppercase text-center tracking-[0.2em]">Select preferred architectural variation to commit to ledger</p>
              </footer>
           </div>
        </div>
      )}

      {/* IMMERSIVE SCANNER OVERLAY */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-center animate-in fade-in duration-500">
           {/* High-Tech Background Elements */}
           <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
              <div className="absolute top-0 left-0 w-full h-full border-[40px] border-slate-900/50" />
              <div className="absolute top-1/2 left-0 w-full h-px bg-indigo-500/30" />
              <div className="absolute top-0 left-1/2 w-px h-full bg-indigo-500/30" />
           </div>

           {/* Scanner Core View */}
           <div className="relative w-full max-w-4xl aspect-[4/3] max-h-[80vh] flex flex-col items-center px-4">
              <div id="scanner-container" className="w-full h-full bg-slate-900 rounded-[64px] overflow-hidden border-8 border-slate-800 shadow-2xl relative">
                 {/* Targeting Overlay */}
                 <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                    <div className="w-[300px] h-[200px] relative">
                       <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-indigo-500 rounded-tl-2xl" />
                       <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-indigo-500 rounded-tr-2xl" />
                       <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-indigo-500 rounded-bl-2xl" />
                       <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-indigo-500 rounded-br-2xl" />
                       
                       {/* Animated Scan Line */}
                       <div className="absolute left-2 right-2 h-1 bg-indigo-400/80 shadow-[0_0_15px_rgba(129,140,248,0.8)] animate-[scanLine_2s_ease-in-out_infinite]" />
                    </div>
                 </div>
                 
                 {/* Feedback Flash */}
                 {showScannerFlash && <div className="absolute inset-0 z-20 bg-white/40 animate-pulse" />}
              </div>

              {/* Real-time Status Panel */}
              <div className="mt-8 w-full flex flex-col md:flex-row gap-6 items-start">
                 <div className="flex-1 bg-slate-900/80 backdrop-blur-md rounded-[32px] p-8 border border-white/5 space-y-6 w-full shadow-2xl">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-indigo-500 animate-ping" />
                          <h4 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em]">Neural Scan Pulse</h4>
                       </div>
                       <div className="flex gap-2">
                          <button className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all" title="Toggle Flash"><Flashlight size={20}/></button>
                          <button onClick={() => setIsScannerOpen(false)} className="p-3 bg-rose-600/20 hover:bg-rose-600/40 text-rose-500 rounded-xl transition-all" title="Terminate Signal"><X size={20}/></button>
                       </div>
                    </div>
                    
                    {scannerFeedback ? (
                      <div className={`p-5 rounded-2xl flex items-center gap-4 animate-in zoom-in duration-200 border-2 ${scannerFeedback.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-rose-500/20 border-rose-500/40 text-rose-400'}`}>
                         {scannerFeedback.type === 'success' ? <CheckCircle2 size={24}/> : <Ban size={24}/>}
                         <span className="font-black text-sm uppercase tracking-widest">{scannerFeedback.msg}</span>
                      </div>
                    ) : (
                      <div className="p-5 bg-white/5 rounded-2xl flex items-center gap-4 border border-white/5">
                         <RefreshCw size={24} className="text-slate-500 animate-spin" />
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Awaiting valid optical data stream...</span>
                      </div>
                    )}

                    <div className="space-y-2 max-h-[150px] overflow-y-auto no-scrollbar opacity-60">
                       {scannerLog.map((log, i) => (
                          <div key={i} className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase py-2 border-b border-white/5">
                             <div className="flex items-center gap-3">
                                {log.status === 'ok' ? <Package size={14} className="text-emerald-500" /> : <AlertCircle size={14} className="text-rose-500" />}
                                <span>{log.name}</span>
                             </div>
                             <span>{log.time}</span>
                          </div>
                       ))}
                    </div>
                 </div>

                 {/* Cart Preview within Scanner */}
                 <div className="w-full md:w-80 bg-indigo-600 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10">
                       <p className="text-[11px] font-black text-indigo-200 uppercase tracking-widest mb-1">Session Value</p>
                       <h3 className="text-4xl font-black tracking-tighter">{state.settings.currency}{total.toLocaleString()}</h3>
                       <div className="mt-8 space-y-4">
                          <div className="flex justify-between text-[10px] font-black text-indigo-100 uppercase tracking-widest opacity-60">
                             <span>Assets Cached</span>
                             <span>{cart.length}</span>
                          </div>
                          <button onClick={() => { setIsScannerOpen(false); setIsCartOpen(true); }} className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
                             Finalize Session <ArrowRight size={14}/>
                          </button>
                       </div>
                    </div>
                    <ShoppingCart size={120} className="absolute -bottom-6 -right-6 text-white/10 rotate-12" />
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Payment Selection Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[56px] w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col border border-white/10 animate-in zoom-in-95 duration-300">
              <header className="p-10 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
                 <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center shadow-lg"><Wallet size={28}/></div>
                    <div>
                       <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Settlement Module</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized Fiscal Protocol</p>
                    </div>
                 </div>
                 <button onClick={() => setIsCheckoutOpen(false)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-rose-500 transition-all"><X size={24}/></button>
              </header>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-8">
                 <div className="p-8 bg-slate-50 dark:bg-slate-800 rounded-[40px] text-center border border-slate-100 dark:border-slate-700 shadow-inner">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Aggregate Value Due</p>
                    <h2 className="text-6xl font-black dark:text-white tracking-tighter">{state.settings.currency}{total.toLocaleString()}</h2>
                 </div>

                 <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Channel of Remittance</label>
                    <div className="grid grid-cols-3 gap-3">
                       {[
                         { id: 'cash', label: 'Cash Entry', icon: Banknote },
                         { id: 'card', label: 'Digital Token', icon: CreditCard },
                         { id: 'transfer', label: 'Wire Link', icon: RefreshCw }
                       ].map(method => (
                          <button 
                            key={method.id} 
                            onClick={() => setPaymentMethod(method.id as any)}
                            className={`flex flex-col items-center justify-center p-6 rounded-[32px] border-4 transition-all gap-3 ${paymentMethod === method.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900 grayscale opacity-60'}`}
                          >
                             <method.icon size={32} className={paymentMethod === method.id ? 'text-indigo-600' : 'text-slate-400'} />
                             <span className={`text-[10px] font-black uppercase tracking-widest ${paymentMethod === method.id ? 'text-indigo-600' : 'text-slate-400'}`}>{method.label}</span>
                          </button>
                       ))}
                    </div>
                 </div>

                 {paymentMethod === 'cash' && (
                    <div className="space-y-6 animate-in slide-in-from-top-4">
                       <div className="flex items-center justify-between mb-2">
                          <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-2 flex items-center gap-2">
                            <Coins size={14}/> Cash Flow Manager
                          </label>
                          {total > 0 && (
                            <div className="flex gap-1">
                               {[total, 10, 20, 50, 100].map((val, i) => (
                                 <button key={i} onClick={() => setCashReceived(val)} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[9px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all">
                                    {i === 0 ? 'Exact' : `${state.settings.currency}${val}`}
                                 </button>
                               ))}
                            </div>
                          )}
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="relative">
                             <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-2xl text-slate-300">{state.settings.currency}</span>
                             <input 
                               type="number" 
                               value={cashReceived} 
                               onChange={e => setCashReceived(e.target.value === '' ? '' : Number(e.target.value))}
                               className="w-full bg-white dark:bg-slate-800 border-4 border-indigo-100 dark:border-indigo-900/50 focus:border-indigo-500 rounded-[32px] py-6 pl-14 pr-8 font-black text-4xl dark:text-white outline-none shadow-xl transition-all" 
                               placeholder="Received..."
                               autoFocus
                             />
                             <p className="absolute -top-3 left-6 bg-white dark:bg-slate-800 px-2 text-[9px] font-black text-indigo-600 uppercase">Remittance In</p>
                          </div>
                          
                          <div className={`relative flex flex-col justify-center px-10 rounded-[32px] border-4 border-dashed transition-all ${changeDue > 0 ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 text-emerald-600' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 text-slate-300'}`}>
                             <p className="text-[9px] font-black uppercase mb-1">Return Surplus (Change)</p>
                             <h4 className="text-4xl font-black tabular-nums">{state.settings.currency}{changeDue.toLocaleString()}</h4>
                             {changeDue > 0 && <Sparkles size={20} className="absolute top-4 right-4 text-emerald-400 animate-pulse" />}
                          </div>
                       </div>
                    </div>
                 )}

                 <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-[32px] border border-amber-100 dark:border-amber-800/30 flex items-start gap-5">
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-amber-600"><Sparkles size={24}/></div>
                    <div>
                       <p className="text-[11px] font-black text-amber-600 uppercase tracking-widest mb-1">Authorization Note</p>
                       <p className="text-[9px] font-bold text-slate-500 uppercase leading-relaxed">Executing this action will subtract items from current active inventory and log a permanent invoice to the ledger for {selectedCustomer?.name || 'Walk-in'}.</p>
                    </div>
                 </div>
              </div>

              <footer className="p-10 border-t border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-4">
                 <button onClick={() => setIsCheckoutOpen(false)} className="flex-1 py-7 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-[32px] font-black text-xs uppercase tracking-[0.2em]">Abort Process</button>
                 <button onClick={finalizeSale} className="flex-[2] py-7 bg-indigo-600 text-white rounded-[32px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-[0.98] flex items-center justify-center gap-4">
                    <CheckCircle2 size={24}/> Finalize Authorized Sale
                 </button>
              </footer>
           </div>
        </div>
      )}

      {/* SUCCESS RECEIPT MODAL */}
      {finishedInvoice && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[64px] w-full max-w-2xl h-full max-h-[90vh] shadow-2xl overflow-hidden flex flex-col border border-white/10 animate-in zoom-in-95 duration-500">
              <header className="p-10 pb-6 text-center shrink-0">
                 <div className="w-20 h-20 bg-emerald-500 text-white rounded-[28px] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-200 dark:shadow-none mb-6 animate-bounce">
                    <CheckCircle size={40} strokeWidth={3} />
                 </div>
                 <h2 className="text-4xl font-black dark:text-white uppercase tracking-tighter">Sale Authorized!</h2>
                 <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">Document #INV-{finishedInvoice.id.padStart(4, '0')}</p>
              </header>

              <div className="flex-1 overflow-y-auto custom-scrollbar px-10 py-6">
                 <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[48px] border border-slate-100 dark:border-slate-800 p-8 space-y-8">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-6">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm"><ReceiptIcon size={24}/></div>
                          <div>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggregate Total</p>
                             <p className="text-2xl font-black dark:text-white">{state.settings.currency}{finishedInvoice.total.toLocaleString()}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Remittance</p>
                          <p className="text-lg font-black text-emerald-600 uppercase">{finishedInvoice.paymentMethod}</p>
                       </div>
                    </div>

                    {/* Money Receipt Logic Display */}
                    {finishedInvoice.paymentMethod === 'cash' && (
                       <div className="grid grid-cols-2 gap-4 p-6 bg-white dark:bg-slate-700 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800">
                          <div>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cash In</p>
                             <p className="text-2xl font-black dark:text-white">{state.settings.currency}{finishedInvoice.paidAmount.toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                             <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Change Out</p>
                             <p className="text-2xl font-black text-emerald-500">{state.settings.currency}{(finishedInvoice.paidAmount - finishedInvoice.total).toLocaleString()}</p>
                          </div>
                       </div>
                    )}

                    <div className="space-y-4">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset Log</p>
                       {finishedInvoice.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm">
                             <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center text-[10px] font-black text-slate-400">{it.quantity}</span>
                                <p className="font-bold dark:text-slate-200 uppercase truncate max-w-[240px]">{it.name}</p>
                             </div>
                             <p className="font-black dark:text-white">{state.settings.currency}{(it.price * it.quantity).toLocaleString()}</p>
                          </div>
                       ))}
                    </div>

                    <div className="pt-6 border-t border-slate-200 dark:border-slate-700 space-y-2">
                       <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                          <span>Subtotal</span>
                          <span>{state.settings.currency}{finishedInvoice.subtotal.toLocaleString()}</span>
                       </div>
                       {finishedInvoice.discount > 0 && (
                          <div className="flex justify-between text-xs font-black text-rose-500 uppercase">
                             <span>Discount Authorized</span>
                             <span>-{state.settings.currency}{finishedInvoice.discount.toLocaleString()}</span>
                          </div>
                       )}
                       <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                          <span>Fiscal Modules (Tax)</span>
                          <span>+{state.settings.currency}{finishedInvoice.tax.toLocaleString()}</span>
                       </div>
                    </div>
                    
                    {finishedInvoice.customerId && (
                       <div className="p-5 bg-indigo-600 rounded-[32px] text-white flex items-center justify-between shadow-xl">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Star size={20} fill="white"/></div>
                             <div>
                                <p className="text-[9px] font-black text-indigo-100 uppercase tracking-widest">Rewards Synchronized</p>
                                <p className="text-sm font-black uppercase">{state.customers.find(c => c.id === finishedInvoice.customerId)?.name}</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="text-xl font-black">+{finishedInvoice.pointsEarned} <span className="text-[10px]">PTS</span></p>
                          </div>
                       </div>
                    )}
                 </div>
              </div>

              <footer className="p-10 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col gap-4 shrink-0">
                 <div className="flex gap-4">
                    <button 
                       onClick={() => handlePrintReceipt(finishedInvoice)}
                       className="flex-1 py-5 bg-white dark:bg-slate-800 text-slate-700 dark:text-white border-2 rounded-[28px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-50 transition-all active:scale-95"
                    >
                       <Printer size={18}/> Print Receipt
                    </button>
                    <button 
                       onClick={() => handleDownloadReceiptPDF(finishedInvoice)}
                       disabled={isExportingReceipt}
                       className="flex-1 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[28px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:opacity-90 transition-all active:scale-95"
                    >
                       {isExportingReceipt ? <RefreshCw size={18} className="animate-spin"/> : <FileDown size={18}/>} Save Digital PDF
                    </button>
                 </div>
                 <button 
                    onClick={() => setFinishedInvoice(null)}
                    className="w-full py-6 bg-indigo-600 text-white rounded-[32px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-[0.98]"
                 >
                    Initialize New Session
                 </button>
              </footer>
           </div>
        </div>
      )}

      <style>{`
        @keyframes scanLine {
           0% { top: 0; }
           50% { top: 100%; }
           100% { top: 0; }
        }
      `}</style>
    </div>
  );
}
