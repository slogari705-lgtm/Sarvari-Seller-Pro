
import React, { useState, useMemo } from 'react';
import { 
  Scale, 
  Search, 
  User, 
  Phone, 
  DollarSign, 
  AlertCircle, 
  Clock, 
  X, 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus, 
  PlusCircle, 
  Calculator, 
  Printer, 
  FileDown, 
  CheckCircle2,
  Settings,
  ArrowRight
} from 'lucide-react';
import { AppState, Customer, View, LoanTransaction } from '../types';
import { translations } from '../translations';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface Props {
  state: AppState;
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
  setCurrentView: (view: View) => void;
}

const Loans: React.FC<Props> = ({ state, updateState, setCurrentView }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [payingCustomer, setPayingCustomer] = useState<Customer | null>(null);
  const [viewingDebtor, setViewingDebtor] = useState<Customer | null>(null);
  const [isManualLogOpen, setIsManualLogOpen] = useState(false);
  const [repaymentAmount, setRepaymentAmount] = useState<number | ''>('');
  const [isExporting, setIsExporting] = useState(false);
  
  // Manual Log Form State
  const [manualCustomer, setManualCustomer] = useState<Customer | null>(null);
  const [manualSearch, setManualSearch] = useState('');
  const [manualType, setManualType] = useState<'debt' | 'repayment' | 'adjustment'>('debt');
  const [manualAmount, setManualAmount] = useState<number | ''>('');
  const [manualNote, setManualNote] = useState('');
  const [manualDueDate, setManualDueDate] = useState('');

  const t = translations[state.settings.language || 'en'];

  const debtors = useMemo(() => {
    return state.customers
      .filter(c => c.totalDebt > 0)
      .filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.phone.includes(searchTerm)
      )
      .sort((a, b) => b.totalDebt - a.totalDebt);
  }, [state.customers, searchTerm]);

  const availableCustomers = useMemo(() => {
    if (!manualSearch) return [];
    return state.customers.filter(c => 
      c.name.toLowerCase().includes(manualSearch.toLowerCase()) || 
      c.phone.includes(manualSearch)
    ).slice(0, 5);
  }, [state.customers, manualSearch]);

  const totalOutstanding = state.customers.reduce((acc, c) => acc + (c.totalDebt || 0), 0);
  const totalDebtors = debtors.length;

  // Added missing helper to retrieve loan transaction history for a specific customer
  const getChronologicalHistory = (cid: string) => {
    return state.loanTransactions
      .filter(t => t.customerId === cid)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const handleProcessRepayment = (targetCustomer: Customer, amount: number, note: string = "Manual repayment") => {
    if (!targetCustomer || amount <= 0) return;
    
    let remainingPayment = amount;
    const updatedInvoices = state.invoices.map(inv => ({ ...inv }));
    
    const customerInvoices = updatedInvoices
      .filter(inv => inv.customerId === targetCustomer.id && (inv.status === 'partial' || inv.status === 'unpaid'))
      .sort((a, b) => new Date(a.date).getTime() - new Date(a.date).getTime());

    for (const inv of customerInvoices) {
      if (remainingPayment <= 0) break;
      const invBalance = inv.total - inv.paidAmount;
      const paymentToApply = Math.min(remainingPayment, invBalance);
      inv.paidAmount += paymentToApply;
      remainingPayment -= paymentToApply;
      if (inv.paidAmount >= inv.total) inv.status = 'paid';
      else if (inv.paidAmount > 0) inv.status = 'partial';
    }

    const actualReduction = amount - remainingPayment;
    const updatedCustomers = state.customers.map(c => {
      if (c.id === targetCustomer.id) {
        return { 
          ...c, 
          totalDebt: Math.max(0, (c.totalDebt || 0) - actualReduction),
          lastVisit: new Date().toISOString().split('T')[0]
        };
      }
      return c;
    });

    const newTrans: LoanTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      customerId: targetCustomer.id,
      date: new Date().toISOString(),
      amount: actualReduction,
      type: 'repayment',
      note: note
    };

    updateState('invoices', updatedInvoices);
    updateState('customers', updatedCustomers);
    updateState('loanTransactions', [...state.loanTransactions, newTrans]);
    setPayingCustomer(null);
    setRepaymentAmount('');
    if (viewingDebtor?.id === targetCustomer.id) {
      setViewingDebtor(updatedCustomers.find(c => c.id === targetCustomer.id) || null);
    }
  };

  const handleManualTransaction = () => {
    if (!manualCustomer || !manualAmount || manualAmount <= 0) return;
    if (manualType === 'repayment') {
      handleProcessRepayment(manualCustomer, Number(manualAmount), manualNote || "Manual repayment entry");
    } else {
      const updatedCustomers = state.customers.map(c => {
        if (c.id === manualCustomer.id) {
          const adj = manualType === 'debt' ? Number(manualAmount) : -Number(manualAmount);
          return { 
            ...c, 
            totalDebt: Math.max(0, (c.totalDebt || 0) + adj),
            lastVisit: new Date().toISOString().split('T')[0]
          };
        }
        return c;
      });
      const newTrans: LoanTransaction = {
        id: Math.random().toString(36).substr(2, 9),
        customerId: manualCustomer.id,
        date: new Date().toISOString(),
        amount: Number(manualAmount),
        type: manualType,
        note: manualNote || `Manual ${manualType} adjustment`,
        dueDate: manualType === 'debt' && manualDueDate ? manualDueDate : undefined
      };
      updateState('customers', updatedCustomers);
      updateState('loanTransactions', [...state.loanTransactions, newTrans]);
    }
    setIsManualLogOpen(false);
    setManualCustomer(null);
    setManualAmount('');
    setManualNote('');
    setManualDueDate('');
    setManualType('debt');
  };

  const generateLoanHTML = (c: Customer | null) => {
    const isGlobal = !c;
    const list = isGlobal ? debtors : [c!];
    const currency = state.settings.currency;
    const brandColor = state.settings.brandColor || '#4f46e5';

    return `
      <div style="padding: 20mm; font-family: 'Inter', sans-serif; background: white; color: #1e293b; min-height: 297mm;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 4px solid ${brandColor}; padding-bottom: 20px; margin-bottom: 30px;">
          <div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 900; color: ${brandColor}; text-transform: uppercase;">${state.settings.shopName}</h1>
            <p style="margin: 4px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 2px;">
              ${isGlobal ? 'Global Debt Master Ledger' : 'Client Debt Integrity Statement'}
            </p>
          </div>
          <div style="text-align: right; font-size: 11px; font-weight: 700; color: #64748b;">
            <div style="font-weight: 900; color: #1e293b; font-size: 14px;">DATE: ${new Date().toLocaleDateString()}</div>
            <div style="margin-top: 5px;">AUDIT REF: ${isGlobal ? 'GLB' : 'CUST'}-${Date.now().toString().slice(-6)}</div>
          </div>
        </div>

        ${!isGlobal ? `
          <div style="background: #f8fafc; padding: 25px; border-radius: 20px; margin-bottom: 35px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
             <div>
                <div style="font-size: 9px; font-weight: 900; color: ${brandColor}; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">Customer Portfolio</div>
                <div style="font-size: 22px; font-weight: 900; margin-bottom: 4px;">${c!.name}</div>
                <div style="font-size: 12px; font-weight: 700; color: #64748b;">Phone: ${c!.phone} | Email: ${c!.email || 'N/A'}</div>
             </div>
             <div style="text-align: right;">
                <div style="font-size: 9px; font-weight: 900; color: #e11d48; text-transform: uppercase; margin-bottom: 4px;">Verified ID</div>
                <div style="font-size: 18px; font-weight: 900; color: #1e293b; font-family: monospace;">#${c!.id.padStart(4, '0')}</div>
             </div>
          </div>
        ` : ''}

        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #1e293b; color: white;">
              <th style="padding: 15px; text-align: left; border-radius: 12px 0 0 0;">ID</th>
              <th style="padding: 15px; text-align: left;">Account Entity</th>
              <th style="padding: 15px; text-align: left;">Contact Details</th>
              <th style="padding: 15px; text-align: right; border-radius: 0 12px 0 0;">Outstanding Balance</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(d => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 15px; font-weight: 800; color: #64748b;">#${d.id.padStart(4, '0')}</td>
                <td style="padding: 15px; font-weight: 900; font-size: 14px;">${d.name}</td>
                <td style="padding: 15px; color: #64748b; font-weight: 600;">${d.phone}</td>
                <td style="padding: 15px; text-align: right; font-weight: 900; color: #e11d48; font-size: 16px;">${currency}${d.totalDebt.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
             <tr style="background: #f8fafc; font-weight: 900;">
                <td colspan="3" style="padding: 20px 15px; text-align: right; text-transform: uppercase; font-size: 11px; color: #64748b;">Total Business Exposure</td>
                <td style="padding: 20px 15px; text-align: right; font-size: 24px; color: #e11d48;">${currency}${list.reduce((a,b)=>a+b.totalDebt,0).toLocaleString()}</td>
             </tr>
          </tfoot>
        </table>

        <div style="margin-top: 60px; padding: 20px; border: 2px dashed #cbd5e1; border-radius: 16px; text-align: center;">
           <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">This document serves as an official accounting record generated by Sarvari Seller Pro Intelligence.</p>
           <div style="display: flex; justify-content: space-around; margin-top: 40px;">
              <div style="width: 150px; border-top: 1px solid #94a3b8; padding-top: 8px; font-size: 9px; font-weight: 900; text-transform: uppercase;">Finance Manager</div>
              <div style="width: 150px; border-top: 1px solid #94a3b8; padding-top: 8px; font-size: 9px; font-weight: 900; text-transform: uppercase;">Client Validation</div>
           </div>
        </div>
      </div>
    `;
  };

  const handlePrintExport = (c: Customer | null) => {
    const html = generateLoanHTML(c);
    const holder = document.getElementById('print-holder');
    if (!holder) return;
    holder.innerHTML = html;
    window.print();
    holder.innerHTML = '';
  };

  const handleDownloadPDF = async (c: Customer | null) => {
    if (isExporting) return;
    setIsExporting(true);
    const container = document.getElementById('pdf-render-container');
    if (!container) return;
    container.innerHTML = generateLoanHTML(c);
    await new Promise(resolve => setTimeout(resolve, 1000));
    try {
      const canvas = await html2canvas(container, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${isGlobal(c) ? 'Master' : c!.name.replace(/\s+/g, '_')}_Debt_Audit.pdf`);
    } catch (e) { console.error(e); }
    container.innerHTML = '';
    setIsExporting(false);
  };

  const isGlobal = (c: Customer | null) => !c;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div>
            <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">{t.loan} Intelligence</h3>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Managed Debt Reconciliation Terminal</p>
         </div>
         <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => handleDownloadPDF(null)}
              disabled={isExporting}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
            >
              {isExporting ? <Clock size={16} className="animate-spin" /> : <FileDown size={16} />}
              Export Ledger
            </button>
            <button 
              onClick={() => setIsManualLogOpen(true)}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95"
            >
              <PlusCircle size={16} />
              New Entry
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative overflow-hidden group">
             <div className="relative z-10">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Outstanding Exposure</p>
                <h3 className="text-6xl font-black text-rose-600 dark:text-rose-400 tracking-tighter">
                   {state.settings.currency}{totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                </h3>
                <div className="flex items-center gap-4 mt-6">
                   <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 dark:bg-rose-900/20 rounded-full border border-rose-100 dark:border-rose-900/50">
                      <AlertCircle size={14} className="text-rose-500" />
                      <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">{totalDebtors} Active Debtors</span>
                   </div>
                   <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-800">
                      <Clock size={14} className="text-slate-400" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real-time Pulse</span>
                   </div>
                </div>
             </div>
             <div className="w-32 h-32 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[40px] flex items-center justify-center shadow-inner relative z-10 shrink-0 transition-transform group-hover:scale-110">
                <Scale size={64} />
             </div>
             <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/5 blur-[100px] rounded-full"></div>
          </div>

          <div className="flex items-center gap-4">
             <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Query debtor archive by identity or contact..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-6 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-sm dark:text-white transition-all shadow-sm"
                />
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {debtors.map((c) => (
              <div 
                key={c.id} 
                className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all group cursor-pointer"
                onClick={() => setViewingDebtor(c)}
              >
                <div className="flex items-center justify-between mb-6">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl flex items-center justify-center font-black text-lg group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        {c.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                         <h4 className="font-black text-[15px] dark:text-white truncate uppercase tracking-tight">{c.name}</h4>
                         <p className="text-[10px] text-slate-400 font-bold tracking-widest">{c.phone}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-0.5">Debt Index</p>
                      <p className="text-xl font-black text-rose-600">{state.settings.currency}{c.totalDebt.toLocaleString()}</p>
                   </div>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
                   <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ID: #{c.id.padStart(4, '0')}</span>
                   </div>
                   <div className="flex gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handlePrintExport(c); }}
                        className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                      >
                        <Printer size={16} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setPayingCustomer(c); }}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all"
                      >
                        <DollarSign size={14} /> Repay
                      </button>
                   </div>
                </div>
              </div>
            ))}
            {debtors.length === 0 && (
              <div className="col-span-full py-32 text-center flex flex-col items-center justify-center gap-4 border-2 border-dashed border-slate-100 rounded-[40px]">
                 <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-500 rounded-full flex items-center justify-center">
                    <CheckCircle2 size={40} />
                 </div>
                 <p className="font-black text-xs uppercase tracking-widest text-slate-300">Clean Slate - No active debts detected</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <Clock size={16} className="text-indigo-600" /> Transaction Pulse
              </h4>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                 {state.loanTransactions.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15).map(trans => {
                    const cust = state.customers.find(c => c.id === trans.customerId);
                    return (
                       <div key={trans.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-transparent hover:border-slate-200 transition-all group">
                          <div className="flex justify-between items-start mb-2">
                             <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${
                                  trans.type === 'debt' ? 'bg-rose-100 text-rose-600' : 
                                  trans.type === 'repayment' ? 'bg-emerald-100 text-emerald-600' : 
                                  'bg-amber-100 text-amber-600'
                                }`}>
                                   {trans.type === 'debt' ? <ArrowDownLeft size={16} /> : trans.type === 'repayment' ? <ArrowUpRight size={16} /> : <Calculator size={16} />}
                                </div>
                                <div className="min-w-0">
                                   <p className="text-[11px] font-black dark:text-white truncate w-24 group-hover:w-auto transition-all">{cust?.name}</p>
                                   <span className="text-[8px] font-black text-slate-400 uppercase">{new Date(trans.date).toLocaleDateString()}</span>
                                </div>
                             </div>
                             <p className={`text-sm font-black ${trans.type === 'debt' ? 'text-rose-600' : trans.type === 'repayment' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {trans.type === 'debt' ? '+' : '-'}{state.settings.currency}{trans.amount.toFixed(0)}
                             </p>
                          </div>
                          <p className="text-[9px] text-slate-400 font-bold italic truncate opacity-60">"{trans.note || 'Internal ledger entry'}"</p>
                       </div>
                    )
                 })}
              </div>
           </div>
        </div>
      </div>

      {/* Viewing Debtor Detail Modal */}
      {viewingDebtor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-10 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[48px] w-full max-w-5xl h-full lg:max-h-[85vh] shadow-2xl relative flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <header className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center font-black text-2xl shadow-xl">{viewingDebtor.name.charAt(0)}</div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">{viewingDebtor.name}</h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">ID: #{viewingDebtor.id.padStart(4, '0')} | {viewingDebtor.phone}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                 <button onClick={() => handlePrintExport(viewingDebtor)} className="p-3 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100" title="Print Statement"><Printer size={20}/></button>
                 <button onClick={() => handleDownloadPDF(viewingDebtor)} disabled={isExporting} className="p-3 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100" title="Download PDF Statement">
                    {isExporting ? <Clock size={20} className="animate-spin" /> : <FileDown size={20}/>}
                 </button>
                 <button onClick={() => setViewingDebtor(null)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all ml-4"><X size={24}/></button>
              </div>
            </header>
            
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/20">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border shadow-sm flex items-center justify-between">
                     <div>
                        <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Unpaid Exposure</p>
                        <h4 className="text-4xl font-black text-rose-600">{state.settings.currency}{viewingDebtor.totalDebt.toLocaleString()}</h4>
                     </div>
                     <Scale size={48} className="text-rose-100" />
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border shadow-sm flex items-center justify-between">
                     <div>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Lifetime Volume</p>
                        <h4 className="text-4xl font-black text-indigo-600">{state.settings.currency}{viewingDebtor.totalSpent.toLocaleString()}</h4>
                     </div>
                     <ArrowUpRight size={48} className="text-indigo-100" />
                  </div>
               </div>
               
               <div className="space-y-4">
                  <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Chronological Timeline</h5>
                  {getChronologicalHistory(viewingDebtor.id).map(h => (
                    <div key={h.id} className="bg-white dark:bg-slate-900 p-5 rounded-[24px] border shadow-sm flex items-center justify-between hover:border-indigo-100 transition-all">
                       <div className="flex items-center gap-5">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${h.type === 'debt' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                             {h.type === 'debt' ? <ArrowDownLeft size={18}/> : <ArrowUpRight size={18}/>}
                          </div>
                          <div>
                             <p className="text-sm font-black dark:text-white capitalize tracking-tight">{h.type} Logged</p>
                             <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(h.date).toLocaleDateString()} - ${h.note || 'System Record'}</p>
                          </div>
                       </div>
                       <p className={`text-xl font-black ${h.type === 'debt' ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {h.type === 'debt' ? '+' : '-'}{state.settings.currency}{h.amount.toLocaleString()}
                       </p>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>
      )}

      {isManualLogOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-lg p-0 shadow-2xl relative animate-in zoom-in duration-200 max-h-[90vh] overflow-hidden flex flex-col">
             <header className="p-8 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600"><PlusCircle size={24}/></div>
                   <div>
                      <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Adjustment Panel</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Manual Balance Modulation</p>
                   </div>
                </div>
                <button onClick={() => { setIsManualLogOpen(false); setManualCustomer(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"><X size={20}/></button>
             </header>

             <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                <div className="space-y-6">
                   <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Target Account</label>
                      {manualCustomer ? (
                        <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl animate-in zoom-in-95">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-black text-xs">{manualCustomer.name.charAt(0)}</div>
                              <div>
                                 <p className="text-sm font-black dark:text-white uppercase tracking-tight">{manualCustomer.name}</p>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase">Present Balance: {state.settings.currency}{manualCustomer.totalDebt.toLocaleString()}</p>
                              </div>
                           </div>
                           <button onClick={() => setManualCustomer(null)} className="p-2 hover:bg-indigo-100 dark:hover:bg-indigo-800 rounded-full text-indigo-600"><X size={16}/></button>
                        </div>
                      ) : (
                        <div className="relative">
                           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                           <input 
                              type="text" 
                              value={manualSearch}
                              onChange={(e) => setManualSearch(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-indigo-500 font-bold text-sm dark:text-white transition-all"
                              placeholder="Locate client by name or contact..."
                           />
                           {manualSearch && (
                              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 py-2 z-20 overflow-hidden">
                                 {availableCustomers.map(c => (
                                    <button key={c.id} onClick={() => { setManualCustomer(c); setManualSearch(''); }} className="w-full p-4 text-left hover:bg-indigo-50 dark:hover:bg-indigo-500/10 flex items-center justify-between group transition-colors">
                                       <div className="flex items-center gap-3">
                                          <div className="w-9 h-9 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-400 font-black text-xs">{c.name.charAt(0)}</div>
                                          <div>
                                             <p className="text-sm font-black dark:text-white uppercase tracking-tight">{c.name}</p>
                                             <p className="text-[9px] text-slate-400 font-bold">{c.phone}</p>
                                          </div>
                                       </div>
                                       <ArrowRight size={16} className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-all"/>
                                    </button>
                                 ))}
                              </div>
                           )}
                        </div>
                      )}
                   </div>

                   <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'debt', label: 'Debit', icon: PlusCircle, color: 'text-rose-500' },
                        { id: 'repayment', label: 'Repay', icon: CheckCircle2, color: 'text-emerald-500' },
                        { id: 'adjustment', label: 'Adj', icon: Settings, color: 'text-amber-500' }
                      ].map(type => (
                        <button 
                           key={type.id}
                           onClick={() => setManualType(type.id as any)}
                           className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${manualType === type.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40' : 'border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
                        >
                           <type.icon size={24} className={manualType === type.id ? type.color : 'text-slate-400'}/>
                           <span className={`text-[10px] font-black uppercase tracking-widest mt-2 ${manualType === type.id ? 'text-indigo-600' : 'text-slate-400'}`}>{type.label}</span>
                        </button>
                      ))}
                   </div>

                   <div className="space-y-6">
                      <div>
                         <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Flow Amount</label>
                         <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={24}/>
                            <input 
                              type="number" 
                              value={manualAmount}
                              onChange={(e) => setManualAmount(e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-indigo-500 font-black text-3xl dark:text-white transition-all"
                              placeholder="0.00"
                            />
                         </div>
                      </div>
                      
                      {manualType === 'debt' && (
                        <div className="animate-in slide-in-from-top-2">
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Collection Deadline</label>
                           <input 
                             type="date" 
                             value={manualDueDate}
                             onChange={(e) => setManualDueDate(e.target.value)}
                             className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 outline-none focus:border-indigo-500 font-bold text-sm dark:text-white"
                           />
                        </div>
                      )}

                      <div>
                         <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Internal Reference Note</label>
                         <input 
                           type="text" 
                           value={manualNote}
                           onChange={(e) => setManualNote(e.target.value)}
                           className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-6 font-bold text-sm dark:text-white shadow-inner outline-none"
                           placeholder="e.g. Bulk inventory credit, partial settle..."
                         />
                      </div>
                   </div>
                </div>
             </div>

             <footer className="p-8 pt-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky bottom-0 z-10">
                <button 
                  onClick={handleManualTransaction}
                  disabled={!manualCustomer || !manualAmount || manualAmount <= 0}
                  className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none disabled:opacity-50 active:scale-[0.98] uppercase tracking-widest"
                >
                  Confirm Registry
                </button>
             </footer>
          </div>
        </div>
      )}

      {payingCustomer && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-md p-10 shadow-2xl relative border border-white/10">
            <button onClick={() => setPayingCustomer(null)} className="absolute top-8 right-8 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"><X size={20}/></button>
            <div className="flex items-center gap-5 mb-10">
               <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-500/10 rounded-[20px] flex items-center justify-center text-emerald-600 shadow-lg shadow-emerald-100 dark:shadow-none"><Wallet size={28}/></div>
               <div>
                  <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Settlement</h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">{payingCustomer.name}</p>
               </div>
            </div>

            <div className="space-y-8 mb-10">
               <div className="p-8 bg-rose-50 dark:bg-rose-900/10 rounded-[32px] border border-rose-100 dark:border-rose-900/30 text-center">
                  <p className="text-[11px] font-black text-rose-400 uppercase tracking-widest mb-2">Liability Portfolio</p>
                  <p className="text-5xl font-black text-rose-600 tracking-tighter">{state.settings.currency}{payingCustomer.totalDebt.toLocaleString()}</p>
               </div>

               <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Inbound Payment</label>
                  <div className="relative">
                     <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={24}/>
                     <input 
                        type="number" 
                        value={repaymentAmount}
                        onChange={(e) => setRepaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[24px] py-5 pl-14 pr-6 outline-none font-black text-3xl dark:text-white transition-all shadow-inner"
                        placeholder="0.00"
                        autoFocus
                     />
                  </div>
               </div>
            </div>

            <button 
               onClick={() => handleProcessRepayment(payingCustomer, Number(repaymentAmount))}
               disabled={repaymentAmount === '' || repaymentAmount <= 0}
               className="w-full py-6 bg-emerald-600 text-white rounded-[24px] font-black text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 dark:shadow-none disabled:opacity-50 active:scale-95 uppercase tracking-widest"
            >
               Execute Repayment
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Loans;
