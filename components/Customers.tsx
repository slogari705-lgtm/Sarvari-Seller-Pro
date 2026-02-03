
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
  Image as ImageIcon
} from 'lucide-react';
import { AppState, Customer, View, LoanTransaction, CardDesign } from '../types';
import { translations } from '../translations';
import ConfirmDialog from './ConfirmDialog';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface Props {
  state: AppState;
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
  setCurrentView?: (view: View) => void;
}

type CustomerTab = 'overview' | 'history' | 'info';
type SortKey = 'name' | 'id' | 'spent' | 'debt';
type SortOrder = 'asc' | 'desc';

const Customers: React.FC<Props> = ({ state, updateState, setCurrentView }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDebt, setFilterDebt] = useState(false);
  const [showArchived, setshowArchived] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [trashConfirm, setTrashConfirm] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('spent');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [activeTab, setActiveTab] = useState<CustomerTab>('overview');
  const [repayModal, setRepayModal] = useState<{customer: Customer, mode: 'debt' | 'repayment'} | null>(null);
  const [repayAmount, setRepayAmount] = useState<number | ''>('');
  const [repayNote, setRepayNote] = useState('');
  const [isExportingCard, setIsExportingCard] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tempNotes, setTempNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({ 
    name: '', phone: '', email: '', address: '', company: '', notes: '', dob: '', photo: '',
    gender: 'Male', occupation: '', secondaryPhone: '', reference: '', preferredPayment: 'Cash'
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
                            c.email?.toLowerCase().includes(q) ||
                            c.id.toString().includes(searchTerm);
      const matchesDebt = filterDebt ? c.totalDebt > 0 : true;
      const matchesArchive = showArchived ? c.isArchived : !c.isArchived;
      return matchesSearch && matchesDebt && matchesArchive;
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
  }, [activeCustomers, searchTerm, filterDebt, showArchived, sortKey, sortOrder]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewCustomer(prev => ({ ...prev, photo: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSaveCustomer = () => {
    if (!newCustomer.name || !newCustomer.phone) return alert("Required: Name & Phone");
    if (editingCustomer) {
      updateState('customers', state.customers.map(c => c.id === editingCustomer.id ? { ...c, ...newCustomer } as Customer : c));
    } else {
      const nextId = (state.customers.reduce((max, c) => Math.max(max, parseInt(c.id) || 0), 0) + 1).toString();
      const customer: Customer = { 
        id: nextId, 
        name: newCustomer.name || '', 
        email: newCustomer.email || '', 
        phone: newCustomer.phone || '', 
        secondaryPhone: newCustomer.secondaryPhone || '',
        address: newCustomer.address || '', 
        dob: newCustomer.dob || '', 
        gender: newCustomer.gender as any || 'Male',
        occupation: newCustomer.occupation || '',
        photo: newCustomer.photo || '',
        totalSpent: 0, 
        totalDebt: 0, 
        lastVisit: 'Just Joined', 
        joinedDate: new Date().toISOString(),
        transactionCount: 0, 
        loyaltyPoints: 0,
        notes: newCustomer.notes || '', 
        company: newCustomer.company || '', 
        reference: newCustomer.reference || '',
        isArchived: false, 
        isDeleted: false,
        preferredPayment: newCustomer.preferredPayment as any || 'Cash'
      };
      updateState('customers', [...state.customers, customer]);
    }
    setIsAdding(false); setEditingCustomer(null); 
    setNewCustomer({ 
      name: '', phone: '', email: '', address: '', company: '', notes: '', dob: '', photo: '',
      gender: 'Male', occupation: '', secondaryPhone: '', reference: '', preferredPayment: 'Cash'
    });
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortOrder('desc'); }
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
              <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">Client Ledger</h3>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Registry node managing {activeCustomers.length} identities</p>
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

      {/* Search & List */}
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
                           <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Identity</th>
                           <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center" onClick={() => toggleSort('spent')}>Investment <ArrowUpDown size={10} className="inline"/></th>
                           <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right" onClick={() => toggleSort('debt')}>Liability <ArrowUpDown size={10} className="inline"/></th>
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
                                      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center font-black text-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all overflow-hidden">
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
                                   <p className="text-[8px] font-bold text-slate-400 uppercase">Exposure Index</p>
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
               <div className="bg-white dark:bg-slate-900 rounded-[48px] border shadow-xl overflow-hidden animate-in slide-in-from-right duration-300 flex flex-col min-h-[600px]">
                  <header className="p-10 pb-6 text-center border-b dark:border-slate-800">
                     <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-[32px] flex items-center justify-center mx-auto shadow-2xl overflow-hidden border-4 border-white dark:border-slate-700">
                        {viewingCustomer.photo ? <img src={viewingCustomer.photo} className="w-full h-full object-cover" /> : <User size={48} className="text-slate-200" />}
                     </div>
                     <h4 className="text-2xl font-black dark:text-white uppercase tracking-tighter mt-6">{viewingCustomer.name}</h4>
                     <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mt-2">Member ID: #REG-{viewingCustomer.id.padStart(4, '0')}</p>
                  </header>

                  <div className="flex-1 p-10 space-y-8 overflow-y-auto custom-scrollbar">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[32px] text-center border border-slate-100 dark:border-slate-800">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Spent Pool</p>
                           <h5 className="text-xl font-black dark:text-white">{state.settings.currency}{viewingCustomer.totalSpent.toLocaleString()}</h5>
                        </div>
                        <div className="bg-rose-50 dark:bg-rose-950/20 p-6 rounded-[32px] text-center border border-rose-100 dark:border-rose-900/30">
                           <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Debt Risk</p>
                           <h5 className="text-xl font-black text-rose-600">{state.settings.currency}{viewingCustomer.totalDebt.toLocaleString()}</h5>
                        </div>
                     </div>

                     <section className="space-y-4">
                        <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">Technical Context</h6>
                        <div className="space-y-3">
                           <div className="flex items-center gap-4"><Phone size={14} className="text-indigo-500"/><span className="text-[12px] font-bold dark:text-slate-300">{viewingCustomer.phone}</span></div>
                           {viewingCustomer.email && <div className="flex items-center gap-4"><Mail size={14} className="text-indigo-500"/><span className="text-[12px] font-bold dark:text-slate-300">{viewingCustomer.email}</span></div>}
                           {viewingCustomer.address && <div className="flex items-center gap-4"><MapPin size={14} className="text-indigo-500"/><span className="text-[12px] font-bold dark:text-slate-300">{viewingCustomer.address}</span></div>}
                        </div>
                     </section>
                  </div>

                  <footer className="p-8 border-t dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 grid grid-cols-3 gap-2">
                     <button onClick={() => { setEditingCustomer(viewingCustomer); setNewCustomer(viewingCustomer); setIsAdding(true); }} className="p-4 bg-white dark:bg-slate-800 text-slate-500 rounded-2xl border shadow-sm hover:text-indigo-600 transition-all"><Edit size={20}/></button>
                     <button onClick={() => setTrashConfirm(viewingCustomer.id)} className="p-4 bg-white dark:bg-slate-800 text-slate-500 rounded-2xl border shadow-sm hover:text-rose-600 transition-all"><Trash2 size={20}/></button>
                     <button onClick={() => setViewingCustomer(null)} className="p-4 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-2xl shadow-xl transition-all"><X size={20}/></button>
                  </footer>
               </div>
            ) : (
               <div className="bg-indigo-600 rounded-[48px] p-12 text-white shadow-2xl flex flex-col items-center justify-center text-center space-y-8 min-h-[600px] relative overflow-hidden group">
                  <div className="w-24 h-24 bg-white/20 rounded-[36px] flex items-center justify-center backdrop-blur-md shadow-inner animate-pulse"><UsersIcon size={48}/></div>
                  <div className="relative z-10">
                     <h4 className="text-2xl font-black uppercase tracking-tighter">Selection Required</h4>
                     <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mt-2 max-w-[200px] mx-auto">Identify a registry node to view historical activity</p>
                  </div>
                  <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-white/5 blur-[80px] rounded-full group-hover:scale-125 transition-transform duration-700" />
               </div>
            )}
         </div>
      </div>

      {isAdding && (
         <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[56px] w-full max-w-4xl max-h-[95vh] shadow-2xl overflow-hidden flex flex-col border border-white/10 animate-in zoom-in-95 duration-300">
               <header className="p-10 border-b flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-6">
                     <div className="w-16 h-16 bg-indigo-600 text-white rounded-[28px] flex items-center justify-center shadow-2xl"><UserPlus size={32}/></div>
                     <div>
                        <h3 className="text-3xl font-black dark:text-white uppercase tracking-tighter">{editingCustomer ? 'Rectify Profile' : 'Enroll Identity'}</h3>
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Registry node modification cycle</p>
                     </div>
                  </div>
                  <button onClick={() => { setIsAdding(false); setEditingCustomer(null); }} className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-rose-500 transition-all"><X size={28}/></button>
               </header>

               <div className="flex-1 overflow-y-auto p-12 custom-scrollbar space-y-12">
                  <div className="flex flex-col xl:flex-row gap-12">
                     <div className="xl:w-1/3 flex flex-col items-center">
                        <div 
                          onClick={() => fileInputRef.current?.click()} 
                          className="w-full aspect-square max-w-[240px] rounded-[48px] bg-slate-50 dark:bg-slate-950 border-4 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center cursor-pointer overflow-hidden group shadow-inner relative transition-all hover:border-indigo-400"
                        >
                           {newCustomer.photo ? (
                             <img src={newCustomer.photo} className="w-full h-full object-cover p-2 rounded-[40px]" />
                           ) : (
                             <div className="flex flex-col items-center text-slate-300">
                               <ImageIcon size={64} strokeWidth={1} />
                               <p className="text-[10px] font-black uppercase mt-4 tracking-widest text-center px-6">Upload Portrait</p>
                             </div>
                           )}
                           <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                        </div>
                     </div>

                     <div className="xl:w-2/3 space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="md:col-span-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Legal Identity Name</label>
                              <input type="text" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-3xl py-4 px-8 font-black text-xl dark:text-white outline-none shadow-sm" placeholder="Full legal name..." />
                           </div>
                           <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Primary Telecom</label>
                              <div className="relative">
                                 <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                 <input type="text" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 pl-14 pr-6 font-bold dark:text-white outline-none" placeholder="07XX..." />
                              </div>
                           </div>
                           <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Electronic Mail</label>
                              <input type="email" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-6 font-bold dark:text-white outline-none" placeholder="identity@domain.com" />
                           </div>
                           <div className="md:col-span-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Geographic Node (Address)</label>
                              <input type="text" value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-6 font-bold dark:text-white outline-none" placeholder="Street, Sector, City Node..." />
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               <footer className="p-10 border-t bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row gap-4 shrink-0">
                  <button onClick={() => { setIsAdding(false); setEditingCustomer(null); }} className="flex-1 py-6 bg-white dark:bg-slate-800 text-slate-500 rounded-[32px] font-black text-xs uppercase tracking-widest border border-slate-100 dark:border-slate-700">Abort Cycle</button>
                  <button onClick={handleSaveCustomer} className="flex-[2] py-6 bg-indigo-600 text-white rounded-[32px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-4"><CheckCircle2 size={24}/> {editingCustomer ? 'Update Identity Snapshot' : 'Finalize Enrollment'}</button>
               </footer>
            </div>
         </div>
      )}
    </div>
  );
};

export default Customers;
