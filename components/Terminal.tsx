
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
  Edit3
} from 'lucide-react';
import { AppState, Product, CartItem, Invoice, Customer } from '../types';
import { translations } from '../translations';

interface Props {
  state: AppState;
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
}

const Terminal: React.FC<Props> = ({ state, updateState }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(() => {
    return state.customers.find(c => c.id === state.settings.defaultCustomerId) || null;
  });
  const [paymentModal, setPaymentModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [paidAmountInput, setPaidAmountInput] = useState<number | ''>(''); // Loan System
  const [showCartMobile, setShowCartMobile] = useState(false);
  const [showQuickAddCust, setShowQuickAddCust] = useState(false);
  
  const t = translations[state.settings.language || 'en'];

  const filteredProducts = useMemo(() => {
    return state.products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [state.products, searchTerm]);

  const favoriteProducts = useMemo(() => {
    return state.products.filter(p => p.isFavorite);
  }, [state.products]);

  const toggleFavorite = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    const updatedProducts = state.products.map(p => 
      p.id === productId ? { ...p, isFavorite: !p.isFavorite } : p
    );
    updateState('products', updatedProducts);
  };

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id 
          ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } 
          : item
        );
      }
      // Important: Snapshot buyPrice at time of addition
      return [...prev, { ...product, quantity: 1, buyPrice: product.costPrice || 0 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, Math.min(item.quantity + delta, item.stock));
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const updatePrice = (productId: string, newPrice: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        return { ...item, price: newPrice };
      }
      return item;
    }));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalCost = cart.reduce((acc, item) => acc + ((item.buyPrice || 0) * item.quantity), 0);
  const tax = (subtotal * state.settings.taxRate) / 100;
  const total = subtotal + tax;
  const invoiceProfit = total - tax - totalCost; // Net profit from this sale (excluding tax)

  const finalPaid = paidAmountInput === '' ? total : paidAmountInput;
  const balanceDue = Math.max(0, total - finalPaid);

  const handleCheckout = () => {
    if (cart.length === 0) return;

    const status: Invoice['status'] = finalPaid >= total ? 'paid' : (finalPaid > 0 ? 'partial' : 'unpaid');
    
    const newInvoice: Invoice = {
      id: Math.random().toString(36).substring(7).toUpperCase(),
      date: new Date().toISOString(),
      customerId: selectedCustomer?.id,
      items: cart,
      subtotal,
      tax,
      discount: 0,
      total,
      profit: invoiceProfit,
      paidAmount: finalPaid,
      status,
      paymentMethod
    };

    updateState('invoices', [...state.invoices, newInvoice]);

    const updatedProducts = state.products.map(p => {
      const cartItem = cart.find(item => item.id === p.id);
      return cartItem ? { ...p, stock: p.stock - cartItem.quantity } : p;
    });
    updateState('products', updatedProducts);

    if (selectedCustomer) {
      const updatedCustomers = state.customers.map(c => {
        if (c.id === selectedCustomer.id) {
          return {
            ...c,
            totalSpent: c.totalSpent + total,
            totalDebt: (c.totalDebt || 0) + balanceDue,
            lastVisit: new Date().toISOString().split('T')[0]
          };
        }
        return c;
      });
      updateState('customers', updatedCustomers);
    }

    setCart([]);
    const defaultCust = state.customers.find(c => c.id === state.settings.defaultCustomerId) || null;
    setSelectedCustomer(defaultCust);
    setPaidAmountInput('');
    setPaymentModal(false);
    setSuccessModal(true);
    setShowCartMobile(false);
  };

  const handleQuickAddCust = (name: string, phone: string) => {
    const newCust: Customer = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      phone,
      email: '',
      totalSpent: 0,
      totalDebt: 0,
      lastVisit: 'Just joined'
    };
    updateState('customers', [...state.customers, newCust]);
    setSelectedCustomer(newCust);
    setShowQuickAddCust(false);
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 lg:gap-6 relative">
      {/* Product Area */}
      <div className="flex-1 flex flex-col gap-4 lg:gap-6 min-h-0">
        <div className="bg-white dark:bg-slate-900 p-3 lg:p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-3 lg:gap-4 sticky top-0 z-10">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={t.search} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none text-sm dark:text-white"
            />
          </div>
          <button 
            onClick={() => setShowQuickAddCust(true)}
            className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
          >
            <UserPlus size={20} />
          </button>
        </div>

        {favoriteProducts.length > 0 && searchTerm === '' && (
          <div className="space-y-3 shrink-0">
            <div className="flex items-center gap-2 px-1">
              <Star size={16} className="text-amber-500 fill-amber-500" />
              <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500">{t.quickAccess}</h3>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
              {favoriteProducts.map((p) => (
                <button
                  key={`fav-${p.id}`}
                  onClick={() => addToCart(p)}
                  className="flex-shrink-0 w-32 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-500 transition-all text-left group"
                >
                  <div className="relative aspect-square bg-slate-50 dark:bg-slate-800 rounded-xl mb-2 flex items-center justify-center text-slate-400 dark:text-slate-500 overflow-hidden">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={20} />
                    )}
                    <div className="absolute top-1 right-1">
                       <Star size={14} className="text-amber-500 fill-amber-500" />
                    </div>
                  </div>
                  <h4 className="font-bold text-[10px] text-slate-800 dark:text-white leading-tight mb-1 truncate">{p.name}</h4>
                  <p className="font-black text-indigo-600 dark:text-indigo-400 text-xs">{state.settings.currency}{p.price.toFixed(2)}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 lg:gap-4 pb-20 lg:pb-4 custom-scrollbar">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => addToCart(product)}
              disabled={product.stock <= 0}
              className={`bg-white dark:bg-slate-900 p-3 lg:p-4 rounded-2xl shadow-sm border text-left flex flex-col justify-between hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-500 transition-all active:scale-95 group relative ${
                product.stock <= 0 ? 'opacity-50 grayscale' : 'border-slate-100 dark:border-slate-800'
              }`}
            >
              <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <div 
                  onClick={(e) => toggleFavorite(e, product.id)}
                  className="p-1.5 bg-white/90 dark:bg-slate-800/90 rounded-lg shadow-sm hover:scale-110 transition-transform"
                >
                  <Star size={16} className={`${product.isFavorite ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-600'}`} />
                </div>
              </div>

              <div>
                <div className="w-full aspect-square bg-slate-50 dark:bg-slate-800 rounded-xl mb-3 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 transition-colors border border-slate-100 dark:border-slate-700 shadow-inner overflow-hidden">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package size={32} />
                  )}
                </div>
                <h4 className="font-bold text-xs lg:text-sm text-slate-800 dark:text-white leading-tight mb-1 truncate line-clamp-2 h-8 lg:h-10">{product.name}</h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">{product.category}</p>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm lg:text-base">{state.settings.currency}{product.price.toFixed(2)}</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${
                  product.stock > 10 ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600'
                }`}>
                  {product.stock}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className={`
        fixed inset-0 lg:static z-40 flex flex-col lg:w-96 bg-white dark:bg-slate-900 lg:rounded-3xl shadow-2xl lg:shadow-lg border lg:border-slate-200 dark:lg:border-slate-800 h-full lg:h-[calc(100vh-10rem)] transition-transform duration-300 ease-in-out
        ${showCartMobile ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
      `}>
        <div className="p-5 lg:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10 shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="text-indigo-600" size={24} />
            <h3 className="font-black text-lg text-slate-800 dark:text-white uppercase tracking-tighter">{t.cart}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-lg text-xs font-black">
              {cart.reduce((a, b) => a + b.quantity, 0)} {t.items}
            </span>
            <button onClick={() => setShowCartMobile(false)} className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          <div className="mb-2">
             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t.customerSelection}</label>
             <select 
               value={selectedCustomer?.id || ''}
               onChange={(e) => setSelectedCustomer(state.customers.find(c => c.id === e.target.value) || null)}
               className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm dark:text-white shadow-inner"
             >
                <option value="">{t.walkInCustomer}</option>
                {state.customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
             </select>
          </div>

          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 gap-4 opacity-30">
              <ShoppingCart size={80} strokeWidth={1} />
              <p className="font-black text-sm uppercase tracking-widest">{t.cartEmpty}</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex gap-4 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-500 transition-colors group">
                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 shrink-0 border border-slate-100 dark:border-slate-700">
                  <Package size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h5 className="font-bold text-sm truncate pr-2 text-slate-700 dark:text-slate-200">{item.name}</h5>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  {/* Editable Price Field */}
                  <div className="mt-2 flex items-center gap-2">
                     <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 rounded-lg px-2 py-1 ring-1 ring-slate-200 dark:ring-slate-700 focus-within:ring-indigo-500 transition-all">
                        <span className="text-[10px] font-black text-slate-400">{state.settings.currency}</span>
                        <input 
                          type="number" 
                          value={item.price} 
                          onChange={(e) => updatePrice(item.id, Number(e.target.value))}
                          className="bg-transparent border-none outline-none w-16 text-xs font-black dark:text-white"
                        />
                        <Edit3 size={10} className="text-slate-300" />
                     </div>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unit Price</span>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 rounded-xl px-1.5 py-1 ring-1 ring-slate-200 dark:ring-slate-700">
                      <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:text-rose-500 transition-colors dark:text-slate-400"><Minus size={14} /></button>
                      <span className="text-xs font-black w-4 text-center dark:text-white">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:text-indigo-600 transition-colors dark:text-slate-400"><Plus size={14} /></button>
                    </div>
                    <div className="text-right">
                       <span className="font-black text-sm text-indigo-600 dark:text-indigo-400">{state.settings.currency}{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 space-y-4 shrink-0">
          <div className="space-y-2">
             <div className="flex justify-between text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider">
               <span>{t.subtotal}</span>
               <span>{state.settings.currency}{subtotal.toFixed(2)}</span>
             </div>
             <div className="flex justify-between items-center text-slate-800 dark:text-white pt-3 border-t border-slate-50 dark:border-slate-800">
               <span className="font-black text-sm uppercase tracking-widest">{t.payableTotal}</span>
               <span className="font-black text-3xl text-indigo-600 dark:text-indigo-400 tracking-tighter">{state.settings.currency}{total.toFixed(2)}</span>
             </div>
          </div>

          <button 
            disabled={cart.length === 0}
            onClick={() => setPaymentModal(true)}
            className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-xl shadow-2xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-3"
          >
            {t.checkout}
            <ArrowRight size={24} />
          </button>
        </div>
      </div>

      {cart.length > 0 && !showCartMobile && (
        <button 
          onClick={() => setShowCartMobile(true)}
          className="lg:hidden fixed bottom-6 right-6 z-30 w-16 h-16 bg-indigo-600 text-white rounded-2xl shadow-2xl flex items-center justify-center animate-bounce ring-4 ring-indigo-100 dark:ring-slate-900"
        >
          <div className="relative">
            <ShoppingCart size={32} />
            <span className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white text-[10px] font-black rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
              {cart.length}
            </span>
          </div>
        </button>
      )}

      {paymentModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-[32px] w-full max-w-md p-6 lg:p-10 shadow-2xl relative animate-in slide-in-from-bottom sm:zoom-in duration-300">
            <button onClick={() => setPaymentModal(false)} className="absolute top-6 right-6 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
            <h3 className="text-2xl font-black mb-6 text-center uppercase tracking-tighter dark:text-white">{t.finalizeSale}</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t.amountPaid}</label>
                <div className="relative">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400"><Wallet size={18}/></div>
                   <input 
                     type="number" 
                     value={paidAmountInput} 
                     onChange={(e) => setPaidAmountInput(e.target.value === '' ? '' : Number(e.target.value))}
                     className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 pl-12 pr-4 outline-none font-black text-lg dark:text-white transition-all shadow-inner"
                     placeholder={total.toFixed(2)}
                   />
                </div>
              </div>

              {balanceDue > 0 && selectedCustomer && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-3">
                     <Scale size={20} className="text-amber-600"/>
                     <div>
                       <p className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400">{t.loan} {t.total}</p>
                       <p className="text-lg font-black text-amber-900 dark:text-amber-100">{state.settings.currency}{balanceDue.toFixed(2)}</p>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{t.partial}</p>
                  </div>
                </div>
              )}

              {balanceDue > 0 && !selectedCustomer && (
                <div className="p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900/30 rounded-2xl flex items-center gap-3 animate-in shake">
                  <X size={20} className="text-rose-600"/>
                  <p className="text-xs font-bold text-rose-800 dark:text-rose-200">Customer ID required for loans. Please select a customer or pay full total.</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 mt-4">
                {[
                  { id: 'cash', label: t.cash, icon: Banknote },
                  { id: 'card', label: t.card, icon: CreditCard },
                  { id: 'transfer', label: t.transfer, icon: ArrowRight },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${
                      paymentMethod === m.id 
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400' 
                        : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <m.icon size={20} className="mb-1"/>
                    <span className="text-[10px] font-black uppercase tracking-widest">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 dark:bg-black p-6 rounded-[24px] mb-8 flex justify-between items-center text-white">
              <span className="text-indigo-400 font-bold uppercase tracking-widest text-xs">{t.totalBill}</span>
              <span className="text-3xl font-black">{state.settings.currency}{total.toFixed(2)}</span>
            </div>

            <button 
              disabled={balanceDue > 0 && !selectedCustomer}
              onClick={handleCheckout}
              className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-xl hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-100 dark:shadow-none disabled:opacity-50 disabled:grayscale"
            >
              {t.confirmFinish}
            </button>
          </div>
        </div>
      )}

      {successModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in zoom-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-sm p-10 shadow-2xl text-center">
            <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce ring-8 ring-emerald-50 dark:ring-emerald-900/20">
              <CheckCircle2 size={56} />
            </div>
            <h3 className="text-2xl font-black mb-3 uppercase tracking-tighter dark:text-white">{t.saleSuccess}</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-10 font-medium">{t.invoiceSuccess}</p>
            {invoiceProfit > 0 && (
                <p className="text-xs font-black text-emerald-600 mb-6 uppercase tracking-widest">
                    Est. Profit: {state.settings.currency}{invoiceProfit.toFixed(2)}
                </p>
            )}
            <button 
              onClick={() => setSuccessModal(false)}
              className="w-full py-5 bg-slate-900 dark:bg-indigo-600 text-white rounded-[24px] font-black text-lg hover:bg-slate-800 dark:hover:bg-indigo-700 transition-all active:scale-95 shadow-xl"
            >
              {t.newTransaction}
            </button>
          </div>
        </div>
      )}

      {showQuickAddCust && (
        <QuickAddCustInline t={t} onClose={() => setShowQuickAddCust(false)} onSave={handleQuickAddCust} />
      )}
    </div>
  );
};

const QuickAddCustInline = ({ t, onClose, onSave }: any) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={20}/></button>
        <h3 className="text-xl font-black mb-6 dark:text-white">{t.quickAddCustomer}</h3>
        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t.fullName}</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)} type="text" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-xl py-3 px-4 outline-none focus:border-indigo-500 font-bold dark:text-white" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t.phone}</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} type="text" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-xl py-3 px-4 outline-none focus:border-indigo-500 font-bold dark:text-white" />
          </div>
        </div>
        <button 
          onClick={() => onSave(name, phone)}
          className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95"
        >
          {t.add}
        </button>
      </div>
    </div>
  );
};

export default Terminal;
