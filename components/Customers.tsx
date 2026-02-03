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
  DollarSign,
  History,
  Award,
  Calendar,
  Wallet,
  Crown,
  UserPlus,
  Mail,
  FileDown,
  IdCard,
  User,
  ShieldCheck,
  Save,
  Star,
  RefreshCw,
  ArrowUpDown,
  Zap,
  Clock,
  Building2,
  LayoutGrid,
  Printer,
  QrCode,
  ArrowRight,
  PlusCircle,
  Activity,
  Download,
  UserMinus,
  MapPin,
  Briefcase,
  Smartphone,
  Image as ImageIcon,
  Camera,
  Maximize2,
  ExternalLink,
  CreditCard
} from 'lucide-react';
import { AppState, Customer, View, CardDesign } from '../types';
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
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Partial<Customer>>({ 
    name: '', phone: '', email: '', address: '', company: '', notes: '', photo: '',
    gender: 'Male', occupation: ''
  });

  const t = translations[state.settings.language || 'en'];

  const getTier = (spent: number) => {
    if (spent >= 5000) return { label: 'Platinum', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', icon: Crown };
    if (spent >= 2500) return { label: 'Gold', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: Crown };
    if (spent >= 1000) return { label: 'Silver', color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800/50', icon: Award };
    return { label: 'Bronze', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', icon: Award };
  };

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
        id: nextId, 
        name: form.name || '', 
        email: form.email || '', 
        phone: form.phone || '', 
        address: form.address || '', 
        photo: form.photo || '',
        totalSpent: 0, 
        totalDebt: 0, 
        lastVisit: 'Just Joined', 
        joinedDate: new Date().toISOString(),
        transactionCount: 0, 
        loyaltyPoints: 0,
        notes: form.notes || '', 
        company: form.company || '', 
        isArchived: false, 
        isDeleted: false,
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
      console.error("PDF Export failed:", e);
    } finally {
      setIsExportingCard(false);
    }
  };

  const handlePrintCard = () => {
    const element = document.getElementById('member-card-render');
    const holder = document.getElementById('print-holder');
    if (!element || !holder) return;

    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.margin = '20mm auto';
    clone.style.boxShadow = 'none';
    clone.style.transform = 'none';
    
    holder.innerHTML = '';
    holder.appendChild(clone);
    window.print();
    holder.innerHTML = '';
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

      {/* Header Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-8 rounded-[48px] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 bg-indigo-600 text-white rounded-[28px] flex items-center justify-center shadow-2xl shadow-indigo-100 dark:shadow-none"><UsersIcon size={32}/></div>
           <div>
              <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">Client Registry</h3>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Authorized database managing {activeCustomers.length} identities</p>
           </div>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setFilterDebt(!filterDebt)} className={`px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all flex items-center gap-2 ${filterDebt ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white dark:bg-slate-900 text-slate-400'}`}>
              <Scale size={16}/> Debtors Only
           </button>
           <button onClick={() => setIsAdding(true)} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 active:scale-95 transition-all">
              <UserPlus size={18}/> New Profile
           </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
         <div className="lg:col-span-8 space-y-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border shadow-sm">
               <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" placeholder="Locate client by ID, Label or Telecom..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3.5 pl-12 pr-6 outline-none font-bold text-sm dark:text-white" />
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
                             <tr key={c.id} onClick={() => setViewingCustomer(c)} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group cursor-pointer">
                                <td className="px-8 py-4">
                                   <div className="flex items-center gap-4">
                                      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center font-black text-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all overflow-hidden border">
                                         {c.photo ? <img src={c.photo} className="w-full h-full object-cover" /> : c.name.charAt(0)}
                                      </div>
                                      <div>
                                         <p className="font-black text-sm dark:text-white uppercase tracking-tight truncate max-w-[150px]">{c.name}</p>
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
                                   <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Liability Index</p>
                                </td>
                                <td className="px-8 py-4 text-right">
                                   <div className="p-2 text-slate-300 opacity-0 group-hover:opacity-100 transition-all"><ArrowRight size={20}/></div>
                                </td>
                             </tr>
                           )
                        })}
                     </tbody>
                  </table>
                  {filteredCustomers.length === 0 && (
                     <div className="py-24 text-center flex flex-col items-center gap-4 opacity-20">
                        <UsersIcon size={64}/>
                        <p className="font-black text-[10px] uppercase tracking-widest">No matching identities found</p>
                     </div>
                  )}
               </div>
            </div>
         </div>

         {/* Selection Sidebar */}
         <div className="lg:col-span-4">
            {viewingCustomer ? (
               <div className="bg-white dark:bg-slate-900 rounded-[48px] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden animate-in slide-in-from-right duration-300 flex flex-col min-h-[700px] sticky top-8">
                  <div className="h-28 bg-indigo-600 relative overflow-hidden">
                     <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                  </div>
                  <header className="px-10 pb-6 text-center -mt-14 relative z-10">
                     <div className="w-28 h-28 bg-white dark:bg-slate-800 rounded-[40px] flex items-center justify-center mx-auto shadow-2xl overflow-hidden border-4 border-white dark:border-slate-800">
                        {viewingCustomer.photo ? <img src={viewingCustomer.photo} className="w-full h-full object-cover" /> : <User size={56} className="text-slate-200" />}
                     </div>
                     <h4 className="text-2xl font-black dark:text-white uppercase tracking-tighter mt-6">{viewingCustomer.name}</h4>
                     <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mt-2">MEMBER ID: #REG-{viewingCustomer.id.padStart(4, '0')}</p>
                  </header>

                  <div className="flex-1 p-10 space-y-8 overflow-y-auto custom-scrollbar">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[32px] text-center border">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Spent Pool</p>
                           <h5 className="text-xl font-black dark:text-white">{state.settings.currency}{viewingCustomer.totalSpent.toLocaleString()}</h5>
                        </div>
                        <div className="bg-rose-50 dark:bg-rose-950/20 p-6 rounded-[32px] text-center border border-rose-100">
                           <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Exposure</p>
                           <h5 className="text-xl font-black text-rose-600">{state.settings.currency}{viewingCustomer.totalDebt.toLocaleString()}</h5>
                        </div>
                     </div>

                     <button onClick={() => setViewingCard(viewingCustomer)} className="w-full py-5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-[32px] border-2 border-indigo-100 dark:border-indigo-800 flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all group">
                        <CreditCard size={18}/> View Member Token <Maximize2 size={12} className="opacity-0 group-hover:opacity-100"/>
                     </button>

                     <section className="space-y-4">
                        <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-3">Technical Profile</h6>
                        <div className="space-y-4">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-indigo-500 shadow-sm"><Phone size={18}/></div>
                              <div><p className="text-[8px] font-black text-slate-400 uppercase">Telecom</p><span className="text-[13px] font-bold dark:text-slate-200">{viewingCustomer.phone}</span></div>
                           </div>
                           {viewingCustomer.email && (
                              <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-indigo-500 shadow-sm"><Mail size={18}/></div>
                                 <div><p className="text-[8px] font-black text-slate-400 uppercase">Registry Mail</p><span className="text-[13px] font-bold dark:text-slate-200">{viewingCustomer.email}</span></div>
                              </div>
                           )}
                        </div>
                     </section>
                  </div>

                  <footer className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 grid grid-cols-3 gap-3">
                     <button onClick={() => { setEditingCustomer(viewingCustomer); setForm(viewingCustomer); setIsAdding(true); }} className="p-4 bg-white dark:bg-slate-800 text-slate-500 rounded-3xl border shadow-sm hover:text-indigo-600 transition-all flex items-center justify-center"><Edit size={20}/></button>
                     <button onClick={() => setTrashConfirm(viewingCustomer.id)} className="p-4 bg-white dark:bg-slate-800 text-slate-500 rounded-3xl border shadow-sm hover:text-rose-600 transition-all flex items-center justify-center"><Trash2 size={20}/></button>
                     <button onClick={() => setViewingCustomer(null)} className="p-4 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-3xl shadow-xl transition-all flex items-center justify-center"><X size={20}/></button>
                  </footer>
               </div>
            ) : (
               <div className="bg-indigo-600 rounded-[56px] p-16 text-white shadow-2xl flex flex-col items-center justify-center text-center space-y-8 min-h-[700px] relative overflow-hidden group border-8 border-white/10">
                  <div className="w-28 h-28 bg-white/20 rounded-[40px] flex items-center justify-center backdrop-blur-md shadow-inner animate-pulse border border-white/30"><UsersIcon size={56} /></div>
                  <div className="relative z-10">
                     <h4 className="text-3xl font-black uppercase tracking-tighter">Identity Target Required</h4>
                     <p className="text-[11px] font-bold opacity-70 uppercase tracking-[0.3em] mt-4 max-w-[240px] mx-auto leading-relaxed">Select a registry record from the ledger to view operational history and metadata</p>
                  </div>
                  <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/5 blur-[80px] rounded-full group-hover:scale-125 transition-transform duration-1000" />
               </div>
            )}
         </div>
      </div>

      {/* Member Card Modal */}
      {viewingCard && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-2xl animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[64px] w-full max-w-2xl shadow-2xl overflow-hidden border border-white/10 flex flex-col animate-in zoom-in-95 duration-500">
              <header className="p-10 pb-6 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center shadow-xl"><IdCard size={32}/></div>
                    <div>
                       <h3 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Member Token</h3>
                       <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Proprietary Identity Badge</p>
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
                             <p className="text-[9px] font-black opacity-60 uppercase tracking-[0.2em] mt-2">{state.settings.shopTagline || 'Authorized Partner Token'}</p>
                          </div>
                          <div className="text-right">
                             <div className="text-xl font-black opacity-80 tabular-nums font-mono">#REG-{viewingCard.id.padStart(4, '0')}</div>
                             <div className="text-[8px] font-black opacity-40 uppercase mt-1 tracking-widest">Digital Registry ID</div>
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
                          <div>
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
                    {isExportingCard ? <RefreshCw size={20} className="animate-spin" /> : <FileDown size={20}/>} Download PDF
                 </button>
                 <button onClick={handlePrintCard} className="flex-1 py-6 bg-white dark:bg-slate-800 text-slate-700 dark:text-white border-2 rounded-[32px] font-black text-xs uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-3">
                    <Printer size={20}/> Physical Print
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
                        <h3 className="text-3xl font-black dark:text-white uppercase tracking-tighter">{editingCustomer ? 'Update Profile' : 'Enroll Identity'}</h3>
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Registry node modification cycle</p>
                     </div>
                  </div>
                  <button onClick={resetAndClose} className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-rose-500 transition-all active:scale-90"><X size={28}/></button>
               </header>

               <div className="flex-1 overflow-y-auto p-12 custom-scrollbar space-y-12">
                  <div className="flex flex-col xl:flex-row gap-12">
                     <div className="xl:w-1/3 flex flex-col items-center">
                        <div 
                          onClick={() => fileInputRef.current?.click()} 
                          className="w-full aspect-square max-w-[280px] rounded-[48px] bg-slate-50 dark:bg-slate-950 border-4 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center cursor-pointer overflow-hidden group shadow-inner relative transition-all hover:border-indigo-400"
                        >
                           {form.photo ? (
                             <img src={form.photo} className="w-full h-full object-cover p-2 rounded-[40px]" />
                           ) : (
                             <div className="flex flex-col items-center text-slate-300">
                               <Camera size={64} strokeWidth={1} />
                               <p className="text-[10px] font-black uppercase mt-4 tracking-widest text-center px-6">Upload Identity Portrait</p>
                             </div>
                           )}
                           <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                        </div>
                     </div>

                     <div className="xl:w-2/3 space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="md:col-span-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Full Legal Name</label>
                              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-3xl py-5 px-8 font-black text-xl dark:text-white outline-none shadow-sm" placeholder="Full Identity Label..." />
                           </div>
                           <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Primary Telecom</label>
                              <div className="relative">
                                 <Phone className="absolute left-6 top-1/2 -translate-y-