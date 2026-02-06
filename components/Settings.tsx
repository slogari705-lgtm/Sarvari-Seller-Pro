
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Store, 
  Database,
  Download,
  UploadCloud,
  Palette,
  Languages,
  Moon,
  Sun,
  Image as ImageIcon,
  X,
  Hash,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Lock,
  IdCard,
  Check,
  Layout,
  Receipt,
  Gift,
  RefreshCw,
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Zap,
  Fingerprint,
  Monitor,
  HardDrive,
  ExternalLink,
  ChevronRight,
  Shield,
  Clock,
  Printer,
  Bell,
  Code,
  Globe,
  Settings as SettingsIcon,
  HelpCircle,
  Smartphone,
  Eye,
  Edit2,
  User,
  Activity,
  AlertTriangle,
  CreditCard,
  DollarSign,
  Layers,
  FileDown,
  QrCode,
  Brush,
  Signature,
  Star,
  Calendar,
  Percent,
  Coins,
  ArrowUpRight,
  Award,
  MessageSquare,
  Cpu,
  Info,
  Key,
  ShieldAlert,
  EyeOff,
  Laptop,
  Smartphone as MobileIcon,
  AppWindow,
  Terminal as TerminalIcon,
  PackageCheck,
  SmartphoneNfc,
  CloudLightning,
  Github,
  History
} from 'lucide-react';
import { AppState, Language, Theme, CardDesign, InvoiceTemplate, User as UserType, DbSnapshot } from '../types';
import { translations } from '../translations';
import { getSnapshots } from '../db';
import ConfirmDialog from './ConfirmDialog';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface Props {
  state: AppState;
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
  initialTab?: SettingsTab;
}

type SettingsTab = 'profile' | 'localization' | 'templates' | 'card' | 'loyalty' | 'security' | 'backup' | 'users' | 'about';

const Settings: React.FC<Props> = ({ state, updateState, initialTab = 'profile' }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [formData, setFormData] = useState(state.settings);
  const [showSaved, setShowSaved] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingCard, setIsExportingCard] = useState(false);
  const [snapshots, setSnapshots] = useState<DbSnapshot[]>([]);
  
  // Security States
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  
  // Template States
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<InvoiceTemplate> | null>(null);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const t = translations[state.settings.language || 'en'];

  useEffect(() => {
    setFormData(state.settings);
    if (activeTab === 'backup') {
      getSnapshots().then(setSnapshots);
    }
  }, [state.settings, activeTab]);

  const handleSaveSettings = (dataOverride?: any) => { 
    const finalData = dataOverride || formData;
    updateState('settings', finalData); 
    setShowSaved(true); 
    setTimeout(() => setShowSaved(false), 2000); 
  };

  const handleRestoreSnapshot = (snapshot: DbSnapshot) => {
    if (confirm(`CRITICAL PROTOCOL: Restore systems to snapshot from ${new Date(snapshot.timestamp).toLocaleString()}? Current data will be overwritten.`)) {
      updateState('products', snapshot.data.products);
      updateState('customers', snapshot.data.customers);
      updateState('invoices', snapshot.data.invoices);
      updateState('expenses', snapshot.data.expenses);
      updateState('users', snapshot.data.users);
      updateState('settings', snapshot.data.settings);
      alert("System State Synchronized.");
      window.location.reload();
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newSettings = { ...formData, shopLogo: reader.result as string };
        setFormData(newSettings);
        handleSaveSettings(newSettings);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExportData = () => {
    setIsExporting(true);
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const exportFileDefaultName = `sarvari_pos_archive_${new Date().toISOString().split('T')[0]}.sa`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', url);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    URL.revokeObjectURL(url);
    setTimeout(() => setIsExporting(false), 1000);
  };

  const handleSaveSecurity = () => {
    if (newPasscode && newPasscode.length < 4) {
      alert("PIN must be at least 4 digits.");
      return;
    }
    if (newPasscode && newPasscode !== confirmPasscode) {
      alert("PINs do not match.");
      return;
    }

    const newSettings = {
      ...formData,
      security: {
        ...formData.security,
        passcode: newPasscode || formData.security.passcode,
        isLockEnabled: !!(newPasscode || formData.security.passcode)
      }
    };
    setFormData(newSettings);
    handleSaveSettings(newSettings);
    setNewPasscode('');
    setConfirmPasscode('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-8 rounded-[48px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-[24px] flex items-center justify-center text-white shadow-xl">
             <SettingsTabIcon tab={activeTab} />
          </div>
          <div>
            <h3 className="text-3xl font-black uppercase tracking-tighter dark:text-white">Configuration Suite</h3>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
               IndexedDB Vault Active <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" /> Node 01
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 relative z-10">
           {showSaved && (
             <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl shadow-sm animate-in zoom-in">
               <CheckCircle2 size={16} className="text-emerald-600" />
               <span className="text-[10px] font-black text-emerald-600 uppercase">Synchronized</span>
             </div>
           )}
           <button onClick={handleExportData} disabled={isExporting} className="flex items-center gap-3 px-6 py-3.5 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95">
             {isExporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />} Data Export (.sa)
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
         <aside className="lg:col-span-3 space-y-2">
            {[ 
              {id: 'profile', icon: User, label: 'Owner Profile', desc: 'Identity & Enterprise Meta'}, 
              {id: 'localization', icon: Languages, label: 'Regional Config', desc: 'Interface Language & Theme'}, 
              {id: 'templates', icon: Brush, label: 'Invoice Designer', desc: 'Billing Preset Management'},
              {id: 'card', icon: IdCard, label: 'Member Card Studio', desc: 'Badge Aesthetic Orchestration'}, 
              {id: 'loyalty', icon: Gift, label: 'Reward Engine', desc: 'Algorithms & Tier Levels'},
              {id: 'users', icon: ShieldCheck, label: 'User Registry', desc: 'Access Control List'}, 
              {id: 'security', icon: Lock, label: 'Security Vault', desc: 'Access Control'}, 
              {id: 'backup', icon: Database, label: 'Backup Console', desc: 'Snapshot Recovery'},
              {id: 'about', icon: Info, label: 'System & Developer', desc: 'Support & Credits'} 
            ].map(tab => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as any)} 
                className={`w-full p-4 rounded-[28px] text-left transition-all border group flex items-center gap-4 ${activeTab === tab.id ? 'bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-100 dark:shadow-none' : 'bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800 hover:border-indigo-200'}`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50'}`}>
                   <tab.icon size={20} strokeWidth={2.5}/>
                </div>
                <div className="min-w-0">
                   <p className={`font-black text-[11px] uppercase tracking-widest ${activeTab === tab.id ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>{tab.label}</p>
                   <p className={`text-[9px] font-bold truncate ${activeTab === tab.id ? 'text-indigo-100' : 'text-slate-400'}`}>{tab.desc}</p>
                </div>
              </button>
            ))}
         </aside>

         <div className="lg:col-span-9 bg-white dark:bg-slate-900 rounded-[56px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
            <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
               {activeTab === 'profile' && (
                 <div className="space-y-12 animate-in slide-in-from-bottom-4">
                    <div className="flex flex-col xl:flex-row gap-12">
                       <div className="xl:w-1/3 flex flex-col items-center">
                          <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-6 self-start px-2">Visual Identity</h4>
                          <div 
                            onClick={() => logoInputRef.current?.click()} 
                            className="w-full aspect-square max-w-[280px] rounded-[48px] bg-slate-50 dark:bg-slate-950 border-4 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center cursor-pointer overflow-hidden group shadow-inner relative transition-all hover:border-indigo-400"
                          >
                             {formData.shopLogo ? (
                               <img src={formData.shopLogo} className="w-full h-full object-contain p-8 transition-transform group-hover:scale-105" />
                             ) : (
                               <div className="flex flex-col items-center text-slate-300">
                                 <ImageIcon size={64} strokeWidth={1} />
                                 <p className="text-[10px] font-black uppercase mt-4 tracking-widest text-center px-6">Upload Brand Logo</p>
                               </div>
                             )}
                             <input ref={logoInputRef} type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                          </div>
                       </div>

                       <div className="xl:w-2/3 space-y-10">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Shop Name</label>
                                <input type="text" value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-3xl py-4 px-8 font-black text-2xl dark:text-white outline-none shadow-sm" />
                             </div>
                             <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Shop Phone</label>
                                <div className="relative">
                                   <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                   <input type="text" value={formData.shopPhone || ''} onChange={e => setFormData({...formData, shopPhone: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 pl-14 pr-6 font-bold dark:text-white outline-none" />
                                </div>
                             </div>
                             <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Shop Email</label>
                                <div className="relative">
                                   <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                   <input type="email" value={formData.shopEmail || ''} onChange={e => setFormData({...formData, shopEmail: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 pl-14 pr-6 font-bold dark:text-white outline-none" />
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
               )}

               {activeTab === 'users' && (
                 <div className="space-y-10 animate-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between">
                       <h4 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Authorized Personnel</h4>
                       <button className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 active:scale-95"><Plus size={16}/> New User</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {state.users.map(user => (
                         <div key={user.id} className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-[32px] border border-transparent hover:border-indigo-200 transition-all group">
                            <div className="flex items-center gap-4 mb-4">
                               <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-lg">{user.name.charAt(0)}</div>
                               <div className="min-w-0">
                                  <p className="font-black text-sm dark:text-white uppercase truncate tracking-tight">{user.name}</p>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">{user.role} • @{user.username}</p>
                               </div>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                               <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${user.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                                  {user.isActive ? 'Active' : 'Locked'}
                               </span>
                               <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 size={14}/></button>
                                  <button className="p-2 text-slate-400 hover:text-rose-600"><Trash2 size={14}/></button>
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
               )}

               {activeTab === 'backup' && (
                 <div className="space-y-12 animate-in slide-in-from-bottom-4">
                    <div className="text-center space-y-4">
                       <div className="w-20 h-20 bg-indigo-600 text-white rounded-[32px] flex items-center justify-center mx-auto shadow-2xl mb-6">
                          <Database size={32} />
                       </div>
                       <h4 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Vault Management</h4>
                       <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Automatic local snapshots & manual archives</p>
                    </div>

                    <div className="space-y-6">
                       <h5 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 px-2"><History size={14}/> Recent Snapshots</h5>
                       <div className="bg-slate-50 dark:bg-slate-950/50 rounded-[40px] border border-slate-100 dark:border-slate-800 overflow-hidden">
                          {snapshots.length > 0 ? (
                            <table className="w-full text-left">
                               <thead className="bg-white/50 dark:bg-slate-900/50 border-b">
                                  <tr>
                                     <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase">Temporal Log</th>
                                     <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase text-right">Recovery</th>
                                  </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                  {snapshots.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(sn => (
                                    <tr key={sn.id} className="hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors">
                                       <td className="px-8 py-5">
                                          <p className="text-xs font-black dark:text-white">{new Date(sn.timestamp).toLocaleString()}</p>
                                          <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Snapshot UID: {sn.id}</p>
                                       </td>
                                       <td className="px-8 py-5 text-right">
                                          <button onClick={() => handleRestoreSnapshot(sn)} className="px-4 py-2 bg-white dark:bg-slate-800 border rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">Restore</button>
                                       </td>
                                    </tr>
                                  ))}
                               </tbody>
                            </table>
                          ) : (
                            <div className="py-20 text-center opacity-30"><Database size={48} className="mx-auto mb-4"/><p className="text-[10px] font-black uppercase tracking-[0.3em]">Vault is clean</p></div>
                          )}
                       </div>
                    </div>
                 </div>
               )}
            </div>
            
            {['profile', 'localization', 'loyalty'].includes(activeTab) && (
              <footer className="p-10 border-t bg-slate-50/50 dark:bg-slate-950/20 shrink-0">
                 <button 
                   onClick={() => handleSaveSettings()} 
                   className="w-full py-6 bg-indigo-600 text-white rounded-[32px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-4"
                 >
                    <CheckCircle2 size={24}/> Confirm Changes
                 </button>
              </footer>
            )}
         </div>
      </div>
    </div>
  );
};

const SettingsTabIcon = ({ tab }: { tab: SettingsTab }) => {
   switch (tab) {
      case 'profile': return <User size={32} strokeWidth={2.5}/>;
      case 'localization': return <Languages size={32} strokeWidth={2.5}/>;
      case 'card': return <IdCard size={32} strokeWidth={2.5}/>;
      case 'templates': return <Brush size={32} strokeWidth={2.5}/>;
      case 'security': return <Lock size={32} strokeWidth={2.5}/>;
      case 'backup': return <Database size={32} strokeWidth={2.5}/>;
      case 'loyalty': return <Gift size={32} strokeWidth={2.5}/>;
      case 'users': return <ShieldCheck size={32} strokeWidth={2.5}/>;
      case 'about': return <Info size={32} strokeWidth={2.5}/>;
      default: return <SettingsIcon size={32} strokeWidth={2.5}/>;
   }
};

export default Settings;
