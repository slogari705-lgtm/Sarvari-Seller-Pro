
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
  FileSpreadsheet
} from 'lucide-react';
import { AppState, Product, CartItem, Invoice, Customer } from '../types';
import { translations } from '../translations';

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
  const [lastInvoice, setLastInvoice] = useState<Invoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [paidAmountInput, setPaidAmountInput] = useState<number | ''>(''); 
  const [showCartMobile, setShowCartMobile] = useState(false);
  const [showQuickAddCust, setShowQuickAddCust] = useState(false);
  
  const t = translations[state.settings.language || 'en'];

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

  const generatePrintHTML = (inv: Invoice, layout: 'advice' | 'thermal') => {
    const customer = state.customers.find(c => c.id === inv.customerId);
    const dateStr = new Date(inv.date).toLocaleDateString();
    const timeStr = new Date(inv.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const currency = state.settings.currency;

    const previousDebt = inv.previousDebt || 0;
    const currentInvoiceTotal = inv.total;
    const grandTotal = previousDebt + currentInvoiceTotal;
    const amountPaid = inv.paidAmount;
    const remainingBalance = grandTotal - amountPaid;

    const itemsHTML = inv.items.map((item, idx) => `
      <tr style="border-bottom: 1px solid #000;">
        <td style="padding: 12px 10px; text-align: center; border-right: 1px solid #000; font-size: 13px;">${idx + 1}</td>
        <td style="padding: 12px 10px; border-right: 1px solid #000;">
          <div style="font-weight: 900; font-size: 14px;">${item.name}</div>
          <div style="font-size: 10px; text-transform: uppercase; margin-top: 2px; color: #555;">SKU: ${item.sku}</div>
        </td>
        <td style="padding: 12px 10px; text-align: center; font-weight: 800; border-right: 1px solid #000; font-size: 13px;">${item.quantity}</td>
        <td style="padding: 12px 10px; text-align: right; font-weight: 800; border-right: 1px solid #000; font-size: 13px;">${currency}${item.price.toLocaleString()}</td>
        <td style="padding: 12px 10px; text-align: right; font-weight: 900; font-size: 15px;">${currency}${(item.price * item.quantity).toLocaleString()}</td>
      </tr>
    `).join('');

    if (layout === 'advice') {
      return `
        <div style="width: 210mm; padding: 20mm; font-family: 'Inter', Arial, sans-serif; color: #000; background: #fff; box-sizing: border-box; border: 1px solid #eee;">
          <div style="display: flex; justify-content: space-between; border-bottom: 6px solid #000; padding-bottom: 25px; margin-bottom: 35px;">
            <div style="display: flex; gap: 20px; align-items: center;">
              <div style="width: 80px; height: 80px; background: #000; border-radius: 14px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 950; font-size: 48px;">S</div>
              <div>
                <h1 style="margin: 0; font-size: 34px; font-weight: 950; text-transform: uppercase; letter-spacing: -1.5px;">${state.settings.shopName}</h1>
                <p style="margin: 8px 0; font-size: 14px; font-weight: 800; color: #333;">${state.settings.shopAddress || 'Authorized Dealer'}</p>
                <p style="margin: 0; font-size: 14px; font-weight: 800; color: #333;">TEL: ${state.settings.shopPhone || 'N/A'}</p>
              </div>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; font-size: 42px; font-weight: 950; text-transform: uppercase; letter-spacing: 4px; color: #000;">${inv.id === 'DRAFT' ? 'PRO-FORMA' : 'INVOICE'}</h2>
              <div style="margin-top: 15px;">
                <p style="margin: 0; font-size: 20px; font-weight: 900; background: #000; color: #fff; display: inline-block; padding: 6px 16px; border-radius: 10px;">SERIAL: #${inv.id === 'DRAFT' ? 'DRAFT' : inv.id.padStart(6, '0')}</p>
                <p style="margin: 8px 0 0 0; font-size: 14px; font-weight: 800; color: #555;">DATE: ${dateStr} ${timeStr}</p>
              </div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px;">
            <div style="padding: 25px; border: 3px solid #000; border-radius: 20px; background: #fdfdfd;">
              <h4 style="margin: 0 0 12px 0; font-size: 11px; text-transform: uppercase; font-weight: 950; border-bottom: 2px solid #000; padding-bottom: 8px; letter-spacing: 2px; color: #444;">Billed To</h4>
              <p style="margin: 15px 0 0 0; font-size: 24px; font-weight: 950; color: #000;">${customer?.name || 'Walk-in Guest'}</p>
              <p style="margin: 8px 0; font-size: 16px; font-weight: 800; color: #333;">Phone: ${customer?.phone || 'No phone recorded'}</p>
              <p style="margin: 0; font-size: 13px; font-weight: 700; color: #666;">Address: ${customer?.address || 'N/A'}</p>
            </div>
            <div style="padding: 25px; border: 3px solid #000; border-radius: 20px; background: #fdfdfd;">
              <h4 style="margin: 0 0 12px 0; font-size: 11px; text-transform: uppercase; font-weight: 950; border-bottom: 2px solid #000; padding-bottom: 8px; letter-spacing: 2px; color: #444;">Account Summary</h4>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><span style="font-size: 14px; font-weight: 800;">Previous Loan:</span><span style="font-size: 14px; font-weight: 950;">${currency}${previousDebt.toLocaleString()}</span></div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><span style="font-size: 14px; font-weight: 800;">Current Bill:</span><span style="font-size: 14px; font-weight: 950;">${currency}${currentInvoiceTotal.toLocaleString()}</span></div>
              <div style="display: flex; justify-content: space-between; border-top: 2px solid #000; pt: 8px; margin-top: 8px;"><span style="font-size: 16px; font-weight: 900;">Total Payable:</span><span style="font-size: 16px; font-weight: 950;">${currency}${grandTotal.toLocaleString()}</span></div>
            </div>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 45px; border: 3px solid #000;">
            <thead style="background: #efefef;">
              <tr style="border-bottom: 3px solid #000;">
                <th style="padding: 16px 12px; border-right: 1px solid #000; font-size: 11px; font-weight: 950; text-align: center; width: 45px;">#</th>
                <th style="padding: 16px 12px; text-align: left; border-right: 1px solid #000; font-size: 11px; font-weight: 950;">ITEM DESCRIPTION & SKU</th>
                <th style="padding: 16px 12px; border-right: 1px solid #000; font-size: 11px; font-weight: 950; text-align: center; width: 75px;">QTY</th>
                <th style="padding: 16px 12px; text-align: right; border-right: 1px solid #000; font-size: 11px; font-weight: 950; width: 120px;">UNIT PRICE</th>
                <th style="padding: 16px 12px; text-align: right; font-size: 11px; font-weight: 950; width: 150px;">LINE TOTAL</th>
              </tr>
            </thead>
            <tbody>${itemsHTML}</tbody>
          </table>
          <div style="display: flex; justify-content: space-between; align-items: end; gap: 50px;">
            <div style="flex: 1; padding: 25px; border: 3px dashed #000; border-radius: 20px; min-height: 140px; background: #fff;">
               <h4 style="margin: 0 0 12px 0; font-size: 11px; text-transform: uppercase; font-weight: 950; color: #555; letter-spacing: 1px;">Status: ${inv.status.toUpperCase()}</h4>
               <p style="margin: 0; font-size: 14px; font-weight: 700; line-height: 1.6; color: #222;">${inv.notes || 'Thank you for your business.'}</p>
            </div>
            <div style="width: 350px; border: 4px solid #000; border-radius: 20px; padding: 30px; background: #fff;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 16px; font-weight: 800;">
                <span style="color: #666;">Grand Total</span>
                <span>${currency}${grandTotal.toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 16px; font-weight: 800;">
                <span style="color: #666;">Paid Amount</span>
                <span>${currency}${amountPaid.toLocaleString()}</span>
              </div>
              <div style="border-top: 4px solid #000; margin-top: 15px; padding-top: 15px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 20px; font-weight: 950; color: #000; text-transform: uppercase;">Balance Due</span>
                <span style="font-size: 32px; font-weight: 950;">${currency}${remainingBalance.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div style="margin-top: 100px; display: flex; justify-content: space-between; padding: 0 50px;">
             <div style="text-align: center; border-top: 3px solid #000; width: 250px; padding-top: 18px; font-size: 15px; font-weight: 950; text-transform: uppercase; letter-spacing: 2px;">Recipient Sign</div>
             <div style="text-align: center; border-top: 3px solid #000; width: 250px; padding-top: 18px; font-size: 15px; font-weight: 950; text-transform: uppercase; letter-spacing: 2px;">Authorized Stamp</div>
          </div>
        </div>
      `;
    }

    // Thermal Receipt
    return `
      <div style="width: 80mm; padding: 8mm 2mm; font-family: 'Courier New', Courier, monospace; color: #000; line-height: 1.3; text-align: center;">
        <h2 style="margin: 0; font-size: 22px; font-weight: 950; text-transform: uppercase;">${state.settings.shopName}</h2>
        <p style="margin: 4px 0; font-size: 10px;">${state.settings.shopAddress || ''}</p>
        <div style="border-top: 2px dashed #000; border-bottom: 2px dashed #000; padding: 10px 0; margin: 15px 0; font-size: 12px; text-align: left; font-weight: bold;">
          <div style="display: flex; justify-content: space-between;"><span>INV:</span> <span>#${inv.id}</span></div>
          <div style="display: flex; justify-content: space-between;"><span>DATE:</span> <span>${dateStr}</span></div>
          <div style="display: flex; justify-content: space-between;"><span>TIME:</span> <span>${timeStr}</span></div>
          <div style="display: flex; justify-content: space-between;"><span>USER:</span> <span>${customer?.name || 'WALK-IN'}</span></div>
        </div>
        <div style="text-align: left; margin-bottom: 15px;">
          ${inv.items.map(i => `
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px; font-weight: bold;">
               <span>${i.quantity}x ${i.name.substring(0, 16)}</span>
               <span>${currency}${(i.price * i.quantity).toLocaleString()}</span>
            </div>
          `).join('')}
        </div>
        <div style="border-top: 2px solid #000; padding-top: 10px; font-size: 12px; text-align: left; font-weight: bold;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
             <span>Prev Balance:</span>
             <span>${currency}${previousDebt.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
             <span>Current Bill:</span>
             <span>${currency}${currentInvoiceTotal.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-top: 1px dashed #000; padding-top: 4px; margin-top: 4px;">
             <span>Total Due:</span>
             <span>${currency}${grandTotal.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 4px;">
             <span>Paid Now:</span>
             <span>${currency}${amountPaid.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-top: 2px solid #000; padding-top: 6px; margin-top: 6px; font-size: 16px;">
             <span>BALANCE:</span>
             <span>${currency}${remainingBalance.toLocaleString()}</span>
          </div>
        </div>
        <div style="margin-top: 30px; font-size: 11px; border-top: 1px dashed #000; padding-top: 15px; font-weight: bold;">
           THANK YOU FOR YOUR PATRONAGE
        </div>
      </div>
    `;
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    const maxId = state.invoices.reduce((max, inv) => {
      const idNum = parseInt(inv.id);
      return !isNaN(idNum) ? Math.max(max, idNum) : max;
    }, 0);
    const nextId = (maxId + 1).toString();

    const status: Invoice['status'] = finalPaid >= total ? 'paid' : (finalPaid > 0 ? 'partial' : 'unpaid');
    
    // Capture the customer's previous debt BEFORE this transaction
    const previousDebt = selectedCustomer?.totalDebt || 0;

    const newInvoice: Invoice = {
      id: nextId,
      date: new Date().toISOString(), // Includes time
      customerId: selectedCustomer?.id,
      items: cart,
      subtotal,
      tax,
      discount: 0,
      total,
      profit: invoiceProfit,
      paidAmount: finalPaid,
      status,
      paymentMethod,
      previousDebt // Store it
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
            lastVisit: new Date().toISOString().split('T')[0], // Assuming lastVisit is date only string is fine, or update to include time if needed, but ISO split is standard for just date display in lists
            transactionCount: (c.transactionCount || 0) + 1
          };
        }
        return c;
      });
      updateState('customers', updatedCustomers);
    }

    setLastInvoice(newInvoice);
    setCart([]);
    setPaidAmountInput('');
    setPaymentModal(false);
    setSuccessModal(true);
    setShowCartMobile(false);
  };

  const handlePrintInstant = (layout: 'advice' | 'thermal') => {
    const isProforma = !lastInvoice && cart.length > 0;
    const invToPrint = lastInvoice || (isProforma ? {
       id: 'DRAFT',
       date: new Date().toISOString(),
       customerId: selectedCustomer?.id,
       items: cart,
       subtotal,
       tax,
       discount: 0,
       total,
       profit: 0,
       paidAmount: 0,
       status: 'unpaid' as const,
       paymentMethod: 'cash' as const,
       previousDebt: selectedCustomer?.totalDebt || 0
    } : null);

    if (!invToPrint) return;

    const printSection = document.getElementById('print-section');
    if (!printSection) return;

    printSection.innerHTML = '';
    const frame = document.createElement('div');
    frame.innerHTML = generatePrintHTML(invToPrint as Invoice, layout);
    printSection.appendChild(frame);

    setTimeout(() => {
      window.print();
      printSection.innerHTML = '';
    }, 600);
  };

  // ... rest of component logic (return statement) remains the same structure, just utilizing the new functions ...
  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 lg:gap-6 relative">
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
                          className={`w-full px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 ${sortConfig.key === key ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10' : 'text-slate-500 dark:text-slate-400'}`}
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

          <div className="grid grid-cols-2 gap-3">
             <button 
               disabled={cart.length === 0}
               onClick={() => handlePrintInstant('advice')}
               className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-200 dark:border-slate-700 hover:bg-white transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
             >
               <FileSpreadsheet size={18} />
               Print Advice
             </button>
             <button 
               disabled={cart.length === 0}
               onClick={() => setPaymentModal(true)}
               className="py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2"
             >
               Checkout
               <ArrowRight size={20} />
             </button>
          </div>
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
          <div className="bg-white dark:bg-slate-900 rounded-[64px] w-full max-w-md p-10 shadow-2xl text-center border-8 border-slate-50 dark:border-slate-800">
            <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <CheckCircle2 size={56} strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-black mb-2 uppercase tracking-tighter dark:text-white">{t.saleSuccess}</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-8 font-bold uppercase tracking-widest text-[10px]">{t.invoiceSuccess}</p>
            
            <div className="grid grid-cols-2 gap-3 mb-8">
               <button onClick={() => handlePrintInstant('advice')} className="flex items-center justify-center gap-2 p-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-2xl transition-all group">
                  <FileText size={18} className="text-indigo-600 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">A4 Advice</span>
               </button>
               <button onClick={() => handlePrintInstant('thermal')} className="flex items-center justify-center gap-2 p-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-2xl transition-all group">
                  <Smartphone size={18} className="text-indigo-600 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Thermal</span>
               </button>
            </div>

            <button 
              onClick={() => { setSuccessModal(false); setLastInvoice(null); }}
              className="w-full py-5 bg-slate-950 dark:bg-indigo-600 text-white rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-2xl"
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
