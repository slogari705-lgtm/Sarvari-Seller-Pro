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
  AlertCircle
} from 'lucide-react';
import { AppState, Product, CartItem, Invoice, Customer } from '../types';
import { translations } from '../translations';

// QuickAddCustInline defined here to avoid scoping errors
const QuickAddCustInline = ({ t, onClose, onSave }: any) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-[48px] w-full max-w-md p-10 shadow-2xl relative animate-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-8 right-8 p-3 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl"><X size={24}/></button>
        <h3 className="text-2xl font-black mb-8 dark:text-white uppercase tracking-tighter">Quick Add Customer</h3>
        <div className="space-y-6 mb-10">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">{t.fullName}</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)} type="text" className="w-full bg-slate-50 dark:bg-slate-800 border-4 border-transparent focus:border-indigo-500 rounded-3xl py-5 px-6 outline-none font-bold dark:text-white shadow-inner" placeholder="John Doe" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">{t.phone}</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} type="text" className="w-full bg-slate-50 dark:bg-slate-800 border-4 border-transparent focus:border-indigo-500 rounded-3xl py-5 px-6 outline-none font-bold dark:text-white shadow-inner" placeholder="07XX XXX XXX" />
          </div>
        </div>
        <button 
          onClick={() => onSave(name, phone)}
          className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95 uppercase tracking-widest text-xs"
        >
          Register & Select
        </button>
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
  const [showSortMenu, setShowSortMenu] = useState(false);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(() => {
    return state.customers.find(c => c.id === state.settings.defaultCustomerId) || null;
  });
  const [paymentModal, setPaymentModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [paidAmountInput, setPaidAmountInput] = useState<number | ''>(''); 
  const [showCartMobile, setShowCartMobile] = useState(false);
  const [showQuickAddCust, setShowQuickAddCust] = useState(false);
  
  const t = translations[state.settings.language || 'en'];

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set(state.products.map(p => p.category));
    return ['All', ...Array.from(cats)].sort();
  }, [state.products]);

  const filteredProducts = useMemo(() => {
    let result = state.products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });

    result.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortConfig.order === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return result;
  }, [state.products, searchTerm, categoryFilter, sortConfig]);

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

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({ key, order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc' }));
    setShowSortMenu(false);
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalCost = cart.reduce((acc, item) => acc + ((item.buyPrice || 0) * item.quantity), 0);
  const tax = (subtotal * state.settings.taxRate) / 100;
  const total = subtotal + tax;
  const invoiceProfit = total - tax - totalCost;

  const finalPaid = paidAmountInput === '' ? total : paidAmountInput;
  const balanceDue = Math.max(0, total - finalPaid);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    // SEQUENTIAL NUMERIC ID GENERATION
    const maxId = state.invoices.reduce((max, inv) => {
      const idNum = parseInt(inv.id);
      return !isNaN(idNum) ? Math.max(max, idNum) : max;
    }, 0);
    const nextId = (maxId + 1).toString();

    const status: Invoice['status'] = finalPaid >= total ? 'paid' : (finalPaid > 0 ? 'partial' : 'unpaid');
    const newInvoice: Invoice = {
      id: nextId,
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
            lastVisit: new Date().toISOString().split('T')[0],
            transactionCount: (c.transactionCount || 0) + 1
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

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 lg:gap-6 relative">
      {/* Product Area */}
      <div className="flex-1 flex flex-col gap-4 lg:gap-6 min-h-0">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 space-y-4 sticky top-0 z-10">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
             <div className="relative flex-1 w-full">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <input 
                 type="text" 
                 placeholder={t.search} 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-3 pl-12 pr-4 outline-none font-bold text-sm dark:text-white transition-all shadow-inner"
               />
             </div>
             
             <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <button 
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className={`w-full flex items-center justify-between gap-3 px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-all ${showSortMenu ? 'border-indigo-500' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                       <ArrowUpDown size={16} />
                       <span className="hidden sm:inline">Sort:</span> 
                       <span className="text-indigo-600">{sortConfig.key}</span>
                    </div>
                    <ChevronDown size={14} className={`transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
                  </button>
                  {showSortMenu && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 py-2 z-30 animate-in fade-in slide-in-from-top-2">
                      {['name', 'price', 'stock'].map(key => (
                        <button
                          key={key}
                          onClick={() => handleSort(key as SortKey)}
                          className={`w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 ${sortConfig.key === key ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10' : 'text-slate-500 dark:text-slate-400'}`}
                        >
                          {key}
                          {sortConfig.key === key && (sortConfig.order === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setShowQuickAddCust(true)}
                  className="p-3.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none"
                  title="Quick Add Customer"
                >
                  <UserPlus size={22} />
                </button>
             </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
             <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl mr-2">
                <Filter size={14} className="text-indigo-600"/>
             </div>
             {categories.map(cat => (
               <button
                 key={cat}
                 onClick={() => setCategoryFilter(cat)}
                 className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.15em] whitespace-nowrap transition-all border-2 ${
                   categoryFilter === cat 
                     ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                     : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-indigo-300'
                 }`}
               >
                 {cat}
               </button>
             ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-6 pb-20 lg:pb-6 custom-scrollbar pr-2">
          {filteredProducts.map((product) => {
             const isOut = product.stock <= 0;
             const isLow = product.stock <= (product.lowStockThreshold || state.settings.lowStockThreshold);
             return (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={isOut}
                className={`bg-white dark:bg-slate-900 p-4 lg:p-5 rounded-[32px] shadow-sm border text-left flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1 transition-all active:scale-95 group relative overflow-hidden ${
                  isOut ? 'opacity-50 grayscale border-slate-100 dark:border-slate-800 cursor-not-allowed' : 'border-slate-100 dark:border-slate-800 hover:border-indigo-500'
                }`}
              >
                <div>
                  <div className={`w-full aspect-square rounded-[24px] mb-4 flex items-center justify-center text-slate-400 transition-all border shadow-inner overflow-hidden ${
                    isOut ? 'bg-slate-200 dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-800 group-hover:bg-indigo-50/50 border-transparent'
                  }`}>
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <Package size={40} strokeWidth={1.5} />
                    )}
                  </div>
                  <h4 className="font-black text-xs lg:text-sm text-slate-800 dark:text-white leading-tight mb-1 line-clamp-2 h-10">{product.name}</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Layers size={12}/> {product.category}
                  </p>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                  <span className="font-black text-indigo-600 dark:text-indigo-400 text-base lg:text-lg">{state.settings.currency}{product.price.toFixed(2)}</span>
                  <span className={`text-[9px] px-2 py-1 rounded-lg font-black uppercase tracking-widest ${
                    isOut ? 'bg-rose-100 text-rose-600' : isLow ? 'bg-amber-100 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {product.stock} {t.stock}
                  </span>
                </div>
              </button>
             );
          })}
        </div>
      </div>

      <div className={`
        fixed inset-0 lg:static z-40 flex flex-col lg:w-[420px] bg-white dark:bg-slate-900 lg:rounded-[40px] shadow-2xl lg:shadow-xl border lg:border-slate-100 dark:lg:border-slate-800 h-full lg:h-[calc(100vh-10rem)] transition-transform duration-500 ease-in-out shrink-0
        ${showCartMobile ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
      `}>
        <div className="p-6 lg:p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
               <ShoppingCart size={24} />
            </div>
            <div>
               <h3 className="font-black text-xl text-slate-800 dark:text-white uppercase tracking-tighter">{t.cart}</h3>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{cart.reduce((a, b) => a + b.quantity, 0)} {t.items} added</p>
            </div>
          </div>
          <button onClick={() => setShowCartMobile(false)} className="lg:hidden p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-400">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <div className="space-y-3">
             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.customerSelection}</label>
             <div className="relative">
                <select 
                  value={selectedCustomer?.id || ''}
                  onChange={(e) => setSelectedCustomer(state.customers.find(c => c.id === e.target.value) || null)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-5 outline-none font-bold text-sm dark:text-white shadow-inner appearance-none"
                >
                   <option value="">{t.walkInCustomer}</option>
                   {state.customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
             </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800 my-2"></div>

          {cart.length === 0 ? (
            <div className="h-full py-20 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 gap-6 opacity-30">
              <div className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                 <ShoppingCart size={64} strokeWidth={1} />
              </div>
              <p className="font-black text-xs uppercase tracking-[0.3em]">{t.cartEmpty}</p>
            </div>
          ) : (
            <div className="space-y-4 pb-10">
               {cart.map((item) => (
                 <div key={item.id} className="flex gap-4 p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:border-indigo-500 transition-all group animate-in slide-in-from-right-4">
                   <div className="w-14 h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 dark:text-slate-500 shrink-0 border border-slate-100 dark:border-slate-700">
                     {item.image ? <img src={item.image} className="w-full h-full object-cover rounded-2xl" alt={item.name} /> : <Package size={24} />}
                   </div>
                   <div className="flex-1 min-w-0">
                     <div className="flex justify-between items-start">
                       <h5 className="font-black text-xs truncate pr-2 text-slate-800 dark:text-white uppercase tracking-tight">{item.name}</h5>
                       <button 
                         onClick={() => removeFromCart(item.id)}
                         className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                       >
                         <Trash2 size={16} />
                       </button>
                     </div>
                     
                     <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900 rounded-xl px-2 py-1.5 border border-transparent focus-within:border-indigo-500 transition-all">
                           <span className="text-[9px] font-black text-slate-400">{state.settings.currency}</span>
                           <input 
                             type="number" 
                             value={item.price} 
                             onChange={(e) => updatePrice(item.id, Number(e.target.value))}
                             className="bg-transparent border-none outline-none w-14 text-xs font-black dark:text-white"
                           />
                           <Edit3 size={12} className="text-slate-300" />
                        </div>
                        
                        <div className="flex items-center gap-3 bg-indigo-600 rounded-xl px-2 py-1.5 shadow-lg shadow-indigo-100 dark:shadow-none">
                          <button onClick={() => updateQuantity(item.id, -1)} className="text-white hover:scale-125 transition-transform"><Minus size={14} /></button>
                          <span className="text-xs font-black w-4 text-center text-white">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="text-white hover:scale-125 transition-transform"><Plus size={14} /></button>
                        </div>
                     </div>
                     <div className="mt-2 text-right">
                        <span className="font-black text-sm text-indigo-600 dark:text-indigo-400">{state.settings.currency}{(item.price * item.quantity).toFixed(2)}</span>
                     </div>
                   </div>
                 </div>
               ))}
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 space-y-6 shrink-0 lg:rounded-b-[40px]">
          <div className="space-y-3">
             <div className="flex justify-between text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest">
               <span>{t.subtotal}</span>
               <span>{state.settings.currency}{subtotal.toFixed(2)}</span>
             </div>
             <div className="flex justify-between items-center text-slate-800 dark:text-white pt-4 border-t border-slate-200 dark:border-slate-700">
               <span className="font-black text-sm uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">{t.payableTotal}</span>
               <span className="font-black text-4xl tracking-tighter">{state.settings.currency}{total.toFixed(2)}</span>
             </div>
          </div>

          <button 
            disabled={cart.length === 0}
            onClick={() => setPaymentModal(true)}
            className="w-full py-6 bg-indigo-600 text-white rounded-[32px] font-black text-xl shadow-2xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:shadow-none transition-all active:scale-95 flex items-center justify-center gap-4"
          >
            {t.checkout}
            <ArrowRight size={28} />
          </button>
        </div>
      </div>

      {paymentModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-t-[40px] sm:rounded-[48px] w-full max-w-md p-8 lg:p-12 shadow-2xl relative animate-in slide-in-from-bottom sm:zoom-in duration-300">
            <button onClick={() => setPaymentModal(false)} className="absolute top-8 right-8 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-400 transition-colors"><X size={24} /></button>
            <h3 className="text-3xl font-black mb-8 text-center uppercase tracking-tighter dark:text-white">{t.finalizeSale}</h3>
            
            <div className="space-y-6 mb-10">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">{t.amountPaid}</label>
                <div className="relative">
                   <div className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-400 font-black text-xl">{state.settings.currency}</div>
                   <input 
                     type="number" 
                     value={paidAmountInput} 
                     onChange={(e) => setPaidAmountInput(e.target.value === '' ? '' : Number(e.target.value))}
                     className="w-full bg-slate-50 dark:bg-slate-800 border-4 border-transparent focus:border-indigo-500 rounded-[32px] py-6 pl-14 pr-6 outline-none font-black text-2xl dark:text-white transition-all shadow-inner"
                     placeholder={total.toFixed(2)}
                     autoFocus
                   />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'cash', label: t.cash, icon: Banknote },
                  { id: 'card', label: t.card, icon: CreditCard },
                  { id: 'transfer', label: t.transfer, icon: ArrowRight },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`flex flex-col items-center justify-center p-4 rounded-3xl border-4 transition-all ${
                      paymentMethod === m.id 
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 shadow-lg' 
                        : 'border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    <m.icon size={24} className="mb-2"/>
                    <span className="text-[10px] font-black uppercase tracking-widest">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 dark:bg-black p-8 rounded-[40px] mb-10 flex justify-between items-center text-white shadow-2xl">
              <span className="text-indigo-400 font-black uppercase tracking-[0.2em] text-xs">{t.totalBill}</span>
              <span className="text-4xl font-black tracking-tighter">{state.settings.currency}{total.toFixed(2)}</span>
            </div>

            <button 
              onClick={handleCheckout}
              className="w-full py-6 bg-indigo-600 text-white rounded-[32px] font-black text-xl hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-200 dark:shadow-none active:scale-95"
            >
              {t.confirmFinish}
            </button>
          </div>
        </div>
      )}

      {successModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in zoom-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[64px] w-full max-w-md p-12 shadow-2xl text-center border-8 border-slate-50 dark:border-slate-800">
            <div className="w-32 h-32 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-10 animate-bounce ring-[16px] ring-emerald-50 dark:ring-emerald-900/10">
              <CheckCircle2 size={72} strokeWidth={3} />
            </div>
            <h3 className="text-3xl font-black mb-4 uppercase tracking-tighter dark:text-white">{t.saleSuccess}</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-12 font-bold uppercase tracking-widest text-xs">{t.invoiceSuccess}</p>
            <button 
              onClick={() => setSuccessModal(false)}
              className="w-full py-6 bg-slate-950 dark:bg-indigo-600 text-white rounded-[32px] font-black text-lg hover:bg-black transition-all active:scale-95 shadow-2xl"
            >
              {t.newTransaction}
            </button>
          </div>
        </div>
      )}

      {showQuickAddCust && (
        <QuickAddCustInline t={t} onClose={() => setShowQuickAddCust(false)} onSave={(name: string, phone: string) => {
          const newCust: Customer = {
            id: Math.random().toString(36).substr(2, 9),
            name,
            phone,
            email: '',
            totalSpent: 0,
            totalDebt: 0,
            lastVisit: 'Just joined',
            transactionCount: 0
          };
          updateState('customers', [...state.customers, newCust]);
          setSelectedCustomer(newCust);
          setShowQuickAddCust(false);
        }} />
      )}
    </div>
  );
};

export default Terminal;