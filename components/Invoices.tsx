
import React, { useState, useMemo, useEffect } from 'react';
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
  StickyNote,
  ChevronRight,
  Download,
  Smartphone,
  Maximize2,
  FileSpreadsheet
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
  const [printLayout, setPrintLayout] = useState<'a4' | 'thermal' | 'advice'>('advice');
  
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
      return inv.id.toString().includes(searchTerm) || 
             customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             customer?.phone.includes(searchTerm);
    }).sort((a, b) => Number(b.id) - Number(a.id));
  }, [state.invoices, searchTerm, state.customers]);

  const subtotal = builderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalCost = builderItems.reduce((acc, item) => acc + ((item.buyPrice || 0) * item.quantity), 0);
  const tax = (subtotal * state.settings.taxRate) / 100;
  const total = subtotal + tax - builderDiscount;
  const invoiceProfit = total - tax - totalCost;

  const finalPaid = builderPaidAmount === '' ? total : builderPaidAmount;
  const balanceDue = Math.max(0, total - finalPaid);

  const saveInvoice = () => {
    if (builderItems.length === 0) return;
    
    // Sequential ID generation
    const maxId = state.invoices.reduce((max, inv) => {
      const idNum = parseInt(inv.id);
      return !isNaN(idNum) ? Math.max(max, idNum) : max;
    }, 0);
    const nextId = (maxId + 1).toString();
    
    const status: Invoice['status'] = finalPaid >= total ? 'paid' : (finalPaid > 0 ? 'partial' : 'unpaid');
    
    const invoiceDateObj = new Date(builderDate);
    const now = new Date();
    if (invoiceDateObj.toDateString() === now.toDateString()) {
       invoiceDateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    } else {
       invoiceDateObj.setHours(12, 0, 0);
    }

    const newInvoice: Invoice = {
      id: nextId,
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

    const updatedProducts = state.products.map(p => {
      const cartItem = builderItems.find(item => item.id === p.id);
      return cartItem ? { ...p, stock: Math.max(0, p.stock - cartItem.quantity) } : p;
    });
    updateState('products', updatedProducts);

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

      if (balanceDue > 0) {
        const loanTrans: LoanTransaction = {
          id: Math.random().toString(36).substr(2, 9),
          customerId: builderCustomer.id,
          invoiceId: nextId,
          date: new Date().toISOString(),
          amount: balanceDue,
          type: 'debt',
          note: `Loan from invoice #${nextId}`
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

  const generatePrintHTML = (inv: Invoice, layout: 'a4' | 'thermal' | 'advice') => {
    const customer = state.customers.find(c => c.id === inv.customerId);
    const dateStr = new Date(inv.date).toLocaleDateString();
    const timeStr = new Date(inv.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const currency = state.settings.currency;

    const itemsHTML = inv.items.map((item, idx) => `
      <tr style="border-bottom: 1px solid #000;">
        <td style="padding: 10px 8px; text-align: center; border-right: 1px solid #000; font-size: 12px;">${idx + 1}</td>
        <td style="padding: 10px 8px; border-right: 1px solid #000;">
          <div style="font-weight: 800; font-size: 13px;">${item.name}</div>
          <div style="font-size: 9px; text-transform: uppercase;">SKU: ${item.sku}</div>
        </td>
        <td style="padding: 10px 8px; text-align: center; font-weight: 700; border-right: 1px solid #000; font-size: 12px;">${item.quantity}</td>
        <td style="padding: 10px 8px; text-align: right; font-weight: 700; border-right: 1px solid #000; font-size: 12px;">${currency}${item.price.toLocaleString()}</td>
        <td style="padding: 10px 8px; text-align: right; font-weight: 900; font-size: 13px;">${currency}${(item.price * item.quantity).toLocaleString()}</td>
      </tr>
    `).join('');

    if (layout === 'advice') {
      return `
        <div style="width: 210mm; min-height: 297mm; padding: 15mm; font-family: 'Inter', Arial, sans-serif; color: #000; background: #fff; box-sizing: border-box; border: 1px solid #eee;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 25px; border-bottom: 5px solid #000; padding-bottom: 15px;">
            <div style="display: flex; gap: 15px; align-items: center;">
              <div style="width: 60px; height: 60px; background: #000; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900; font-size: 30px;">S</div>
              <div>
                <h1 style="margin: 0; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.01em;">${state.settings.shopName}</h1>
                <p style="margin: 3px 0; font-size: 11px; font-weight: 600; color: #333;">${state.settings.shopAddress || ''}</p>
                <p style="margin: 0; font-size: 11px; font-weight: 600; color: #333;">Tel: ${state.settings.shopPhone || ''}</p>
              </div>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Invoice Advice</h2>
              <div style="margin-top: 8px;">
                <p style="margin: 0; font-size: 14px; font-weight: 800;">SERIAL: #${inv.id.padStart(5, '0')}</p>
                <p style="margin: 2px 0 0 0; font-size: 12px; font-weight: 700; color: #444;">DATE: ${dateStr} ${timeStr}</p>
              </div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
            <div style="padding: 15px; border: 2px solid #000; border-radius: 12px;">
              <h4 style="margin: 0 0 8px 0; font-size: 10px; font-weight: 900; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 4px;">Customer Details</h4>
              <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: 800;">${customer?.name || 'Walk-in Customer'}</p>
              <p style="margin: 4px 0; font-size: 12px; font-weight: 600;">${customer?.phone || ''}</p>
              <p style="margin: 0; font-size: 11px; font-weight: 500; color: #333;">${customer?.address || 'No address specified'}</p>
            </div>
            <div style="padding: 15px; border: 2px solid #000; border-radius: 12px;">
              <h4 style="margin: 0 0 8px 0; font-size: 10px; font-weight: 900; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 4px;">Settlement Summary</h4>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span style="font-size: 12px; font-weight: 700;">Method:</span><span style="font-size: 12px; font-weight: 800; text-transform: uppercase;">${inv.paymentMethod}</span></div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span style="font-size: 12px; font-weight: 700;">Status:</span><span style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: ${inv.status === 'paid' ? '#10b981' : '#ef4444'};">${inv.status}</span></div>
              <div style="display: flex; justify-content: space-between;"><span style="font-size: 12px; font-weight: 700;">Ref:</span><span style="font-size: 12px; font-weight: 800;">TXN-${inv.id}-${Math.floor(Date.now()/1000).toString().slice(-4)}</span></div>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; border: 2px solid #000;">
            <thead style="background: #f1f1f1;">
              <tr style="border-bottom: 2px solid #000;">
                <th style="padding: 10px 8px; text-align: center; font-size: 11px; font-weight: 900; border-right: 1px solid #000; width: 40px;">NO</th>
                <th style="padding: 10px 8px; text-align: left; font-size: 11px; font-weight: 900; border-right: 1px solid #000;">PRODUCT DESCRIPTION</th>
                <th style="padding: 10px 8px; text-align: center; font-size: 11px; font-weight: 900; border-right: 1px solid #000; width: 60px;">QTY</th>
                <th style="padding: 10px 8px; text-align: right; font-size: 11px; font-weight: 900; border-right: 1px solid #000; width: 100px;">UNIT PRICE</th>
                <th style="padding: 10px 8px; text-align: right; font-size: 11px; font-weight: 900; width: 130px;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>

          <div style="display: flex; justify-content: space-between; align-items: end; gap: 40px;">
            <div style="flex: 1;">
              <div style="padding: 15px; border: 2px dashed #000; border-radius: 12px; min-height: 80px;">
                <h4 style="margin: 0 0 5px 0; font-size: 10px; font-weight: 900; text-transform: uppercase;">Official Remarks</h4>
                <p style="margin: 0; font-size: 11px; font-weight: 500; line-height: 1.5;">${inv.notes || 'Please verify the goods before leaving the store. All items listed are non-refundable except for manufacturing defects. Thank you for choosing our business.'}</p>
              </div>
            </div>
            <div style="width: 280px; border: 2px solid #000; border-radius: 12px; padding: 15px; background: #fafafa;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; font-weight: 700;">
                <span style="color: #444;">GROSS SUBTOTAL</span>
                <span>${currency}${inv.subtotal.toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; font-weight: 700;">
                <span style="color: #444;">LESS DISCOUNT</span>
                <span style="color: #ef4444;">-${currency}${inv.discount.toLocaleString()}</span>
              </div>
              <div style="border-top: 2px solid #000; margin-top: 10px; padding-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 14px; font-weight: 900; color: #000;">NET PAYABLE</span>
                <span style="font-size: 24px; font-weight: 900;">${currency}${inv.total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div style="margin-top: 70px; display: flex; justify-content: space-between; padding: 0 20px;">
             <div style="text-align: center; border-top: 1.5px solid #000; width: 180px; padding-top: 8px;">
                <p style="margin: 0; font-size: 11px; font-weight: 800; text-transform: uppercase;">Customer Signature</p>
             </div>
             <div style="text-align: center; border-top: 1.5px solid #000; width: 180px; padding-top: 8px;">
                <p style="margin: 0; font-size: 11px; font-weight: 800; text-transform: uppercase;">Auth Seal / Sign</p>
             </div>
          </div>

          <div style="margin-top: 50px; text-align: center;">
             <p style="margin: 0; font-size: 10px; font-weight: 800; color: #666; text-transform: uppercase; letter-spacing: 2px;">Thank you for your visit!</p>
             <p style="margin: 5px 0 0 0; font-size: 8px; font-weight: 700; color: #999;">Powered by Sarvari Seller Pro - Digital POS Solution</p>
          </div>
        </div>
      `;
    }

    if (layout === 'thermal') {
      return `
        <div style="width: 80mm; padding: 10mm 4mm; font-family: 'Courier New', Courier, monospace; color: #000; background: #fff; margin: 0 auto; line-height: 1.4;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0; font-size: 18px; font-weight: 900; text-transform: uppercase;">${state.settings.shopName}</h2>
            <p style="margin: 4px 0; font-size: 10px;">${state.settings.shopAddress || ''}</p>
            <p style="margin: 2px 0; font-size: 10px;">TEL: ${state.settings.shopPhone || ''}</p>
          </div>
          
          <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 8px 0; margin-bottom: 16px; font-size: 11px;">
            <div style="display: flex; justify-content: space-between;"><span>INV:</span> <span>#${inv.id}</span></div>
            <div style="display: flex; justify-content: space-between;"><span>DATE:</span> <span>${dateStr} ${timeStr}</span></div>
            <div style="display: flex; justify-content: space-between;"><span>CUST:</span> <span>${customer?.name || 'WALK-IN'}</span></div>
          </div>

          <div style="margin-bottom: 16px;">
            ${inv.items.map(item => `
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px;">
                <span style="flex: 1; padding-right: 8px;">${item.quantity}x ${item.name}</span>
                <span>${currency}${(item.price * item.quantity).toLocaleString()}</span>
              </div>
            `).join('')}
          </div>

          <div style="border-top: 1px dashed #000; padding-top: 8px; font-size: 12px; font-weight: bold;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>SUBTOTAL</span> <span>${currency}${inv.subtotal.toLocaleString()}</span></div>
            <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 900; margin-top: 8px; border-top: 1px solid #000; padding-top: 8px;">
              <span>TOTAL</span> <span>${currency}${inv.total.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 10px;"><span>PAID (${inv.paymentMethod.toUpperCase()})</span> <span>${currency}${inv.paidAmount.toLocaleString()}</span></div>
            <div style="display: flex; justify-content: space-between; margin-top: 2px; font-size: 10px;"><span>BALANCE</span> <span>${currency}${(inv.total - inv.paidAmount).toLocaleString()}</span></div>
          </div>

          <div style="text-align: center; margin-top: 25px; font-size: 9px; border-top: 1px dashed #000; padding-top: 8px;">
            <p style="margin: 0; font-weight: bold;">THANK YOU FOR YOUR PURCHASE!</p>
          </div>
        </div>
      `;
    }

    // A4 Generic Layout
    return `
      <div style="width: 210mm; min-height: 297mm; padding: 25mm; font-family: 'Inter', sans-serif; color: #000; background: #fff; box-sizing: border-box;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 40px;">
          <div>
            <h1 style="margin: 0; font-size: 30px; font-weight: 900; color: #000;">${state.settings.shopName}</h1>
            <p style="margin: 8px 0; color: #555; font-weight: 600; font-size: 14px;">${state.settings.shopAddress || ''}</p>
          </div>
          <div style="text-align: right;">
            <h2 style="margin: 0; font-size: 44px; font-weight: 900; color: #f3f4f6; line-height: 1;">INVOICE</h2>
            <div style="margin-top: 15px;">
               <p style="margin: 0; font-size: 16px; font-weight: 800; color: #000;">NO: #${inv.id}</p>
               <p style="margin: 4px 0; font-size: 14px; font-weight: 700; color: #666;">DATE: ${dateStr}</p>
            </div>
          </div>
        </div>
        <div style="margin-bottom: 30px; padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px;">
           <h4 style="margin: 0 0 6px 0; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #9ca3af;">Customer Information</h4>
           <p style="margin: 0; font-size: 18px; font-weight: 900;">${customer?.name || 'Walk-in Customer'}</p>
           <p style="margin: 4px 0 0 0; font-size: 13px; font-weight: 600; color: #4b5563;">${customer?.phone || ''}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background: #111827; color: #fff;">
              <th style="padding: 14px 10px; text-align: left; font-size: 11px; text-transform: uppercase; font-weight: 800; border-radius: 8px 0 0 8px;">Items</th>
              <th style="padding: 14px 10px; text-align: center; font-size: 11px; text-transform: uppercase; font-weight: 800; width: 80px;">Qty</th>
              <th style="padding: 14px 10px; text-align: right; font-size: 11px; text-transform: uppercase; font-weight: 800; width: 140px; border-radius: 0 8px 8px 0;">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${inv.items.map(item => `
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 14px 10px; font-weight: 800; font-size: 14px;">${item.name}</td>
                <td style="padding: 14px 10px; text-align: center; font-weight: 700; color: #374151;">${item.quantity}</td>
                <td style="padding: 14px 10px; text-align: right; font-weight: 900; font-size: 14px;">${currency}${(item.price * item.quantity).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="display: flex; justify-content: flex-end;">
          <div style="width: 250px; padding: 20px; border: 2px solid #000; border-radius: 12px; background: #fff;">
            <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 900; color: #000;">
              <span>TOTAL DUE</span>
              <span>${currency}${inv.total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const handlePrint = (inv: Invoice, layout: 'a4' | 'thermal' | 'advice') => {
    const printSection = document.getElementById('print-section');
    if (!printSection) return;

    // Reset and mount new content
    printSection.innerHTML = '';
    const frame = document.createElement('div');
    frame.style.backgroundColor = '#ffffff';
    frame.style.minHeight = '100vh';
    frame.style.width = '100%';
    frame.style.display = 'block';
    frame.innerHTML = generatePrintHTML(inv, layout);
    printSection.appendChild(frame);

    // Apply special print flag to body to trigger CSS visibility
    document.body.classList.add('printing-special');
    
    // Increased delay to ensure rendering of heavy advice layouts and styles
    setTimeout(() => {
      window.print();
      document.body.classList.remove('printing-special');
      printSection.innerHTML = '';
    }, 800);
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
          Create Invoice
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
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Serial</th>
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
                    <td className="px-8 py-5 font-black text-sm dark:text-white">#{inv.id.padStart(4, '0')}</td>
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
                        <button onClick={() => setSelectedInvoice(inv)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="Print/View"><Printer size={18}/></button>
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
                          <span>Subtotal</span>
                          <span className="text-slate-600 dark:text-slate-300">{state.settings.currency}{subtotal.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between items-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
                          <span>Tax (${state.settings.taxRate}%)</span>
                          <span className="text-slate-600 dark:text-slate-300">{state.settings.currency}{tax.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between items-center pt-6 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Payable Amount</span>
                          <span className="text-4xl font-black dark:text-white tracking-tighter">{state.settings.currency}{total.toLocaleString()}</span>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Amount Paid</label>
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
                                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Loan Recognition</p>
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
                      className="w-full py-6 bg-indigo-600 text-white rounded-[32px] font-black text-xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:shadow-none active:scale-[0.98] flex items-center justify-center gap-4"
                    >
                      Process & Print
                      <CheckCircle2 size={28} strokeWidth={3}/>
                    </button>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-10 bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[48px] w-full max-w-6xl h-full lg:max-h-[90vh] shadow-2xl relative animate-in zoom-in duration-300 overflow-hidden flex flex-col lg:flex-row">
            
            {/* Sidebar View Control */}
            <div className="w-full lg:w-[320px] bg-slate-50 dark:bg-slate-950/20 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800 flex flex-col shrink-0">
               <div className="p-8 space-y-10 flex-1 overflow-y-auto custom-scrollbar">
                  <header className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg"><FileText size={20}/></div>
                        <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Receipt View</h3>
                     </div>
                     <button onClick={() => setSelectedInvoice(null)} className="lg:hidden p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-400"><X size={24}/></button>
                  </header>

                  <div className="space-y-6">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Select Print Layout</p>
                     <div className="grid grid-cols-1 gap-3">
                        {[
                          { id: 'advice', label: 'Advice Print', icon: FileSpreadsheet, desc: 'Professional Business Form' },
                          { id: 'a4', label: 'Corporate A4', icon: FileText, desc: 'Standard business layout' },
                          { id: 'thermal', label: 'Thermal POS', icon: Smartphone, desc: '80mm narrow receipt' }
                        ].map(opt => (
                          <button 
                            key={opt.id}
                            onClick={() => setPrintLayout(opt.id as any)}
                            className={`p-5 rounded-[24px] border-4 transition-all text-left flex items-center gap-4 group ${printLayout === opt.id ? 'border-indigo-600 bg-white dark:bg-slate-800 shadow-xl' : 'border-transparent bg-white dark:bg-slate-900/50 grayscale opacity-60'}`}
                          >
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${printLayout === opt.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                               <opt.icon size={20}/>
                             </div>
                             <div>
                                <p className="font-black text-xs uppercase tracking-widest dark:text-white">{opt.label}</p>
                                <p className="text-[10px] font-bold text-slate-400">{opt.desc}</p>
                             </div>
                          </button>
                        ))}
                     </div>
                  </div>

                  <div className="p-6 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 space-y-4">
                     <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <span>Invoice #</span>
                        <span className="text-slate-800 dark:text-white">${selectedInvoice.id}</span>
                     </div>
                     <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <span>Status</span>
                        <span className={`px-2 py-0.5 rounded-md ${selectedInvoice.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{selectedInvoice.status}</span>
                     </div>
                  </div>
               </div>

               <div className="p-8 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <button 
                    onClick={() => handlePrint(selectedInvoice, printLayout)}
                    className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"
                  >
                    <Printer size={18} /> Print Now
                  </button>
                  <button onClick={() => setSelectedInvoice(null)} className="w-full py-4 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-rose-500 transition-colors">Close Viewer</button>
               </div>
            </div>

            {/* Preview Area */}
            <div className="flex-1 bg-slate-200 dark:bg-black/50 p-6 lg:p-10 flex items-center justify-center overflow-hidden group">
               <div className="w-full h-full max-w-[800px] bg-white dark:bg-white rounded-lg shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] transition-transform duration-500 origin-top overflow-y-auto custom-scrollbar p-10 text-slate-900">
                  {/* Dynamic HTML Preview */}
                  <div className="print-preview-container" dangerouslySetInnerHTML={{ __html: generatePrintHTML(selectedInvoice, printLayout) }} />
               </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
