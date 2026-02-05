
import React, { useState, useMemo, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Receipt, 
  Trash2, 
  DollarSign, 
  Calendar as CalendarIcon,
  Tag,
  X,
  PlusSquare,
  ArrowRight,
  TrendingDown,
  Printer,
  FileDown,
  Clock,
  PieChart,
  ArrowUpRight,
  AlertCircle,
  Users,
  Briefcase,
  IdCard,
  Camera,
  UserCheck,
  ShieldCheck,
  UserPlus,
  Hash,
  Contact,
  CreditCard,
  RefreshCw,
  Sparkles,
  // Fix: Added missing CheckCircle2 icon import from lucide-react
  CheckCircle2
} from 'lucide-react';
import { AppState, Expense, Worker } from '../types';
import { translations } from '../translations';
import ConfirmDialog from './ConfirmDialog';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface Props {
  state: AppState;
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
}

type ExpenseTab = 'ledger' | 'staff';

const Expenses: React.FC<Props> = ({ state, updateState }) => {
  const [activeTab, setActiveTab] = useState<ExpenseTab>('ledger');
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isAddingWorker, setIsAddingWorker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [trashConfirm, setTrashConfirm] = useState<{id: string, type: 'expense' | 'worker'} | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const workerFileRef = useRef<HTMLInputElement>(null);
  const t = translations[state.settings.language || 'en'];

  // Data Selectors
  const activeExpenses = useMemo(() => (state.expenses || []).filter(e => !e.isDeleted), [state.expenses]);
  const activeWorkers = useMemo(() => (state.workers || []).filter(w => !w.isDeleted), [state.workers]);

  const filteredExpenses = useMemo(() => {
    return activeExpenses.filter(e => {
      const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === 'All' || e.category === activeCategory;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activeExpenses, searchTerm, activeCategory]);

  const filteredWorkers = useMemo(() => {
    return activeWorkers.filter(w => 
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      w.employeeId.includes(searchTerm)
    );
  }, [activeWorkers, searchTerm]);

  // Financial Stats
  const totalOutflow = activeExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const staffCosts = activeExpenses.filter(e => e.workerId).reduce((acc, curr) => acc + curr.amount, 0);

  // Form States
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    category: 'General', amount: 0, description: '', date: new Date().toISOString().split('T')[0], workerId: ''
  });

  const [newWorker, setNewWorker] = useState<Partial<Worker>>({
    name: '', employeeId: '', phone: '', position: 'Staff', baseSalary: 0, photo: '', joinDate: new Date().toISOString().split('T')[0]
  });

  const generateWorkerId = () => {
    const random = Math.floor(1000 + Math.random() * 9000);
    return `EMP-${random}`;
  };

  const handleAddExpense = () => {
    if (!newExpense.description || !newExpense.amount) return;
    const expense: Expense = {
      id: Math.random().toString(36).substr(2, 9),
      description: newExpense.description,
      category: newExpense.workerId ? 'Staff Payment' : (newExpense.category || 'General'),
      amount: Number(newExpense.amount),
      date: new Date().toISOString(),
      workerId: newExpense.workerId,
      isDeleted: false
    };
    updateState('expenses', [...(state.expenses || []), expense]);
    setIsAddingExpense(false);
    setNewExpense({ category: 'General', amount: 0, description: '', date: new Date().toISOString().split('T')[0], workerId: '' });
  };

  const handleAddWorker = () => {
    if (!newWorker.name || !newWorker.employeeId) return;
    const worker: Worker = {
      id: Math.random().toString(36).substr(2, 9),
      name: newWorker.name || '',
      employeeId: newWorker.employeeId || '',
      phone: newWorker.phone || '',
      position: newWorker.position || 'Staff',
      baseSalary: Number(newWorker.baseSalary) || 0,
      photo: newWorker.photo,
      joinDate: newWorker.joinDate || new Date().toISOString(),
      isDeleted: false
    };
    updateState('workers', [...(state.workers || []), worker]);
    setIsAddingWorker(false);
    setNewWorker({ name: '', employeeId: '', phone: '', position: 'Staff', baseSalary: 0, photo: '', joinDate: new Date().toISOString().split('T')[0] });
  };

  const handleDelete = () => {
    if (!trashConfirm) return;
    if (trashConfirm.type === 'expense') {
      updateState('expenses', state.expenses.map(e => e.id === trashConfirm.id ? { ...e, isDeleted: true } : e));
    } else {
      updateState('workers', state.workers.map(w => w.id === trashConfirm.id ? { ...w, isDeleted: true } : w));
    }
    setTrashConfirm(null);
  };

  const handleWorkerPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewWorker(prev => ({ ...prev, photo: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const generateWorkerIDCardHTML = (w: Worker) => {
    const brandColor = state.settings.brandColor || '#4f46e5';
    const photoContent = w.photo 
      ? `<img src="${w.photo}" style="width: 28mm; height: 32mm; object-fit: cover; border-radius: 4mm; border: 2px solid ${brandColor};" />`
      : `<div style="width: 28mm; height: 32mm; border-radius: 4mm; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 900; color: ${brandColor}; border: 2px dashed #cbd5e1;">${w.name.charAt(0)}</div>`;

    return `
      <div style="width: 85mm; height: 55mm; padding: 0; font-family: 'Inter', system-ui, sans-serif; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 4mm; display: flex; overflow: hidden; position: relative; box-sizing: border-box;">
        <div style="width: 15mm; background: #1e293b; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 4mm 0; box-sizing: border-box; color: white;">
           <div style="opacity: 0.8;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
           <div style="transform: rotate(-90deg); white-space: nowrap; font-size: 8px; font-weight: 900; letter-spacing: 3px; margin-bottom: 8mm;">AUTHORIZED STAFF</div>
        </div>
        <div style="flex: 1; padding: 5mm 6mm; display: flex; flex-direction: column; justify-content: space-between;">
           <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                 <div style="font-weight: 900; font-size: 14px; color: #1e293b; text-transform: uppercase;">${state.settings.shopName}</div>
                 <div style="font-size: 7px; color: ${brandColor}; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Official Team Member</div>
              </div>
              <div style="text-align: right;">
                 <div style="font-size: 12px; font-weight: 900; color: #1e293b; font-family: monospace;">ID: ${w.employeeId}</div>
              </div>
           </div>
           <div style="display: flex; align-items: center; gap: 4mm; margin-top: 2mm;">
              ${photoContent}
              <div style="flex: 1; min-width: 0;">
                 <div style="font-size: 16px; font-weight: 900; color: #1e293b; text-transform: uppercase; line-height: 1.1; margin-bottom: 2px;">${w.name}</div>
                 <div style="font-size: 9px; font-weight: 700; color: #64748b; margin-bottom: 6px;">${w.position}</div>
                 <div style="background: #f8fafc; padding: 2px 5px; border-radius: 1mm; display: inline-block; border: 1px solid #f1f5f9;">
                    <div style="font-size: 6px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Joined ${new Date(w.joinDate).getFullYear()}</div>
                 </div>
              </div>
           </div>
           <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #f1f5f9; padding-top: 2mm;">
              <div style="font-size: 6px; color: #cbd5e1; font-weight: 700; text-transform: uppercase;">Security Clearance: Level 1 • Non-Transferable</div>
              <div style="opacity: 0.1;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><rect x="7" y="7" width="3" height="3"/><rect x="14" y="7" width="3" height="3"/><rect x="7" y="14" width="3" height="3"/><rect x="14" y="14" width="3" height="3"/></svg></div>
           </div>
        </div>
      </div>
    `;
  };

  const handleDownloadWorkerID = async (w: Worker) => {
    if (isDownloading) return;
    setIsDownloading(true);
    const container = document.getElementById('pdf-render-container');
    if (!container) return setIsDownloading(false);
    container.style.width = '85mm';
    container.innerHTML = generateWorkerIDCardHTML(w);
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const canvas = await html2canvas(container, { scale: 4, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [85, 55] });
      pdf.addImage(imgData, 'PNG', 0, 0, 85, 55);
      pdf.save(`ID_CARD_${w.employeeId}_${w.name.replace(/\s+/g, '_')}.pdf`);
    } catch (e) { console.error(e); }
    container.innerHTML = '';
    container.style.width = '210mm';
    setIsDownloading(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 max-w-full">
      <ConfirmDialog 
        isOpen={!!trashConfirm} 
        onClose={() => setTrashConfirm(null)} 
        onConfirm={handleDelete} 
        title="Quarantine Record?" 
        message={`This ${trashConfirm?.type} will be moved to the Recycle Bin and hidden from the terminal.`} 
        confirmText="Confirm Delete" 
        type="warning" 
      />

      {/* Main Header & Tab Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
         <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-600 rounded-[22px] text-white shadow-xl shadow-rose-200 dark:shadow-none">
               <Receipt size={24} strokeWidth={2.5}/>
            </div>
            <div>
               <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">Fiscal Control</h3>
               <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mt-1 w-fit">
                  <button onClick={() => setActiveTab('ledger')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'ledger' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Expenditure</button>
                  <button onClick={() => setActiveTab('staff')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'staff' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Staff Registry</button>
               </div>
            </div>
         </div>
         
         <div className="flex gap-2">
            {activeTab === 'ledger' ? (
              <button onClick={() => setIsAddingExpense(true)} className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all">
                <Plus size={18} /> {t.logExpense}
              </button>
            ) : (
              <button onClick={() => setIsAddingWorker(true)} className="flex items-center gap-3 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all">
                <UserPlus size={18} /> {t.addStaff}
              </button>
            )}
         </div>
      </div>

      {activeTab === 'ledger' ? (
        <div className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-rose-600 p-6 rounded-[32px] text-white shadow-xl relative overflow-hidden group">
                 <p className="text-[10px] font-black text-rose-200 uppercase tracking-widest mb-1 opacity-80">Aggregate Outflow</p>
                 <h3 className="text-3xl font-black tracking-tighter">{state.settings.currency}{totalOutflow.toLocaleString()}</h3>
                 <Receipt className="absolute -bottom-4 -right-4 text-white/10 rotate-12 group-hover:scale-110 transition-transform" size={120} />
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border shadow-sm flex flex-col justify-center">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Human Capital Cost</p>
                 <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">{state.settings.currency}{staffCosts.toLocaleString()}</h3>
                 <div className="flex items-center gap-1.5 mt-2"><Users size={12} className="text-indigo-500"/><span className="text-[8px] font-black text-slate-400 uppercase">Linked to {activeWorkers.length} staff</span></div>
              </div>
           </div>

           <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-50 dark:border-slate-800">
                 <div className="relative max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="Filter ledger records..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3 pl-12 pr-6 outline-none text-xs font-bold dark:text-white" />
                 </div>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="bg-slate-50/50 dark:bg-slate-800/30 border-b">
                       <tr>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Category</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Payee</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                          <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                       {filteredExpenses.map((e) => {
                         const worker = activeWorkers.find(w => w.id === e.workerId);
                         return (
                          <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 group transition-all">
                             <td className="px-8 py-5">
                                <div className="flex items-center gap-4">
                                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${e.workerId ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
                                      {e.workerId ? <CreditCard size={18}/> : <Receipt size={18}/>}
                                   </div>
                                   <div className="min-w-0">
                                      <p className="font-black text-sm text-slate-800 dark:text-white truncate tracking-tight">{e.description}</p>
                                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{new Date(e.date).toLocaleDateString()}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="px-8 py-5 text-center">
                                <span className="inline-block text-[9px] font-black px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full uppercase tracking-widest">
                                   {e.category}
                                </span>
                             </td>
                             <td className="px-8 py-5">
                                {worker ? (
                                   <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-[10px]">{worker.name.charAt(0)}</div>
                                      <span className="text-[11px] font-black dark:text-white">{worker.name}</span>
                                   </div>
                                ) : <span className="text-[10px] font-bold text-slate-300 italic">General Shop Cost</span>}
                             </td>
                             <td className="px-8 py-5 text-right">
                                <p className="text-lg font-black text-rose-600">{state.settings.currency}{e.amount.toLocaleString()}</p>
                             </td>
                             <td className="px-8 py-5 text-right">
                                <button onClick={() => setTrashConfirm({id: e.id, type: 'expense'})} className="p-3 text-slate-300 hover:text-rose-600 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
                             </td>
                          </tr>
                         )
                       })}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
           {/* Quick Add Worker Card */}
           <button 
             onClick={() => setIsAddingWorker(true)}
             className="bg-white dark:bg-slate-900 rounded-[36px] border-4 border-dashed border-slate-100 dark:border-slate-800 p-8 flex flex-col items-center justify-center gap-4 group hover:border-emerald-500 hover:bg-emerald-50/10 transition-all duration-300 min-h-[300px]"
           >
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-[30px] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                 <UserPlus size={40} />
              </div>
              <div className="text-center">
                 <h4 className="text-xl font-black dark:text-white uppercase tracking-tighter">Enroll Staff</h4>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Add new node to registry</p>
              </div>
           </button>

           {filteredWorkers.map((w) => (
             <div key={w.id} className="bg-white dark:bg-slate-900 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-xl transition-all group relative">
                <div className="p-8 pb-4 flex items-center gap-6">
                   <div className="w-20 h-24 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 shrink-0">
                      {w.photo ? <img src={w.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Users size={32}/></div>}
                   </div>
                   <div className="min-w-0">
                      <h4 className="text-xl font-black text-slate-800 dark:text-white truncate uppercase tracking-tighter">{w.name}</h4>
                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">{w.position}</p>
                      <div className="flex items-center gap-2 mt-3 text-slate-400">
                         <Hash size={12} />
                         <span className="text-[10px] font-bold uppercase">Staff ID: {w.employeeId}</span>
                      </div>
                   </div>
                </div>
                <div className="px-8 py-6 grid grid-cols-2 gap-4 border-y border-slate-50 dark:border-slate-800">
                   <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Base Salary</p>
                      <p className="text-sm font-black text-slate-800 dark:text-white">{state.settings.currency}{w.baseSalary.toLocaleString()}</p>
                   </div>
                   <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Monthly Paid</p>
                      <p className="text-sm font-black text-indigo-600">
                        {state.settings.currency}{activeExpenses.filter(e => e.workerId === w.id).reduce((a,b)=>a+b.amount,0).toLocaleString()}
                      </p>
                   </div>
                </div>
                <div className="p-6 flex items-center justify-between">
                   <div className="flex gap-2">
                      <button onClick={() => handleDownloadWorkerID(w)} className="p-3 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center gap-2" title="ID Card">
                        <IdCard size={18}/><span className="text-[9px] font-black uppercase hidden group-hover:block">View ID</span>
                      </button>
                      <button className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl hover:bg-slate-100 transition-all" title="Accounting History"><Clock size={18}/></button>
                   </div>
                   <button onClick={() => setTrashConfirm({id: w.id, type: 'worker'})} className="p-3 text-slate-300 hover:text-rose-600 transition-all"><Trash2 size={18}/></button>
                </div>
             </div>
           ))}
           {filteredWorkers.length === 0 && (
              <div className="col-span-full py-20 text-center flex flex-col items-center justify-center gap-6 border-2 border-dashed border-slate-100 rounded-[40px] bg-slate-50/50">
                 <div className="w-24 h-24 bg-white rounded-[40px] shadow-sm flex items-center justify-center text-slate-200">
                    <Users size={64} strokeWidth={1} />
                 </div>
                 <div className="space-y-2">
                    <p className="font-black text-sm uppercase tracking-widest text-slate-400">Staff registry is empty</p>
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">Start by adding your first team member</p>
                 </div>
                 <button 
                   onClick={() => setIsAddingWorker(true)}
                   className="px-10 py-5 bg-indigo-600 text-white rounded-[32px] font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-3 active:scale-95 transition-all"
                 >
                    <UserPlus size={20} /> Authorize New Staff
                 </button>
              </div>
           )}
        </div>
      )}

      {/* Modals Section */}
      {isAddingExpense && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col animate-in zoom-in duration-300 max-h-[90vh]">
               <header className="p-8 border-b flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shadow-sm"><Receipt size={24}/></div>
                     <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Expenditure Registry</h3>
                  </div>
                  <button onClick={() => setIsAddingExpense(false)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-rose-600 transition-all"><X size={24}/></button>
               </header>
               <div className="flex-1 overflow-y-auto p-10 space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Expense Payee (Optional)</label>
                    <select value={newExpense.workerId} onChange={e => setNewExpense({...newExpense, workerId: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-6 font-bold text-sm dark:text-white outline-none">
                       <option value="">General Shop Cost</option>
                       {activeWorkers.map(w => <option key={w.id} value={w.id}>Salary/Advance: {w.name} ({w.employeeId})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Detail Description</label>
                    <textarea rows={2} value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-6 font-bold text-sm dark:text-white outline-none resize-none" placeholder="e.g. Electricity Bill Jan, Staff Salary..." />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Amount</label>
                      <input type="number" value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-6 font-black text-2xl dark:text-white outline-none" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Category</label>
                      <select value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-6 font-black text-[10px] uppercase dark:text-white outline-none">
                         {state.expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
               </div>
               <footer className="p-8 border-t flex gap-4">
                  <button onClick={() => setIsAddingExpense(false)} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-3xl font-black text-[10px] uppercase tracking-widest">Discard</button>
                  <button onClick={handleAddExpense} className="flex-[2] py-5 bg-rose-600 text-white rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl">Finalize Log</button>
               </footer>
            </div>
         </div>
      )}

      {isAddingWorker && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[56px] w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col animate-in zoom-in duration-300 max-h-[95vh] border border-white/10">
               <header className="p-10 border-b flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-5">
                     <div className="w-16 h-16 bg-emerald-600 text-white rounded-[24px] flex items-center justify-center shadow-2xl"><UserPlus size={32}/></div>
                     <div>
                        <h3 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Recruit Staff Member</h3>
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-1">Proprietary Identity Enrollment</p>
                     </div>
                  </div>
                  <button onClick={() => setIsAddingWorker(false)} className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-rose-500 transition-all active:scale-90"><X size={28}/></button>
               </header>
               <div className="flex-1 overflow-y-auto p-12 space-y-10 custom-scrollbar">
                  <div className="flex flex-col items-center">
                     <div 
                        onClick={() => workerFileRef.current?.click()} 
                        className="w-40 h-48 rounded-[40px] bg-slate-50 dark:bg-slate-950 border-4 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 transition-all overflow-hidden relative group shadow-inner"
                     >
                        {newWorker.photo ? <img src={newWorker.photo} className="w-full h-full object-cover p-2 rounded-[32px]" /> : <div className="text-slate-300 text-center"><Camera size={48} strokeWidth={1}/><p className="text-[9px] font-black uppercase mt-3 tracking-widest">Enroll Portrait</p></div>}
                        <input type="file" ref={workerFileRef} className="hidden" accept="image/*" onChange={handleWorkerPhoto} />
                        <div className="absolute inset-0 bg-emerald-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="col-span-full">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Legal Professional Name</label>
                        <input type="text" value={newWorker.name} onChange={e => setNewWorker({...newWorker, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-3xl py-5 px-8 font-black text-xl dark:text-white outline-none shadow-sm" placeholder="Enter full identity name..." />
                     </div>
                     
                     <div className="col-span-full md:col-span-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Verified Employment UID</label>
                        <div className="flex gap-2">
                           <div className="relative flex-1">
                              <Hash className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                              <input type="text" value={newWorker.employeeId} onChange={e => setNewWorker({...newWorker, employeeId: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 pl-14 pr-6 font-black text-sm dark:text-white outline-none shadow-inner" placeholder="EMP-XXXX" />
                           </div>
                           <button onClick={() => setNewWorker({...newWorker, employeeId: generateWorkerId()})} className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl hover:text-indigo-600 hover:bg-white transition-all shadow-sm"><RefreshCw size={20}/></button>
                        </div>
                     </div>
                     
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Identity Telecom (Phone)</label>
                        <input type="text" value={newWorker.phone} onChange={e => setNewWorker({...newWorker, phone: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-6 font-bold text-sm dark:text-white outline-none" placeholder="07XX-XXX-XXX" />
                     </div>
                     
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Job Designation / Rank</label>
                        <input type="text" value={newWorker.position} onChange={e => setNewWorker({...newWorker, position: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-6 font-bold text-sm dark:text-white outline-none" placeholder="e.g. Sales Associate, Manager" />
                     </div>
                     
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Base Compensation (Salary)</label>
                        <div className="relative">
                           <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                           <input type="number" value={newWorker.baseSalary || ''} onChange={e => setNewWorker({...newWorker, baseSalary: Number(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 pl-14 pr-6 font-black text-lg dark:text-white outline-none" placeholder="0.00" />
                        </div>
                     </div>
                  </div>
               </div>
               <footer className="p-10 border-t bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row gap-4 shrink-0">
                  <button onClick={() => setIsAddingWorker(false)} className="flex-1 py-7 bg-white dark:bg-slate-800 text-slate-500 rounded-[32px] font-black text-xs uppercase tracking-[0.2em] shadow-sm border border-slate-100 dark:border-slate-700">Discard Enrollment</button>
                  <button onClick={handleAddWorker} className="flex-[2] py-7 bg-emerald-600 text-white rounded-[32px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-emerald-100 dark:shadow-none hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-4">
                     <CheckCircle2 size={24}/> Finalize Staff Onboarding
                  </button>
               </footer>
            </div>
         </div>
      )}
    </div>
  );
};

export default Expenses;
