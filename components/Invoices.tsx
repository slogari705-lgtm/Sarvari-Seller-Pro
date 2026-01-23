
import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Download, 
  Eye, 
  Printer,
  Calendar,
  CreditCard,
  Banknote,
  Plus,
  X,
  User,
  ShoppingBag,
  Trash2,
  CheckCircle2,
  Package,
  ArrowRight,
  Info,
  Tag,
  ChevronRight,
  UserPlus,
  Layout,
  StickyNote,
  Percent,
  Settings,
  Palette,
  AlignLeft,
  ChevronDown,
  PlusCircle,
  Minus,
  Calculator,
  Wallet,
  Scale,
  DollarSign,
  AlertCircle,
  AlertTriangle,
  PenTool,
  Check,
  Trash,
  Clock,
  CircleDashed,
  Globe,
  Mail,
  Phone,
  Hash
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
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
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [repaymentInput, setRepaymentInput] = useState<number | ''>('');
  
  const [isManagingTemplates, setIsManagingTemplates] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<InvoiceTemplate> | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string>(state.settings.invoiceTemplate);

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

  const updateBuilderPrice = (productId: string, price: number) => {
    setBuilderItems(prev => prev.map(item => {
      if (item.id === productId) {
        return { ...item, price };
      }
      return item;
    }));
  };

  const filteredInvoices = useMemo(() => {
    return state.invoices.filter(inv => {
      const customer = state.customers.find(c => c.id === inv.customerId);
      return inv.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
             customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             customer?.phone.includes(searchTerm);
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.invoices, searchTerm, state.customers]);

  const activeTemplate = useMemo(() => {
    return state.templates.find(t => t.id === activeTemplateId) || state.templates[0];
  }, [state.templates, activeTemplateId]);

  const subtotal = builderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalCost = builderItems.reduce((acc, item) => acc + ((item.buyPrice || 0) * item.quantity), 0);
  const tax = (subtotal * state.settings.taxRate) / 100;
  const total = subtotal + tax - builderDiscount;
  const invoiceProfit = total - tax - totalCost;

  const finalPaid = builderPaidAmount === '' ? total : builderPaidAmount;
  const balanceDue = Math.max(0, total - finalPaid);

  const saveInvoice = () => {
    if (builderItems.length === 0) return;

    const invoiceId = `INV-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const status: Invoice['status'] = finalPaid >= total ? 'paid' : (finalPaid > 0 ? 'partial' : 'unpaid');

    // Create date object from picker value
    const invoiceDate = new Date(builderDate);
    // If the selected date is today, use current time, otherwise use noon to avoid timezone shift issues on simple display
    const now = new Date();
    if (invoiceDate.toDateString() === now.toDateString()) {
       invoiceDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    } else {
       invoiceDate.setHours(12, 0, 0); 
    }

    const newInvoice: Invoice = {
      id: invoiceId,
      date: invoiceDate.toISOString(),
      customerId: builderCustomer?.id,
      items: builderItems,
      subtotal,
      tax,
      discount: builderDiscount,
      total,
      profit: invoiceProfit,
      paidAmount: finalPaid,
      status,
      paymentMethod: builderPayment,
      notes: builderNotes
    };

    updateState('invoices', [...state.invoices, newInvoice]);
    
    const updatedProducts = state.products.map(p => {
      const cartItem = builderItems.find(bi => bi.id === p.id);
      return cartItem ? { ...p, stock: p.stock - cartItem.quantity } : p;
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

      // Log Debt Transaction if balance due
      if (balanceDue > 0) {
        const newTrans: LoanTransaction = {
          id: Math.random().toString(36).substr(2, 9),
          customerId: builderCustomer.id,
          invoiceId: invoiceId,
          date: invoiceDate.toISOString(),
          amount: balanceDue,
          type: 'debt',
          note: `Loan from purchase: ${invoiceId}`
        };
        updateState('loanTransactions', [...state.loanTransactions, newTrans]);
      }
    }

    setIsCreating(false);
    resetBuilder();
    printInvoice(newInvoice, activeTemplate);
  };

  const resetBuilder = () => {
    setBuilderCustomer(null);
    setBuilderItems([]);
    setBuilderPayment('cash');
    setBuilderDiscount(0);
    setBuilderPaidAmount('');
    setBuilderNotes('');
    setBuilderDate(new Date().toISOString().split('T')[0]);
    setItemSearch('');
    setCustomerSearch('');
  };

  const handleRepayment = () => {
    if (!payingInvoice || repaymentInput === '' || repaymentInput <= 0) return;

    const amountToAdd = Math.min(repaymentInput, payingInvoice.total - payingInvoice.paidAmount);
    
    const updatedInvoices = state.invoices.map(inv => {
      if (inv.id === payingInvoice.id) {
        const newPaidAmount = inv.paidAmount + amountToAdd;
        const newStatus: Invoice['status'] = newPaidAmount >= inv.total ? 'paid' : 'partial';
        return { ...inv, paidAmount: newPaidAmount, status: newStatus };
      }
      return inv;
    });

    if (payingInvoice.customerId) {
      const updatedCustomers = state.customers.map(c => {
        if (c.id === payingInvoice.customerId) {
          return { ...c, totalDebt: Math.max(0, (c.totalDebt || 0) - amountToAdd) };
        }
        return c;
      });
      updateState('customers', updatedCustomers);

      const newTrans: LoanTransaction = {
        id: Math.random().toString(36).substr(2, 9),
        customerId: payingInvoice.customerId,
        invoiceId: payingInvoice.id,
        date: new Date().toISOString(),
        amount: amountToAdd,
        type: 'repayment',
        note: `Repayment for invoice: ${payingInvoice.id}`
      };
      updateState('loanTransactions', [...state.loanTransactions, newTrans]);
    }

    updateState('invoices', updatedInvoices);
    setPayingInvoice(null);
    setRepaymentInput('');
  };

  const handleSaveTemplate = (template: Partial<InvoiceTemplate>) => {
    if (template.id && state.templates.find(t => t.id === template.id)) {
      const updated = state.templates.map(t => 
        t.id === template.id ? { ...t, ...template } as InvoiceTemplate : t
      );
      updateState('templates', updated);
    } else {
      const newTmp: InvoiceTemplate = {
        id: Math.random().toString(36).substr(2, 9),
        name: template.name || 'New Template',
        layout: template.layout || 'modern',
        brandColor: template.brandColor || '#6366f1',
        headerText: template.headerText || '',
        footerText: template.footerText || '',
        showLogo: template.showLogo ?? true
      };
      updateState('templates', [...state.templates, newTmp]);
      setEditingTemplate(newTmp);
    }
  };

  const handleDeleteTemplate = (id: string) => {
    if (state.templates.length <= 1) {
      alert("Cannot delete the last template.");
      return;
    }
    if (id === state.settings.invoiceTemplate) {
      alert("Cannot delete the active template. Please switch to another template first.");
      return;
    }
    if (confirm("Are you sure you want to delete this template?")) {
       updateState('templates', state.templates.filter(t => t.id !== id));
       setEditingTemplate(null);
    }
  };

  const handleSetActiveTemplate = (id: string) => {
    updateState('settings', { ...state.settings, invoiceTemplate: id });
    setActiveTemplateId(id);
  };

  const printInvoice = (inv: Invoice, template: InvoiceTemplate) => {
    const printSection = document.getElementById('print-section');
    if (!printSection) return;

    const customer = state.customers.find(c => c.id === inv.customerId);
    const brandColor = template.brandColor;
    const invBalance = inv.total - inv.paidAmount;

    let templateHTML = '';

    if (template.layout === 'modern') {
      templateHTML = `
        <div style="font-family: 'Inter', sans-serif; background: white; padding: 40px; max-width: 210mm; margin: 0 auto; color: #0f172a;">
          <div style="display: flex; justify-content: space-between; border-bottom: 4px solid ${brandColor}; padding-bottom: 30px; margin-bottom: 40px;">
            <div style="flex: 1.5;">
               <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                  <div style="width: 50px; height: 50px; background: ${brandColor}; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 24px; shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
                    ${state.settings.shopName.charAt(0)}
                  </div>
                  <h1 style="font-size: 32px; font-weight: 900; color: #1e293b; margin: 0; text-transform: uppercase; letter-spacing: -1.5px;">${state.settings.shopName}</h1>
               </div>
               <div style="font-size: 12px; color: #475569; line-height: 1.7; font-weight: 500;">
                  ${state.settings.shopAddress ? `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;"><span style="color: ${brandColor}; font-weight: 800;">ADR</span> ${state.settings.shopAddress}</div>` : ''}
                  ${state.settings.shopPhone ? `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;"><span style="color: ${brandColor}; font-weight: 800;">TEL</span> ${state.settings.shopPhone}</div>` : ''}
                  ${state.settings.shopEmail ? `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;"><span style="color: ${brandColor}; font-weight: 800;">EML</span> ${state.settings.shopEmail}</div>` : ''}
                  ${state.settings.businessId ? `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;"><span style="color: ${brandColor}; font-weight: 800;">TAX</span> ${state.settings.businessId}</div>` : ''}
                  ${state.settings.shopWebsite ? `<div style="display: flex; align-items: center; gap: 8px;"><span style="color: ${brandColor}; font-weight: 800;">WWW</span> ${state.settings.shopWebsite}</div>` : ''}
               </div>
            </div>
            <div style="text-align: right; flex: 1;">
               <h2 style="font-size: 56px; font-weight: 900; color: #e2e8f0; margin: 0; line-height: 0.8; letter-spacing: -2px; text-transform: uppercase;">INVOICE</h2>
               <div style="margin-top: 25px;">
                  <span style="font-size: 16px; font-weight: 800; color: white; background: #1e293b; padding: 8px 16px; border-radius: 8px;">#${inv.id}</span>
               </div>
               <div style="margin-top: 15px; font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; tracking: 0.1em;">
                  Date Issued: <span style="color: #1e293b;">${new Date(inv.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
               </div>
            </div>
          </div>

          <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 60px; margin-bottom: 50px;">
            <div>
               <h3 style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #94a3b8; letter-spacing: 2px; margin-bottom: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">Billing To</h3>
               <div style="font-size: 18px; font-weight: 800; color: #1e293b; margin-bottom: 6px;">${customer?.name || 'Walk-in Customer'}</div>
               <div style="font-size: 14px; color: #64748b; font-weight: 500; margin-bottom: 4px;">Phone: ${customer?.phone || 'N/A'}</div>
               <div style="font-size: 14px; color: #64748b; font-weight: 500;">Address: ${customer?.address || 'N/A'}</div>
            </div>
            <div style="background: #f8fafc; padding: 25px; border-radius: 20px; border: 1px solid #f1f5f9;">
               <h3 style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #94a3b8; letter-spacing: 2px; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Payment Overview</h3>
               <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                  <span style="font-size: 13px; color: #64748b; font-weight: 600;">Payment Mode</span>
                  <span style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #1e293b;">${inv.paymentMethod}</span>
               </div>
               <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                  <span style="font-size: 13px; color: #64748b; font-weight: 600;">Account Status</span>
                  <span style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: ${inv.status === 'paid' ? '#10b981' : '#f43f5e'}">${inv.status}</span>
               </div>
            </div>
          </div>

          <table style="width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 40px; border-radius: 12px; overflow: hidden;">
            <thead>
              <tr style="background: #1e293b; color: white;">
                <th style="padding: 18px 24px; text-align: left; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Item Description</th>
                <th style="padding: 18px 24px; text-align: center; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; width: 80px;">Qty</th>
                <th style="padding: 18px 24px; text-align: right; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; width: 120px;">Unit Price</th>
                <th style="padding: 18px 24px; text-align: right; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; width: 120px;">Line Total</th>
              </tr>
            </thead>
            <tbody>
              ${inv.items.map((item, i) => `
                <tr style="background: ${i % 2 === 0 ? 'white' : '#fbfcfd'};">
                  <td style="padding: 20px 24px; font-size: 14px; color: #334155; font-weight: 600; border-bottom: 1px solid #f1f5f9;">
                    ${item.name}
                    <div style="font-size: 10px; color: #94a3b8; font-weight: 700; margin-top: 4px; text-transform: uppercase;">SKU: ${item.sku}</div>
                  </td>
                  <td style="padding: 20px 24px; text-align: center; font-size: 14px; color: #64748b; font-weight: 700; border-bottom: 1px solid #f1f5f9;">${item.quantity}</td>
                  <td style="padding: 20px 24px; text-align: right; font-size: 14px; color: #64748b; font-weight: 700; border-bottom: 1px solid #f1f5f9;">${state.settings.currency}${item.price.toFixed(2)}</td>
                  <td style="padding: 20px 24px; text-align: right; font-size: 14px; font-weight: 800; color: #1e293b; border-bottom: 1px solid #f1f5f9;">${state.settings.currency}${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
             <div style="flex: 1; max-width: 350px; padding-right: 40px;">
                ${inv.notes ? `
                   <h4 style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #94a3b8; letter-spacing: 2px; margin-bottom: 10px;">Internal Notes</h4>
                   <div style="font-size: 12px; color: #64748b; line-height: 1.6; font-style: italic; background: #f8fafc; padding: 15px; border-radius: 12px; border-left: 4px solid ${brandColor};">
                     ${inv.notes}
                   </div>
                ` : ''}
             </div>
             <div style="width: 320px; background: #1e293b; color: white; padding: 30px; border-radius: 24px; shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);">
                <div style="display: flex; justify-content: space-between; padding: 10px 0; color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                   <span>Gross Subtotal</span>
                   <span>${state.settings.currency}${inv.subtotal.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px 0; color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                   <span>VAT / Tax (${state.settings.taxRate}%)</span>
                   <span>${state.settings.currency}${inv.tax.toFixed(2)}</span>
                </div>
                ${inv.discount > 0 ? `
                  <div style="display: flex; justify-content: space-between; padding: 10px 0; color: #f43f5e; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
                     <span>Trade Discount</span>
                     <span>-${state.settings.currency}${inv.discount.toFixed(2)}</span>
                  </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; padding: 25px 0 10px 0; border-top: 1px solid #334155; margin-top: 15px; align-items: baseline;">
                   <span style="font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Total Amount</span>
                   <span style="font-size: 32px; font-weight: 900; color: ${brandColor}; letter-spacing: -1px;">${state.settings.currency}${inv.total.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px 0; color: #10b981; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; border-top: 1px solid #334155; margin-top: 10px;">
                   <span>Amt Collected</span>
                   <span>${state.settings.currency}${inv.paidAmount.toFixed(2)}</span>
                </div>
                ${invBalance > 0 ? `
                  <div style="display: flex; justify-content: space-between; padding: 10px 0; color: #fb7185; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
                     <span>Outstanding</span>
                     <span>${state.settings.currency}${invBalance.toFixed(2)}</span>
                  </div>
                ` : ''}
             </div>
          </div>

          <div style="margin-top: 80px; padding-top: 30px; border-top: 1px solid #f1f5f9; text-align: center;">
             <div style="margin-bottom: 25px;">
                <svg id="barcode-inv-${inv.id}"></svg>
             </div>
             <p style="font-size: 15px; font-weight: 800; color: #1e293b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">${template.headerText || 'Professional Service Confirmation'}</p>
             <p style="font-size: 13px; color: #94a3b8; font-weight: 600;">${template.footerText || 'Thank you for choosing our services.'}</p>
             <div style="margin-top: 30px; font-size: 10px; color: #cbd5e1; font-weight: 700; text-transform: uppercase;">Generated via Sarvari Seller Pro Cloud POS</div>
          </div>
        </div>
      `;
    } else if (template.layout === 'minimal') {
      templateHTML = `
        <div style="font-family: 'Inter', sans-serif; width: 80mm; margin: 0 auto; background: white; padding: 15px; color: black; line-height: 1.4;">
           <div style="text-align: center; border-bottom: 2px solid black; padding-bottom: 12px; margin-bottom: 15px;">
              <h2 style="font-size: 20px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.5px;">${state.settings.shopName}</h2>
              <div style="font-size: 10px; margin-top: 8px; font-weight: 600;">
                 ${state.settings.shopPhone ? `<div>Tel: ${state.settings.shopPhone}</div>` : ''}
                 ${state.settings.shopAddress ? `<div>${state.settings.shopAddress}</div>` : ''}
                 ${state.settings.businessId ? `<div>Tax Reg: ${state.settings.businessId}</div>` : ''}
              </div>
           </div>
           
           <div style="font-size: 11px; margin-bottom: 15px; font-weight: 500;">
              <div style="display: flex; justify-content: space-between;"><span>Invoice No</span> <strong>#${inv.id}</strong></div>
              <div style="display: flex; justify-content: space-between;"><span>Date</span> <strong>${new Date(inv.date).toLocaleDateString()}</strong></div>
              <div style="display: flex; justify-content: space-between;"><span>Customer</span> <strong>${customer?.name || 'Walk-in'}</strong></div>
           </div>

           <div style="border-bottom: 1px dashed #94a3b8; margin-bottom: 10px;"></div>
           
           <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
              ${inv.items.map(item => `
                 <tr>
                    <td style="padding: 4px 0; font-weight: 800;" colspan="2">${item.name}</td>
                 </tr>
                 <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding-bottom: 6px; color: #64748b;">${item.quantity} x ${item.price.toFixed(2)}</td>
                    <td style="text-align: right; padding-bottom: 6px; font-weight: 900;">${(item.price * item.quantity).toFixed(2)}</td>
                 </tr>
              `).join('')}
           </table>

           <div style="margin-top: 15px; border-top: 2px solid black; padding-top: 10px;">
              <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; text-transform: uppercase;">
                 <span>Grand Total</span>
                 <span>${state.settings.currency}${inv.total.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 4px;">
                 <span>Paid</span>
                 <span>${state.settings.currency}${inv.paidAmount.toFixed(2)}</span>
              </div>
              ${invBalance > 0 ? `
              <div style="display: flex; justify-content: space-between; font-size: 11px; color: red; font-weight: bold;">
                 <span>Balance Due</span>
                 <span>${state.settings.currency}${invBalance.toFixed(2)}</span>
              </div>
              ` : ''}
           </div>

           <div style="text-align: center; margin-top: 25px; border-top: 1px solid #eee; padding-top: 15px;">
              <svg id="barcode-inv-${inv.id}" style="width: 100%; height: 50px;"></svg>
              <p style="margin-top: 10px; font-size: 10px; font-weight: 700; text-transform: uppercase;">${template.footerText || 'Thank You!'}</p>
           </div>
        </div>
      `;
    } else {
       templateHTML = `
         <div style="font-family: 'Times New Roman', serif; padding: 60px; max-width: 210mm; margin: 0 auto; background: white; color: black; border: 1px solid #eee;">
            <div style="text-align: center; margin-bottom: 50px;">
               <h1 style="font-size: 38px; margin: 0; text-transform: uppercase; letter-spacing: 4px; font-weight: 400;">${state.settings.shopName}</h1>
               <p style="font-size: 14px; font-style: italic; margin-top: 10px; color: #444; border-top: 1px solid black; display: inline-block; padding: 5px 20px;">
                  ESTABLISHED BUSINESS SOLUTIONS
               </p>
               <div style="font-size: 13px; margin-top: 15px; color: #333;">
                  ${state.settings.shopAddress || ''} | ${state.settings.shopPhone || ''} | ${state.settings.businessId || ''}
               </div>
            </div>

            <div style="display: flex; justify-content: space-between; margin-bottom: 40px; padding: 25px 0; border-top: 2px solid #000; border-bottom: 2px solid #000;">
               <div>
                  <h4 style="margin: 0 0 10px 0; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Recipient</h4>
                  <div style="font-size: 16px; font-weight: bold;">${customer?.name || 'Walk-in Customer'}</div>
                  <div style="font-size: 14px; margin-top: 4px;">${customer?.phone || ''}</div>
                  <div style="font-size: 14px;">${customer?.address || ''}</div>
               </div>
               <div style="text-align: right;">
                  <h4 style="margin: 0 0 10px 0; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Documentation</h4>
                  <div><strong>Invoice Ref:</strong> #${inv.id}</div>
                  <div><strong>Issue Date:</strong> ${new Date(inv.date).toLocaleDateString()}</div>
                  <div><strong>Payment Method:</strong> ${inv.paymentMethod.toUpperCase()}</div>
               </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
               <thead>
                  <tr style="border-bottom: 2px solid black;">
                     <th style="text-align: left; padding: 12px; text-transform: uppercase; font-size: 12px;">Description of Goods/Services</th>
                     <th style="text-align: center; padding: 12px; text-transform: uppercase; font-size: 12px;">Qty</th>
                     <th style="text-align: right; padding: 12px; text-transform: uppercase; font-size: 12px;">Unit Price</th>
                     <th style="text-align: right; padding: 12px; text-transform: uppercase; font-size: 12px;">Line Total</th>
                  </tr>
               </thead>
               <tbody>
                  ${inv.items.map(item => `
                     <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 15px 12px; font-size: 14px;">${item.name}</td>
                        <td style="padding: 15px 12px; text-align: center; font-size: 14px;">${item.quantity}</td>
                        <td style="padding: 15px 12px; text-align: right; font-size: 14px;">${item.price.toFixed(2)}</td>
                        <td style="padding: 15px 12px; text-align: right; font-size: 14px; font-weight: bold;">${(item.price * item.quantity).toFixed(2)}</td>
                     </tr>
                  `).join('')}
               </tbody>
            </table>

            <div style="display: flex; justify-content: flex-end;">
               <div style="width: 250px; text-align: right;">
                  <div style="padding: 8px 0; border-bottom: 1px solid #ddd; font-size: 14px;">Subtotal: ${state.settings.currency}${inv.subtotal.toFixed(2)}</div>
                  <div style="padding: 8px 0; border-bottom: 1px solid #ddd; font-size: 14px;">Taxes (${state.settings.taxRate}%): ${state.settings.currency}${inv.tax.toFixed(2)}</div>
                  <div style="padding: 15px 0; font-size: 24px; font-weight: bold;">Total Due: ${state.settings.currency}${inv.total.toFixed(2)}</div>
               </div>
            </div>

            <div style="margin-top: 80px; border-top: 1px solid #000; padding-top: 20px; text-align: center; font-size: 14px;">
               <p style="letter-spacing: 1px;">${template.footerText || 'THANK YOU FOR YOUR VALUED PATRONAGE'}</p>
            </div>
         </div>
       `;
    }

    printSection.innerHTML = templateHTML;
    
    // Add special class to body to trigger print-only CSS
    document.body.classList.add('printing-special');

    try {
       JsBarcode(`#barcode-inv-${inv.id}`, inv.id, {
          format: "CODE128",
          lineColor: "#000",
          width: 2,
          height: 40,
          displayValue: false
       });
    } catch(e) { console.error('Barcode generation error', e); }

    setTimeout(() => { 
       window.print();
       // Cleanup after print dialog closes
       document.body.classList.remove('printing-special');
       printSection.innerHTML = '';
    }, 500);
  };

  const getStatusBadge = (status: Invoice['status']) => {
    const config = {
      paid: {
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        text: 'text-emerald-600 dark:text-emerald-400',
        icon: CheckCircle2,
        label: t.paid
      },
      partial: {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        text: 'text-amber-600 dark:text-amber-400',
        icon: Clock,
        label: t.partial
      },
      unpaid: {
        bg: 'bg-rose-50 dark:bg-rose-900/20',
        text: 'text-rose-600 dark:text-rose-400',
        icon: AlertCircle,
        label: t.unpaid
      }
    };

    const s = config[status || 'paid'];
    const Icon = s.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${s.bg} ${s.text} border border-current opacity-90`}>
        <Icon size={12} strokeWidth={3} />
        {s.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder={t.search} 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 text-sm shadow-sm dark:text-white" 
          />
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setIsManagingTemplates(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Palette size={18} />
            <span className="hidden sm:inline">Templates</span>
          </button>
          <button onClick={() => setIsCreating(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-indigo-700 transition-all active:scale-95"><Plus size={18} />{t.newTransaction}</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Customer</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Total</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-500/5 group">
                  <td className="px-6 py-4 font-bold text-slate-800 dark:text-white text-sm">#{inv.id}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-400">{new Date(inv.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-400 truncate max-w-[150px]">{state.customers.find(c => c.id === inv.customerId)?.name || 'Walk-in'}</td>
                  <td className="px-6 py-4">
                    {getStatusBadge(inv.status)}
                  </td>
                  <td className="px-6 py-4 font-black text-slate-800 dark:text-white text-sm">{state.settings.currency}{inv.total.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                      {inv.status !== 'paid' && (
                        <button onClick={() => { setPayingInvoice(inv); setRepaymentInput(''); }} className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg" title="Collect Payment">
                          <DollarSign size={18} />
                        </button>
                      )}
                      <button onClick={() => setSelectedInvoice(inv)} className="p-2 text-slate-400 hover:text-indigo-600"><Eye size={18} /></button>
                      <button onClick={() => printInvoice(inv, activeTemplate)} className="p-2 text-slate-400 hover:text-slate-600"><Printer size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Invoice Details View Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-2xl p-8 lg:p-10 shadow-2xl relative animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh]">
            <button onClick={() => setSelectedInvoice(null)} className="absolute top-8 right-8 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-400 transition-colors"><X size={28}/></button>
            
            <div className="flex items-center gap-6 mb-10">
               <div className="w-16 h-16 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center shadow-lg"><FileText size={32}/></div>
               <div>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Invoice Details</h3>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">#{selectedInvoice.id} • {new Date(selectedInvoice.date).toLocaleString()}</p>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-10">
               <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Customer Info</p>
                  <p className="font-bold text-slate-800 dark:text-white text-lg">{state.customers.find(c => c.id === selectedInvoice.customerId)?.name || 'Walk-in Customer'}</p>
                  <p className="text-xs text-slate-500 font-medium">{state.customers.find(c => c.id === selectedInvoice.customerId)?.phone || ''}</p>
               </div>
               <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Payment Status</p>
                  <div className="flex flex-col gap-2">
                     {getStatusBadge(selectedInvoice.status)}
                     <p className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase mt-1">{selectedInvoice.paymentMethod} Payment</p>
                  </div>
               </div>
            </div>

            <div className="space-y-4 mb-10">
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Purchased Items</h4>
               <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                  {selectedInvoice.items.map((item, idx) => (
                    <div key={idx} className={`p-4 flex items-center justify-between ${idx !== selectedInvoice.items.length - 1 ? 'border-b border-slate-50 dark:border-slate-700' : ''}`}>
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-center text-slate-400 shrink-0"><Package size={20}/></div>
                          <div>
                             <p className="text-sm font-bold text-slate-800 dark:text-white">{item.name}</p>
                             <p className="text-[10px] text-slate-400 font-bold uppercase">{item.quantity} x {state.settings.currency}{item.price.toFixed(2)}</p>
                          </div>
                       </div>
                       <p className="font-black text-slate-800 dark:text-white">{state.settings.currency}{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
               </div>
            </div>

            <div className="bg-slate-900 dark:bg-black rounded-3xl p-8 text-white space-y-4">
               <div className="flex justify-between items-center text-xs font-black uppercase text-slate-500">
                  <span>Subtotal</span>
                  <span>{state.settings.currency}{selectedInvoice.subtotal.toFixed(2)}</span>
               </div>
               <div className="flex justify-between items-center text-xs font-black uppercase text-slate-500">
                  <span>Tax ({state.settings.taxRate}%)</span>
                  <span>{state.settings.currency}{selectedInvoice.tax.toFixed(2)}</span>
               </div>
               {selectedInvoice.discount > 0 && (
                 <div className="flex justify-between items-center text-xs font-black uppercase text-rose-500">
                    <span>Discount</span>
                    <span>-{state.settings.currency}{selectedInvoice.discount.toFixed(2)}</span>
                 </div>
               )}
               <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                  <span className="text-sm font-black uppercase tracking-widest text-indigo-400">Total</span>
                  <span className="text-3xl font-black">{state.settings.currency}{selectedInvoice.total.toFixed(2)}</span>
               </div>
               <div className="flex justify-between items-center text-xs font-black uppercase text-emerald-500">
                  <span>Total Paid</span>
                  <span>{state.settings.currency}{selectedInvoice.paidAmount.toFixed(2)}</span>
               </div>
               {selectedInvoice.total - selectedInvoice.paidAmount > 0 && (
                 <div className="flex justify-between items-center text-xs font-black uppercase text-rose-500">
                    <span>Balance Due</span>
                    <span>{state.settings.currency}{(selectedInvoice.total - selectedInvoice.paidAmount).toFixed(2)}</span>
                 </div>
               )}
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
               <button onClick={() => setSelectedInvoice(null)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Close View</button>
               <button onClick={() => printInvoice(selectedInvoice, activeTemplate)} className="py-4 bg-indigo-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2"><Printer size={18}/> Print Again</button>
            </div>
          </div>
        </div>
      )}

      {/* Repayment Modal */}
      {payingInvoice && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-md p-8 shadow-2xl relative">
            <button onClick={() => setPayingInvoice(null)} className="absolute top-6 right-6 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"><X size={20}/></button>
            <div className="flex items-center gap-4 mb-8">
               <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600"><Wallet size={24}/></div>
               <div>
                  <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Collect Payment</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">INV #{payingInvoice.id}</p>
               </div>
            </div>

            <div className="space-y-6 mb-8">
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                     <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Grand Total</p>
                     <p className="font-black dark:text-white">{state.settings.currency}{payingInvoice.total.toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-rose-50 dark:bg-rose-900/10 rounded-2xl">
                     <p className="text-[10px] font-black text-rose-400 uppercase mb-1">Remaining</p>
                     <p className="font-black text-rose-600">{state.settings.currency}{(payingInvoice.total - payingInvoice.paidAmount).toFixed(2)}</p>
                  </div>
               </div>

               <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Repayment Amount</label>
                  <div className="relative">
                     <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                     <input 
                        type="number" 
                        value={repaymentInput}
                        onChange={(e) => setRepaymentInput(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-indigo-500 font-black text-xl dark:text-white"
                        placeholder="0.00"
                        autoFocus
                     />
                  </div>
               </div>
            </div>

            <button 
               onClick={handleRepayment}
               disabled={repaymentInput === '' || repaymentInput <= 0}
               className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none disabled:opacity-50"
            >
               Confirm Payment
            </button>
          </div>
        </div>
      )}

      {/* Invoice Creator Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 p-0 lg:p-8">
          <div className="bg-white dark:bg-slate-900 w-full h-full lg:rounded-[40px] shadow-2xl flex flex-col lg:flex-row overflow-hidden animate-in zoom-in-95 duration-300">
            
            <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-950/20">
               <header className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10 shrink-0">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-indigo-600 text-white rounded-[18px] flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none"><Plus size={28}/></div>
                     <div>
                       <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">{t.advancedBuilder}</h3>
                       <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{t.dynamicEditing}</p>
                     </div>
                  </div>
                  <button onClick={() => { setIsCreating(false); resetBuilder(); }} className="p-3 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-2xl text-slate-400 hover:text-rose-500 transition-all"><X size={28}/></button>
               </header>

               <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-10 custom-scrollbar">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                       <User size={16} className="text-indigo-600"/>
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.customerSelection}</h4>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                       <div className="relative flex-1 w-full max-w-md">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                          <input 
                            type="text" 
                            placeholder={t.findScanCustomer}
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-sm dark:text-white transition-all shadow-sm"
                          />
                          {customerSearch && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 py-2 z-20 overflow-hidden animate-in slide-in-from-top-2">
                               {availableCustomers.map(c => (
                                 <button key={c.id} onClick={() => { setBuilderCustomer(c); setCustomerSearch(''); }} className="w-full p-4 text-left hover:bg-indigo-50 dark:hover:bg-indigo-500/10 flex items-center justify-between group">
                                   <div>
                                     <p className="text-sm font-black dark:text-white">{c.name}</p>
                                     <p className="text-[10px] text-slate-400 font-bold">{c.phone}</p>
                                   </div>
                                   <div className="text-right">
                                      {c.totalDebt > 0 && <p className="text-[8px] font-black text-rose-500 uppercase">Debt: {state.settings.currency}{c.totalDebt.toFixed(0)}</p>}
                                      <PlusCircle size={18} className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"/>
                                   </div>
                                 </button>
                               ))}
                               {availableCustomers.length === 0 && <p className="p-4 text-xs font-bold text-slate-400 text-center">No customers found</p>}
                            </div>
                          )}
                       </div>
                       
                       {builderCustomer ? (
                         <div className="flex items-center gap-4 bg-indigo-600 p-2 pl-4 pr-2 rounded-2xl text-white animate-in zoom-in group relative">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center font-black">{builderCustomer.name.charAt(0)}</div>
                            <div className="min-w-0 pr-4">
                               <p className="text-xs font-black truncate">{builderCustomer.name}</p>
                               <div className="flex items-center gap-2">
                                  <p className="text-[10px] opacity-80">{builderCustomer.phone}</p>
                                  {builderCustomer.totalDebt > 0 && (
                                     <span className="bg-rose-500/30 text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-1">
                                        <Scale size={10}/> {state.settings.currency}{builderCustomer.totalDebt.toFixed(0)}
                                     </span>
                                  )}
                               </div>
                            </div>
                            <button onClick={() => setBuilderCustomer(null)} className="p-2 hover:bg-white/10 rounded-xl"><X size={16}/></button>
                         </div>
                       ) : (
                         <div className="h-14 flex items-center px-6 bg-slate-100 dark:bg-slate-800 rounded-2xl text-[10px] font-black uppercase text-slate-400 tracking-widest border border-slate-200 dark:border-slate-700">
                           {t.walkInCustomer}
                         </div>
                       )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <Package size={16} className="text-indigo-600"/>
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Line Items</h4>
                       </div>
                       <div className="relative flex-1 max-w-sm ml-auto">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                          <input 
                            type="text" 
                            placeholder="Add Product..."
                            value={itemSearch}
                            onChange={(e) => setItemSearch(e.target.value)}
                            className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-3 pl-12 pr-4 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-sm dark:text-white transition-all shadow-sm"
                          />
                          {itemSearch && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 py-2 z-20 overflow-hidden animate-in slide-in-from-top-2">
                               {availableProducts.map(p => (
                                 <button key={p.id} onClick={() => addToInvoice(p)} className="w-full p-4 text-left hover:bg-indigo-50 dark:hover:bg-indigo-500/10 flex items-center justify-between group">
                                   <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-slate-50 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-400">
                                         {p.image ? <img src={p.image} className="w-full h-full object-cover rounded-xl"/> : <Package size={18}/>}
                                      </div>
                                      <div>
                                        <p className="text-sm font-black dark:text-white">{p.name}</p>
                                        <p className="text-[10px] text-slate-400 font-bold">{state.settings.currency}{p.price.toFixed(2)} • {p.stock} in stock</p>
                                      </div>
                                   </div>
                                   <PlusCircle size={18} className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"/>
                                 </button>
                               ))}
                               {availableProducts.length === 0 && <p className="p-4 text-xs font-bold text-slate-400 text-center">No products found</p>}
                            </div>
                          )}
                       </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] overflow-hidden shadow-sm">
                       <table className="w-full text-left">
                          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                             <tr>
                                <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.displayName}</th>
                                <th className="p-5 text-center text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.items}</th>
                                <th className="p-5 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.price}</th>
                                <th className="p-5 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.total}</th>
                                <th className="p-5 w-16"></th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                             {builderItems.map(item => (
                               <tr key={item.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                                  <td className="p-5">
                                     <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                                           {item.image ? <img src={item.image} className="w-full h-full object-cover rounded-xl"/> : <Package size={18}/>}
                                        </div>
                                        <div className="min-w-0">
                                           <p className="text-sm font-black dark:text-white truncate">{item.name}</p>
                                           <p className="text-[10px] text-slate-400 font-bold uppercase">{item.sku}</p>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="p-5">
                                     <div className="flex items-center justify-center gap-3 bg-slate-100 dark:bg-slate-800 rounded-xl px-2 py-1 max-w-[120px] mx-auto">
                                        <button onClick={() => updateBuilderQty(item.id, -1)} className="p-1 hover:text-rose-500 transition-colors"><Minus size={14}/></button>
                                        <span className="text-sm font-black w-6 text-center dark:text-white">{item.quantity}</span>
                                        <button onClick={() => updateBuilderQty(item.id, 1)} className="p-1 hover:text-indigo-600 transition-colors"><Plus size={14}/></button>
                                     </div>
                                  </td>
                                  <td className="p-5 text-right">
                                     <div className="flex items-center justify-end gap-1 font-bold text-sm dark:text-white">
                                        <span>{state.settings.currency}</span>
                                        <input 
                                          type="number" 
                                          value={item.price} 
                                          onChange={e => updateBuilderPrice(item.id, Number(e.target.value))}
                                          className="bg-transparent border-b-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700 outline-none w-16 text-right focus:border-indigo-500 focus:bg-slate-50 dark:focus:bg-slate-800 rounded px-1 transition-all"
                                        />
                                     </div>
                                  </td>
                                  <td className="p-5 text-right">
                                     <p className="text-sm font-black text-slate-800 dark:text-white">{state.settings.currency}{(item.price * item.quantity).toFixed(2)}</p>
                                  </td>
                                  <td className="p-5 text-right">
                                     <button onClick={() => removeBuilderItem(item.id)} className="p-2 text-slate-300 hover:text-rose-50 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18}/></button>
                                  </td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                  </div>
               </div>
            </div>

            <div className="w-full lg:w-[450px] border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 p-8 flex flex-col bg-white dark:bg-slate-900 shadow-[-10px_0_30px_rgba(0,0,0,0.02)] shrink-0 overflow-y-auto custom-scrollbar">
               <div className="flex-1 space-y-6">
                  <div className="flex items-center justify-between">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Calculator size={14}/> Summary</h4>
                  </div>

                  <div className="bg-slate-950 dark:bg-black rounded-[40px] p-8 text-white relative overflow-hidden shadow-2xl">
                     <div className="space-y-4 relative z-10">
                        <div className="flex justify-between items-center text-xs font-black uppercase text-indigo-400 tracking-widest">
                           <span>Subtotal</span>
                           <span>{state.settings.currency}{subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-black uppercase text-slate-500 tracking-widest">
                           <span>VAT / Tax (${state.settings.taxRate}%)</span>
                           <span>{state.settings.currency}{tax.toLocaleString()}</span>
                        </div>
                        <div className="pt-6 border-t border-white/10 mt-2">
                           <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em] mb-1">Payable Amount</p>
                           <h2 className="text-5xl font-black tracking-tighter">{state.settings.currency}{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                           <div className="relative">
                              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                              <input 
                                type="date" 
                                value={builderDate} 
                                onChange={(e) => setBuilderDate(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 pl-12 pr-4 outline-none font-bold text-sm dark:text-white transition-all shadow-inner"
                              />
                           </div>
                        </div>
                        <div className="space-y-3">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.discount}</label>
                           <div className="relative">
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Percent size={18}/></div>
                              <input 
                                type="number" 
                                value={builderDiscount || ''} 
                                onChange={(e) => setBuilderDiscount(Number(e.target.value))}
                                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-rose-500 rounded-2xl py-4 pl-12 pr-4 outline-none font-black text-lg dark:text-white transition-all shadow-inner"
                                placeholder="0.00"
                              />
                           </div>
                        </div>
                     </div>

                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notes</label>
                        <div className="relative">
                           <StickyNote className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                           <input 
                             type="text" 
                             value={builderNotes} 
                             onChange={(e) => setBuilderNotes(e.target.value)}
                             className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 pl-12 pr-4 outline-none font-bold text-sm dark:text-white transition-all shadow-inner"
                             placeholder="Add optional notes..."
                           />
                        </div>
                     </div>
                     
                     <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[32px] space-y-6 border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Wallet size={14}/> Payment</h4>
                            <div>
                               {getStatusBadge(finalPaid >= total ? 'paid' : finalPaid > 0 ? 'partial' : 'unpaid')}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button 
                                onClick={() => setBuilderPaidAmount(total)}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${finalPaid >= total ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200 dark:shadow-none' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-emerald-400'}`}
                            >
                                Full
                            </button>
                            <button 
                                onClick={() => setBuilderPaidAmount(parseFloat((total / 2).toFixed(2)))}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-amber-400`}
                            >
                                50%
                            </button>
                            <button 
                                onClick={() => setBuilderPaidAmount(0)}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${finalPaid === 0 ? 'bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-200 dark:shadow-none' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-rose-400'}`}
                            >
                                Unpaid
                            </button>
                        </div>

                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{state.settings.currency}</div>
                            <input 
                                type="number" 
                                value={builderPaidAmount} 
                                onChange={(e) => setBuilderPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl py-3 pl-10 pr-4 outline-none focus:border-indigo-500 font-black text-lg dark:text-white shadow-sm"
                                placeholder="0.00"
                            />
                        </div>

                        {balanceDue > 0 && (
                             <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold ${builderCustomer ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                                {builderCustomer ? <Scale size={18}/> : <AlertTriangle size={18}/>}
                                <div className="flex-1">
                                    <p>Balance Due: ${state.settings.currency}${balanceDue.toFixed(2)}</p>
                                    {!builderCustomer && <p className="text-[9px] uppercase mt-1 opacity-70 tracking-wide font-black">Customer Required for Credit</p>}
                                </div>
                             </div>
                        )}

                        <div className="grid grid-cols-3 gap-2">
                           {[
                             { id: 'cash', icon: Banknote },
                             { id: 'card', icon: CreditCard },
                             { id: 'transfer', icon: Wallet }
                           ].map(m => (
                             <button 
                               key={m.id}
                               onClick={() => setBuilderPayment(m.id as any)}
                               className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all group ${builderPayment === m.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-indigo-300'}`}
                             >
                                <m.icon size={20} className={builderPayment === m.id ? 'mb-1' : 'mb-1 opacity-50 group-hover:opacity-100'}/>
                                <span className="text-[8px] font-black uppercase tracking-widest">${t[m.id as keyof typeof t]}</span>
                             </button>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>

               <div className="pt-8 flex flex-col gap-4">
                  <button 
                    disabled={builderItems.length === 0 || (balanceDue > 0 && !builderCustomer)}
                    onClick={saveInvoice}
                    className="w-full py-6 bg-indigo-600 text-white rounded-[32px] font-black text-xl flex items-center justify-center gap-4 hover:bg-indigo-700 transition-all shadow-2xl disabled:opacity-50 disabled:shadow-none"
                  >
                     {t.processPrint}
                     <Printer size={28}/>
                  </button>
               </div>
            </div>

          </div>
        </div>
      )}
      
      {/* Template Manager modal code */}
      {isManagingTemplates && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-4xl h-[80vh] shadow-2xl relative flex flex-col overflow-hidden animate-in zoom-in-95">
             <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
                <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Invoice Templates</h3>
                <button onClick={() => { setIsManagingTemplates(false); setEditingTemplate(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400"><X size={24}/></button>
             </div>
             
             <div className="flex-1 flex overflow-hidden">
                {/* Sidebar List */}
                <div className="w-1/3 border-r border-slate-100 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-800/20">
                   <div className="p-4 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                      {state.templates.map(tmp => (
                         <div key={tmp.id} 
                              onClick={() => setEditingTemplate(tmp)}
                              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer group ${editingTemplate?.id === tmp.id ? 'bg-white dark:bg-slate-800 border-indigo-500 shadow-md' : 'bg-white dark:bg-slate-900 border-transparent hover:border-slate-200 dark:hover:border-slate-700'}`}
                         >
                            <div className="flex justify-between items-start mb-2">
                               <h4 className={`font-bold text-sm ${editingTemplate?.id === tmp.id ? 'text-indigo-600' : 'text-slate-700 dark:text-slate-200'}`}>{tmp.name}</h4>
                               {state.settings.invoiceTemplate === tmp.id && <span className="bg-indigo-100 text-indigo-700 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">Active</span>}
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">${tmp.layout}</p>
                         </div>
                      ))}
                   </div>
                   <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <button 
                        onClick={() => setEditingTemplate({ id: '', name: 'New Template', layout: 'modern', brandColor: state.settings.brandColor, showLogo: true, headerText: '', footerText: '' })}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                      >
                         <Plus size={16}/> New Template
                      </button>
                   </div>
                </div>

                {/* Edit Area */}
                <div className="flex-1 p-8 overflow-y-auto bg-white dark:bg-slate-900 custom-scrollbar">
                   {editingTemplate ? (
                      <div className="space-y-6 max-w-lg mx-auto">
                         <div className="flex justify-between items-center mb-6">
                            <h4 className="text-lg font-black dark:text-white flex items-center gap-2">
                               <PenTool size={18} className="text-indigo-600"/>
                               {editingTemplate.id ? 'Edit Template' : 'Create Template'}
                            </h4>
                            {editingTemplate.id && editingTemplate.id !== state.settings.invoiceTemplate && (
                               <button 
                                  onClick={() => handleDeleteTemplate(editingTemplate.id!)}
                                  className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 p-2 rounded-lg transition-colors"
                                  title="Delete Template"
                               >
                                  <Trash2 size={18}/>
                               </button>
                            )}
                         </div>

                         <div className="space-y-4">
                            <div>
                               <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Template Name</label>
                               <input 
                                  type="text" 
                                  value={editingTemplate.name || ''}
                                  onChange={e => setEditingTemplate({...editingTemplate, name: e.target.value})}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold dark:text-white outline-none focus:border-indigo-500"
                                  placeholder="e.g. Holiday Special"
                               />
                            </div>
                            
                            <div>
                               <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Layout Style</label>
                               <div className="grid grid-cols-3 gap-3">
                                  {['modern', 'minimal', 'classic'].map(l => (
                                     <button
                                        key={l}
                                        onClick={() => setEditingTemplate({...editingTemplate, layout: l as any})}
                                        className={`py-3 rounded-xl border-2 text-xs font-bold uppercase transition-all ${editingTemplate.layout === l ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 dark:border-slate-700 text-slate-500'}`}
                                     >
                                        ${l}
                                     </button>
                                  ))}
                               </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                               <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Brand Color</label>
                                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                                     <input 
                                        type="color" 
                                        value={editingTemplate.brandColor || '#6366f1'}
                                        onChange={e => setEditingTemplate({...editingTemplate, brandColor: e.target.value})}
                                        className="h-8 w-8 rounded-lg cursor-pointer border-none p-0 bg-transparent"
                                     />
                                     <span className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase">${editingTemplate.brandColor}</span>
                                  </div>
                                </div>
                               <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Options</label>
                                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                     <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${editingTemplate.showLogo ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                        {editingTemplate.showLogo && <Check size={14}/>}
                                     </div>
                                     <input 
                                        type="checkbox"
                                        checked={editingTemplate.showLogo || false}
                                        onChange={e => setEditingTemplate({...editingTemplate, showLogo: e.target.checked})}
                                        className="hidden"
                                     />
                                     <span className="text-xs font-bold dark:text-white">Show Shop Logo</span>
                                  </label>
                               </div>
                            </div>

                            <div>
                               <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Invoice Title / Header</label>
                               <textarea 
                                  value={editingTemplate.headerText || ''}
                                  onChange={e => setEditingTemplate({...editingTemplate, headerText: e.target.value})}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium dark:text-white outline-none focus:border-indigo-500 h-20 resize-none"
                                  placeholder="e.g. Professional Tax Invoice"
                               />
                            </div>

                            <div>
                               <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Footer / Terms</label>
                               <textarea 
                                  value={editingTemplate.footerText || ''}
                                  onChange={e => setEditingTemplate({...editingTemplate, footerText: e.target.value})}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium dark:text-white outline-none focus:border-indigo-500 h-20 resize-none"
                                  placeholder="e.g. Please settle outstanding balances within 14 days."
                               />
                            </div>

                            <div className="pt-4 flex gap-3">
                               <button 
                                  onClick={() => handleSaveTemplate(editingTemplate)}
                                  className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
                                >
                                  Save Template
                               </button>
                               {editingTemplate.id && editingTemplate.id !== state.settings.invoiceTemplate && (
                                  <button 
                                     onClick={() => handleSetActiveTemplate(editingTemplate.id!)}
                                     className="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all active:scale-95"
                                  >
                                     Set Active
                                  </button>
                               )}
                            </div>
                         </div>
                      </div>
                   ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50">
                         <Layout size={64} strokeWidth={1}/>
                         <p className="font-black text-sm uppercase tracking-widest">Select a template to edit</p>
                      </div>
                   )}
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
