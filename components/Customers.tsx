import React, { useState, useMemo, useRef } from 'react';
import { 
  Users as UsersIcon, 
  Search, 
  Plus, 
  Phone, 
  X, 
  Trash2, 
  Edit, 
  Scale,
  CheckCircle2,
  Award,
  Crown,
  UserPlus,
  Mail,
  FileDown,
  IdCard,
  User,
  ShieldCheck,
  Star,
  RefreshCw,
  ArrowUpDown,
  Printer,
  QrCode,
  ArrowRight,
  Maximize2,
  CreditCard,
  Smartphone,
  MapPin,
  Camera,
  Briefcase,
  History,
  FileText,
  TrendingUp,
  Receipt,
  Wallet,
  ArrowDownRight,
  ChevronRight,
  Calculator,
  Calendar,
  ClipboardList
} from 'lucide-react';
import { AppState, Customer, View, Invoice, LoanTransaction } from '../types';
import { translations } from '../translations';
import ConfirmDialog from './ConfirmDialog';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface Props {
  state: AppState;
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
  setCurrentView?: (view: View) => void;
}

type SortKey = 'name' | 'id' | 'spent' | 'debt';
type SortOrder = 'asc' | 'desc';
type ProfileTab = 'overview' | 'transactions' | 'loans';

const Customers: React.FC<Props> = ({ state, updateState, setCurrentView }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDebt, setFilterDebt] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [viewingCard, setViewingCard] = useState<Customer | null>(null);
  const [trashConfirm, setTrashConfirm] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('spent');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [isExportingCard, setIsExportingCard] = useState(false);
  const [isExportingReport, setIsExportingReport] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<ProfileTab>('overview');
  
  const [isSettlingDebt, setIsSettlingDebt] = useState(false);
  const [settlementAmount, setSettlementAmount] = useState<number | ''>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[state.settings.language || 'en'];

  const activeCustomers = useMemo(() => state.customers.filter(c => !c.isDeleted), [state.customers]);

  const filteredCustomers = useMemo(() => {
    let result = activeCustomers.filter(c => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = c.name.toLowerCase().includes(q) || 
                            c.phone.includes(searchTerm) || 
                            c.id.toString().includes(searchTerm);
      const matchesDebt = filterDebt ? c.totalDebt > 0 : true;
      return matchesSearch && matchesDebt;
    });

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case 'name': comparison = a.name.localeCompare(b.name); break;
        case 'id': comparison = parseInt(a.id) - parseInt(b.id); break;
        case 'spent': comparison = a.totalSpent - b.totalSpent; break;
        case 'debt': comparison = a.totalDebt - b.totalDebt; break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [activeCustomers, searchTerm, filterDebt, sortKey, sortOrder]);

  const getTier = (spent: number) => {
    if (spent >= 5000) return { label: 'Platinum', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', icon: Crown };
    if (spent >= 2500) return { label: 'Gold', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: Crown };
    if (spent >= 1000) return { label: 'Silver', color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800/50', icon: Award };
    return { label: 'Bronze', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', icon: Award };
  };

  const [form, setForm] = useState<Partial<Customer>>({ 
    name: '', phone: '', email: '', address: '', company: '', notes: '', photo: '',
    gender: 'Male', occupation: ''
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setForm(prev => ({ ...prev, photo: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSaveCustomer = () => {
    if (!form.name || !form.phone) return alert("Required: Name & Phone");
    if (editingCustomer) {
      updateState('customers', state.customers.map(c => c.id === editingCustomer.id ? { ...c, ...form } as Customer : c));
    } else {
      const nextId = (state.customers.reduce((max, c) => Math.max(max, parseInt(c.id) || 0), 0) + 1).toString();
      const customer: Customer = { 
        id: nextId, name: form.name || '', email: form.email || '', phone: form.phone || '', address: form.address || '', photo: form.photo || '',
        totalSpent: 0, totalDebt: 0, lastVisit: 'New Member', joinedDate: new Date().toISOString(), transactionCount: 0, loyaltyPoints: 0,
        notes: form.notes || '', company: form.company || '', isArchived: false, isDeleted: false,
      };
      updateState('customers', [...state.customers, customer]);
    }
    resetAndClose();
  };

  const resetAndClose = () => {
    setIsAdding(false); 
    setEditingCustomer(null); 
    setForm({ name: '', phone: '', email: '', address: '', company: '', notes: '', photo: '' });
  };

  const handleQuickRepay = () => {
    if (!viewingCustomer || !settlementAmount || Number(settlementAmount) <= 0) return;
    const amount = Number(settlementAmount);
    const newTrans: LoanTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      customerId: viewingCustomer.id,
      date: new Date().toISOString(),
      amount: amount,
      type: 'repayment',
      note: "Quick settlement from profile view"
    };
    let remaining = amount;
    const updatedInvoices = state.invoices.map((inv: Invoice) => {
      if (inv.customerId === viewingCustomer.id && inv.status !== 'paid' && !inv.isVoided) {
        const balance = inv.total - inv.paidAmount;
        const toPay = Math.min(remaining, balance);
        remaining -= toPay;
        const newPaid = inv.paidAmount + toPay;
        return { ...inv, paidAmount: newPaid, status: newPaid >= inv.total ? 'paid' : 'partial' } as Invoice;
      }
      return inv;
    });
    const updatedCustomers = state.customers.map(c => 
      c.id === viewingCustomer.id ? { ...c, totalDebt: Math.max(0, c.totalDebt - amount) } : c
    );
    updateState('invoices', updatedInvoices);
    updateState('customers', updatedCustomers);
    updateState('loanTransactions', [...state.loanTransactions, newTrans]);
    setViewingCustomer(updatedCustomers.find(c => c.id === viewingCustomer.id) || null);
    setIsSettlingDebt(false);
    setSettlementAmount('');
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortOrder('desc'); }
  };

  const handleDownloadCard = async (customer: Customer) => {
    if (isExportingCard) return;
    setIsExportingCard(true);
    const element = document.getElementById('member-card-render');
    if (!element) return setIsExportingCard(false);
    try {
      const canvas = await html2canvas(element, { scale: 4, useCORS: true, backgroundColor: null });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [85, 55] });
      pdf.addImage(imgData, 'PNG', 0, 0, 85, 55);
      pdf.save(`MEMBER_CARD_${customer.name.replace(/\s+/g, '_')}.pdf`);
    } catch (e) { console.error(e); } finally { setIsExportingCard(false); }
  };

  const handleDownloadCustomerReport = async (customer: Customer) => {
    if (isExportingReport) return;
    setIsExportingReport(true);
    const container = document.getElementById('pdf-render-container');
    if (!container) return setIsExportingReport(false);

    const customerInvoices = state.invoices.filter(inv => inv.customerId === customer.id && !inv.isVoided);
    const customerLoans = state.loanTransactions.filter(l => l.customerId === customer.id);
    const currency = state.settings.currency;

    const reportHtml = `
      <div style="width: 210mm; padding: 20mm; background: white; font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.5;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 4px solid #4f46e5; padding-bottom: 10mm; margin-bottom: 10mm;">
          <div>
            <h1 style="margin: 0; font-size: 32px; font-weight: 900; text-transform: uppercase; color: #0f172a;">Audit Report</h1>
            <p style="margin: 4px 0 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 2px;">Official Customer Transaction History</p>
          </div>
          <div style="text-align: right;">
            <h2 style="margin: 0; font-size: 18px; font-weight: 900;">${state.settings.shopName.toUpperCase()}</h2>
            <p style="margin: 2px 0; font-size: 10px; color: #64748b; font-weight: 600;">${state.settings.shopAddress || ''}</p>
            <p style="margin: 2px 0; font-size: 10px; color: #64748b; font-weight: 600;">GENERATED: ${new Date().toLocaleString()}</p>
          </div>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10mm; display: flex; gap: 15mm; margin-bottom: 10mm;">
           <div style="width: 40mm; height: 40mm; background: #fff; border: 4px solid #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border-radius: 12px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
              ${customer.photo ? `<img src="${customer.photo}" style="width: 100%; height: 100%; object-fit: cover;" />` : `<span style="font-size: 48px; font-weight: 900; color: #cbd5e1;">${customer.name.charAt(0)}</span>`}
           </div>
           <div style="flex: 1;">
              <h3 style="margin: 0; font-size: 24px; font-weight: 900; color: #0f172a; text-transform: uppercase;">${customer.name}</h3>
              <p style="margin: 4px 0 15px; font-size: 14px; color: #4f46e5; font-weight: 800; letter-spacing: 1px;">CLIENT ID: #REG-${customer.id.padStart(4, '0')}</p>
              <div style="display: grid; grid-cols: 2; gap: 4px;">
                 <p style="margin: 0; font-size: 11px; color: #64748b;"><b>TELECOM:</b> ${customer.phone}</p>
                 <p style="margin: 0; font-size: 11px; color: #64748b;"><b>LOCATION:</b> ${customer.address || 'Not Registered'}</p>
                 <p style="margin: 0; font-size: 11px; color: #64748b;"><b>ENROLLMENT:</b> ${new Date(customer.joinedDate).toLocaleDateString()}</p>
              </div>
           </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; margin-bottom: 12mm;">
           <div style="background: #ffffff; border: 2px solid #e2e8f0; padding: 6mm; border-radius: 16px; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Lifetime Investment</p>
              <h4 style="margin: 0; font-size: 24px; font-weight: 900; color: #0f172a;">${currency}${customer.totalSpent.toLocaleString()}</h4>
           </div>
           <div style="background: #fff1f2; border: 2px solid #fecdd3; padding: 6mm; border-radius: 16px; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 9px; font-weight: 900; color: #e11d48; text-transform: uppercase; letter-spacing: 1px;">Current Liability</p>
              <h4 style="margin: 0; font-size: 24px; font-weight: 900; color: #be123c;">${currency}${customer.totalDebt.toLocaleString()}</h4>
           </div>
           <div style="background: #eff6ff; border: 2px solid #dbeafe; padding: 6mm; border-radius: 16px; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 9px; font-weight: 900; color: #2563eb; text-transform: uppercase; letter-spacing: 1px;">Loyalty Credits</p>
              <h4 style="margin: 0; font-size: 24px; font-weight: 900; color: #1e40af;">${customer.loyaltyPoints || 0} PTS</h4>
           </div>
        </div>

        <h4 style="font-size: 12px; font-weight: 900; text-transform: uppercase; color: #64748b; border-left: 4px solid #4f46e5; padding-left: 12px; margin-bottom: 6mm;">Transaction Registry (Past 20 Logs)</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12mm; font-size: 11px;">
           <thead>
              <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                 <th style="padding: 4mm; text-align: left; font-weight: 900;">DATE</th>
                 <th style="padding: 4mm; text-align: left; font-weight: 900;">DOC ID</th>
                 <th style="padding: 4mm; text-align: center; font-weight: 900;">STATUS</th>
                 <th style="padding: 4mm; text-align: right; font-weight: 900;">TOTAL AMOUNT</th>
              </tr>
           </thead>
           <tbody>
              ${customerInvoices.slice(-20).map(inv => `
                 <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 4mm;">${new Date(inv.date).toLocaleDateString()}</td>
                    <td style="padding: 4mm; font-family: monospace; font-weight: 700;">#INV-${inv.id.padStart(4, '0')}</td>
                    <td style="padding: 4mm; text-align: center; font-weight: 800; text-transform: uppercase;">${inv.status}</td>
                    <td style="padding: 4mm; text-align: right; font-weight: 800;">${currency}${inv.total.toLocaleString()}</td>
                 </tr>
              `).join('')}
              ${customerInvoices.length === 0 ? '<tr><td colspan="4" style="padding: 10mm; text-align: center; color: #cbd5e1; font-weight: 700;">No sales history logged for this entity.</td></tr>' : ''}
           </tbody>
        </table>

        <h4 style="font-size: 12px; font-weight: 900; text-transform: uppercase; color: #64748b; border-left: 4px solid #be123c; padding-left: 12px; margin-bottom: 6mm;">Loan & Credit Adjustments</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10mm; font-size: 11px;">
           <thead>
              <tr style="background: #fdf2f2; border-bottom: 2px solid #fee2e2;">
                 <th style="padding: 4mm; text-align: left; font-weight: 900;">DATE</th>
                 <th style="padding: 4mm; text-align: left; font-weight: 900;">TRANSACTION TYPE</th>
                 <th style="padding: 4mm; text-align: left; font-weight: 900;">NOTE/REFERENCE</th>
                 <th style="padding: 4mm; text-align: right; font-weight: 900;">MAGNITUDE</th>
              </tr>
           </thead>
           <tbody>
              ${customerLoans.slice(-15).map(l => `
                 <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 4mm;">${new Date(l.date).toLocaleDateString()}</td>
                    <td style="padding: 4mm; font-weight: 800; text-transform: uppercase; color: ${l.type === 'debt' ? '#be123c' : '#059669'};">${l.type}</td>
                    <td style="padding: 4mm; color: #64748b;">${l.note || 'System Registry Entry'}</td>
                    <td style="padding: 4mm; text-align: right; font-weight: 800;">${l.type === 'debt' ? '+' : '-'}${currency}${l.amount.toLocaleString()}</td>
                 </tr>
              `).join('')}
              ${customerLoans.length === 0 ? '<tr><td colspan="4" style="padding: 10mm; text-align: center; color: #cbd5e1; font-weight: 700;">No manual adjustments recorded.</td></tr>' : ''}
           </tbody>
        </table>

        <div style="margin-top: auto; padding-top: 10mm; border-top: 1px solid #e2e8f0; text-align: center;">
           <p style="margin: 0; font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Sarvari Seller Pro POS • Verified Identity Audit • Confidential</p>
        </div>
      </div>
    `;

    container.innerHTML = reportHtml;
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`AUDIT_REPORT_${customer.name.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      container.innerHTML = '';
      setIsExportingReport(false);
    }
  };

  const getPatternStyle = (p: string): string => {
    switch(p) {
      case 'mesh': return 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)';
      case 'dots': return 'radial-gradient(rgba(255,255,255,0.2) 2px, transparent 2px)';
      case 'waves': return 'repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 2px, transparent 2px, transparent 4px)';
      case 'circuit': return 'linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)';
      default: return 'none';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <ConfirmDialog 
        isOpen={!!trashConfirm} 
        onClose={() => setTrashConfirm(null)} 
        onConfirm={() => {
          updateState('customers', state.customers.map(c => c.id === trashConfirm ? { ...c, isDeleted: true } : c));
          setViewingCustomer(null);
        }} 
        title="Quarantine Identity?" 
        message="This customer record will be moved to the Trash bin." 
      />

      {isSettlingDebt && viewingCustomer && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[48px] w-full max-w-md shadow-2xl p-10 border border-white/10 animate-in zoom-in-95">
              <div className="flex flex-col items-center text-center space-y-6">
                 <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-[32px] flex items-center justify-center shadow-lg"><Wallet size={36}/></div>
                 <div><h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Settle Debt</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Payment for {viewingCustomer.name}</p></div>
                 <div className="w-full p-6 bg-rose-50 dark:bg-rose-900/10 rounded-[32px] border border-rose-100 dark:border-rose-900/30">
                    <p className="text-[10px] font-black text-rose-500 uppercase mb-1">Total Outstanding</p>
                    <p className="text-4xl font-black text-rose-600">{state.settings.currency}{viewingCustomer.totalDebt.toLocaleString()}</p>
                 </div>
                 <div className="w-full space-y-2">
                    <label className="block text-[11px] font-black text-slate-400 uppercase text-left ml-4">Repayment Amount</label>
                    <input 
                      type="number" 
                      value={settlementAmount} 
                      onChange={e => setSettlementAmount(e.target.value === '' ? '' : Number(e.target.value))} 
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-emerald-500 rounded-[28px] py-5 px-8 font-black text-3xl text-center dark:text-white outline-none" 
                      placeholder="0.00" 
                      autoFocus 
                    />
                 </div>
                 <div className="flex gap-3 w-full">
                    <button onClick={() => setIsSettlingDebt(false)} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-[24px] font-black text-[10px] uppercase">Abort</button>
                    <button onClick={handleQuickRepay} disabled={!settlementAmount} className="flex-[2] py-5 bg-emerald-600 text-white rounded-[24px] font-black text-[10px] uppercase shadow-lg active:scale-95 disabled:opacity-50">Confirm Payment</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-8 rounded-[48px] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 bg-indigo-600 text-white rounded-[28px] flex items-center justify-center shadow-2xl shadow-indigo-100 dark:shadow-none"><UsersIcon size={32}/></div>
           <div>
              <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">Customer CRM</h3>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Authorized database managing {activeCustomers.length} identities</p>
           </div>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setFilterDebt(!filterDebt)} className={`px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all flex items-center gap-2 ${filterDebt ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white dark:bg-slate-900 text-slate-400'}`}>
              <Scale size={16}/> Debtors Only
           </button>
           <button onClick={() => setIsAdding(true)} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 active:scale-95 transition-all">
              <UserPlus size={18}/> New Identity
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
         <div className="lg:col-span-8 space-y-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border shadow-sm">
               <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" placeholder="Locate client by ID, Name or Phone..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3.5 pl-12 pr-6 outline-none font-bold text-sm dark:text-white" />
               </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[40px] border shadow-sm overflow-hidden">
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b">
                        <tr>
                           <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer" onClick={() => toggleSort('name')}>Identity <ArrowUpDown size={10} className="inline ml-1"/></th>
                           <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center cursor-pointer" onClick={() => toggleSort('spent')}>Investment <ArrowUpDown size={10} className="inline ml-1"/></th>
                           <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right cursor-pointer" onClick={() => toggleSort('debt')}>Liability <ArrowUpDown size={10} className="inline ml-1"/></th>
                           <th className="px-8 py-5"></th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredCustomers.map((c) => {
                           const tier = getTier(c.totalSpent);
                           return (
                             <tr key={c.id} onClick={() => { setViewingCustomer(c); setActiveProfileTab('overview'); }} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group cursor-pointer">
                                <td className="px-8 py-4">
                                   <div className="flex items-center gap-4">
                                      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center font-black text-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all overflow-hidden border">
                                         {c.photo ? <img src={c.photo} className="w-full h-full object-cover" /> : c.name.charAt(0)}
                                      </div>
                                      <div>
                                         <p className="font-black text-sm dark:text-white uppercase truncate max-w-[150px]">{c.name}</p>
                                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{c.phone}</p>
                                      </div>
                                   </div>
                                </td>
                                <td className="px-8 py-4 text-center">
                                   <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${tier.bg} ${tier.color}`}>
                                      <tier.icon size={12}/>
                                      <span className="text-[9px] font-black uppercase tracking-widest">{tier.label}</span>
                                   </div>
                                   <p className="text-[10px] font-black mt-1 dark:text-slate-400">{state.settings.currency}{c.totalSpent.toLocaleString()}</p>
                                </td>
                                <td className="px-8 py-4 text-right">
                                   <p className={`text-sm font-black ${c.totalDebt > 0 ? 'text-rose-600' : 'text-emerald-500'}`}>{state.settings.currency}{c.totalDebt.toLocaleString()}</p>
                                   <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Exposure Index</p>
                                </td>
                                <td className="px-8 py-4 text-right">
                                   <div className="p-2 text-slate-300 opacity-0 group-hover:opacity-100 transition-all"><ArrowRight size={20}/></div>
                                </td>
                             </tr>
                           )
                        })}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>

         <div className="lg:col-span-4">
            {viewingCustomer ? (
               <div className="bg-white dark:bg-slate-900 rounded-[48px] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden animate-in slide-in-from-right duration-300 flex flex-col h-[800px] sticky top-8">
                  <div className="h-32 bg-indigo-600 relative overflow-hidden shrink-0">
                     <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                  </div>
                  <header className="px-10 pb-6 text-center -mt-16 relative z-10 shrink-0">
                     <div className="w-32 h-32 bg-white dark:bg-slate-800 rounded-[40px] flex items-center justify-center mx-auto shadow-2xl overflow-hidden border-4 border-white dark:border-slate-800">
                        {viewingCustomer.photo ? <img src={viewingCustomer.photo} className="w-full h-full object-cover" /> : <User size={64} className="text-slate-200" />}
                     </div>
                     <h4 className="text-2xl font-black dark:text-white uppercase tracking-tighter mt-6 leading-none">{viewingCustomer.name}</h4>
                     <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mt-3">ID: #REG-{viewingCustomer.id.padStart(4, '0')}</p>
                  </header>

                  <div className="px-10 flex gap-6 border-b dark:border-slate-800 shrink-0">
                     {[
                       { id: 'overview', label: 'Meta', icon: User },
                       { id: 'transactions', label: 'History', icon: Receipt },
                       { id: 'loans', label: 'Loans', icon: Calculator }
                     ].map(tab => (
                       <button 
                        key={tab.id} 
                        onClick={() => setActiveProfileTab(tab.id as any)}
                        className={`pb-4 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all ${activeProfileTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                       >
                          <tab.icon size={14}/> {tab.label}
                       </button>
                     ))}
                  </div>

                  <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                     {activeProfileTab === 'overview' && (
                       <div className="space-y-8 animate-in fade-in">
                          <div className="grid grid-cols-2 gap-4">
                             <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[32px] border">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Aggregate Sales</p>
                                <h5 className="text-xl font-black dark:text-white">{state.settings.currency}{viewingCustomer.totalSpent.toLocaleString()}</h5>
                             </div>
                             <div className="bg-rose-50 dark:bg-rose-950/20 p-6 rounded-[32px] border border-rose-100">
                                <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Exposure</p>
                                <h5 className="text-xl font-black text-rose-600">{state.settings.currency}{viewingCustomer.totalDebt.toLocaleString()}</h5>
                             </div>
                          </div>

                          <div className="grid grid-cols-1 gap-3">
                             {viewingCustomer.totalDebt > 0 && (
                               <button onClick={() => setIsSettlingDebt(true)} className="w-full py-5 bg-emerald-600 text-white rounded-[28px] shadow-xl shadow-emerald-200 dark:shadow-none font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all">
                                  <CheckCircle2 size={18}/> Authorize Repayment
                               </button>
                             )}

                             <button onClick={() => handleDownloadCustomerReport(viewingCustomer)} disabled={isExportingReport} className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[28px] shadow-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50">
                                {isExportingReport ? <RefreshCw size={18} className="animate-spin"/> : <ClipboardList size={18}/>} 
                                {isExportingReport ? 'Generating Audit...' : 'Generate Audit Report'}
                             </button>

                             <button onClick={() => setViewingCard(viewingCustomer)} className="w-full py-5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-[28px] border-2 border-indigo-100 dark:border-indigo-800 flex items-center justify-center gap-3 font-black text-[11px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">
                                <IdCard size={18}/> Digital Identity Badge
                             </button>
                          </div>

                          <section className="space-y-4">
                             <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-3">Technical Data</h6>
                             <div className="space-y-4">
                                <div className="flex items-center gap-4"><div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-indigo-500 shadow-sm"><Phone size={18}/></div><div><p className="text-[8px] font-black text-slate-400 uppercase">Telecom</p><span className="text-[13px] font-bold dark:text-slate-200">{viewingCustomer.phone}</span></div></div>
                                {viewingCustomer.address && (<div className="flex items-center gap-4"><div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-indigo-500 shadow-sm"><MapPin size={18}/></div><div className="min-w-0 flex-1"><p className="text-[8px] font-black text-slate-400 uppercase">Geographic Node</p><span className="text-[13px] font-bold dark:text-slate-200 truncate block">{viewingCustomer.address}</span></div></div>)}
                                <div className="flex items-center gap-4"><div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-indigo-500 shadow-sm"><Calendar size={18}/></div><div><p className="text-[8px] font-black text-slate-400 uppercase">Enrollment Date</p><span className="text-[13px] font-bold dark:text-slate-200">{new Date(viewingCustomer.joinedDate).toLocaleDateString()}</span></div></div>
                             </div>
                          </section>
                       </div>
                     )}

                     {activeProfileTab === 'transactions' && (
                       <div className="space-y-4 animate-in slide-in-from-right duration-300">
                          <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4"><History size={14}/> Registry Logs</h6>
                          {state.invoices.filter(inv => inv.customerId === viewingCustomer.id).length > 0 ? (
                            state.invoices.filter(inv => inv.customerId === viewingCustomer.id).map(inv => (
                               <div key={inv.id} className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border flex items-center justify-between group hover:border-indigo-200 transition-all">
                                  <div>
                                     <p className="text-[10px] font-black text-indigo-600 uppercase">#INV-{inv.id.padStart(4, '0')}</p>
                                     <p className="text-[11px] font-bold dark:text-slate-200 mt-1">{new Date(inv.date).toLocaleDateString()}</p>
                                  </div>
                                  <div className="text-right">
                                     <p className="font-black text-sm dark:text-white">{state.settings.currency}{inv.total.toLocaleString()}</p>
                                     <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{inv.status}</span>
                                  </div>
                               </div>
                            ))
                          ) : (
                            <div className="py-20 text-center opacity-20"><Receipt size={48} className="mx-auto mb-2"/><p className="text-[10px] font-black uppercase">No Sales Logged</p></div>
                          )}
                       </div>
                     )}

                     {activeProfileTab === 'loans' && (
                       <div className="space-y-4 animate-in slide-in-from-right duration-300">
                          <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4"><TrendingUp size={14}/> Loan ledger</h6>
                          {state.loanTransactions.filter(l => l.customerId === viewingCustomer.id).length > 0 ? (
                            state.loanTransactions.filter(l => l.customerId === viewingCustomer.id).map(l => (
                               <div key={l.id} className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border flex items-center gap-4">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${l.type === 'debt' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                     {l.type === 'debt' ? <ArrowUpDown size={18}/> : <ArrowDownRight size={18}/>}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                     <div className="flex justify-between items-start">
                                        <p className="font-black text-xs uppercase dark:text-white truncate">{l.type === 'debt' ? 'Liability Incurred' : 'Repayment Entry'}</p>
                                        <p className={`font-black text-sm ${l.type === 'debt' ? 'text-rose-600' : 'text-emerald-600'}`}>{l.type === 'debt' ? '+' : '-'}{state.settings.currency}{l.amount.toLocaleString()}</p>
                                     </div>
                                     <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{new Date(l.date).toLocaleDateString()} • {l.note || 'Registry Entry'}</p>
                                  </div>
                               </div>
                            ))
                          ) : (
                            <div className="py-20 text-center opacity-20"><Calculator size={48} className="mx-auto mb-2"/><p className="text-[10px] font-black uppercase">Balance Static</p></div>
                          )}
                       </div>
                     )}
                  </div>

                  <footer className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 grid grid-cols-3 gap-3 shrink-0">
                     <button onClick={() => { setEditingCustomer(viewingCustomer); setForm(viewingCustomer); setIsAdding(true); }} className="p-4 bg-white dark:bg-slate-800 text-slate-500 rounded-3xl border shadow-sm hover:text-indigo-600 transition-all flex items-center justify-center"><Edit size={20}/></button>
                     <button onClick={() => setTrashConfirm(viewingCustomer.id)} className="p-4 bg-white dark:bg-slate-800 text-slate-500 rounded-3xl border shadow-sm hover:text-rose-600 transition-all flex items-center justify-center"><Trash2 size={20}/></button>
                     <button onClick={() => setViewingCustomer(null)} className="p-4 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-3xl shadow-xl transition-all flex items-center justify-center"><X size={20}/></button>
                  </footer>
               </div>
            ) : (
               <div className="bg-indigo-600 rounded-[56px] p-16 text-white shadow-2xl flex flex-col items-center justify-center text-center space-y-8 h-[800px] relative overflow-hidden group border-8 border-white/10 sticky top-8">
                  <div className="w-28 h-28 bg-white/20 rounded-[40px] flex items-center justify-center backdrop-blur-md shadow-inner animate-pulse border border-white/30"><UsersIcon size={56} /></div>
                  <div className="relative z-10">
                     <h4 className="text-3xl font-black uppercase tracking-tighter">Target Selection</h4>
                     <p className="text-[11px] font-bold opacity-70 uppercase tracking-[0.3em] mt-4 max-w-[240px] mx-auto leading-relaxed">Choose a profile from the ledger to view operational history and metadata</p>
                  </div>
                  <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/5 blur-[80px] rounded-full group-hover:scale-125 transition-transform duration-1000" />
               </div>
            )}
         </div>
      </div>

      {viewingCard && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-2xl animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[64px] w-full max-w-2xl shadow-2xl overflow-hidden border border-white/10 flex flex-col animate-in zoom-in-95 duration-500">
              <header className="p-10 pb-6 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center shadow-xl"><IdCard size={32}/></div>
                    <div>
                       <h3 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Member Token</h3>
                       <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Official Proprietary ID</p>
                    </div>
                 </div>
                 <button onClick={() => setViewingCard(null)} className="p-4 bg-slate-100 dark:bg-slate-800 rounded-3xl text-slate-400 hover:text-rose-500 transition-all"><X size={28}/></button>
              </header>

              <div className="flex-1 overflow-y-auto p-12 flex flex-col items-center justify-center custom-scrollbar">
                 <div 
                    id="member-card-render" 
                    className="relative overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] transition-all duration-700" 
                    style={{ 
                      width: '420px', 
                      height: '260px', 
                      borderRadius: `${state.settings.cardDesign.borderRadius}px`, 
                      background: state.settings.cardDesign.theme === 'gradient' 
                        ? `linear-gradient(135deg, ${state.settings.cardDesign.primaryColor}, ${state.settings.cardDesign.secondaryColor})` 
                        : state.settings.cardDesign.primaryColor
                    }}
                 >
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-40" />
                    {state.settings.cardDesign.pattern !== 'none' && (
                      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: getPatternStyle(state.settings.cardDesign.pattern), backgroundSize: '15px 15px' }} />
                    )}
                    
                    <div className={`p-10 h-full flex flex-col justify-between relative z-10 ${state.settings.cardDesign.textColor === 'light' ? 'text-white' : 'text-slate-900'}`}>
                       <div className="flex justify-between items-start">
                          <div>
                             {state.settings.cardDesign.showLogo && state.settings.shopLogo ? (
                                <img src={state.settings.shopLogo} className="h-10 object-contain drop-shadow-xl" />
                             ) : (
                                <div className="w-12 h-12 rounded-[18px] bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xl border border-white/30 shadow-lg">S</div>
                             )}
                             <h4 className="mt-5 font-black text-xl uppercase tracking-tighter leading-none">{state.settings.shopName}</h4>
                             <p className="text-[9px] font-black opacity-60 uppercase tracking-[0.2em] mt-2">{state.settings.shopTagline || 'Authorized Partner'}</p>
                          </div>
                          <div className="text-right">
                             <div className="text-xl font-black opacity-80 tabular-nums font-mono">#REG-{viewingCard.id.padStart(4, '0')}</div>
                             <div className="text-[8px] font-black opacity-40 uppercase mt-1 tracking-widest">Verified Digital ID</div>
                          </div>
                       </div>
                       
                       <div className="flex items-center gap-6">
                          <div className="w-20 h-20 rounded-[28px] bg-white/20 backdrop-blur-xl flex items-center justify-center font-black text-4xl border border-white/20 shadow-xl overflow-hidden">
                             {viewingCard.photo ? (
                               <img src={viewingCard.photo} className="w-full h-full object-cover" />
                             ) : (
                               <div className="w-full h-full bg-slate-400/10 flex items-center justify-center">{viewingCard.name.charAt(0)}</div>
                             )}
                          </div>
                          <div className="min-w-0 flex-1">
                             <h5 className="font-black text-2xl leading-none uppercase tracking-tight truncate max-w-[200px]">{viewingCard.name}</h5>
                             <p className="text-[10px] font-black opacity-60 mt-1.5 uppercase tracking-[0.2em]">{viewingCard.phone}</p>
                             {state.settings.cardDesign.showPoints && (
                               <div className="flex items-center gap-1.5 mt-3">
                                 <Star size={12} fill="currentColor" className="text-amber-300" />
                                 <span className="text-[10px] font-black uppercase">{viewingCard.loyaltyPoints || 0} Credits</span>
                               </div>
                             )}
                          </div>
                          {state.settings.cardDesign.showQr && (
                             <div className="ml-auto w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-2 shadow-2xl opacity-80">
                               <QrCode size={40} className="text-slate-900" />
                             </div>
                          )}
                       </div>
                    </div>
                 </div>
              </div>

              <footer className="p-10 border-t bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row gap-4 shrink-0">
                 <button onClick={() => handleDownloadCard(viewingCard)} disabled={isExportingCard} className="flex-1 py-6 bg-indigo-600 text-white rounded-[32px] font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3">
                    {isExportingCard ? <RefreshCw size={20} className="animate-spin" /> : <FileDown size={20}/>} Download Card
                 </button>
                 <button onClick={() => window.print()} className="flex-1 py-6 bg-white dark:bg-slate-800 text-slate-700 dark:text-white border-2 rounded-[32px] font-black text-xs uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-3">
                    <Printer size={20}/> Dispatch Print
                 </button>
                 <button onClick={() => setViewingCard(null)} className="flex-1 py-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[32px] font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95">Dismiss</button>
              </footer>
           </div>
        </div>
      )}

      {isAdding && (
         <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[56px] w-full max-w-4xl max-h-[95vh] shadow-2xl overflow-hidden flex flex-col border border-white/10 animate-in zoom-in-95 duration-300">
               <header className="p-10 border-b flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-6">
                     <div className="w-16 h-16 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center shadow-2xl"><UserPlus size={32}/></div>
                     <div>
                        <h3 className="text-3xl font-black dark:text-white uppercase tracking-tighter">{editingCustomer ? 'Update Profile' : 'Identity Enrollment'}</h3>
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Registry modification session</p>
                     </div>
                  </div>
                  <button onClick={resetAndClose} className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-rose-500 transition-all active:scale-90"><X size={28}/></button>
               </header>

               <div className="flex-1 overflow-y-auto p-12 custom-scrollbar space-y-12">
                  <div className="flex flex-col xl:flex-row gap-12">
                     <div className="xl:w-1/3 flex flex-col items-center">
                        <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4">Portrait Source</label>
                        <div 
                          onClick={() => fileInputRef.current?.click()} 
                          className="w-full aspect-square max-w-[280px] rounded-[48px] bg-slate-50 dark:bg-slate-950 border-4 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center cursor-pointer overflow-hidden group shadow-inner relative transition-all hover:border-indigo-400"
                        >
                           {form.photo ? (
                             <img src={form.photo} className="w-full h-full object-cover p-2 rounded-[40px]" />
                           ) : (
                             <div className="flex flex-col items-center text-slate-300">
                               <Camera size={64} strokeWidth={1} />
                               <p className="text-[10px] font-black uppercase mt-4 tracking-widest text-center px-6">Upload Member Photo</p>
                             </div>
                           )}
                           <div className="absolute inset-0 bg-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                           <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                        </div>
                     </div>

                     <div className="xl:w-2/3 space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="md:col-span-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Legal Identity Name</label>
                              <input 
                                type="text" 
                                value={form.name} 
                                onChange={e => setForm({...form, name: e.target.value})} 
                                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-3xl py-5 px-8 font-black text-xl dark:text-white outline-none shadow-sm" 
                                placeholder="Enter full name" 
                              />
                           </div>
                           <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Primary Node (Phone)</label>
                              <div className="relative">
                                 <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                                 <input 
                                   type="text" 
                                   value={form.phone} 
                                   onChange={e => setForm({...form, phone: e.target.value})} 
                                   className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-3xl py-5 pl-16 pr-8 font-bold dark:text-white outline-none shadow-sm" 
                                   placeholder="07XX..." 
                                 />
                              </div>
                           </div>
                           <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Electronic Mail</label>
                              <div className="relative">
                                 <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                                 <input 
                                   type="email" 
                                   value={form.email} 
                                   onChange={e => setForm({...form, email: e.target.value})} 
                                   className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-3xl py-5 pl-16 pr-8 font-bold dark:text-white outline-none shadow-sm" 
                                   placeholder="Email address" 
                                 />
                              </div>
                           </div>
                           <div className="md:col-span-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Geographic Node (Address)</label>
                              <div className="relative">
                                 <MapPin className="absolute left-6 top-6 text-slate-300" size={20} />
                                 <textarea 
                                   rows={2} 
                                   value={form.address} 
                                   onChange={e => setForm({...form, address: e.target.value})} 
                                   className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-3xl py-5 pl-16 pr-8 font-bold dark:text-white outline-none shadow-sm resize-none" 
                                   placeholder="Street, District, City" 
                                 />
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               <footer className="p-10 border-t bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row gap-4 shrink-0">
                  <button onClick={resetAndClose} className="flex-1 py-7 bg-white dark:bg-slate-800 text-slate-500 rounded-[32px] font-black text-xs uppercase tracking-[0.2em] border shadow-sm">Discard Changes</button>
                  <button onClick={handleSaveCustomer} className="flex-[2] py-7 bg-indigo-600 text-white rounded-[32px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-4">
                     <CheckCircle2 size={24}/> {editingCustomer ? 'Authorize Modification' : 'Complete Enrollment'}
                  </button>
               </footer>
            </div>
         </div>
      )}
    </div>
  );
};

export default Customers;