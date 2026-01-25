
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
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { AppState, Product, Customer, CartItem, Invoice, InvoiceTemplate, LoanTransaction, View } from '../types';
import { translations } from '../translations';

interface Props {
  state: AppState;
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
  setCurrentView?: (view: View) => void;
}

const Invoices: React.FC<Props> = ({ state, updateState }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'a4' | 'thermal' | 'advice'>('a4');
  
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
    setViewingInvoice(null);
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
      notes: builderNotes,
      previousDebt: builderCustomer?.totalDebt || 0
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
    const prevDebt = inv.previousDebt || 0;
    const newTotalDebt = prevDebt + (inv.total - inv.paidAmount);

    const itemsHTML = inv.items.map((item, idx) => `
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 6px 4px; text-align: center; border-right: 1px solid #eee; font-size: 11px;">${idx + 1}</td>
        <td style="padding: 6px 8px; border-right: 1px solid #eee;">
          <div style="font-weight: 700; font-size: 12px;">${item.name}</div>
          <div style="font-size: 9px; text-transform: uppercase; color: #555;">${item.sku}</div>
        </td>
        <td style="padding: 6px 4px; text-align: center; font-weight: 600; border-right: 1px solid #eee; font-size: 11px;">${item.quantity}</td>
        <td style="padding: 6px 8px; text-align: right; font-weight: 600; border-right: 1px solid #eee; font-size: 11px;">${currency}${item.price.toLocaleString()}</td>
        <td style="padding: 6px 8px; text-align: right; font-weight: 700; font-size: 11px;">${currency}${(item.price * item.quantity).toLocaleString()}</td>
      </tr>
    `).join('');

    const accountSummaryHTML = customer ? `
      <div style="margin-top: 15px; border: 2px solid #000; padding: 10px; border-radius: 8px;">
         <h5 style="margin: 0 0 8px 0; font-size: 10px; text-transform: uppercase; font-weight: 900;">Account Balance Context</h5>
         <div style="display: flex; justify-content: space-between; font-size: 11px;"><span>Old Balance:</span><span>${currency}${prevDebt.toLocaleString()}</span></div>
         <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 800; border-top: 1px dashed #ccc; margin-top: 4px; padding-top: 4px;"><span>New Total Debt:</span><span>${currency}${newTotalDebt.toLocaleString()}</span></div>
      </div>
    ` : '';

    if (layout === 'advice') {
      return `
        <div style="width: 210mm; padding: 12mm; font-family: 'Inter', Arial, sans-serif; color: #000; background: #fff; box-sizing: border-box;">
          <div style="display: flex; justify-content: space-between; border-bottom: 3px solid #000; padding-bottom: 15px; margin-bottom: 20px;">
            <div style="display: flex; gap: 15px; align-items: center;">
              <div style="width: 50px; height: 50px; background: ${state.settings.brandColor}; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 28px;">${state.settings.shopName.charAt(0)}</div>
              <div>
                <h1 style="margin: 0; font-size: 22px; font-weight: 900; text-transform: uppercase;">${state.settings.shopName}</h1>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: #444;">${state.settings.shopAddress || 'Authorized Dealer'} | ${state.settings.shopPhone || ''}</p>
              </div>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; font-size: 28px; font-weight: 900; text-transform: uppercase; color: #000;">ADVICE NOTE</h2>
              <p style="margin: 5px 0 0 0; font-size: 12px; font-weight: 700;">#${inv.id.padStart(6, '0')} | ${dateStr} ${timeStr}</p>
            </div>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 25px; gap: 20px;">
            <div style="flex: 1; padding: 15px; border: 1px solid #ddd; border-radius: 12px; background: #f9f9f9;">
              <h4 style="margin: 0 0 8px 0; font-size: 9px; text-transform: uppercase; font-weight: 800; color: #666;">Bill To</h4>
              <p style="margin: 0; font-size: 16px; font-weight: 800; color: #000;">${customer?.name || 'Walk-in Guest'}</p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #444;">${customer?.phone || ''} ${customer?.address ? ' | ' + customer.address : ''}</p>
            </div>
            <div style="flex: 1; padding: 15px; border: 1px solid #ddd; border-radius: 12px; background: #f9f9f9;">
              <h4 style="margin: 0 0 8px 0; font-size: 9px; text-transform: uppercase; font-weight: 800; color: #666;">Payment Info</h4>
              <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;"><span style="font-weight: 600;">Method:</span><span style="font-weight: 800; text-transform: uppercase;">${inv.paymentMethod}</span></div>
              <div style="display: flex; justify-content: space-between; font-size: 11px;"><span style="font-weight: 600;">Status:</span><span style="font-weight: 800; text-transform: uppercase;">${inv.status}</span></div>
              <div style="display: flex; justify-content: space-between;"><span style="font-size: 11px; font-weight: 600;">Internal ID:</span><span style="font-size: 11px; font-weight: 950;">REF-${Date.now().toString().slice(-8)}</span></div>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; border: 1px solid #000;">
            <thead style="background: #f0f0f0;">
              <tr style="border-bottom: 2px solid #000;">
                <th style="padding: 10px 8px; border-right: 1px solid #ccc; font-size: 10px; font-weight: 900; text-align: center; width: 40px;">#</th>
                <th style="padding: 10px 8px; text-align: left; border-right: 1px solid #ccc; font-size: 10px; font-weight: 900;">DESCRIPTION</th>
                <th style="padding: 10px 8px; border-right: 1px solid #ccc; font-size: 10px; font-weight: 900; text-align: center; width: 60px;">QTY</th>
                <th style="padding: 10px 8px; text-align: right; border-right: 1px solid #ccc; font-size: 10px; font-weight: 900; width: 100px;">PRICE</th>
                <th style="padding: 10px 8px; text-align: right; font-size: 10px; font-weight: 900; width: 110px;">TOTAL</th>
              </tr>
            </thead>
            <tbody>${itemsHTML}</tbody>
          </table>

          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 40px;">
            <div style="flex: 1;">
               <h4 style="margin: 0 0 5px 0; font-size: 10px; text-transform: uppercase; font-weight: 700; color: #555;">Notes</h4>
               <p style="margin: 0; font-size: 11px; font-style: italic; color: #333; line-height: 1.4;">${inv.notes || 'This advice confirms the release of goods listed above. Please inspect for defects before signature.'}</p>
               ${accountSummaryHTML}
            </div>
            <div style="width: 250px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px; font-weight: 600; color: #555;">
                <span>SUBTOTAL</span>
                <span>${currency}${inv.subtotal.toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px; font-weight: 600; color: #555;">
                <span>TAX</span>
                <span>${currency}${inv.tax.toLocaleString()}</span>
              </div>
              <div style="border-top: 3px solid #000; margin-top: 10px; padding-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 16px; font-weight: 900; color: #000;">TOTAL DUE</span>
                <span style="font-size: 24px; font-weight: 900;">${currency}${inv.total.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div style="margin-top: 40px; display: flex; justify-content: space-between; padding-top: 20px; border-top: 1px dashed #ccc;">
             <div style="text-align: center; width: 150px;">
                <div style="border-bottom: 1px solid #000; height: 30px;"></div>
                <div style="font-size: 10px; font-weight: 700; margin-top: 5px;">SIGNATURE</div>
             </div>
             <div style="text-align: center; width: 150px;">
                <div style="border-bottom: 1px solid #000; height: 30px;"></div>
                <div style="font-size: 10px; font-weight: 700; margin-top: 5px;">STAMP</div>
             </div>
          </div>
        </div>
      `;
    }

    if (layout === 'thermal') {
      return `
        <div style="width: 80mm; padding: 5mm 2mm; font-family: 'Courier New', Courier, monospace; color: #000; line-height: 1.2; text-align: center;">
          <h2 style="margin: 0; font-size: 18px; font-weight: 800; text-transform: uppercase;">${state.settings.shopName}</h2>
          <p style="margin: 4px 0; font-size: 10px;">${state.settings.shopAddress || ''}</p>
          <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 8px 0; margin: 10px 0; font-size: 10px; text-align: left;">
            <div>INV: #${inv.id}</div>
            <div>DATE: ${dateStr} ${timeStr}</div>
            <div>USER: ${customer?.name || 'WALK-IN'}</div>
          </div>
          <div style="text-align: left; margin-bottom: 10px;">
            ${inv.items.map(i => `<div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 10px;"><span>${i.quantity}x ${i.name.substring(0,20)}</span><span>${currency}${(i.price * i.quantity).toLocaleString()}</span></div>`).join('')}
          </div>
          <div style="border-top: 2px solid #000; padding-top: 10px; font-weight: 950; font-size: 18px; display: flex; justify-content: space-between; text-align: left; margin-bottom: 8px;">
            <span>TOTAL</span>
            <span>${currency}${inv.total.toLocaleString()}</span>
          </div>
          ${customer ? `
          <div style="border-top: 1px dashed #000; padding-top: 6px; font-size: 10px; text-align: left;">
             <div style="display: flex; justify-content: space-between;"><span>Account Bal:</span><span>${currency}${newTotalDebt.toLocaleString()}</span></div>
          </div>
          ` : ''}
          <p style="margin-top: 20px; font-size: 10px; border-top: 1px dashed #000; padding-top: 8px;">THANK YOU FOR YOUR VISIT</p>
        </div>
      `;
    }

    return `
        <div style="width: 210mm; padding: 15mm; font-family: 'Inter', sans-serif; background: #fff; box-sizing: border-box;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 950; color: ${state.settings.brandColor};">${state.settings.shopName}</h1>
            <div style="text-align: right;">
              <h2 style="margin: 0; font-size: 32px; font-weight: 950; color: #ccc; line-height: 1;">INVOICE</h2>
              <p style="margin: 5px 0 0 0; font-size: 14px; font-weight: 700;">#${inv.id.padStart(6, '0')}</p>
              <p style="margin: 2px 0 0 0; font-size: 11px; font-weight: 600; color: #666;">${dateStr} ${timeStr}</p>
            </div>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead style="background: #f8fafc; border-bottom: 2px solid #000;">
              <tr>
                <th style="padding: 10px; text-align: left; font-size: 12px; font-weight: 900;">ITEM</th>
                <th style="padding: 10px; text-align: center; font-size: 12px; font-weight: 900;">QTY</th>
                <th style="padding: 10px; text-align: right; font-size: 12px; font-weight: 900;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${inv.items.map(item => `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-size: 12px; font-weight: 600;">${item.name}</td><td style="padding: 10px; text-align: center; font-size: 12px;">${item.quantity}</td><td style="padding: 10px; text-align: right; font-size: 12px; font-weight: 700;">${currency}${(item.price * item.quantity).toLocaleString()}</td></tr>`).join('')}
            </tbody>
          </table>
          <div style="display: flex; justify-content: flex-end; gap: 40px; align-items: flex-start;">
            ${accountSummaryHTML}
            <div style="width: 250px; padding: 15px; border: 2px solid #000; border-radius: 12px;">
              <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 600; color: #666; margin-bottom: 8px;">
                <span>SUBTOTAL</span>
                <span>${currency}${inv.subtotal.toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 950; color: #000; border-top: 2px solid #eee; padding-top: 8px;">
                <span>TOTAL</span>
                <span>${currency}${inv.total.toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 800; color: #10b981; margin-top: 4px;">
                <span>PAID</span>
                <span>${currency}${inv.paidAmount.toLocaleString()}</span>
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

  const handlePreview = (inv: Invoice, layout: 'a4' | 'thermal' | 'advice') => {
    setPreviewHtml(generatePrintHTML(inv, layout));
    setPreviewType(layout);
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
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Time</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.total}</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredInvoices.map((inv) => {
                  const customer = state.customers.find(c => c.id === inv.customerId);
                  return (
                    <tr key={inv.id} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-500/5 transition-colors group cursor-pointer" onClick={() => setViewingInvoice(inv)}>
                      <td className="px-8 py-5 font-black text-sm dark:text-white">#{inv.id.padStart(4, '0')}</td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center font-black text-xs text-slate-400 border border-slate-100 dark:border-slate-700">
                            {customer ? customer.name.charAt(0) : <User size={14}/>}
                          </div>
                          <span className="font-bold text-slate-700 dark:text-slate-300 text-sm truncate max-w-[150px]">{customer?.name || t.walkInCustomer}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-xs font-bold text-slate-400 uppercase">
                        {new Date(inv.date).toLocaleDateString()} <span className="opacity-50">|</span> {new Date(inv.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </td>
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
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setViewingInvoice(inv)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="View"><Eye size={18}/></button>
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
                                   <p className="text-sm font-black dark:text-white truncate uppercase tracking-widest">{item.name}</p>
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.sku}</p>
                                </div>
                             </div>
                             
                             <div className="flex items-center gap-6">
                                <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900 rounded-xl px-2 py-1.5">
                                   <button onClick={() => updateBuilderQty(item.id, -1)} className="p-1 hover:text-rose-500 transition-colors"><Minus size={14}/></button>
                                   <span className="text-xs font-black w-4 text-center dark:text-white">{item.quantity}</span>
                                   <button onClick={() => updateBuilderQty(item.id, 1)} className="p-1 hover:text-emerald-500 transition-colors"><Plus size={14}/></button>
                                </div>
                                <div className="text-right w-24">
                                   <p className="font-black text-sm dark:text-white">{state.settings.currency}{(item.price * item.quantity).toFixed(2)}</p>
                                   <p className="text-[9px] font-bold text-slate-400">{state.settings.currency}{item.price}/unit</p>
                                </div>
                                <button onClick={() => removeBuilderItem(item.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><X size={18}/></button>
                             </div>
                          </div>
                        ))}
                        {builderItems.length === 0 && (
                           <div className="py-10 text-center text-slate-300 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                              <Package size={32} className="mx-auto mb-3 opacity-50"/>
                              <p className="text-xs font-black uppercase tracking-widest">No items added</p>
                           </div>
                        )}
                     </div>
                  </div>

                  <div className="space-y-4">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notes / Terms</label>
                     <textarea 
                        value={builderNotes} 
                        onChange={(e) => setBuilderNotes(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl p-6 outline-none font-bold text-sm dark:text-white transition-all shadow-inner h-32 resize-none"
                        placeholder="Thank you for your business..."
                     />
                  </div>
               </div>

               <div className="w-full lg:w-[400px] bg-slate-50 dark:bg-slate-900/50 p-8 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 flex flex-col">
                  <div className="flex-1 space-y-8">
                     <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Customer Details</h4>
                        {builderCustomer ? (
                           <div className="p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm relative group">
                              <button onClick={() => setBuilderCustomer(null)} className="absolute top-2 right-2 p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><X size={14}/></button>
                              <div className="flex items-center gap-3 mb-3">
                                 <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center font-black">{builderCustomer.name.charAt(0)}</div>
                                 <div>
                                    <p className="font-black text-sm dark:text-white">{builderCustomer.name}</p>
                                    <p className="text-[10px] font-bold text-slate-400">{builderCustomer.phone}</p>
                                 </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500">
                                 <div className="bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-xl">Debt: {state.settings.currency}{builderCustomer.totalDebt.toLocaleString()}</div>
                                 <div className="bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-xl">Orders: {builderCustomer.transactionCount || 0}</div>
                              </div>
                           </div>
                        ) : (
                           <div className="relative">
                              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                              <input 
                                 type="text" 
                                 value={customerSearch}
                                 onChange={(e) => setCustomerSearch(e.target.value)}
                                 className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 rounded-2xl py-4 pl-12 pr-4 outline-none font-bold text-sm dark:text-white transition-all shadow-sm"
                                 placeholder="Search customer..."
                              />
                              {availableCustomers.length > 0 && (
                                 <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 py-2 z-20 overflow-hidden">
                                    {availableCustomers.map(c => (
                                       <button key={c.id} onClick={() => { setBuilderCustomer(c); setCustomerSearch(''); }} className="w-full p-4 text-left hover:bg-indigo-50 dark:hover:bg-indigo-500/10 flex items-center justify-between group">
                                          <div>
                                             <p className="font-bold text-sm dark:text-white">{c.name}</p>
                                             <p className="text-[10px] text-slate-400 font-bold">{c.phone}</p>
                                          </div>
                                          <Plus size={16} className="text-slate-300 group-hover:text-indigo-600"/>
                                       </button>
                                    ))}
                                 </div>
                              )}
                           </div>
                        )}
                     </div>

                     <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment & Settlement</h4>
                        
                        <div className="grid grid-cols-3 gap-2">
                           {[
                              { id: 'cash', label: t.cash, icon: Banknote },
                              { id: 'card', label: t.card, icon: CreditCard },
                              { id: 'transfer', label: t.transfer, icon: ArrowRight },
                           ].map((m) => (
                              <button
                                 key={m.id}
                                 onClick={() => setBuilderPayment(m.id as any)}
                                 className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${
                                    builderPayment === m.id 
                                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' 
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400'
                                 }`}
                              >
                                 <m.icon size={20} className="mb-1"/>
                                 <span className="text-[9px] font-black uppercase tracking-widest">{m.label}</span>
                              </button>
                           ))}
                        </div>

                        <div>
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t.discount}</label>
                           <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">- {state.settings.currency}</span>
                              <input 
                                type="number" 
                                value={builderDiscount}
                                onChange={(e) => setBuilderDiscount(Number(e.target.value))}
                                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 pl-12 pr-6 outline-none font-bold text-sm dark:text-white transition-all shadow-inner"
                                placeholder="0.00"
                              />
                           </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                           <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                              <span>Subtotal</span>
                              <span>{state.settings.currency}{subtotal.toFixed(2)}</span>
                           </div>
                           <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                              <span>Tax ({state.settings.taxRate}%)</span>
                              <span>{state.settings.currency}{tax.toFixed(2)}</span>
                           </div>
                           {builderDiscount > 0 && (
                              <div className="flex justify-between items-center text-xs font-bold text-emerald-500 uppercase tracking-widest">
                                 <span>Discount</span>
                                 <span>- {state.settings.currency}{builderDiscount.toFixed(2)}</span>
                              </div>
                           )}
                           <div className="flex justify-between items-center pt-2">
                              <span className="text-sm font-black dark:text-white uppercase tracking-widest">Total</span>
                              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">{state.settings.currency}{total.toFixed(2)}</span>
                           </div>
                        </div>

                        <div>
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Paid Amount</label>
                           <div className="relative">
                              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                              <input 
                                type="number" 
                                value={builderPaidAmount}
                                onChange={(e) => setBuilderPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 pl-12 pr-6 outline-none font-black text-xl dark:text-white transition-all shadow-inner"
                                placeholder={total.toFixed(2)}
                              />
                           </div>
                        </div>
                     </div>
                  </div>

                  <button 
                     onClick={saveInvoice}
                     disabled={builderItems.length === 0}
                     className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all uppercase tracking-widest text-xs active:scale-95 disabled:opacity-50 disabled:shadow-none"
                  >
                     {editingInvoiceId ? 'Update Record' : 'Generate Invoice'}
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Viewing Invoice Modal (Modern Document View) */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-4xl h-[90vh] shadow-2xl relative flex flex-col overflow-hidden animate-in zoom-in duration-300">
              <header className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900 z-10">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center font-black">
                       <FileText size={24}/>
                    </div>
                    <div>
                       <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Archive: INV-#{viewingInvoice.id.padStart(4, '0')}</h3>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          Recorded on {new Date(viewingInvoice.date).toLocaleDateString()} at {new Date(viewingInvoice.date).toLocaleTimeString()}
                       </p>
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                    <button onClick={() => handleEditInvoice(viewingInvoice)} className="p-3 bg-amber-50 text-amber-600 rounded-2xl hover:bg-amber-100 transition-colors"><Edit size={20}/></button>
                    <button onClick={() => setViewingInvoice(null)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-400"><X size={24}/></button>
                 </div>
              </header>

              <div className="flex-1 overflow-y-auto p-8 lg:p-12 custom-scrollbar">
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-10">
                       <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Line Items</h4>
                          <div className="space-y-3">
                             {viewingInvoice.items.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-slate-200 transition-all">
                                   <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center font-black text-slate-400 border border-slate-100 dark:border-slate-600">
                                         {idx + 1}
                                      </div>
                                      <div>
                                         <p className="font-bold text-sm dark:text-white">{item.name}</p>
                                         <p className="text-[10px] text-slate-400 font-black uppercase">SKU: {item.sku} <span className="mx-2">•</span> {item.quantity} x {state.settings.currency}{item.price.toFixed(2)}</p>
                                      </div>
                                   </div>
                                   <div className="text-right">
                                      <p className="font-black text-sm dark:text-white">{state.settings.currency}{(item.price * item.quantity).toLocaleString()}</p>
                                   </div>
                                </div>
                             ))}
                          </div>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 space-y-6">
                          <div className="flex items-center justify-between">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Financial Summary</p>
                             <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${viewingInvoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                {viewingInvoice.status}
                             </div>
                          </div>
                          
                          <div className="space-y-3">
                             <div className="flex justify-between text-xs font-bold text-slate-500"><span>Subtotal:</span><span>{state.settings.currency}{viewingInvoice.subtotal.toLocaleString()}</span></div>
                             <div className="flex justify-between text-xs font-bold text-slate-500"><span>Tax (${state.settings.taxRate}%):</span><span>{state.settings.currency}{viewingInvoice.tax.toLocaleString()}</span></div>
                             <div className="flex justify-between text-xl font-black dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700"><span>Total:</span><span>{state.settings.currency}{viewingInvoice.total.toLocaleString()}</span></div>
                          </div>

                          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                             <div className="flex justify-between text-sm font-black text-emerald-600"><span>Paid via ${viewingInvoice.paymentMethod}:</span><span>${state.settings.currency}${viewingInvoice.paidAmount.toLocaleString()}</span></div>
                             {(viewingInvoice.total - viewingInvoice.paidAmount > 0) && (
                                <div className="flex justify-between text-sm font-black text-rose-600"><span>Unpaid / Debt:</span><span>${state.settings.currency}${(viewingInvoice.total - viewingInvoice.paidAmount).toLocaleString()}</span></div>
                             )}
                          </div>
                       </div>

                       <div className="grid grid-cols-1 gap-3">
                          <button onClick={() => handlePrint(viewingInvoice, 'advice')} className="w-full py-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 hover:border-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all"><FileText size={16} className="text-indigo-600"/> Print Advice Note</button>
                          <button onClick={() => handlePrint(viewingInvoice, 'thermal')} className="w-full py-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 hover:border-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all"><Smartphone size={16} className="text-indigo-600"/> Print POS Thermal</button>
                          <button onClick={() => handlePrint(viewingInvoice, 'a4')} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-100 dark:shadow-none"><Printer size={16}/> Print A4 Invoice</button>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {previewHtml && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-3xl h-[85vh] shadow-2xl relative flex flex-col overflow-hidden animate-in zoom-in duration-200">
              <header className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 z-10">
                 <h3 className="text-lg font-black dark:text-white uppercase tracking-tighter">Document Preview</h3>
                 <div className="flex items-center gap-3">
                    <button onClick={() => {
                        const iframe = document.getElementById('preview-frame') as HTMLIFrameElement;
                        iframe?.contentWindow?.print();
                    }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all">
                       <Printer size={16}/> Print
                    </button>
                    <button onClick={() => setPreviewHtml(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400"><X size={20}/></button>
                 </div>
              </header>
              <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-8 overflow-y-auto flex justify-center">
                 <div className="bg-white shadow-xl animate-in slide-in-from-bottom-4 duration-500" style={{ width: previewType === 'thermal' ? '80mm' : '210mm', minHeight: previewType === 'thermal' ? 'auto' : '297mm' }}>
                    <iframe 
                       id="preview-frame"
                       srcDoc={previewHtml} 
                       className="w-full h-full" 
                       style={{ minHeight: '600px', border: 'none' }} 
                       title="Invoice Preview"
                    />
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
