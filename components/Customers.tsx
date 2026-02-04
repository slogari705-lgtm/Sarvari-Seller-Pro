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
  LayoutGrid,
  List,
  ExternalLink,
  Zap
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
type ViewMode = 'grid' | 'table';

const Customers: React.FC<Props> = ({ state, updateState, setCurrentView }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDebt, setFilterDebt] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [viewingCard, setViewingCard] = useState<Customer | null>(null);
  const [trashConfirm, setTrashConfirm] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('spent');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [isExportingCard, setIsExportingCard] = useState(false);
  
  // Quick Repayment State
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

  const summaryStats = useMemo(() => ({
    total: activeCustomers.length,
    activeDebt: activeCustomers.reduce((acc, c) => acc + (c.totalDebt || 0), 0),
    avgSpend: activeCustomers.length ? activeCustomers.reduce((acc, c) => acc + (c.totalSpent || 0), 0) / activeCustomers.length : 0
  }), [activeCustomers]);

  const getTier = (spent: number) => {
    if (spent >= 5000) return { label: 'Platinum', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', icon: Crown, border: 'border-indigo-200' };
    if (spent >= 2500) return { label: 'Gold', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: Crown, border: 'border-amber-200' };
    if (spent >= 1000) return { label: 'Silver', color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800/50', icon: Award, border: 'border-slate-200' };
    return { label: 'Bronze', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', icon: Award, border: 'border-orange-200' };
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setForm(prev => ({ ...prev, photo: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const [form, setForm] = useState<Partial<Customer>>({ 
    name: '', phone: '', email: '', address: '', company: '', notes: '', photo: '',
    gender: 'Male', occupation: ''
  });

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
    } catch (e) {
      console.error("PDF Export Failed:", e);
    } finally {
      setIsExportingCard(false);
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

      {/* CXM Header & Stats */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-2 bg-indigo-600 p-10 rounded-[56px] text-white shadow-2xl relative overflow-hidden group">
           <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-5">
                 <div className="w-14 h-14 bg-white/20 rounded-[22px] backdrop-blur-xl flex items-center justify-center border border-white/20"><UsersIcon size={32}/></div>
                 <div>
                    <h3 className="text-3xl font-black uppercase tracking-tighter">CRM Console</h3>
                    <p className="text-indigo-100/70 text-[10px] font-bold uppercase tracking-[0.2em]">Authorized Management Hub</p>
                 </div>
              </div>
              <div className="flex gap-10">
                 <div><p className="text-[10px] font-black uppercase text-indigo-200 mb-1">Managed Identities</p><h4 className="text-4xl font-black">{summaryStats.total}</h4></div>
                 <div className="w-px h-12 bg-white/20 my-auto" />
                 <div><p className="text-[10px] font-black uppercase text-indigo-200 mb-1">Active Portfolio</p><h4 className="text-4xl font-black">{state.settings.currency}{summaryStats.activeDebt.toLocaleString()}</h4></div>
              </div>
           </div>
           <UsersIcon size={240} className="absolute -bottom-12 -right-12 text-white/5 rotate-12 group-hover:rotate-0 transition-transform duration-700 pointer-events-none" />
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[48px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Risk Pulse</p>
              <h4 className={`text-4xl font-black ${summaryStats.activeDebt > 5000 ? 'text-rose-600' : 'text-emerald-500'}`}>
                 {summaryStats.activeDebt > 0 ? 'Elevated' : 'Stable'}
              </h4>
           </div>
           <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl flex items-center justify-center"><Scale size={24}/></div>
              <div><p className="text-[10px] font-bold text-slate-400 uppercase">Exposure Index</p><span className="text-xs font-black dark:text-white">{state.settings.currency}{summaryStats.activeDebt.toLocaleString()} Net</span></div>
           </div>
        </div>

        <div className="bg-slate-950 p-8 rounded-[48px] shadow-2xl text-white flex flex-col justify-between relative overflow-hidden group">
           <div className="relative z-10">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Quick Entry</p>
              <button onClick={() => setIsAdding(true)} className="w-full py-5 bg-white text-slate-900 rounded-[28px] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all">
                 <UserPlus size={18} strokeWidth={3}/> New Identity
              </button>
           </div>
           <Zap size={100} className="absolute -bottom-4 -right-4 text-white/5 rotate-45 group-hover:scale-110 transition-transform"/>
        </div>
      </div>

      {/* Main Console Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
         <div className="lg:col-span-8 space-y-4">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[40px] border shadow-sm flex flex-col md:flex-row items-center gap-4">
               <div className="relative flex-1 w-full">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input type="text" placeholder="Locate identity by metadata (Name, ID, Phone)..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 pl-14 pr-6 outline-none font-bold text-sm dark:text-white" />
               </div>
               <div className="flex gap-2">
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border dark:border-slate-700">
                     <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}><LayoutGrid size={20}/></button>
                     <button onClick={() => setViewMode('table')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}><List size={20}/></button>
                  </div>
                  <button onClick={() => setFilterDebt(!filterDebt)} className={`px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all flex items-center gap-3 ${filterDebt ? 'bg-rose-600 border-rose-600 text-white shadow-xl' : 'bg-white dark:bg-slate-900 text-slate-400'}`}>
                     <Scale size={16}/> Liability
                  </button>
               </div>
            </div>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-300">
                 {filteredCustomers.map(c => {
                   const tier = getTier(c.totalSpent);
                   return (
                     <div key={c.id} onClick={() => setViewingCustomer(c)} className={`group bg-white dark:bg-slate-900 p-8 rounded-[48px] border-2 transition-all hover:shadow-2xl cursor-pointer relative overflow-hidden flex flex-col items-center text-center ${viewingCustomer?.id === c.id ? 'border-indigo-600 shadow-xl' : 'border-slate-50 dark:border-slate-800'}`}>
                        <div className={`absolute top-6 right-6 p-2 rounded-xl ${tier.bg} ${tier.color} border ${tier.border}`}><tier.icon size={16}/></div>
                        <div className="w-24 h-24 rounded-[32px] overflow-hidden bg-slate-50 dark:bg-slate-800 border-4 border-white dark:border-slate-800 shadow-xl mb-6 flex items-center justify-center shrink-0">
                           {c.photo ? <img src={c.photo} className="w-full h-full object-cover" /> : <div className="text-3xl font-black text-indigo-600 uppercase">{c.name.charAt(0)}</div>}
                        </div>
                        <h5 className="text-xl font-black dark:text-white uppercase truncate w-full px-2 tracking-tight">{c.name}</h5>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 mb-6">{c.phone}</p>
                        
                        <div className="w-full grid grid-cols-2 gap-4 mt-auto">
                           <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl">
                              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Spent</p>
                              <p className="text-sm font-black dark:text-white">{state.settings.currency}{c.totalSpent.toLocaleString()}</p>
                           </div>
                           <div className={`p-4 rounded-3xl ${c.totalDebt > 0 ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
                              <p className={`text-[8px] font-black uppercase mb-1 ${c.totalDebt > 0 ? 'text-rose-400' : 'text-slate-400'}`}>Debt</p>
                              <p className={`text-sm font-black ${c.totalDebt > 0 ? 'text-rose-600' : 'text-slate-500 dark:text-slate-400'}`}>{state.settings.currency}{c.totalDebt.toLocaleString()}</p>
                           </div>
                        </div>
                     </div>
                   );
                 })}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-[48px] border shadow-sm overflow-hidden animate-in slide-in-from-bottom-4">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b">
                          <tr>
                             <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer" onClick={() => toggleSort('name')}>Identity Identity <ArrowUpDown size={12} className="inline ml-1"/></th>
                             <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center cursor-pointer" onClick={() => toggleSort('spent')}>Investment <ArrowUpDown size={12} className="inline ml-1"/></th>
                             <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right cursor-pointer" onClick={() => toggleSort('debt')}>Liability <ArrowUpDown size={12} className="inline ml-1"/></th>
                             <th className="px-10 py-6"></th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {filteredCustomers.map((c) => {
                             const tier = getTier(c.totalSpent);
                             const isViewing = viewingCustomer?.id === c.id;
                             return (
                               <tr key={c.id} onClick={() => setViewingCustomer(c)} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group cursor-pointer ${isViewing ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                                  <td className="px-10 py-5">
                                     <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center font-black text-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm">
                                           {c.photo ? <img src={c.photo} className="w-full h-full object-cover" /> : c.name.charAt(0)}
                                        </div>
                                        <div>
                                           <p className="font-black text-base dark:text-white uppercase truncate max-w-[200px] tracking-tight">{c.name}</p>
                                           <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{c.phone}</p>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="px-10 py-5 text-center">
                                     <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full ${tier.bg} ${tier.color} border ${tier.border} shadow-sm mb-1`}>
                                        <tier.icon size={14}/>
                                        <span className="text-[10px] font-black uppercase tracking-widest">{tier.label}</span>
                                     </div>
                                     <p className="text-[11px] font-black text-slate-700 dark:text-slate-400">{state.settings.currency}{c.totalSpent.toLocaleString()}</p>
                                  </td>
                                  <td className="px-10 py-5 text-right">
                                     <p className={`text-lg font-black ${c.totalDebt > 0 ? 'text-rose-600' : 'text-emerald-500'}`}>{state.settings.currency}{c.totalDebt.toLocaleString()}</p>
                                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Exposure Index</p>
                                  </td>
                                  <td className="px-10 py-5 text-right">
                                     <div className={`p-3 rounded-xl transition-all ${isViewing ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-300'}`}>
                                        <ChevronRight size={20} strokeWidth={3} />
                                     </div>
                                  </td>
                                </tr>
                             )
                          })}
                       </tbody>
                    </table>
                 </div>
              </div>
            )}
         </div>

         {/* Enhanced CXM Sidebar Detail */}
         <div className="lg:col-span-4">
            {viewingCustomer ? (
               <div className="bg-white dark:bg-slate-900 rounded-[56px] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden animate-in slide-in-from-right duration-500 flex flex-col h-[850px] sticky top-8">
                  {/* Decorative Header */}
                  <div className="h-40 bg-slate-950 relative overflow-hidden shrink-0">
                     <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }} />
                     <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white dark:from-slate-900 to-transparent" />
                  </div>

                  {/* Profile Info Overlay */}
                  <div className="px-10 -mt-20 relative z-10 shrink-0 text-center">
                     <div className="w-36 h-36 bg-white dark:bg-slate-800 rounded-[48px] flex items-center justify-center mx-auto shadow-2xl overflow-hidden border-[6px] border-white dark:border-slate-900">
                        {viewingCustomer.photo ? <img src={viewingCustomer.photo} className="w-full h-full object-cover" /> : <User size={70} className="text-slate-200" />}
                     </div>
                     <h4 className="text-3xl font-black dark:text-white uppercase tracking-tighter mt-6 leading-tight">{viewingCustomer.name}</h4>
                     <div className="inline-flex items-center gap-2 px-5 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-full border border-indigo-100 dark:border-indigo-800 mt-4">
                        <Star size={14} fill="currentColor" className="text-indigo-600" />
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">LOYALTY MEMBER</span>
                     </div>
                  </div>

                  <div className="flex-1 p-10 overflow-y-auto custom-scrollbar space-y-12">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-950/50 p-6 rounded-[36px] border group hover:border-indigo-400 transition-all">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Portfolio Balance</p>
                           <h5 className="text-2xl font-black text-indigo-600">{state.settings.currency}{viewingCustomer.totalSpent.toLocaleString()}</h5>
                        </div>
                        <div className="bg-rose-50 dark:bg-rose-950/20 p-6 rounded-[36px] border border-rose-100 dark:border-rose-900/50 group hover:border-rose-400 transition-all">
                           <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Open Exposure</p>
                           <h5 className="text-2xl font-black text-rose-600">{state.settings.currency}{viewingCustomer.totalDebt.toLocaleString()}</h5>
                        </div>
                     </div>

                     {viewingCustomer.totalDebt > 0 && (
                       <button onClick={() => setIsSettlingDebt(true)} className="w-full py-6 bg-emerald-600 text-white rounded-[32px] shadow-xl shadow-emerald-200 dark:shadow-none font-black text-xs uppercase tracking-widest flex items-center justify-center gap-4 active:scale-95 transition-all">
                          <CheckCircle2 size={24} strokeWidth={3}/> Execute Settlement
                       </button>
                     )}

                     <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Registry Access</label>
                        <div className="grid grid-cols-2 gap-3">
                           <button onClick={() => setViewingCard(viewingCustomer)} className="py-5 bg-white dark:bg-slate-800 rounded-[28px] border border-slate-100 dark:border-slate-700 flex flex-col items-center gap-3 shadow-sm hover:border-indigo-500 transition-all">
                              <IdCard size={24} className="text-indigo-600"/>
                              <span className="text-[9px] font-black uppercase">Identity Token</span>
                           </button>
                           <a href={`tel:${viewingCustomer.phone}`} className="py-5 bg-white dark:bg-slate-800 rounded-[28px] border border-slate-100 dark:border-slate-700 flex flex-col items-center gap-3 shadow-sm hover:border-emerald-500 transition-all">
                              <Phone size={24} className="text-emerald-600"/>
                              <span className="text-[9px] font-black uppercase">Tele-Comm</span>
                           </a>
                        </div>
                     </div>

                     <section className="space-y-6">
                        <div className="flex items-center justify-between border-b dark:border-slate-800 pb-4 px-4">
                           <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3"><History size={16}/> Unified activity</h6>
                        </div>
                        <div className="space-y-4">
                           {state.invoices.filter(i => i.customerId === viewingCustomer.id).slice(0, 5).map(inv => (
                             <div key={inv.id} className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-[32px] border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900 transition-all flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                   <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center text-indigo-500 shadow-sm"><Receipt size={20}/></div>
                                   <div>
                                      <p className="text-[11px] font-black dark:text-white">SALE TRANSACTION</p>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">#INV-{inv.id.padStart(4, '0')}</p>
                                   </div>
                                </div>
                                <div className="text-right">
                                   <p className="text-sm font-black dark:text-white">{state.settings.currency}{inv.total.toLocaleString()}</p>
                                   <p className="text-[9px] font-bold text-slate-400 uppercase">{new Date(inv.date).toLocaleDateString()}</p>
                                </div>
                             </div>
                           ))}
                           {state.invoices.filter(i => i.customerId === viewingCustomer.id).length === 0 && (
                             <div className="py-20 text-center opacity-20"><History size={48} className="mx-auto mb-4"/><p className="text-[10px] font-black uppercase tracking-widest">No Activity Records</p></div>
                           )}
                        </div>
                     </section>
                  </div>

                  <footer className="p-10 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 grid grid-cols-3 gap-4 shrink-0">
                     <button onClick={() => { setEditingCustomer(viewingCustomer); setForm(viewingCustomer); setIsAdding(true); }} className="p-5 bg-white dark:bg-slate-800 text-slate-500 rounded-[28px] border shadow-sm hover:text-indigo-600 transition-all flex items-center justify-center active:scale-95"><Edit size={24}/></button>
                     <button onClick={() => setTrashConfirm(viewingCustomer.id)} className="p-5 bg-white dark:bg-slate-800 text-slate-500 rounded-[28px] border shadow-sm hover:text-rose-600 transition-all flex items-center justify-center active:scale-95"><Trash2 size={24}/></button>
                     <button onClick={() => setViewingCustomer(null)} className="p-5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-[28px] shadow-2xl transition-all flex items-center justify-center active:scale-95"><X size={24}/></button>
                  </footer>
               </div>
            ) : (
               <div className="bg-indigo-600 rounded-[56px] p-20 text-white shadow-2xl flex flex-col items-center justify-center text-center space-y-10 h-[850px] relative overflow-hidden group border-[12px] border-white/10 sticky top-8 animate-pulse">
                  <div className="w-36 h-36 bg-white/20 rounded-[56px] flex items-center justify-center backdrop-blur-md shadow-inner border border-white/30"><User size={70} /></div>
                  <div className="relative z-10">
                     <h4 className="text-4xl font-black uppercase tracking-tighter">Identity Terminal</h4>
                     <p className="text-xs font-bold opacity-70 uppercase tracking-[0.3em] mt-6 max-w-[280px] mx-auto leading-loose">Select a customer profile from the console to initialize identity audit and access registry history.</p>
                  </div>
                  <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-white/10 blur-[100px] rounded-full group-hover:scale-125 transition-transform duration-1000" />
               </div>
            )}
         </div>
      </div>

      {/* Settlement Modal */}
      {isSettlingDebt && viewingCustomer && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[64px] w-full max-w-xl shadow-2xl p-16 border border-white/10 animate-in zoom-in-95 overflow-hidden relative">
              <div className="flex flex-col items-center text-center space-y-10">
                 <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-[40px] flex items-center justify-center shadow-lg"><Wallet size={48}/></div>
                 <div className="space-y-2">
                    <h3 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Settlement Module</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Authorization for {viewingCustomer.name}</p>
                 </div>
                 <div className="w-full p-10 bg-rose-50 dark:bg-rose-950/20 rounded-[48px] border-4 border-dashed border-rose-100 dark:border-rose-900/30 relative">
                    <p className="text-[10px] font-black text-rose-500 uppercase mb-2 tracking-widest">Total Risk Exposure</p>
                    <p className="text-6xl font-black text-rose-600 tracking-tighter">{state.settings.currency}{viewingCustomer.totalDebt.toLocaleString()}</p>
                 </div>
                 <div className="w-full space-y-4">
                    <label className="block text-[11px] font-black text-slate-400 uppercase text-left ml-6 tracking-widest">Inbound Remittance Magnitude</label>
                    <div className="relative">
                       <span className="absolute left-10 top-1/2 -translate-y-1/2 text-slate-300 font-black text-4xl">{state.settings.currency}</span>
                       <input 
                         type="number" 
                         value={settlementAmount} 
                         onChange={e => setSettlementAmount(e.target.value === '' ? '' : Number(e.target.value))} 
                         className="w-full bg-slate-50 dark:bg-slate-800 border-4 border-transparent focus:border-emerald-500 rounded-[40px] py-8 pl-24 pr-10 font-black text-5xl dark:text-white outline-none shadow-inner" 
                         placeholder="0.00" 
                         autoFocus 
                       />
                    </div>
                 </div>
                 <div className="flex gap-4 w-full">
                    <button onClick={() => setIsSettlingDebt(false)} className="flex-1 py-7 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-[32px] font-black text-xs uppercase tracking-widest">Abort Protocol</button>
                    <button onClick={handleQuickRepay} disabled={!settlementAmount} className="flex-[2] py-7 bg-emerald-600 text-white rounded-[32px] font-black text-xs uppercase tracking-widest shadow-2xl active:scale-95 disabled:opacity-50">Execute Transaction</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Member Card Studio Modal (Already improved in previous steps, ensuring consistency) */}
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

      {/* Creation / Editing Modal */}
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