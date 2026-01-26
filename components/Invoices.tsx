import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Eye, 
  Printer,
  Calendar,
  X,
  Trash2,
  TrendingUp,
  FileCheck,
  FileDown,
  Scale,
  Loader2,
  CheckSquare,
  Square,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  Package,
  MinusCircle,
  PlusCircle,
  ArrowDownLeft,
  ChevronRight,
  ShieldCheck,
  Banknote,
  History,
  Info,
  Plus,
  User,
  Zap,
  Tag,
  CreditCard,
  ShoppingCart,
  CheckCircle2,
  ArrowRight,
  DollarSign,
  Percent,
  Wallet,
  ArrowUpRight,
  ScanLine,
  Flashlight
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { AppState, Invoice, View, CartItem, Product, LoanTransaction, Customer, ProductVariation } from '../types';
import { translations } from '../translations';
import { generatePrintHTML, PrintLayout } from '../printService';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  state: AppState;
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
  setCurrentView: (view: View) => void;
}

type SortKey = 'id' | 'date' | 'total' | 'status';
type SortOrder = 'asc' | 'desc';

export default function Invoices({ state, updateState, setCurrentView }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPrinting, setIsPrinting] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [trashConfirm, setTrashConfirm] = useState<string | null>(null);
  
  // Creation Flow State
  const [isCreating, setIsCreating] = useState(false);
  const [draftItems, setDraftItems] = useState<CartItem[]>([]);
  const [draftCustomerId, setDraftCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [draftDiscount, setDraftDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('fixed');
  const [draftPayment, setDraftPayment] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [draftPaidAmount, setDraftPaidAmount] = useState<number | ''>('');
  const [paymentStatusMode, setPaymentStatusMode] = useState<'paid' | 'partial' | 'unpaid'>('paid');
  const [productSearch, setProductSearch] = useState('');

  // Scanner State for Invoices
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Return Logic State
  const [returningInvoice, setReturningInvoice] = useState<Invoice | null>(null);
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});

  const t = translations[state.settings.language || 'en'];

  const activeInvoices = useMemo(() => state.invoices.filter(i => !i.isDeleted), [state.invoices]);

  const filteredInvoices = useMemo(() => {
    let result = activeInvoices.filter(inv => {
      const customer = state.customers.find(c => c.id === inv.customerId);
      const matchesSearch = inv.id.toString().includes(searchTerm) || 
                            customer?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
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
  }, [activeInvoices, searchTerm, statusFilter, state.customers, sortKey, sortOrder]);

  // Derived Creation Stats
  const draftSubtotal = useMemo(() => draftItems.reduce((acc, it) => acc + (it.price * it.quantity), 0), [draftItems]);
  const draftTax = draftSubtotal * (state.settings.taxRate / 100);
  const discountVal = discountType === 'percent' ? (draftSubtotal * (draftDiscount / 100)) : draftDiscount;
  const draftTotal = Math.max(0, draftSubtotal + draftTax - discountVal);

  // Auto-manage draftPaidAmount based on status mode
  useEffect(() => {
    if (paymentStatusMode === 'paid') setDraftPaidAmount(draftTotal);
    else if (paymentStatusMode === 'unpaid') setDraftPaidAmount(0);
  }, [paymentStatusMode, draftTotal]);

  const availableProducts = useMemo(() => {
    if (!productSearch) return [];
    return state.products.filter(p => !p.isDeleted && p.stock > 0 && (
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase())
    )).slice(0, 8);
  }, [state.products, productSearch]);

  const searchedCustomers = useMemo(() => {
    if (!customerSearch) return [];
    return state.customers.filter(c => !c.isDeleted && (
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.includes(customerSearch)
    )).slice(0, 5);
  }, [state.customers, customerSearch]);

  const selectedCustomer = useMemo(() => state.customers.find(c => c.id === draftCustomerId), [draftCustomerId, state.customers]);

  const totals = useMemo(() => {
    const nonVoided = filteredInvoices.filter(i => !i.isVoided);
    return nonVoided.reduce((acc, inv) => ({
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
    if (selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredInvoices.map(i => i.id)));
  };

  const moveToTrash = (id: string) => {
    const inv = state.invoices.find(i => i.id === id);
    if (!inv) return;
    
    const updatedInvoices = state.invoices.map(i => i.id === id ? { ...i, isDeleted: true, isVoided: true, status: 'voided' as const } : i);
    const updatedProducts = state.products.map(p => {
      const item = inv.items.find(it => it.id === p.id);
      return item ? { ...p, stock: p.stock + item.quantity } : p;
    });
    
    updateState('invoices', updatedInvoices);
    updateState('products', updatedProducts);
    setTrashConfirm(null);
  };

  const handleAuthorizeInvoice = () => {
    if (draftItems.length === 0) return;
    if (paymentStatusMode !== 'paid' && !draftCustomerId) {
      alert("Error: A customer must be assigned for Unpaid or Partial invoices to track debt.");
      return;
    }
    
    const paidAmount = Number(draftPaidAmount) || 0;
    const debtIncurred = draftTotal - paidAmount;
    const profit = draftItems.reduce((acc, it) => acc + ((it.price - it.costPrice) * it.quantity), 0) - discountVal;
    const newId = (state.invoices.reduce((max, i) => Math.max(max, parseInt(i.id) || 0), 0) + 1).toString();

    let finalStatus: 'paid' | 'partial' | 'unpaid' = 'paid';
    if (paidAmount === 0) finalStatus = 'unpaid';
    else if (paidAmount < draftTotal) finalStatus = 'partial';

    const invoice: Invoice = {
      id: newId,
      date: new Date().toISOString(),
      customerId: draftCustomerId || undefined,
      items: draftItems,
      subtotal: draftSubtotal,
      tax: draftTax,
      discount: discountVal,
      total: draftTotal,
      paidAmount: paidAmount,
      profit: profit,
      status: finalStatus,
      paymentMethod: draftPayment,
      pointsEarned: Math.floor(draftTotal * state.settings.loyaltySettings.pointsPerUnit)
    };

    const updatedProducts = state.products.map(p => {
      const lineItems = draftItems.filter(it => it.id === p.id);
      if (lineItems.length > 0) {
        const consumed = lineItems.reduce((a, b) => a + b.quantity, 0);
        return { ...p, stock: p.stock - consumed };
      }
      return p;
    });

    const updatedLoanTransactions = [...state.loanTransactions];
    if (draftCustomerId) {
      const updatedCustomers = state.customers.map(c => {
        if (c.id === draftCustomerId) {
          return { 
            ...c, 
            totalSpent: c.totalSpent + draftTotal,
            totalDebt: (c.totalDebt || 0) + debtIncurred,
            loyaltyPoints: (c.loyaltyPoints || 0) + (invoice.pointsEarned || 0),
            transactionCount: (c.transactionCount || 0) + 1,
            lastVisit: new Date().toISOString()
          };
        }
        return c;
      });
      updateState('customers', updatedCustomers);

      if (debtIncurred > 0) {
        updatedLoanTransactions.push({
          id: Math.random().toString(36).substr(2, 9),
          customerId: draftCustomerId,
          invoiceId: newId,
          date: new Date().toISOString(),
          amount: debtIncurred,
          type: 'debt',
          note: `Auto-logged from Invoice #${newId}`
        });
      }
    }

    updateState('products', updatedProducts);
    updateState('invoices', [...state.invoices, invoice]);
    updateState('loanTransactions', updatedLoanTransactions);
    
    setIsCreating(false);
    setDraftItems([]);
    setDraftCustomerId('');
    setDraftDiscount(0);
    setDraftPayment('cash');
    setPaymentStatusMode('paid');
    setDraftPaidAmount('');
  };

  const handleOpenReturn = (inv: Invoice) => {
    setReturningInvoice(inv);
    const initialQtys: Record<string, number> = {};
    inv.items.forEach(item => {
      const maxReturnable = item.quantity - (item.returnedQuantity || 0);
      initialQtys[item.id] = maxReturnable;
    });
    setReturnQtys(initialQtys);
  };

  const handleProcessReturn = () => {
    if (!returningInvoice) return;
    
    let totalRefundValue = 0;
    let totalPointsToRemove = 0;
    
    const updatedItems = returningInvoice.items.map(item => {
      const returning = returnQtys[item.id] || 0;
      if (returning > 0) {
        totalRefundValue += returning * item.price;
        if (returningInvoice.pointsEarned) {
          const ratio = (returning * item.price) / returningInvoice.total;
          totalPointsToRemove += Math.floor(returningInvoice.pointsEarned * ratio);
        }
        return { ...item, returnedQuantity: (item.returnedQuantity || 0) + returning };
      }
      return item;
    });

    const updatedInvoices = state.invoices.map(inv => {
      if (inv.id === returningInvoice.id) {
        const isFullyReturned = updatedItems.every(i => (i.returnedQuantity || 0) >= i.quantity);
        return { 
          ...inv, 
          items: updatedItems,
          status: isFullyReturned ? 'returned' : (totalRefundValue > 0 ? 'partial' : inv.status),
          pointsEarned: Math.max(0, (inv.pointsEarned || 0) - totalPointsToRemove),
          returnHistory: [
            ...(inv.returnHistory || []),
            { 
              date: new Date().toISOString(), 
              items: Object.entries(returnQtys).filter(([_, q]) => q > 0).map(([id, q]) => ({ productId: id, quantity: q })),
              refundAmount: totalRefundValue
            }
          ]
        };
      }
      return inv;
    });

    const updatedProducts = state.products.map(p => {
      const returnedCount = returnQtys[p.id] || 0;
      if (returnedCount > 0) return { ...p, stock: p.stock + returnedCount };
      return p;
    });

    const updatedCustomers = state.customers.map(c => {
      if (c.id === returningInvoice.customerId) {
        let remainingRefund = totalRefundValue;
        let newDebt = c.totalDebt || 0;

        if (newDebt > 0) {
          const deduction = Math.min(newDebt, remainingRefund);
          newDebt -= deduction;
          remainingRefund -= deduction;
        }

        return { 
          ...c, 
          totalSpent: Math.max(0, c.totalSpent - totalRefundValue),
          totalDebt: newDebt,
          loyaltyPoints: Math.max(0, (c.loyaltyPoints || 0) - totalPointsToRemove)
        };
      }
      return c;
    });

    const newRefundTrans: LoanTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      customerId: returningInvoice.customerId || 'walk-in',
      date: new Date().toISOString(),
      amount: totalRefundValue,
      type: 'refund',
      note: `Refund for items on Inv #${returningInvoice.id}`
    };

    updateState('invoices', updatedInvoices as Invoice[]);
    updateState('products', updatedProducts);
    updateState('customers', updatedCustomers);
    updateState('loanTransactions', [...state.loanTransactions, newRefundTrans]);

    setReturningInvoice(null);
  };

  const handlePrint = async (inv: Invoice, overrideLayout: PrintLayout = 'auto') => {
    setIsPrinting(inv.id);
    try {
      const html = generatePrintHTML(state, inv, overrideLayout);
      const holder = document.getElementById('print-holder');
      if (holder) {
        holder.innerHTML = html;
        window.print();
        holder.innerHTML = '';
      }
    } catch (e) {
      console.error("Print Error:", e);
    } finally {
      setIsPrinting(null);
    }
  };

  const handleDownloadPDF = async (inv: Invoice) => {
    if (isDownloading) return;
    setIsDownloading(inv.id);
    try {
      const html = generatePrintHTML(state, inv, 'a4');
      const container = document.getElementById('pdf-render-container');
      if (!container) throw new Error("Render target missing");
      
      container.innerHTML = html;
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const canvas = await html2canvas(container, { 
        scale: 2, 
        useCORS: true, 
        logging: false, 
        backgroundColor: '#ffffff' 
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_#${inv.id}.pdf`);
    } catch (e) { 
      console.error(e); 
    } finally { 
      const container = document.getElementById('pdf-render-container');
      if (container) container.innerHTML = ''; 
      setIsDownloading(null); 
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase rounded-lg border border-emerald-100">Paid</span>;
      case 'returned': return <span className="px-3 py-1 bg-rose-50 text-rose-600 text-[9px] font-black uppercase rounded-lg border border-rose-100">Returned</span>;
      case 'partial': return <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[9px] font-black uppercase rounded-lg border border-amber-100">Partial</span>;
      case 'voided': return <span className="px-3 py-1 bg-slate-100 text-slate-400 text-[9px] font-black uppercase rounded-lg border border-slate-200">Voided</span>;
      default: return <span className="px-3 py-1 bg-rose-50 text-rose-500 text-[9px] font-black uppercase rounded-lg border border-rose-100">{status}</span>;
    }
  };

  // Integrated Barcode Scanner Logic for Invoices
  useEffect(() => {
    if (isScannerOpen && isCreating) {
      const startScanner = async () => {
        try {
          const html5QrCode = new Html5Qrcode("invoice-scanner-container");
          scannerRef.current = html5QrCode;
          await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 20, qrbox: { width: 280, height: 180 } },
            (decodedText) => {
              let foundProduct: Product | null = null;
              let foundVariation: ProductVariation | undefined = undefined;

              for (const p of state.products) {
                if (p.isDeleted) continue;
                if (p.sku === decodedText) { foundProduct = p; break; }
                const vMatch = p.variations?.find(v => v.sku === decodedText);
                if (vMatch) { foundProduct = p; foundVariation = vMatch; break; }
              }

              if (foundProduct) {
                const target = foundVariation || foundProduct;
                const existing = draftItems.find(it => it.id === foundProduct!.id && it.variationId === foundVariation?.id);
                
                if (existing) {
                  if (existing.quantity < target.stock) {
                    setDraftItems(draftItems.map(it => (it.id === foundProduct!.id && it.variationId === foundVariation?.id) ? { ...it, quantity: it.quantity + 1 } : it));
                  }
                } else {
                  setDraftItems([...draftItems, { 
                    ...foundProduct, 
                    name: foundVariation ? `${foundProduct.name} (${foundVariation.name})` : foundProduct.name,
                    sku: target.sku,
                    price: foundVariation?.salePrice ?? foundVariation?.price ?? foundProduct.salePrice ?? foundProduct.price,
                    costPrice: target.costPrice,
                    stock: target.stock,
                    quantity: 1, 
                    buyPrice: foundVariation?.salePrice ?? foundVariation?.price ?? foundProduct.salePrice ?? foundProduct.price,
                    variationId: foundVariation?.id,
                    variationName: foundVariation?.name
                  }]);
                }
                setIsScannerOpen(false); // Close after successful scan to not overwhelm UI
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
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => { scannerRef.current = null; }).catch(() => {});
      }
    };
  }, [isScannerOpen, isCreating, state.products, draftItems]);

  return (
    <div className="space-y-4 animate-in fade-in duration-500 max-w-full overflow-hidden pb-20">
      <ConfirmDialog 
        isOpen={!!trashConfirm} 
        onClose={() => setTrashConfirm(null)} 
        onConfirm={() => trashConfirm && moveToTrash(trashConfirm)} 
        title="Move Invoice to Trash?" 
        message="Trashing an invoice will automatically void it and return items to inventory." 
        confirmText="Move to Trash" 
        type="warning" 
      />

      {/* Optimized Invoice Creator Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-2 md:p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[40px] md:rounded-[56px] w-full max-w-6xl h-[95vh] md:h-auto md:max-h-[92vh] shadow-2xl relative overflow-hidden flex flex-col border border-white/10 animate-in zoom-in-95 duration-300">
              
              <header className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
                 <div className="flex items-center gap-4 md:gap-6">
                    <div className="w-10 h-10 md:w-14 md:h-14 bg-indigo-600 text-white rounded-[16px] md:rounded-[22px] flex items-center justify-center shadow-lg"><FileText size={20}/></div>
                    <div>
                       <h3 className="text-xl md:text-2xl font-black dark:text-white uppercase tracking-tighter leading-none">Draft Invoice Builder</h3>
                       <p className="text-slate-400 font-bold text-[8px] md:text-[10px] uppercase tracking-[0.2em] mt-1">Registry Terminal Entry</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                    <button onClick={() => setIsScannerOpen(!isScannerOpen)} className={`p-3 rounded-2xl transition-all border ${isScannerOpen ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`} title="Toggle Scanner"><ScanLine size={20}/></button>
                    <button onClick={() => setIsCreating(false)} className="p-3 md:p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl md:rounded-3xl text-slate-400 hover:text-rose-600 transition-all active:scale-95"><X size={20}/></button>
                 </div>
              </header>

              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-slate-50/20 dark:bg-slate-950/10">
                 
                 {/* Asset & Customer Discovery Pane */}
                 <div className="lg:w-[400px] border-r border-slate-100 dark:border-slate-800 flex flex-col h-full bg-white dark:bg-slate-900 shrink-0">
                    <div className="p-6 md:p-8 space-y-6 md:space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                       
                       {isScannerOpen && (
                         <div id="invoice-scanner-container" className="w-full aspect-[4/3] bg-black rounded-3xl overflow-hidden mb-6 relative animate-in zoom-in">
                            <div className="absolute inset-0 pointer-events-none border-2 border-indigo-500/50 rounded-3xl z-10"></div>
                         </div>
                       )}

                       <section className="space-y-4">
                          <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1 flex items-center gap-2"><User size={14}/> Client Assignment</label>
                          <div className="space-y-3">
                             {selectedCustomer ? (
                               <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-[20px] border border-indigo-100 dark:border-indigo-800 animate-in zoom-in-95 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-black">{selectedCustomer.name.charAt(0)}</div>
                                     <div className="min-w-0">
                                        <p className="text-xs font-black dark:text-white uppercase leading-none truncate">{selectedCustomer.name}</p>
                                        <p className="text-[8px] font-bold text-slate-400 mt-1">{selectedCustomer.phone}</p>
                                     </div>
                                  </div>
                                  <button onClick={() => setDraftCustomerId('')} className="p-1.5 hover:bg-indigo-100 dark:hover:bg-indigo-800 rounded-lg text-indigo-600"><X size={14}/></button>
                               </div>
                             ) : (
                               <div className="relative">
                                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                  <input 
                                    type="text" 
                                    value={customerSearch} 
                                    onChange={e => setCustomerSearch(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-3 pl-10 pr-4 font-bold text-xs outline-none transition-all dark:text-white"
                                    placeholder="Lookup Client Registry..."
                                  />
                                  {customerSearch && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden">
                                       {searchedCustomers.map(c => (
                                         <button key={c.id} onClick={() => { setDraftCustomerId(c.id); setCustomerSearch(''); }} className="w-full p-3 text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center justify-between group transition-colors">
                                            <div className="flex items-center gap-3">
                                               <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">{c.name.charAt(0)}</div>
                                               <div><p className="text-[11px] font-black dark:text-white uppercase leading-none">{c.name}</p><p className="text-[8px] text-slate-400 font-bold">{c.phone}</p></div>
                                            </div>
                                            <ArrowRight size={12} className="text-indigo-600 opacity-0 group-hover:opacity-100" />
                                         </button>
                                       ))}
                                    </div>
                                  )}
                               </div>
                             )}
                          </div>
                       </section>

                       <section className="space-y-4">
                          <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1 flex items-center gap-2"><Package size={14}/> Asset Discovery</label>
                          <div className="relative">
                             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                             <input 
                               type="text" 
                               value={productSearch} 
                               onChange={e => setProductSearch(e.target.value)}
                               className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-3 pl-10 pr-4 font-bold text-xs outline-none transition-all dark:text-white"
                               placeholder="Type label or Scan..."
                             />
                          </div>
                          
                          <div className="space-y-2 max-h-[180px] md:max-h-[220px] overflow-y-auto no-scrollbar">
                             {availableProducts.map(p => (
                               <button 
                                 key={p.id} 
                                 onClick={() => {
                                   const existing = draftItems.find(it => it.id === p.id && !it.variationId);
                                   if (existing) {
                                     setDraftItems(draftItems.map(it => (it.id === p.id && !it.variationId) ? { ...it, quantity: Math.min(p.stock, it.quantity + 1) } : it));
                                   } else {
                                     setDraftItems([...draftItems, { ...p, quantity: 1, buyPrice: p.salePrice ?? p.price }]);
                                   }
                                   setProductSearch('');
                                 }}
                                 className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-50 dark:border-slate-700 hover:border-indigo-400 transition-all text-left flex items-center justify-between group shadow-sm"
                               >
                                  <div className="flex items-center gap-3">
                                     <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-300 group-hover:text-indigo-500 transition-colors"><Package size={16}/></div>
                                     <div className="min-w-0">
                                        <p className="font-black text-[11px] uppercase dark:text-white truncate leading-tight">{p.name}</p>
                                        <p className="text-[8px] font-black uppercase text-slate-400 mt-0.5">{p.stock} units in reserve</p>
                                     </div>
                                  </div>
                                  <p className="font-black text-xs text-indigo-600">{state.settings.currency}{(p.salePrice ?? p.price).toLocaleString()}</p>
                               </button>
                             ))}
                          </div>
                       </section>
                    </div>

                    <div className="p-6 md:p-8 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 space-y-6">
                       <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Wallet size={14}/> Settlement Mode</label>
                          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                             {[
                               { id: 'paid', label: 'Paid Full', icon: CheckCircle2, color: 'text-emerald-500' },
                               { id: 'partial', label: 'Partial', icon: History, color: 'text-amber-500' },
                               { id: 'unpaid', label: 'Unpaid', icon: AlertCircle, color: 'text-rose-500' }
                             ].map(s => (
                               <button key={s.id} onClick={() => setPaymentStatusMode(s.id as any)} className={`py-2.5 rounded-lg flex flex-col items-center gap-0.5 transition-all ${paymentStatusMode === s.id ? 'bg-white dark:bg-slate-700 shadow-sm scale-105' : 'opacity-40 grayscale'}`}>
                                  <s.icon size={14} className={s.color}/>
                                  <span className="text-[8px] font-black uppercase tracking-widest">{s.label}</span>
                               </button>
                             ))}
                          </div>
                          
                          {paymentStatusMode === 'partial' && (
                             <div className="animate-in slide-in-from-top-2 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800">
                                <label className="block text-[8px] font-black text-amber-600 uppercase mb-2">Deposit Magnitude</label>
                                <div className="relative">
                                   <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-300" size={16} />
                                   <input 
                                     type="number" 
                                     value={draftPaidAmount} 
                                     onChange={e => setDraftPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
                                     className="w-full bg-white dark:bg-slate-800 rounded-xl py-2 pl-8 pr-4 font-black text-lg text-amber-600 outline-none"
                                     placeholder="0.00"
                                   />
                                </div>
                             </div>
                          )}
                       </div>
                    </div>
                 </div>

                 {/* Document Preview Pane */}
                 <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                       <div className="bg-slate-50/40 dark:bg-slate-950/20 rounded-[32px] md:rounded-[40px] border border-slate-100 dark:border-slate-800 p-6 md:p-8 min-h-full flex flex-col shadow-inner">
                          
                          <div className="flex justify-between items-start mb-6">
                             <div>
                                <h4 className="text-lg md:text-xl font-black dark:text-white uppercase tracking-tighter">Draft Ledger Point</h4>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Status: Authorization Pending</p>
                             </div>
                             <div className="text-right">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Temporal Log</p>
                                <p className="text-[10px] font-black dark:text-white">{new Date().toLocaleDateString()}</p>
                             </div>
                          </div>

                          <div className="flex-1">
                             <table className="w-full text-left">
                                <thead className="border-b border-slate-200 dark:border-slate-700">
                                   <tr>
                                      <th className="pb-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                                      <th className="pb-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Volume</th>
                                      <th className="pb-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Unit</th>
                                      <th className="pb-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Sum</th>
                                      <th className="pb-2"></th>
                                   </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                   {draftItems.map((it, idx) => (
                                      <tr key={idx} className="group">
                                         <td className="py-3">
                                            <p className="font-black text-[11px] uppercase dark:text-white truncate max-w-[100px] md:max-w-[180px]">{it.name}</p>
                                            <p className="text-[7px] font-bold text-slate-400 uppercase">SKU: {it.sku}</p>
                                         </td>
                                         <td className="py-3">
                                            <div className="flex items-center justify-center gap-1.5 bg-white dark:bg-slate-800 rounded-lg p-0.5 w-16 md:w-20 mx-auto shadow-sm">
                                               <button onClick={() => setDraftItems(draftItems.map((item, i) => i === idx ? { ...item, quantity: Math.max(0, item.quantity - 1) } : item).filter(it => it.quantity > 0))} className="p-0.5 hover:text-rose-500"><MinusCircle size={12}/></button>
                                               <span className="font-black text-[10px] dark:text-white tabular-nums">{it.quantity}</span>
                                               <button onClick={() => it.quantity < it.stock && setDraftItems(draftItems.map((item, i) => i === idx ? { ...item, quantity: item.quantity + 1 } : item))} className="p-0.5 hover:text-indigo-600"><PlusCircle size={12}/></button>
                                            </div>
                                         </td>
                                         <td className="py-3 text-right font-bold text-[10px] text-slate-500 dark:text-slate-400">{state.settings.currency}{it.price.toLocaleString()}</td>
                                         <td className="py-3 text-right font-black text-[11px] dark:text-white">
                                            {state.settings.currency}{(it.price * it.quantity).toLocaleString()}
                                         </td>
                                         <td className="py-3 text-right">
                                            <button onClick={() => setDraftItems(draftItems.filter((_, i) => i !== idx))} className="p-1.5 text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><X size={12}/></button>
                                         </td>
                                      </tr>
                                   ))}
                                </tbody>
                             </table>

                             {draftItems.length === 0 && (
                               <div className="py-16 text-center opacity-10 grayscale">
                                  <ShoppingCart size={40} className="mx-auto" strokeWidth={1} />
                                  <p className="font-black text-[8px] uppercase tracking-[0.4em] mt-3">Manifest Null</p>
                               </div>
                             )}
                          </div>

                          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 space-y-4">
                             <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                                <div className="space-y-1.5 px-1 flex-1">
                                   <div className="flex justify-between md:justify-start md:gap-8 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                      <span>Registry Base</span>
                                      <span className="dark:text-slate-300 font-black">{state.settings.currency}{draftSubtotal.toLocaleString()}</span>
                                   </div>
                                   <div className="flex justify-between md:justify-start md:gap-8 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                      <span>Fiscal VAT ({state.settings.taxRate}%)</span>
                                      <span className="dark:text-slate-300 font-black">+{state.settings.currency}{draftTax.toLocaleString()}</span>
                                   </div>
                                   <div className="flex justify-between md:justify-start md:gap-8 items-center pt-1">
                                      <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Concession (Disc)</span>
                                      <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-0.5 rounded-lg border">
                                        <input 
                                          type="number" 
                                          value={draftDiscount || ''} 
                                          onChange={e => setDraftDiscount(Number(e.target.value))}
                                          className="w-14 bg-transparent border-none text-[10px] font-black text-right outline-none dark:text-white p-0.5"
                                          placeholder="0"
                                        />
                                        <button onClick={() => setDiscountType(discountType === 'percent' ? 'fixed' : 'percent')} className="text-[8px] font-black bg-slate-50 dark:bg-slate-700 px-1 py-0.5 rounded text-indigo-600 uppercase">
                                          {discountType === 'percent' ? '%' : state.settings.currency}
                                        </button>
                                      </div>
                                   </div>
                                </div>
                                <div className="text-right border-t md:border-t-0 pt-3 md:pt-0">
                                   <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-0.5">Authorization Sum</p>
                                   <h3 className="text-4xl md:text-5xl font-black dark:text-white tracking-tighter tabular-nums">{state.settings.currency}{draftTotal.toLocaleString()}</h3>
                                </div>
                             </div>
                             
                             <div className="pt-5 border-t border-slate-200 dark:border-slate-800 flex gap-3">
                                <button onClick={() => setIsCreating(false)} className="px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-200 transition-all">Abort</button>
                                <button 
                                  onClick={handleAuthorizeInvoice}
                                  disabled={draftItems.length === 0}
                                  className="flex-1 py-4 bg-indigo-600 text-white rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.98]"
                                >
                                   Finalize Registry <CheckCircle2 size={20}/>
                                </button>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Registry Tools Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-2">
        <div>
          <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">Authorized Ledger</h3>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Managed Fiscal Archive Nodes</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-3"
        >
          <Plus size={20} strokeWidth={3} />
          Create New Invoice
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices', value: filteredInvoices.length, icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
          { label: 'Cumulative Revenue', value: totals.total, isCurrency: true, icon: TrendingUp, color: 'text-slate-800 dark:text-white', bg: 'bg-white dark:bg-slate-900' },
          { label: 'Net Profit Pool', value: totals.profit, isCurrency: true, icon: FileCheck, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { label: 'Pending Receivables', value: totals.balance, isCurrency: true, icon: Scale, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
        ].map((stat, i) => (
          <div key={i} className={`p-5 rounded-[32px] border dark:border-slate-800 shadow-sm flex items-center gap-5 ${stat.bg}`}>
             <div className={`${stat.color} w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 shadow-inner`}><stat.icon size={20} strokeWidth={2.5}/></div>
             <div className="min-w-0">
                <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase mb-0.5 md:mb-1 truncate">{stat.label}</p>
                <h4 className={`text-sm md:text-lg font-black truncate leading-none ${stat.color}`}>{stat.isCurrency ? state.settings.currency : ''}{stat.value.toLocaleString()}</h4>
             </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Query documents by ID or Client..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3 pl-12 pr-6 outline-none text-xs font-bold dark:text-white"
          />
        </div>
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-[10px] font-black uppercase outline-none border-none dark:text-white cursor-pointer"
        >
          <option value="all">All Status</option>
          <option value="paid">Paid Only</option>
          <option value="partial">Partial Payment</option>
          <option value="unpaid">Unpaid / Debt</option>
          <option value="returned">Returns Only</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b">
              <tr>
                <th className="px-6 py-5 w-16 text-center">
                  <button onClick={toggleSelectAll} className="text-slate-400 hover:text-indigo-600">
                    {selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0 ? <CheckSquare size={20} className="text-indigo-600"/> : <Square size={20} />}
                  </button>
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Registry ID</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Integrity</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Temporal Date</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Protocol Status</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Settlement Value</th>
                <th className="px-6 py-5 text-right uppercase text-[10px] font-black text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredInvoices.map((inv) => {
                const customer = state.customers.find(c => c.id === inv.customerId);
                const isSelected = selectedIds.has(inv.id);
                return (
                  <tr 
                    key={inv.id} 
                    onClick={() => toggleSelect(inv.id)}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all cursor-pointer group ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
                  >
                    <td className="px-6 py-4 text-center">
                      <button className={`${isSelected ? 'text-indigo-600' : 'text-slate-300'}`}>
                        {isSelected ? <CheckSquare size={20}/> : <Square size={20} />}
                      </button>
                    </td>
                    <td className="px-6 py-4 font-black text-[12px] text-slate-500">#INV-{inv.id.padStart(4, '0')}</td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-[10px] uppercase">{customer?.name.charAt(0) || 'W'}</div>
                          <span className="text-[12px] font-black dark:text-slate-200">{customer?.name || 'Anonymous Guest'}</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-[11px] font-bold text-slate-400">{new Date(inv.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-center">{getStatusBadge(inv.status)}</td>
                    <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white">{state.settings.currency}{inv.total.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all" onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleOpenReturn(inv)} className="p-2 text-slate-400 hover:text-amber-600" title="Return Items"><RotateCcw size={18}/></button>
                          <button onClick={() => handlePrint(inv)} className="p-2 text-slate-400 hover:text-indigo-600"><Printer size={18}/></button>
                          <button onClick={() => handleDownloadPDF(inv)} className="p-2 text-slate-400 hover:text-indigo-600"><FileDown size={18}/></button>
                          <button onClick={() => setTrashConfirm(inv.id)} className="p-2 text-slate-300 hover:text-rose-600"><Trash2 size={18}/></button>
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredInvoices.length === 0 && (
             <div className="py-24 text-center flex flex-col items-center justify-center gap-4 opacity-30">
                <FileText size={64} strokeWidth={1} />
                <p className="font-black text-xs uppercase tracking-widest">Registry Search Null</p>
             </div>
          )}
        </div>
      </div>

      {/* Return Items Modal */}
      {returningInvoice && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[48px] w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col border border-white/10 animate-in zoom-in-95 duration-300">
              <header className="p-10 pb-6 flex items-center justify-between border-b border-slate-50 dark:border-slate-800">
                 <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600 shadow-lg"><RotateCcw size={28}/></div>
                    <div>
                       <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Process Return</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document #INV-{returningInvoice.id.padStart(4, '0')}</p>
                    </div>
                 </div>
                 <button onClick={() => setReturningInvoice(null)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-rose-500 transition-all"><X size={24}/></button>
              </header>

              <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar">
                 <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl space-y-4 border border-slate-100 dark:border-slate-800">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                       <Package size={12} /> Select Items for Restock
                    </h4>
                    <div className="space-y-3">
                       {returningInvoice.items.map(item => {
                          const maxReturnable = item.quantity - (item.returnedQuantity || 0);
                          const returning = returnQtys[item.id] || 0;
                          const hasPreviousReturns = (item.returnedQuantity || 0) > 0;
                          
                          return (
                             <div key={item.id} className={`p-4 rounded-2xl border transition-all ${hasPreviousReturns ? 'bg-amber-50/30 border-amber-200' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'} flex items-center justify-between group hover:border-amber-400`}>
                                <div className="flex items-center gap-4 min-w-0">
                                   <div className="relative">
                                      <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                                         {item.image ? <img src={item.image} className="w-full h-full object-cover rounded-xl" /> : <Package size={18}/>}
                                      </div>
                                      {hasPreviousReturns && (
                                         <div className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white rounded-full p-0.5 shadow-sm" title="Already partially returned">
                                            <RotateCcw size={10} strokeWidth={4} />
                                         </div>
                                      )}
                                   </div>
                                   <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                         <p className="font-black text-xs dark:text-white truncate uppercase">{item.name}</p>
                                         {hasPreviousReturns && (
                                            <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-600 text-[7px] font-black uppercase rounded border border-amber-200">
                                               Return History
                                            </span>
                                         )}
                                      </div>
                                      <div className="flex items-center gap-2 mt-0.5">
                                         <span className="text-[9px] font-black text-indigo-600 uppercase tracking-tight">{state.settings.currency}{item.price.toLocaleString()}</span>
                                         <span className="text-[8px] font-bold text-slate-300">|</span>
                                         <span className="text-[9px] font-bold text-slate-400 uppercase">
                                            {maxReturnable} available
                                            {hasPreviousReturns && ` (${item.returnedQuantity} already back)`}
                                         </span>
                                      </div>
                                   </div>
                                </div>
                                <div className="flex items-center gap-4">
                                   <div className="flex bg-slate-50 dark:bg-slate-800 rounded-xl p-1 border">
                                      <button 
                                        disabled={returning <= 0}
                                        onClick={() => setReturnQtys(prev => ({ ...prev, [item.id]: Math.max(0, prev[item.id] - 1) }))}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-all disabled:opacity-20"
                                      >
                                        <MinusCircle size={16}/>
                                      </button>
                                      <span className={`w-8 text-center font-black text-xs flex items-center justify-center ${returning > 0 ? 'text-amber-600' : 'text-slate-400'} dark:text-white`}>
                                         {returning}
                                      </span>
                                      <button 
                                        disabled={returning >= maxReturnable}
                                        onClick={() => setReturnQtys(prev => ({ ...prev, [item.id]: Math.min(maxReturnable, prev[item.id] + 1) }))}
                                        className="p-1.5 text-slate-400 hover:text-emerald-600 disabled:opacity-20 transition-all"
                                      >
                                        <PlusCircle size={16}/>
                                      </button>
                                   </div>
                                </div>
                             </div>
                          );
                       })}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-3xl border border-amber-100 dark:border-amber-800">
                       <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Estimated Credit</p>
                       <h3 className="text-3xl font-black text-amber-700 dark:text-amber-400">
                          {state.settings.currency}{Object.entries(returnQtys).reduce((acc, [id, q]) => acc + (q * (returningInvoice.items.find(i => i.id === id)?.price || 0)), 0).toLocaleString()}
                       </h3>
                    </div>
                    <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Restock Action</p>
                       <h3 className="text-3xl font-black dark:text-white">
                          +{Object.values(returnQtys).reduce((a, b) => a + b, 0)} <span className="text-sm font-bold text-slate-400">Units</span>
                       </h3>
                    </div>
                 </div>

                 <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                    <div className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm text-indigo-600 shrink-0"><Info size={16}/></div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed">
                       Quantities are pre-filled with the maximum available items from this invoice. Adjust them manually to process a partial return.
                    </p>
                 </div>

                 {returningInvoice.customerId && (
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-800 flex items-center gap-3">
                       <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center"><ShieldCheck size={20}/></div>
                       <div>
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Accounting Policy</p>
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Refunds are automatically deducted from customer liability (Debt) before cash issuance.</p>
                       </div>
                    </div>
                 )}
              </div>

              <footer className="p-10 border-t border-slate-50 dark:border-slate-800 flex gap-4 bg-white dark:bg-slate-900">
                 <button onClick={() => setReturningInvoice(null)} className="flex-1 py-6 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-3xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                 <button 
                  onClick={handleProcessReturn}
                  disabled={Object.values(returnQtys).reduce((a,b)=>a+b,0) === 0}
                  className="flex-[2] py-6 bg-amber-600 text-white rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 hover:bg-amber-700 transition-all"
                 >
                   <RefreshCw size={18}/> Execute Restock & Refund
                 </button>
              </footer>
           </div>
        </div>
      )}
    </div>
  );
}
