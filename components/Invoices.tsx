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
  FileSpreadsheet,
  Edit,
  Filter,
  RotateCcw,
  ChevronDown,
  ArrowRight
} from 'lucide-react';
import { AppState, Product, Customer, CartItem, Invoice, InvoiceTemplate, LoanTransaction } from '../types';
import { translations } from '../translations';

interface Props {
  state: AppState;
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
}

const Invoices: React.FC<Props> = ({ state, updateState }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [printLayout, setPrintLayout] = useState<'a4' | 'thermal' | 'advice'>('advice');
  
  // Filter States
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'card' | 'transfer'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');

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

  const handleEditInvoice = (inv: Invoice) => {
    setEditingInvoiceId(inv.id);
    setBuilderCustomer(state.customers.find(c => c.id === inv.customerId) || null);
    setBuilderItems([...inv.items]);
    setBuilderPayment(inv.paymentMethod);
    setBuilderDiscount(inv.discount || 0);
    setBuilderPaidAmount(inv.paidAmount);
    setBuilderNotes(inv.notes || '');
    setBuilderDate(new Date(inv.date).toISOString().split('T')[0]);
    setIsCreating(true);
  };

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
      const matchesSearch = inv.id.toString().includes(searchTerm) || 
             customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             customer?.phone.includes(searchTerm);
      
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      const matchesPayment = paymentFilter === 'all' || inv.paymentMethod === paymentFilter;
      const matchesCustomer = !customerFilter || inv.customerId === customerFilter;
      
      const invDate = new Date(inv.date);
      const matchesStart = !startDate || invDate >= new Date(startDate);
      const matchesEnd = !endDate || invDate <= new Date(endDate + 'T23:59:59');

      return matchesSearch && matchesStatus && matchesPayment && matchesCustomer && matchesStart && matchesEnd;
    }).sort((a, b) => Number(b.id) - Number(a.id));
  }, [state.invoices, searchTerm, state.customers, statusFilter, paymentFilter, customerFilter, startDate, endDate]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPaymentFilter('all');
    setCustomerFilter('');
    setStartDate('');
    setEndDate('');
  };

  const subtotal = builderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalCost = builderItems.reduce((acc, item) => acc + ((item.buyPrice || 0) * item.quantity), 0);
  const tax = (subtotal * state.settings.taxRate) / 100;
  const total = subtotal + tax - builderDiscount;
  const invoiceProfit = total - tax - totalCost;

  const finalPaid = builderPaidAmount === '' ? total : builderPaidAmount;
  const balanceDue = Math.max(0, total - finalPaid);

  const saveInvoice = () => {
    if (builderItems.length === 0) return;
    
    let nextId: string;
    let oldInvoice: Invoice | null = null;

    if (editingInvoiceId) {
      nextId = editingInvoiceId;
      oldInvoice = state.invoices.find(i => i.id === editingInvoiceId) || null;
    } else {
      const maxId = state.invoices.reduce((max, inv) => {
        const idNum = parseInt(inv.id);
        return !isNaN(idNum) ? Math.max(max, idNum) : max;
      }, 0);
      nextId = (maxId + 1).toString();
    }
    
    const status: Invoice['status'] = finalPaid >= total ? 'paid' : (finalPaid > 0 ? 'partial' : 'unpaid');
    const invoiceDateObj = new Date(builderDate);
    const now = new Date();
    if (!editingInvoiceId && invoiceDateObj.toDateString() === now.toDateString()) {
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

    // INVENTORY RECONCILIATION
    let updatedProducts = [...state.products];
    if (oldInvoice) {
      oldInvoice.items.forEach(oldItem => {
        updatedProducts = updatedProducts.map(p => 
          p.id === oldItem.id ? { ...p, stock: p.stock + oldItem.quantity } : p
        );
      });
    }
    builderItems.forEach(newItem => {
      updatedProducts = updatedProducts.map(p => 
        p.id === newItem.id ? { ...p, stock: Math.max(0, p.stock - newItem.quantity) } : p
      );
    });
    updateState('products', updatedProducts);

    if (editingInvoiceId) {
      updateState('invoices', state.invoices.map(i => i.id === editingInvoiceId ? newInvoice : i));
    } else {
      updateState('invoices', [...state.invoices, newInvoice]);
    }

    // CUSTOMER BALANCE UPDATE
    if (builderCustomer) {
      const debtDiff = balanceDue - (oldInvoice ? (oldInvoice.total - oldInvoice.paidAmount) : 0);
      const spentDiff = total - (oldInvoice ? oldInvoice.total : 0);

      const updatedCustomers = state.customers.map(c => {
        if (c.id === builderCustomer.id) {
          return {
            ...c,
            totalSpent: c.totalSpent + spentDiff,
            totalDebt: Math.max(0, (c.totalDebt || 0) + debtDiff),
            lastVisit: new Date().toISOString().split('T')[0],
            transactionCount: editingInvoiceId ? c.transactionCount : (c.transactionCount || 0) + 1
          };
        }
        return c;
      });
      updateState('customers', updatedCustomers);

      if (debtDiff !== 0) {
        const loanTrans: LoanTransaction = {
          id: Math.random().toString(36).substr(2, 9),
          customerId: builderCustomer.id,
          invoiceId: nextId,
          date: new Date().toISOString(),
          amount: Math.abs(debtDiff),
          type: debtDiff > 0 ? 'debt' : 'repayment',
          note: editingInvoiceId ? `Balance adjusted via invoice edit #${nextId}` : `Sale record #${nextId}`
        };
        updateState('loanTransactions', [...state.loanTransactions, loanTrans]);
      }
    }

    setIsCreating(false);
    setEditingInvoiceId(null);
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
      const invToDelete = state.invoices.find(i => i.id === id);
      if (invToDelete) {
        const updatedProducts = state.products.map(p => {
          const itemInInv = invToDelete.items.find(it => it.id === p.id);
          return itemInInv ? { ...p, stock: p.stock + itemInInv.quantity } : p;
        });
        updateState('products', updatedProducts);
        if (invToDelete.customerId) {
          const updatedCustomers = state.customers.map(c => {
            if (c.id === invToDelete.customerId) {
              const unpaid = invToDelete.total - invToDelete.paidAmount;
              return {
                ...c,
                totalSpent: Math.max(0, c.totalSpent - invToDelete.total),
                totalDebt: Math.max(0, (c.totalDebt || 0) - unpaid),
                transactionCount: Math.max(0, (c.transactionCount || 0) - 1)
              };
            }
            return c;
          });
          updateState('customers', updatedCustomers);
        }
      }
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
        <div style="width: 210mm; min-height: 297mm; padding: 20mm; font-family: 'Inter', Arial, sans-serif; color: #000; background: #fff; box-sizing: border-box; border: 1px solid #eee;">
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
              <h2 style="margin: 0; font-size: 42px; font-weight: 950; text-transform: uppercase; letter-spacing: 4px; color: #000;">ADVICE NOTE</h2>
              <div style="margin-top: 15px;">
                <p style="margin: 0; font-size: 20px; font-weight: 900; background: #000; color: #fff; display: inline-block; padding: 6px 16px; border-radius: 10px;">SERIAL: #${inv.id.padStart(6, '0')}</p>
                <p style="margin: 8px 0 0 0; font-size: 14px; font-weight: 800; color: #555;">DATE: ${dateStr} ${timeStr}</p>
              </div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px;">
            <div style="padding: 25px; border: 3px solid #000; border-radius: 20px; background: #fdfdfd;">
              <h4 style="margin: 0 0 12px 0; font-size: 11px; text-transform: uppercase; font-weight: 950; border-bottom: 2px solid #000; padding-bottom: 8px; letter-spacing: 2px; color: #444;">Billed / Shipped To</h4>
              <p style="margin: 15px 0 0 0; font-size: 24px; font-weight: 950; color: #000;">${customer?.name || 'Walk-in Guest'}</p>
              <p style="margin: 8px 0; font-size: 16px; font-weight: 800; color: #333;">Phone: ${customer?.phone || 'No phone recorded'}</p>
              <p style="margin: 0; font-size: 13px; font-weight: 700; color: #666;">Address: ${customer?.address || 'N/A'}</p>
            </div>
            <div style="padding: 25px; border: 3px solid #000; border-radius: 20px; background: #fdfdfd;">
              <h4 style="margin: 0 0 12px 0; font-size: 11px; text-transform: uppercase; font-weight: 950; border-bottom: 2px solid #000; padding-bottom: 8px; letter-spacing: 2px; color: #444;">Document Settlement</h4>
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px;"><span style="font-size: 15px; font-weight: 800;">Method:</span><span style="font-size: 15px; font-weight: 950; text-transform: uppercase;">${inv.paymentMethod}</span></div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px;"><span style="font-size: 15px; font-weight: 800;">Status:</span><span style="font-size: 15px; font-weight: 950; text-transform: uppercase; color: ${inv.status === 'paid' ? '#059669' : '#dc2626'};">${inv.status}</span></div>
              <div style="display: flex; justify-content: space-between;"><span style="font-size: 15px; font-weight: 800;">Internal ID:</span><span style="font-size: 15px; font-weight: 950;">REF-${Date.now().toString().slice(-8)}</span></div>
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
               <h4 style="margin: 0 0 12px 0; font-size: 11px; text-transform: uppercase; font-weight: 950; color: #555; letter-spacing: 1px;">Merchant Remarks</h4>
               <p style="margin: 0; font-size: 14px; font-weight: 700; line-height: 1.6; color: #222;">${inv.notes || 'This advice confirms the release of goods listed above. Please inspect for defects before signature. Signed documents are final records of acceptance. We value your business.'}</p>
            </div>
            <div style="width: 350px; border: 4px solid #000; border-radius: 20px; padding: 30px; background: #fff;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 16px; font-weight: 800;">
                <span style="color: #666;">GROSS SUBTOTAL</span>
                <span>${currency}${inv.subtotal.toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 16px; font-weight: 800;">
                <span style="color: #666;">TAX & FEES</span>
                <span>${currency}${inv.tax.toLocaleString()}</span>
              </div>
              <div style="border-top: 4px solid #000; margin-top: 20px; padding-top: 20px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 20px; font-weight: 950; color: #000; text-transform: uppercase;">Total Due</span>
                <span style="font-size: 42px; font-weight: 950;">${currency}${inv.total.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div style="margin-top: 140px; display: flex; justify-content: space-between; padding: 0 50px;">
             <div style="text-align: center; border-top: 3px solid #000; width: 250px; padding-top: 18px; font-size: 15px; font-weight: 950; text-transform: uppercase; letter-spacing: 2px;">Customer Signature</div>
             <div style="text-align: center; border-top: 3px solid #000; width: 250px; padding-top: 18px; font-size: 15px; font-weight: 950; text-transform: uppercase; letter-spacing: 2px;">Authorized Stamp</div>
          </div>
        </div>
      `;
    }

    if (layout === 'thermal') {
      return `
        <div style="width: 80mm; padding: 8mm 2mm; font-family: 'Courier New', Courier, monospace; color: #000; line-height: 1.2; text-align: center;">
          <h2 style="margin: 0; font-size: 22px; font-weight: 950; text-transform: uppercase;">${state.settings.shopName}</h2>
          <p style="margin: 6px 0; font-size: 11px;">${state.settings.shopAddress || ''}</p>
          <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin: 15px 0; font-size: 11px; text-align: left;">
            <div>INV: #${inv.id} | ${dateStr}</div>
            <div>USER: ${customer?.name || 'WALK-IN'}</div>
          </div>
          <div style="text-align: left; margin-bottom: 15px;">
            ${inv.items.map(i => `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>${i.quantity}x ${i.name}</span><span>${currency}${(i.price * i.quantity).toLocaleString()}</span></div>`).join('')}
          </div>
          <div style="border-top: 2px solid #000; padding-top: 10px; font-weight: 950; font-size: 18px; display: flex; justify-content: space-between; text-align: left;">
            <span>TOTAL</span>
            <span>${currency}${inv.total.toLocaleString()}</span>
          </div>
          <p style="margin-top: 30px; font-size: 11px; border-top: 1px dashed #000; padding-top: 10px;">THANK YOU FOR YOUR VISIT</p>
        </div>
      `;
    }

    return `
      <div style="width: 210mm; min-height: 297mm; padding: 25mm; font-family: 'Inter', sans-serif; background: #fff;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 50px;">
          <h1 style="margin: 0; font-size: 34px; font-weight: 950; color: #4f46e5;">${state.settings.shopName}</h1>
          <div style="text-align: right;">
            <h2 style="margin: 0; font-size: 52px; font-weight: 950; color: #f1f5f9; line-height: 0.9;">INVOICE</h2>
            <p style="margin: 15px 0 0 0; font-size: 20px; font-weight: 900;">ID: #${inv.id.padStart(6, '0')}</p>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 50px;">
          <thead style="background: #0f172a; color: #fff;">
            <tr>
              <th style="padding: 15px; text-align: left;">Description</th>
              <th style="padding: 15px; text-align: center;">Qty</th>
              <th style="padding: 15px; text-align: right;">Line Total</th>
            </tr>
          </thead>
          <tbody>
            ${inv.items.map(item => `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 15px; font-weight: 900;">${item.name}</td><td style="padding: 15px; text-align: center;">${item.quantity}</td><td style="padding: 15px; text-align: right; font-weight: 900;">${currency}${(item.price * item.quantity).toLocaleString()}</td></tr>`).join('')}
          </tbody>
        </table>
        <div style="display: flex; justify-content: flex-end;">
          <div style="width: 280px; padding: 25px; border: 4px solid #000; border-radius: 20px; background: #fff;">
            <div style="display: flex; justify-content: space-between; font-size: 24px; font-weight: 950; color: #000;">
              <span>TOTAL</span>
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
    printSection.innerHTML = '';
    const frame = document.createElement('div');
    frame.innerHTML = generatePrintHTML(inv, layout);
    printSection.appendChild(frame);
    setTimeout(() => {
      window.print();
      printSection.innerHTML = '';
    }, 600);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">{t.invoices}</h3>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest">Global business billing archives</p>
        </div>
        <button 
          onClick={() => { setEditingInvoiceId(null); resetBuilder(); setIsCreating(true); }}
          className="flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Plus size={18} strokeWidth={3} />
          Create Invoice
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={t.search} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm dark:text-white transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border ${
              showFilters 
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' 
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Filter size={18} />
            {showFilters ? <ChevronDown size={14} className="rotate-180 transition-transform" /> : <ChevronDown size={14} className="transition-transform" />}
          </button>
        </div>

        {showFilters && (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-xl animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-8">
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                 <Filter size={14} className="text-indigo-600" />
                 Advanced Audit Filters
               </h4>
               <button onClick={clearFilters} className="flex items-center gap-2 text-[10px] font-black uppercase text-rose-500 hover:opacity-70 transition-opacity">
                  <RotateCcw size={12}/> Clear All
               </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Status</label>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold dark:text-white focus:border-indigo-500 outline-none appearance-none"
                  >
                     <option value="all">All Statuses</option>
                     <option value="paid">Paid Full</option>
                     <option value="partial">Partial Payment</option>
                     <option value="unpaid">Unpaid / Credit</option>
                  </select>
               </div>

               <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Method</label>
                  <select 
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold dark:text-white focus:border-indigo-500 outline-none appearance-none"
                  >
                     <option value="all">All Methods</option>
                     <option value="cash">Cash Settlement</option>
                     <option value="card">Card / POS</option>
                     <option value="transfer">Bank Transfer</option>
                  </select>
               </div>

               <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Customer Filter</label>
                  <select 
                    value={customerFilter}
                    onChange={(e) => setCustomerFilter(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold dark:text-white focus:border-indigo-500 outline-none appearance-none"
                  >
                     <option value="">All Customers</option>
                     {state.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
               </div>

               <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date Range</label>
                  <div className="flex items-center gap-2">
                     <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-2 py-3 text-[10px] font-black dark:text-white outline-none"/>
                     <span className="text-slate-300">-</span>
                     <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-2 py-3 text-[10px] font-black dark:text-white outline-none"/>
                  </div>
               </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
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
                          <button onClick={() => handleEditInvoice(inv)} className="p-2 text-slate-400 hover:text-amber-600 transition-colors" title="Edit"><Edit size={18}/></button>
                          <button onClick={() => deleteInvoice(inv.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100" title="Delete"><Trash2 size={18}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredInvoices.length === 0 && (
            <div className="py-24 text-center">
               <FileText className="w-16 h-16 text-slate-200 mx-auto mb-4" />
               <p className="font-black text-sm text-slate-400 uppercase tracking-widest">No invoices match these criteria</p>
               <button onClick={clearFilters} className="mt-4 text-indigo-600 text-xs font-black uppercase tracking-widest hover:underline">Reset Search</button>
            </div>
          )}
        </div>
      </div>

      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-5xl h-[90vh] shadow-2xl relative flex flex-col overflow-hidden animate-in zoom-in duration-300">
            <header className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900 z-10">
               <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${editingInvoiceId ? 'bg-amber-500' : 'bg-indigo-600'} text-white rounded-2xl flex items-center justify-center shadow-lg`}>
                    {editingInvoiceId ? <Edit size={24}/> : <PenTool size={24}/>}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter">
                      {editingInvoiceId ? `Revision: Invoice #${editingInvoiceId}` : 'New Invoice Builder'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      {editingInvoiceId ? 'Reconciling inventory and balances' : 'Numeric Sequential Logging'}
                    </p>
                  </div>
               </div>
               <button onClick={() => { setIsCreating(false); setEditingInvoiceId(null); }} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-400"><X size={24}/></button>
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
                          <div key={item.id} className="p-5 bg-white dark:bg-slate-800/50 rounded-3xl flex items-center justify-between border border-slate-100 dark:border-slate-800 shadow-sm">
                             <div className="flex items-center gap-5 flex-1 min-w-0">
                                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 shrink-0 border border-slate-100 dark:border-slate-800">{item.image ? <img src={item.image} className="w-full h-full object-cover rounded-2xl"/> : <Package size={24}/>}</div>
                                <div className="min-w-0 flex-1">
                                   <p className="text-sm font-black dark:text-white truncate uppercase tracking-tight">{item.name}</p>
                                   <p className="text-[10px] font-black text-indigo-500">{state.settings.currency}{item.price.toFixed(2)} unit</p>
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
                                <button onClick={() => removeBuilderItem(item.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-all rounded-xl"><Trash2 size={20}/></button>
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>
               </div>

               <div className="w-full lg:w-[420px] bg-slate-50/50 dark:bg-slate-950/20 p-8 lg:p-10 space-y-10 flex flex-col shrink-0">
                  <div className="space-y-8 flex-1">
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Customer Selection</label>
                       {builderCustomer ? (
                         <div className="p-5 bg-white dark:bg-slate-900 rounded-[28px] flex items-center justify-between border-4 border-indigo-600 shadow-2xl animate-in zoom-in-95">
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 bg-indigo-600 text-white rounded-[18px] flex items-center justify-center font-black text-xl shadow-lg">{builderCustomer.name.charAt(0)}</div>
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
                              placeholder="Find customer..."
                            />
                            {availableCustomers.length > 0 && (
                              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 py-2 z-20 overflow-hidden">
                                {availableCustomers.map(c => (
                                  <button key={c.id} onClick={() => { setBuilderCustomer(c); setCustomerSearch(''); }} className="w-full p-4 text-left hover:bg-indigo-50 dark:hover:bg-indigo-500/10 flex items-center gap-4 group">
                                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center font-black text-xs text-slate-400 transition-all">{c.name.charAt(0)}</div>
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

                    <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 space-y-6 shadow-sm border border-slate-100 dark:border-slate-800/50">
                       <div className="flex justify-between items-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
                          <span>Subtotal</span>
                          <span className="text-slate-600 dark:text-slate-300">{state.settings.currency}{subtotal.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between items-center pt-6 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Net Value</span>
                          <span className="text-4xl font-black dark:text-white tracking-tighter">{state.settings.currency}{total.toLocaleString()}</span>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Settlement (Paid Amount)</label>
                       <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 font-black text-lg">{state.settings.currency}</div>
                          <input 
                            type="number" 
                            value={builderPaidAmount}
                            onChange={(e) => setBuilderPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-white dark:bg-slate-900 border-2 border-transparent focus:border-indigo-600 rounded-2xl py-4 pl-12 pr-4 outline-none font-black text-xl dark:text-white shadow-inner"
                            placeholder={total.toFixed(0)}
                          />
                       </div>
                    </div>
                  </div>

                  <div className="pt-8">
                    <button 
                      onClick={saveInvoice}
                      disabled={builderItems.length === 0}
                      className={`w-full py-6 ${editingInvoiceId ? 'bg-amber-500' : 'bg-indigo-600'} text-white rounded-[32px] font-black text-xl shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-4`}
                    >
                      {editingInvoiceId ? 'Commit Revisions' : 'Process & Archive'}
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
            
            <div className="w-full lg:w-[350px] bg-slate-50 dark:bg-slate-950/20 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800 flex flex-col shrink-0">
               <div className="p-8 space-y-10 flex-1 overflow-y-auto custom-scrollbar">
                  <header className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg"><FileText size={20}/></div>
                        <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Document View</h3>
                     </div>
                     <button onClick={() => setSelectedInvoice(null)} className="lg:hidden p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-400 transition-colors"><X size={24}/></button>
                  </header>

                  <div className="space-y-6">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Format Selection</p>
                     <div className="grid grid-cols-1 gap-3">
                        {[
                          { id: 'advice', label: 'Advice Print', icon: FileSpreadsheet, desc: 'Professional Business Advice Note' },
                          { id: 'a4', label: 'Corporate A4', icon: FileText, desc: 'Standard business layout' },
                          { id: 'thermal', label: 'Thermal POS', icon: Smartphone, desc: '80mm narrow receipt format' }
                        ].map(opt => (
                          <button 
                            key={opt.id}
                            onClick={() => setPrintLayout(opt.id as any)}
                            className={`p-5 rounded-[28px] border-4 transition-all text-left flex items-center gap-4 group ${printLayout === opt.id ? 'border-indigo-600 bg-white dark:bg-slate-800 shadow-xl' : 'border-transparent bg-white dark:bg-slate-900/50 grayscale opacity-60'}`}
                          >
                             <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm ${printLayout === opt.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                               <opt.icon size={22}/>
                             </div>
                             <div className="min-w-0">
                                <p className="font-black text-xs uppercase tracking-widest dark:text-white">{opt.label}</p>
                                <p className="text-[9px] font-bold text-slate-400 truncate">{opt.desc}</p>
                             </div>
                          </button>
                        ))}
                     </div>
                  </div>
               </div>

               <div className="p-8 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900">
                  <button 
                    onClick={() => handlePrint(selectedInvoice, printLayout)}
                    className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                  >
                    <Printer size={18} /> Execute Print
                  </button>
                  <button onClick={() => setSelectedInvoice(null)} className="w-full py-4 text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] hover:text-rose-500 transition-colors">Close View</button>
               </div>
            </div>

            <div className="flex-1 bg-slate-200 dark:bg-slate-950 p-6 lg:p-12 flex items-center justify-center overflow-hidden">
               <div className="w-full h-full max-w-[850px] bg-white rounded-xl shadow-2xl transition-transform duration-500 origin-top overflow-y-auto custom-scrollbar p-10 text-slate-900">
                  <div className="invoice-print-frame" dangerouslySetInnerHTML={{ __html: generatePrintHTML(selectedInvoice, printLayout) }} />
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;