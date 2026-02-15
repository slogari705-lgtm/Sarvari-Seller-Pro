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
  MapPin,
  Camera,
  History,
  TrendingUp,
  Receipt,
  Wallet,
  ArrowDownRight,
  Calculator,
  Calendar,
  ClipboardList,
  Target,
  Gem,
  Medal
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

// Loyalty Tier Thresholds (Cumulative Spending)
const TIER_THRESHOLDS = {
  BRONZE: 0,
  SILVER: 1500,
  GOLD: 5000,
  PLATINUM: 10000
};

const Customers: React.FC<Props> = ({ state, updateState, setCurrentView }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDebt, setFilterDebt] = useState(false);
  const [filterTier, setFilterTier] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [trashConfirm, setTrashConfirm] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('spent');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [activeProfileTab, setActiveProfileTab] = useState<ProfileTab>('overview');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[state.settings.language || 'en'];

  // dynamic tier computation based on spending
  const getTierMetadata = (spent: number) => {
    if (spent >= TIER_THRESHOLDS.PLATINUM) return { label: 'Platinum', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', icon: Crown, next: null };
    if (spent >= TIER_THRESHOLDS.GOLD) return { label: 'Gold', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: Medal, next: 'Platinum', nextThreshold: TIER_THRESHOLDS.PLATINUM };
    if (spent >= TIER_THRESHOLDS.SILVER) return { label: 'Silver', color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800/50', icon: Award, next: 'Gold', nextThreshold: TIER_THRESHOLDS.GOLD };
    return { label: 'Bronze', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', icon: Star, next: 'Silver', nextThreshold: TIER_THRESHOLDS.SILVER };
  };

  const activeCustomers = useMemo(() => state.customers.filter(c => !c.isDeleted), [state.customers]);

  const tierDistribution = useMemo(() => {
    const counts = { Bronze: 0, Silver: 0, Gold: 0, Platinum: 0 };
    activeCustomers.forEach(c => {
      const meta = getTierMetadata(c.totalSpent);
      counts[meta.label as keyof typeof counts]++;
    });
    return counts;
  }, [activeCustomers]);

  const filteredCustomers = useMemo(() => {
    let result = activeCustomers.filter(c => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = c.name.toLowerCase().includes(q) || c.phone.includes(searchTerm);
      const matchesDebt = filterDebt ? c.totalDebt > 0 : true;
      const matchesTier = filterTier ? getTierMetadata(c.totalSpent).label === filterTier : true;
      return matchesSearch && matchesDebt && matchesTier;
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
  }, [activeCustomers, searchTerm, filterDebt, filterTier, sortKey, sortOrder]);

  const [form, setForm] = useState<Partial<Customer>>({ 
    name: '', phone: '', email: '', address: '', notes: '', photo: ''
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
        isDeleted: false,
      };
      updateState('customers', [...state.customers, customer]);
    }
    setIsAdding(false);
    setEditingCustomer(null);
    setForm({ name: '', phone: '', email: '', address: '', notes: '', photo: '' });
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
        message="Move this customer to the global Recycle Bin?" 
      />

      {/* Loyalty Distribution Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Bronze', count: tierDistribution.Bronze, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/20', icon: Star },
          { label: 'Silver', count: tierDistribution.Silver, color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800/50', icon: Award },
          { label: 'Gold', count: tierDistribution.Gold, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: Medal },
          { label: 'Platinum', count: tierDistribution.Platinum, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', icon: Crown },
        ].map((tier, i) => (
          <button 
            key={i} 
            onClick={() => setFilterTier(filterTier === tier.label ? null : tier.label)}
            className={`p-6 rounded-[36px] border-2 transition-all flex items-center justify-between group ${filterTier === tier.label ? 'border-indigo-500 bg-white dark:bg-slate-900 shadow-xl' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200'}`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl ${tier.bg} ${tier.color} flex items-center justify-center shrink-0`}><tier.icon size={20}/></div>
              <div className="text-left"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{tier.label}</p><p className="text-xl font-black dark:text-white leading-none mt-0.5">{tier.count}</p></div>
            </div>
            {filterTier === tier.label && <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-8 rounded-[48px] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 bg-indigo-600 text-white rounded-[28px] flex items-center justify-center shadow-2xl shadow-indigo-100 dark:shadow-none"><UsersIcon size={32}/></div>
           <div>
              <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">Customer Ecosystem</h3>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Authorized node managing {activeCustomers.length} active identities</p>
           </div>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setFilterDebt(!filterDebt)} className={`px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all flex items-center gap-2 ${filterDebt ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white dark:bg-slate-900 text-slate-400'}`}>
              <Scale size={16}/> Filter Debtors
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
                  <input type="text" placeholder="Locate client by ID, Name or Telecom..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3.5 pl-12 pr-6 outline-none font-bold text-sm dark:text-white" />
               </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[40px] border shadow-sm overflow-hidden">
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b">
                        <tr>
                           <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer" onClick={() => { setSortKey('name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>Identity</th>
                           <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Loyalty Rank</th>
                           <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aggregate Sales</th>
                           <th className="px-8 py-5"></th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredCustomers.map((c) => {
                           const tier = getTierMetadata(c.totalSpent);
                           return (
                             <tr key={c.id} onClick={() => { setViewingCustomer(c); setActiveProfileTab('overview'); }} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group cursor-pointer">
                                <td className="px-8 py-4">
                                   <div className="flex items-center gap-4">
                                      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center font-black text-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all overflow-hidden border">
                                         {c.photo ? <img src={c.photo} className="w-full h-full object-cover" /> : c.name.charAt(0)}
                                      </div>
                                      <div>
                                         <p className="font-black text-sm dark:text-white uppercase truncate max-w-[150px]">{c.name}</p>
                                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{c.phone}</p>
                                      </div>
                                   </div>
                                </td>
                                <td className="px-8 py-4 text-center">
                                   <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full ${tier.bg} ${tier.color} border border-transparent group-hover:border-current transition-all shadow-sm`}>
                                      <tier.icon size={14}/>
                                      <span className="text-[10px] font-black uppercase tracking-widest">{tier.label}</span>
                                   </div>
                                </td>
                                <td className="px-8 py-4 text-right">
                                   <p className="text-sm font-black dark:text-white">{state.settings.currency}{c.totalSpent.toLocaleString()}</p>
                                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Gross Contribution</p>
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
               <div className="bg-white dark:bg-slate-900 rounded-[48px] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden animate-in slide-in-from-right duration-300 flex flex-col h-[750px] sticky top-8">
                  <div className="h-32 bg-indigo-600 relative overflow-hidden shrink-0">
                     <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                  </div>
                  <header className="px-10 pb-6 text-center -mt-16 relative z-10 shrink-0">
                     <div className="w-32 h-32 bg-white dark:bg-slate-800 rounded-[40px] flex items-center justify-center mx-auto shadow-2xl overflow-hidden border-4 border-white dark:border-slate-800 relative">
                        {viewingCustomer.photo ? <img src={viewingCustomer.photo} className="w-full h-full object-cover" /> : <User size={64} className="text-slate-200" />}
                        <div className={`absolute -bottom-2 -right-2 p-3 rounded-2xl shadow-xl border-4 border-white dark:border-slate-800 ${getTierMetadata(viewingCustomer.totalSpent).bg} ${getTierMetadata(viewingCustomer.totalSpent).color}`}>
                           {React.createElement(getTierMetadata(viewingCustomer.totalSpent).icon, { size: 24 })}
                        </div>
                     </div>
                     <h4 className="text-2xl font-black dark:text-white uppercase tracking-tighter mt-6 leading-none">{viewingCustomer.name}</h4>
                     <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mt-3">MEMBER ID: #REG-{viewingCustomer.id.padStart(4, '0')}</p>
                  </header>

                  <div className="flex-1 p-8 overflow-y-auto custom-scrollbar space-y-8">
                     {/* Tier Progression Card */}
                     <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-[40px] border relative overflow-hidden group">
                        <div className="relative z-10">
                           <div className="flex justify-between items-center mb-6">
                              <div>
                                 <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Loyalty Status</p>
                                 <h5 className="text-xl font-black dark:text-white uppercase tracking-tighter mt-1">{getTierMetadata(viewingCustomer.totalSpent).label} Rank</h5>
                              </div>
                              <div className={`p-4 rounded-2xl ${getTierMetadata(viewingCustomer.totalSpent).bg} ${getTierMetadata(viewingCustomer.totalSpent).color} shadow-lg`}>
                                 {React.createElement(getTierMetadata(viewingCustomer.totalSpent).icon, { size: 28 })}
                              </div>
                           </div>

                           {getTierMetadata(viewingCustomer.totalSpent).next ? (
                              <div className="space-y-4">
                                 <div className="flex justify-between items-end">
                                    <p className="text-[9px] font-black text-slate-400 uppercase">Path to {getTierMetadata(viewingCustomer.totalSpent).next}</p>
                                    <p className="text-xs font-black text-indigo-600">{state.settings.currency}{(getTierMetadata(viewingCustomer.totalSpent).nextThreshold! - viewingCustomer.totalSpent).toLocaleString()} Remaining</p>
                                 </div>
                                 <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                       className="h-full bg-indigo-600 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(79,70,229,0.5)]" 
                                       style={{ width: `${Math.min(100, (viewingCustomer.totalSpent / getTierMetadata(viewingCustomer.totalSpent).nextThreshold!) * 100)}%` }}
                                    />
                                 </div>
                                 <p className="text-[8px] font-bold text-slate-400 uppercase text-center tracking-widest mt-2">Growth Level: {Math.round((viewingCustomer.totalSpent / getTierMetadata(viewingCustomer.totalSpent).nextThreshold!) * 100)}%</p>
                              </div>
                           ) : (
                              <div className="p-6 bg-indigo-600 text-white rounded-[32px] text-center space-y-2">
                                 <Gem size={28} className="mx-auto mb-2 animate-bounce" />
                                 <p className="text-xs font-black uppercase tracking-widest">Ultimate Tier Achieved</p>
                                 <p className="text-[9px] font-bold opacity-70 uppercase leading-relaxed">This entity has reached the zenith of the loyalty ecosystem.</p>
                              </div>
                           )}
                        </div>
                        <Target size={120} className="absolute -bottom-10 -right-10 text-indigo-500/5 group-hover:scale-110 transition-transform duration-700" />
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border shadow-sm">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Lifetime</p>
                           <h5 className="text-xl font-black dark:text-white">{state.settings.currency}{viewingCustomer.totalSpent.toLocaleString()}</h5>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border shadow-sm">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Liability</p>
                           <h5 className={`text-xl font-black ${viewingCustomer.totalDebt > 0 ? 'text-rose-600' : 'text-emerald-500'}`}>{state.settings.currency}{viewingCustomer.totalDebt.toLocaleString()}</h5>
                        </div>
                     </div>

                     <div className="space-y-4 pt-4 border-t dark:border-slate-800">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-indigo-500 shadow-sm"><Phone size={18}/></div>
                           <div><p className="text-[8px] font-black text-slate-400 uppercase">Telecom</p><span className="text-[13px] font-bold dark:text-slate-200">{viewingCustomer.phone}</span></div>
                        </div>
                        {viewingCustomer.address && (
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-indigo-500 shadow-sm"><MapPin size={18}/></div>
                              <div className="min-w-0 flex-1"><p className="text-[8px] font-black text-slate-400 uppercase">Registered Node</p><span className="text-[13px] font-bold dark:text-slate-200 truncate block">{viewingCustomer.address}</span></div>
                           </div>
                        )}
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-indigo-500 shadow-sm"><Calendar size={18}/></div>
                           <div><p className="text-[8px] font-black text-slate-400 uppercase">Joined System</p><span className="text-[13px] font-bold dark:text-slate-200">{new Date(viewingCustomer.joinedDate).toLocaleDateString()}</span></div>
                        </div>
                     </div>
                  </div>

                  <footer className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 grid grid-cols-3 gap-3 shrink-0">
                     <button onClick={() => { setEditingCustomer(viewingCustomer); setForm(viewingCustomer); setIsAdding(true); }} className="p-4 bg-white dark:bg-slate-800 text-slate-500 rounded-3xl border shadow-sm hover:text-indigo-600 transition-all flex items-center justify-center"><Edit size={20}/></button>
                     <button onClick={() => setTrashConfirm(viewingCustomer.id)} className="p-4 bg-white dark:bg-slate-800 text-slate-500 rounded-3xl border shadow-sm hover:text-rose-600 transition-all flex items-center justify-center"><Trash2 size={20}/></button>
                     <button onClick={() => setViewingCustomer(null)} className="p-4 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-3xl shadow-xl transition-all flex items-center justify-center"><X size={20}/></button>
                  </footer>
               </div>
            ) : (
               <div className="bg-indigo-600 rounded-[56px] p-16 text-white shadow-2xl flex flex-col items-center justify-center text-center space-y-8 h-full min-h-[600px] relative overflow-hidden group border-8 border-white/10 sticky top-8">
                  <div className="w-24 h-24 bg-white/20 rounded-[40px] flex items-center justify-center backdrop-blur-md shadow-inner animate-pulse"><UsersIcon size={48} /></div>
                  <div className="relative z-10">
                     <h4 className="text-3xl font-black uppercase tracking-tighter">Operational Select</h4>
                     <p className="text-[11px] font-bold opacity-70 uppercase tracking-[0.3em] mt-4 max-w-[200px] mx-auto leading-relaxed">Select a profile from the ledger to view operational history and loyalty benchmarks</p>
                  </div>
                  <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/5 blur-[80px] rounded-full group-hover:scale-125 transition-transform duration-1000" />
               </div>
            )}
         </div>
      </div>

      {isAdding && (
         <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[56px] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col border border-white/10 animate-in zoom-in-95 duration-300">
               <header className="p-10 border-b flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-6">
                     <div className="w-16 h-16 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center shadow-2xl"><UserPlus size={32}/></div>
                     <div>
                        <h3 className="text-3xl font-black dark:text-white uppercase tracking-tighter">{editingCustomer ? 'Update Identity' : 'Enroll Identity'}</h3>
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Registry modification session active</p>
                     </div>
                  </div>
                  <button onClick={() => setIsAdding(false)} className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-rose-500 transition-all"><X size={28}/></button>
               </header>

               <div className="flex-1 overflow-y-auto p-12 space-y-10 custom-scrollbar">
                  <div className="space-y-8">
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Legal Identity Name</label>
                        <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-3xl py-5 px-8 font-black text-xl dark:text-white outline-none shadow-sm" placeholder="Full name..." />
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                           <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Primary Telecom</label>
                           <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-3xl py-5 px-8 font-bold dark:text-white outline-none shadow-sm" placeholder="07XX..." />
                        </div>
                        <div>
                           <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Email Address</label>
                           <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-3xl py-5 px-8 font-bold dark:text-white outline-none shadow-sm" placeholder="mail@provider.com" />
                        </div>
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Registered Node (Address)</label>
                        <textarea rows={2} value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-3xl py-5 px-8 font-bold dark:text-white outline-none shadow-sm resize-none" placeholder="Street, District, City..." />
                     </div>
                  </div>
               </div>

               <footer className="p-10 border-t bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row gap-4 shrink-0">
                  <button onClick={() => setIsAdding(false)} className="flex-1 py-7 bg-white dark:bg-slate-800 text-slate-500 rounded-[32px] font-black text-xs uppercase tracking-[0.2em] border shadow-sm">Discard Changes</button>
                  <button onClick={handleSaveCustomer} className="flex-[2] py-7 bg-indigo-600 text-white rounded-[32px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-4">
                     <CheckCircle2 size={24}/> Authorize Registry Update
                  </button>
               </footer>
            </div>
         </div>
      )}
    </div>
  );
};

export default Customers;