
import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Eye, 
  Printer,
  Calendar,
  X,
  User,
  Trash2,
  Package,
  Plus,
  Minus,
  Edit,
  Filter,
  RotateCcw,
  ChevronDown,
  ArrowRight,
  Smartphone,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Banknote,
  CreditCard,
  ArrowUpRight,
  Scale,
  MoreVertical,
  ChevronUp,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  CheckSquare,
  Square,
  Download,
  History,
  TrendingUp,
  FileCheck,
  ShieldAlert,
  BarChart2,
  Share2,
  ChevronRight,
  MapPin,
  Phone
} from 'lucide-react';
import { AppState, Product, Customer, CartItem, Invoice, View, LoanTransaction } from '../types';
import { translations } from '../translations';

interface Props {
  state: AppState;
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
  setCurrentView?: (view: View) => void;
}

type SortKey = 'id' | 'date' | 'total' | 'status';
type SortOrder = 'asc' | 'desc';
type PrintLayout = 'a4' | 'advice' | 'thermal';

const Invoices: React.FC<Props> = ({ state, updateState }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewData, setPreviewData] = useState<{inv: Invoice, layout: PrintLayout} | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  const t = translations[state.settings.language || 'en'];

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const filteredInvoices = useMemo(() => {
    let result = state.invoices.filter(inv => {
      const customer = state.customers.find(c => c.id === inv.customerId);
      const matchesSearch = inv.id.toString().includes(searchTerm) || 
                            customer?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      const matchesMethod = methodFilter === 'all' || inv.paymentMethod === methodFilter;
      const matchesDate = !dateFilter || inv.date.startsWith(dateFilter);
      
      return matchesSearch && matchesStatus && matchesMethod && matchesDate;
    });

    result.sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'id') comparison = Number(a.id) - Number(b.id);
      else if (sortKey === 'date') comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      else if (sortKey === 'total') comparison = a.total - b.total;
      else if (sortKey === 'status') comparison = a.status.localeCompare(b.status);
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [state.invoices, searchTerm, statusFilter, methodFilter, dateFilter, state.customers, sortKey, sortOrder]);

  const totals = useMemo(() => {
    return filteredInvoices.reduce((acc, inv) => ({
      total: acc.total + inv.total,
      collected: acc.collected + inv.paidAmount,
      balance: acc.balance + (inv.total - inv.paidAmount),
      profit: acc.profit + (inv.profit || 0)
    }), { total: 0, collected: 0, balance: 0, profit: 0 });
  }, [filteredInvoices]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInvoices.map(i => i.id)));
    }
  };

  const deleteInvoice = (id: string) => {
    if (window.confirm("Are you sure? This will return items to stock and adjust customer balances.")) {
      const inv = state.invoices.find(i => i.id === id);
      if (inv) {
        updateState('products', state.products.map(p => {
          const item = inv.items.find(it => it.id === p.id);
          return item ? { ...p, stock: p.stock + item.quantity } : p;
        }));
        if (inv.customerId) {
          updateState('customers', state.customers.map(c => c.id === inv.customerId ? { ...c, totalSpent: Math.max(0, c.totalSpent - inv.total), totalDebt: Math.max(0, c.totalDebt - (inv.total - inv.paidAmount)) } : c));
        }
      }
      updateState('invoices', state.invoices.filter(i => i.id !== id));
      setSelectedInvoice(null);
    }
  };

  const bulkDelete = () => {
    if (window.confirm(`Delete ${selectedIds.size} invoices? Stock and customer data will be reverted.`)) {
      let updatedProducts = [...state.products];
      let updatedCustomers = [...state.customers];
      
      selectedIds.forEach(id => {
        const inv = state.invoices.find(i => i.id === id);
        if (inv) {
          updatedProducts = updatedProducts.map(p => {
            const item = inv.items.find(it => it.id === p.id);
            return item ? { ...p, stock: p.stock + item.quantity } : p;
          });
          if (inv.customerId) {
            updatedCustomers = updatedCustomers.map(c => c.id === inv.customerId ? { ...c, totalSpent: Math.max(0, c.totalSpent - inv.total), totalDebt: Math.max(0, c.totalDebt - (inv.total - inv.paidAmount)) } : c);
          }
        }
      });

      updateState('products', updatedProducts);
      updateState('customers', updatedCustomers);
      updateState('invoices', state.invoices.filter(i => !selectedIds.has(i.id)));
      setSelectedIds(new Set());
    }
  };

  const bulkMarkAsPaid = () => {
    if (window.confirm(`Mark ${selectedIds.size} invoices as fully paid? This will reconcile outstanding debt.`)) {
      let updatedCustomers = [...state.customers];
      const updatedInvoices = state.invoices.map(inv => {
        if (selectedIds.has(inv.id) && inv.status !== 'paid') {
          const balance = inv.total - inv.paidAmount;
          if (inv.customerId) {
            updatedCustomers = updatedCustomers.map(c => c.id === inv.customerId ? { ...c, totalDebt: Math.max(0, c.totalDebt - balance) } : c);
          }
          return { ...inv, paidAmount: inv.total, status: 'paid' as const };
        }
        return inv;
      });

      updateState('customers', updatedCustomers);
      updateState('invoices', updatedInvoices);
      setSelectedIds(new Set());
    }
  };

  const exportToCSV = () => {
    const headers = ['Invoice ID', 'Date', 'Customer', 'Total', 'Paid', 'Balance', 'Profit', 'Status', 'Method'];
    const rows = filteredInvoices.map(inv => {
      const cust = state.customers.find(c => c.id === inv.customerId);
      return [
        inv.id,
        new Date(inv.date).toLocaleDateString(),
        cust?.name || 'Walk-in',
        inv.total,
        inv.paidAmount,
        inv.total - inv.paidAmount,
        inv.profit || 0,
        inv.status,
        inv.paymentMethod
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Sarvari_Invoices_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generatePrintHTML = (inv: Invoice, layout: PrintLayout) => {
    const cust = state.customers.find(c => c.id === inv.customerId);
    const currency = state.settings.currency;
    const shop = state.settings;
    
    const itemsHTML = inv.items.map((it, idx) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px 8px; font-size: 11px; color: #64748b;">${idx+1}</td>
        <td style="padding: 12px 8px; font-size: 12px; font-weight: 600;">
           <div style="color: #1e293b;">${it.name}</div>
           <div style="font-size: 10px; color: #94a3b8; font-weight: normal; margin-top: 2px;">${it.sku}</div>
        </td>
        <td style="padding: 12px 8px; text-align: center; font-size: 12px;">${it.quantity}</td>
        <td style="padding: 12px 8px; text-align: right; font-size: 12px; color: #64748b;">${currency}${it.price.toLocaleString()}</td>
        <td style="padding: 12px 8px; text-align: right; font-weight: 700; font-size: 12px; color: #1e293b;">${currency}${(it.price * it.quantity).toLocaleString()}</td>
      </tr>`).join('');

    if (layout === 'a4' || layout === 'advice') {
      const isAdvice = layout === 'advice';
      return `
      <div style="padding: 15mm; font-family: 'Inter', sans-serif; background: #fff; width: 210mm; min-height: 297mm; margin: 0 auto; color: #1e293b; box-sizing: border-box;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 4px solid #4f46e5; padding-bottom: 20px;">
          <div>
            <div style="width: 48px; height: 48px; background: #4f46e5; color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 24px; margin-bottom: 15px;">S</div>
            <h1 style="margin: 0; color: #1e293b; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px;">${shop.shopName}</h1>
            <div style="margin-top: 8px; font-size: 11px; color: #64748b; line-height: 1.5;">
              <div>${shop.shopAddress || ''}</div>
              <div>Phone: ${shop.shopPhone || ''}</div>
              <div>Email: ${shop.shopEmail || ''}</div>
            </div>
          </div>
          <div style="text-align: right;">
            <h2 style="margin: 0; font-size: 28px; font-weight: 900; color: #4f46e5; letter-spacing: -1px;">${isAdvice ? 'PAYMENT ADVICE' : 'TAX INVOICE'}</h2>
            <div style="margin-top: 15px; background: #f8fafc; padding: 12px 20px; border-radius: 12px; display: inline-block;">
               <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Reference No.</div>
               <div style="font-size: 16px; font-weight: 900; color: #1e293b;">#INV-${inv.id.padStart(4, '0')}</div>
               <div style="font-size: 11px; font-weight: 700; color: #64748b; margin-top: 4px;">${new Date(inv.date).toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 40px; margin-bottom: 40px;">
           <div style="background: #f8fafc; padding: 25px; border-radius: 20px; border: 1px solid #f1f5f9;">
             <p style="margin: 0; font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Customer Identity</p>
             <p style="margin: 8px 0 0 0; font-size: 18px; font-weight: 900; color: #1e293b;">${cust?.name || 'Walk-in Customer'}</p>
             <p style="margin: 4px 0 0 0; font-size: 12px; font-weight: 700; color: #4f46e5;">${cust?.phone || ''}</p>
             ${cust?.address ? `<p style="margin: 6px 0 0 0; font-size: 11px; color: #64748b; line-height: 1.4;">${cust.address}</p>` : ''}
           </div>
           <div style="background: ${inv.status === 'paid' ? '#f0fdf4' : '#fef2f2'}; padding: 25px; border-radius: 20px; border: 1px solid ${inv.status === 'paid' ? '#dcfce7' : '#fee2e2'}; display: flex; flex-direction: column; justify-content: center;">
             <p style="margin: 0; font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Account Status</p>
             <p style="margin: 8px 0 0 0; font-size: 20px; font-weight: 900; color: ${inv.status === 'paid' ? '#16a34a' : '#dc2626'}; text-transform: uppercase;">${inv.status}</p>
             <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 700; color: #64748b;">Method: ${inv.paymentMethod.toUpperCase()}</p>
           </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
          <thead>
            <tr style="background: #1e293b;">
              <th style="padding: 12px 10px; text-align: left; font-size: 10px; color: #fff; text-transform: uppercase; border-top-left-radius: 8px; border-bottom-left-radius: 8px;">#</th>
              <th style="padding: 12px 10px; text-align: left; font-size: 10px; color: #fff; text-transform: uppercase;">Description</th>
              <th style="padding: 12px 10px; text-align: center; font-size: 10px; color: #fff; text-transform: uppercase;">Qty</th>
              <th style="padding: 12px 10px; text-align: right; font-size: 10px; color: #fff; text-transform: uppercase;">Price</th>
              <th style="padding: 12px 10px; text-align: right; font-size: 10px; color: #fff; text-transform: uppercase; border-top-right-radius: 8px; border-bottom-right-radius: 8px;">Total</th>
            </tr>
          </thead>
          <tbody>${itemsHTML}</tbody>
        </table>

        <div style="display: flex; justify-content: flex-end; margin-bottom: 60px;">
          <div style="width: 300px; background: #f8fafc; border-radius: 20px; padding: 25px; border: 1px solid #f1f5f9;">
             <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
               <span style="color: #64748b; font-size: 12px; font-weight: 600;">Gross Amount</span>
               <span style="font-weight: 700; color: #1e293b;">${currency}${inv.total.toLocaleString()}</span>
             </div>
             <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
               <span style="color: #64748b; font-size: 12px; font-weight: 600;">Payment Applied</span>
               <span style="font-weight: 700; color: #16a34a;">${currency}${inv.paidAmount.toLocaleString()}</span>
             </div>
             <div style="display: flex; justify-content: space-between; padding: 15px 0 0 0; margin-top: 5px;">
               <span style="font-weight: 900; font-size: 14px; color: #1e293b; text-transform: uppercase;">Balance Due</span>
               <span style="font-weight: 900; font-size: 18px; color: #dc2626;">${currency}${(inv.total - inv.paidAmount).toLocaleString()}</span>
             </div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; border-top: 2px solid #f1f5f9; padding-top: 30px;">
           <div style="width: 200px;">
              <p style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 800; margin-bottom: 50px;">Prepared By</p>
              <div style="border-bottom: 1px solid #e2e8f0; width: 100%;"></div>
              <p style="font-size: 10px; color: #64748b; font-weight: 700; margin-top: 5px;">Digital Terminal Signature</p>
           </div>
           <div style="width: 200px; text-align: right;">
              <p style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 800; margin-bottom: 50px;">Customer Signature</p>
              <div style="border-bottom: 1px solid #e2e8f0; width: 100%;"></div>
              <p style="font-size: 10px; color: #64748b; font-weight: 700; margin-top: 5px;">Acknowledge Receipt</p>
           </div>
        </div>
        
        <div style="margin-top: 60px; text-align: center; color: #94a3b8; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">
           Thank you for choosing ${shop.shopName}
        </div>
      </div>`;
    }

    return `
      <div style="width: 80mm; padding: 8mm 4mm; font-family: 'Courier New', Courier, monospace; color: #000; background: #fff; font-size: 12px; line-height: 1.4;">
        <div style="text-align: center; margin-bottom: 15px;">
           <h2 style="margin: 0; font-size: 20px; font-weight: bold; text-transform: uppercase;">${shop.shopName}</h2>
           <div style="font-size: 10px; margin-top: 2px;">${shop.shopAddress || ''}</div>
           <div style="font-size: 10px;">${shop.shopPhone || ''}</div>
        </div>
        
        <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
        <div style="display: flex; justify-content: space-between; font-weight: bold;">
           <span>INV #${inv.id.padStart(4, '0')}</span>
           <span>${new Date(inv.date).toLocaleDateString()}</span>
        </div>
        <div style="font-size: 10px; margin-bottom: 5px;">TIME: ${new Date(inv.date).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</div>
        <div style="font-size: 10px; font-weight: bold;">CUST: ${cust?.name || 'WALK-IN'}</div>
        <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
        
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="text-align: left; padding: 2px 0;">ITEM</th>
              <th style="text-align: center; padding: 2px 0;">QTY</th>
              <th style="text-align: right; padding: 2px 0;">PRICE</th>
            </tr>
          </thead>
          <tbody>
            ${inv.items.map(it => `
              <tr>
                <td style="padding: 2px 0; font-weight: bold;">${it.name.toUpperCase().slice(0, 15)}</td>
                <td style="text-align: center; padding: 2px 0;">${it.quantity}</td>
                <td style="text-align: right; padding: 2px 0;">${currency}${(it.price * it.quantity).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
        
        <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; margin: 5px 0;">
          <span>TOTAL</span>
          <span>${currency}${inv.total.toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>PAID (${inv.paymentMethod.toUpperCase()})</span>
          <span>${currency}${inv.paidAmount.toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: bold;">
          <span>BALANCE</span>
          <span>${currency}${(inv.total - inv.paidAmount).toLocaleString()}</span>
        </div>
        
        <div style="border-top: 1px dashed #000; margin: 15px 0 10px 0;"></div>
        <div style="text-align: center; font-size: 10px; font-weight: bold;">
           *** THANK YOU ***
           <br/>STAY BLESSED
        </div>
      </div>`;
  };

  const handlePrint = (inv: Invoice, layout: PrintLayout) => {
    const ps = document.getElementById('print-section');
    if (!ps) return;
    ps.innerHTML = generatePrintHTML(inv, layout);
    setTimeout(() => { 
      window.print(); 
      ps.innerHTML = ''; 
      setPreviewData(null); 
    }, 500);
  };

  const repaymentHistory = useMemo(() => {
    if (!selectedInvoice) return [];
    return state.loanTransactions.filter(t => t.invoiceId === selectedInvoice.id || (t.customerId === selectedInvoice.customerId && t.type === 'repayment')).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedInvoice, state.loanTransactions]);

  return (
    <div className="space-y-4 animate-in fade-in duration-500 max-w-full overflow-hidden pb-20">
      {/* High-Level Financial Ledger Header */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Document Volume', value: filteredInvoices.length, icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
          { label: 'Total Valuation', value: totals.total, isCurrency: true, icon: TrendingUp, color: 'text-slate-800 dark:text-white', bg: 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800' },
          { label: 'Projected Margins', value: totals.profit, isCurrency: true, icon: FileCheck, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { label: 'Outstanding Balance', value: totals.balance, isCurrency: true, icon: Scale, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
        ].map((stat, i) => (
          <div key={i} className={`p-5 rounded-[32px] border dark:border-slate-800 shadow-sm flex items-center gap-5 transition-all hover:shadow-md ${stat.bg}`}>
             <div className={`${stat.color} w-12 h-12 flex items-center justify-center rounded-2xl shrink-0 bg-white dark:bg-slate-800 shadow-inner`}>
                <stat.icon size={22} strokeWidth={2.5}/>
             </div>
             <div className="min-w-0">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 truncate">{stat.label}</p>
                <h4 className={`text-lg font-black truncate leading-none ${stat.color}`}>
                   {stat.isCurrency ? state.settings.currency : ''}{stat.value.toLocaleString()}
                </h4>
             </div>
          </div>
        ))}
      </div>

      {/* Advanced Control & Search Panel */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Query Audit Vault (Invoice ID or Customer Name)..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 pl-12 pr-6 outline-none text-xs font-black dark:text-white placeholder:text-slate-400" 
            />
          </div>
          <div className="flex items-center gap-2 w-full lg:w-auto shrink-0">
            {selectedIds.size > 0 && (
              <div className="flex gap-2 animate-in slide-in-from-right-2">
                <button onClick={bulkMarkAsPaid} className="px-5 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-emerald-200 dark:shadow-none flex items-center gap-2">
                  <CheckCircle2 size={16}/> {t.bulkPaid}
                </button>
                <button onClick={bulkDelete} className="px-5 py-3.5 bg-rose-50 text-rose-600 rounded-2xl font-black text-[10px] uppercase border border-rose-100 flex items-center gap-2">
                  <Trash2 size={16}/> Wipe
                </button>
              </div>
            )}
            <button 
              onClick={exportToCSV}
              className="flex-1 lg:flex-none px-6 py-3.5 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 shadow-lg"
            >
              <FileSpreadsheet size={16}/> {t.exportCsv}
            </button>
            <button 
              onClick={() => setShowFilters(!showFilters)} 
              className={`flex-1 lg:flex-none px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase border transition-all flex items-center justify-center gap-2 ${showFilters ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-400'}`}
            >
              <Filter size={16}/> {showFilters ? 'Hide Parameters' : 'Audit Parameters'}
            </button>
            <button onClick={() => { setSearchTerm(''); setStatusFilter('all'); setMethodFilter('all'); setDateFilter(''); }} className="p-3.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-2xl hover:text-indigo-600 transition-all">
               <RotateCcw size={20}/>
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="pt-4 border-t dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-6 animate-in slide-in-from-top-2 duration-300">
             <div className="space-y-2">
                <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1"><Calendar size={12}/> Temporal Range</label>
                <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl py-3 px-4 text-[11px] font-black dark:text-white outline-none focus:ring-2 ring-indigo-500/20" />
             </div>
             <div className="space-y-2">
                <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1"><CheckCircle2 size={12}/> Settlement Status</label>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl py-3 px-4 text-[11px] font-black dark:text-white outline-none">
                   <option value="all">Global Status</option>
                   <option value="paid">Settled (Full)</option>
                   <option value="partial">Awaiting Partial</option>
                   <option value="unpaid">Zero Deposit</option>
                </select>
             </div>
             <div className="space-y-2">
                <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1"><CreditCard size={12}/> Disbursement Method</label>
                <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl py-3 px-4 text-[11px] font-black dark:text-white outline-none">
                   <option value="all">Global Channels</option>
                   <option value="cash">Liquid Currency</option>
                   <option value="card">Digital Processing</option>
                   <option value="transfer">Direct Deposit</option>
                </select>
             </div>
          </div>
        )}
      </div>

      {/* Main Table Ledger */}
      <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-5 w-16 text-center">
                  <button onClick={toggleSelectAll} className="text-slate-400 hover:text-indigo-600 transition-colors">
                    {selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0 ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} />}
                  </button>
                </th>
                <th onClick={() => handleSort('id')} className="px-6 py-5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group">
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                    ID {sortKey === 'id' ? (sortOrder === 'asc' ? <SortAsc size={14} className="text-indigo-600" /> : <SortDesc size={14} className="text-indigo-600" />) : <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-100" />}
                  </div>
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Entity Signature</th>
                <th onClick={() => handleSort('date')} className="px-6 py-5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group">
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                    Timestamp {sortKey === 'date' ? (sortOrder === 'asc' ? <SortAsc size={14} className="text-indigo-600" /> : <SortDesc size={14} className="text-indigo-600" />) : <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-100" />}
                  </div>
                </th>
                <th onClick={() => handleSort('total')} className="px-6 py-5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group">
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                    Bill Value {sortKey === 'total' ? (sortOrder === 'asc' ? <SortAsc size={14} className="text-indigo-600" /> : <SortDesc size={14} className="text-indigo-600" />) : <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-100" />}
                  </div>
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Margin Index</th>
                <th onClick={() => handleSort('status')} className="px-6 py-5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group text-center">
                  <div className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                    Audit {sortKey === 'status' ? (sortOrder === 'asc' ? <SortAsc size={14} className="text-indigo-600" /> : <SortDesc size={14} className="text-indigo-600" />) : <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-100" />}
                  </div>
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredInvoices.map((inv) => {
                const customer = state.customers.find(c => c.id === inv.customerId);
                const isSelected = selectedIds.has(inv.id);
                const marginPercent = ((inv.profit || 0) / (inv.total || 1)) * 100;
                
                return (
                  <tr key={inv.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all cursor-pointer group ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`} onClick={() => setSelectedInvoice(inv)}>
                    <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                       <button onClick={() => toggleSelect(inv.id)} className={`${isSelected ? 'text-indigo-600' : 'text-slate-300'} hover:text-indigo-600`}>
                          {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                       </button>
                    </td>
                    <td className="px-6 py-4">
                       <span className="font-black text-[12px] text-slate-500 group-hover:text-indigo-600 transition-colors">#INV-{inv.id.padStart(4, '0')}</span>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[11px] font-black dark:text-slate-400 border border-transparent group-hover:border-indigo-200">{customer?.name?.charAt(0) || 'W'}</div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-black dark:text-slate-200 truncate max-w-[140px] leading-tight">{customer?.name || 'Walk-in Customer'}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{inv.paymentMethod}</p>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <p className="text-[11px] font-black dark:text-slate-300">{new Date(inv.date).toLocaleDateString()}</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase">{new Date(inv.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="px-6 py-4">
                       <p className="font-black text-slate-900 dark:text-white text-[14px] leading-tight">{state.settings.currency}{inv.total.toLocaleString()}</p>
                       <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${inv.status === 'paid' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{state.settings.currency}{inv.paidAmount.toLocaleString()} Dep</span>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="space-y-1">
                          <p className={`text-[11px] font-black ${marginPercent > 25 ? 'text-emerald-500' : marginPercent > 10 ? 'text-amber-500' : 'text-rose-500'}`}>{marginPercent.toFixed(1)}% Efficiency</p>
                          <div className="w-20 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                             <div className={`h-full ${marginPercent > 25 ? 'bg-emerald-500' : marginPercent > 10 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, Math.max(0, marginPercent))}%` }}></div>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : inv.status === 'partial' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                          {inv.status === 'paid' ? <CheckCircle2 size={12}/> : inv.status === 'partial' ? <Clock size={12}/> : <AlertCircle size={12}/>}
                          {inv.status}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setSelectedInvoice(inv)} className="p-2 text-slate-400 hover:text-indigo-600 transition-transform active:scale-90" title="View Detailed Audit"><Eye size={18}/></button>
                          <button onClick={() => setPreviewData({inv, layout: 'a4'})} className="p-2 text-slate-400 hover:text-indigo-600 transition-transform active:scale-90" title="Print Options"><Printer size={18}/></button>
                          <button onClick={() => deleteInvoice(inv.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-transform active:scale-90"><Trash2 size={18}/></button>
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Modal */}
      {previewData && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-4xl h-[90vh] shadow-2xl relative flex flex-col overflow-hidden animate-in zoom-in duration-200">
              <header className="p-6 border-b flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-slate-900 z-10 gap-4">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600"><Printer size={20}/></div>
                    <div>
                       <h3 className="text-sm font-black dark:text-white uppercase tracking-widest">Document Audit Preview</h3>
                       <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Reference #INV-{previewData.inv.id.padStart(4, '0')}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex gap-1 overflow-x-auto no-scrollbar max-w-[280px] sm:max-w-none">
                       {(['a4', 'advice', 'thermal'] as PrintLayout[]).map(l => (
                         <button 
                          key={l}
                          onClick={() => setPreviewData({...previewData, layout: l})}
                          className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${previewData.layout === l ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                         >{l === 'a4' ? 'Tax Invoice' : l}</button>
                       ))}
                    </div>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden sm:block" />
                    <button onClick={() => handlePrint(previewData.inv, previewData.layout)} className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2 font-black text-[10px] uppercase">
                       <Printer size={16}/> Print
                    </button>
                    <button onClick={() => setPreviewData(null)} className="p-3 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                       <X size={20}/>
                    </button>
                 </div>
              </header>
              <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-4 lg:p-10 overflow-y-auto flex justify-center custom-scrollbar">
                 <div className="bg-white shadow-2xl relative" style={{ width: previewData.layout === 'thermal' ? '80mm' : '210mm', minHeight: previewData.layout === 'thermal' ? 'auto' : '297mm', height: 'fit-content' }}>
                    <iframe 
                      srcDoc={generatePrintHTML(previewData.inv, previewData.layout)} 
                      className="w-full h-full border-none pointer-events-none" 
                      style={{ minHeight: previewData.layout === 'thermal' ? '150mm' : '297mm' }}
                      title="Invoice Preview" 
                    />
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Detailed Document Modal */}
      {selectedInvoice && !previewData && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-t-[48px] sm:rounded-[60px] w-full max-w-6xl h-[95vh] sm:h-[90vh] shadow-2xl relative flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-300">
              <header className="p-8 lg:p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 z-10 shrink-0">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center font-black text-2xl shadow-2xl shrink-0 border-4 border-white dark:border-slate-800">
                      <FileCheck size={28}/>
                    </div>
                    <div>
                       <h3 className="text-2xl sm:text-3xl font-black dark:text-white leading-tight uppercase tracking-tighter flex items-center gap-3">Entry #INV-{selectedInvoice.id.padStart(4, '0')} <ShieldAlert size={20} className="text-emerald-500" /></h3>
                       <div className="flex items-center gap-3 mt-1.5">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedInvoice.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                            Audit: {selectedInvoice.status}
                          </span>
                          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest opacity-60">
                            Logged {new Date(selectedInvoice.date).toLocaleString()}
                          </span>
                       </div>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <button onClick={() => setPreviewData({inv: selectedInvoice, layout: 'a4'})} className="hidden lg:flex p-4 bg-indigo-600 text-white rounded-[22px] font-black text-[10px] uppercase tracking-widest items-center gap-2 shadow-lg hover:bg-indigo-700 transition-all"><Printer size={20}/> Print View</button>
                    <button onClick={() => setSelectedInvoice(null)} className="p-4 bg-slate-100 dark:bg-slate-800 rounded-[22px] text-slate-400 hover:text-rose-600 transition-all"><X size={28}/></button>
                 </div>
              </header>

              <div className="flex-1 overflow-y-auto p-8 lg:p-12 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/20 grid grid-cols-1 lg:grid-cols-4 gap-10">
                 <div className="lg:col-span-1 space-y-8">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
                       <div>
                          <h5 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest border-b dark:border-slate-800 pb-4 flex items-center gap-2"><User size={14}/> Identity</h5>
                          <div className="flex items-center gap-4 mt-6">
                             <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center font-black text-base border">{state.customers.find(c => c.id === selectedInvoice.customerId)?.name.charAt(0) || 'W'}</div>
                             <div className="min-w-0">
                                <p className="text-[10px] font-black text-slate-400 uppercase">Billing To</p>
                                <p className="text-base font-black dark:text-white truncate">{state.customers.find(c => c.id === selectedInvoice.customerId)?.name || 'Walk-in Customer'}</p>
                             </div>
                          </div>
                       </div>
                       <div className="space-y-4">
                          <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase">Bill Total</span><span className="font-black dark:text-white text-lg">{state.settings.currency}{selectedInvoice.total.toLocaleString()}</span></div>
                          <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase">Paid Amount</span><span className="font-black text-emerald-500 text-lg">{state.settings.currency}{selectedInvoice.paidAmount.toLocaleString()}</span></div>
                          <div className="flex justify-between items-center pt-4 border-t dark:border-slate-800"><span className="text-[10px] font-black text-slate-400 uppercase">Balance</span><span className="font-black text-rose-500 text-xl">{state.settings.currency}{(selectedInvoice.total - selectedInvoice.paidAmount).toLocaleString()}</span></div>
                       </div>
                    </div>

                    <div className="bg-slate-950 p-8 rounded-[40px] text-white shadow-2xl space-y-8">
                       <h5 className="text-[11px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2"><History size={14}/> Reconciliation History</h5>
                       <div className="space-y-4">
                          {repaymentHistory.map((h, i) => (
                             <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                                <div><p className="text-[10px] font-black uppercase text-indigo-300">{h.type}</p><p className="text-[8px] font-bold text-slate-500 mt-0.5">{new Date(h.date).toLocaleDateString()}</p></div>
                                <p className="text-sm font-black text-emerald-400">+{state.settings.currency}{h.amount.toLocaleString()}</p>
                             </div>
                          ))}
                          {repaymentHistory.length === 0 && <div className="text-center py-6 opacity-30 text-[9px] font-black uppercase tracking-widest">No reconciliation history</div>}
                       </div>
                    </div>
                 </div>

                 <div className="lg:col-span-3 space-y-8">
                    <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                       <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                             <tr>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Operational Breakdown</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Qty</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Unit Price</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                             {selectedInvoice.items.map((it, i) => (
                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                   <td className="px-8 py-5">
                                      <p className="text-sm font-black dark:text-slate-200">{it.name}</p>
                                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{it.sku}</p>
                                   </td>
                                   <td className="px-8 py-5 text-center"><span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl font-black text-[11px] dark:text-slate-400">x{it.quantity}</span></td>
                                   <td className="px-8 py-5 text-right text-sm font-bold text-slate-500">{state.settings.currency}{it.price.toLocaleString()}</td>
                                   <td className="px-8 py-5 text-right text-base font-black dark:text-white">{state.settings.currency}{(it.price * it.quantity).toLocaleString()}</td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                       <div className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] shadow-sm">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Entry Profit</p>
                          <p className="text-2xl font-black text-emerald-500 tracking-tighter">{state.settings.currency}{(selectedInvoice.profit || 0).toLocaleString()}</p>
                       </div>
                       <div className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] shadow-sm">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Margin Efficacy</p>
                          <p className="text-2xl font-black text-indigo-600 tracking-tighter">{(( (selectedInvoice.profit || 0) / (selectedInvoice.total || 1) ) * 100).toFixed(1)}%</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
