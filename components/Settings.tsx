
import React, { useState, useRef, useEffect } from 'react';
import { 
  Database,
  Download,
  Languages,
  Image as ImageIcon,
  ShieldCheck,
  Phone,
  Mail,
  Lock,
  IdCard,
  Brush,
  Gift,
  RefreshCw,
  CheckCircle2,
  User,
  Info,
  History,
  Settings as SettingsIcon,
  Globe,
  Palette,
  FileText,
  BadgePercent,
  KeyRound,
  ShieldAlert,
  Moon,
  Sun,
  Layout,
  Terminal,
  Type,
  CheckSquare,
  Square
} from 'lucide-react';
import { AppState, DbSnapshot, Language, Theme } from '../types';
import { translations } from '../translations';
import { getSnapshots, createSnapshot } from '../db';

interface Props {
  state: AppState;
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
  initialTab?: SettingsTab;
}

type SettingsTab = 'profile' | 'localization' | 'templates' | 'card' | 'loyalty' | 'security' | 'backup' | 'about';

const Settings: React.FC<Props> = ({ state, updateState, initialTab = 'profile' }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [formData, setFormData] = useState(state.settings);
  const [showSaved, setShowSaved] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [snapshots, setSnapshots] = useState<DbSnapshot[]>([]);
  
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-8 rounded-[48px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-[24px] flex items-center justify-center text-white shadow-xl">
             <SettingsTabIcon tab={activeTab} />
          </div>
          <div>
            <h3 className="text-3xl font-black uppercase tracking-tighter dark:text-white">{t.settings}</h3>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
               System Node Config <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" /> Active Session
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
              {id: 'profile', icon: User, label: t.shopProfile, desc: 'Identity & Contacts'}, 
              {id: 'localization', icon: Languages, label: t.localization, desc: 'Language & Atmosphere'}, 
              {id: 'templates', icon: Brush, label: t.invoiceSettings, desc: 'Receipts & Branding'},
              {id: 'card', icon: IdCard, label: 'Membership Cards', desc: 'Loyalty Card Aesthetics'}, 
              {id: 'loyalty', icon: Gift, label: t.loyaltySettings, desc: 'Points & Rewards'},
              {id: 'security', icon: Lock, label: t.security, desc: 'Vault Access Keys'}, 
              {id: 'backup', icon: Database, label: t.backup, desc: 'Snapshots & Recovery'},
              {id: 'about', icon: Info, label: t.about, desc: 'System Integrity'} 
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
                 <div className="space-y-10 animate-in slide-in-from-bottom-4">
                    <div className="flex flex-col xl:flex-row gap-12">
                       <div className="xl:w-1/3 flex flex-col items-center">
                          <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-6 self-start px-2">Shop Branding</h4>
                          <div 
                            onClick={() => logoInputRef.current?.click()} 
                            className="w-full aspect-square max-w-[280px] rounded-[48px] bg-slate-50 dark:bg-slate-950 border-4 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center cursor-pointer overflow-hidden group shadow-inner relative transition-all hover:border-indigo-400"
                          >
                             {formData.shopLogo ? (
                               <img src={formData.shopLogo} className="w-full h-full object-contain p-8 transition-transform group-hover:scale-105" />
                             ) : (
                               <div className="flex flex-col items-center text-slate-300">
                                 <ImageIcon size={64} strokeWidth={1} />
                                 <p className="text-[10px] font-black uppercase mt-4 tracking-widest text-center px-6">Upload Brand Symbol</p>
                               </div>
                             )}
                             <input ref={logoInputRef} type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                          </div>
                       </div>

                       <div className="xl:w-2/3 space-y-8">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2">Business Designation</label>
                                <input type="text" value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-3xl py-4 px-8 font-black text-2xl dark:text-white outline-none" />
                             </div>
                             <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2">Tagline / Motto</label>
                                <input type="text" value={formData.shopTagline || ''} onChange={e => setFormData({...formData, shopTagline: e.target.value})} placeholder="e.g. Quality Since 2025" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-3xl py-4 px-8 font-bold text-sm dark:text-white outline-none" />
                             </div>
                             <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2">Contact Phone</label>
                                <div className="relative">
                                   <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                   <input type="text" value={formData.shopPhone || ''} onChange={e => setFormData({...formData, shopPhone: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 pl-14 pr-6 font-bold dark:text-white outline-none" />
                                </div>
                             </div>
                             <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2">Email Node</label>
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

               {activeTab === 'localization' && (
                 <div className="space-y-12 animate-in slide-in-from-bottom-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                       <div className="space-y-6">
                          <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-3"><Globe size={18}/> {t.language}</h4>
                          <div className="grid grid-cols-1 gap-3">
                             {[
                               { id: 'en', label: 'English', desc: 'Standard Global Architecture' },
                               { id: 'ps', label: 'پښتو', desc: 'افغان ملي ژبه (Pashto)' },
                               { id: 'dr', label: 'دری', desc: 'فارسی افغانستان (Dari)' }
                             ].map(lang => (
                               <button 
                                 key={lang.id} 
                                 onClick={() => setFormData({...formData, language: lang.id as Language})}
                                 className={`p-6 rounded-[32px] text-left border-4 transition-all flex items-center justify-between group ${formData.language === lang.id ? 'border-indigo-600 bg-white dark:bg-slate-800 shadow-xl' : 'border-slate-50 dark:border-slate-950 opacity-60'}`}
                               >
                                  <div>
                                     <p className="font-black text-lg dark:text-white uppercase">{lang.label}</p>
                                     <p className="text-[10px] font-bold text-slate-400 uppercase">{lang.desc}</p>
                                  </div>
                                  {formData.language === lang.id && <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center"><CheckCircle2 size={20}/></div>}
                               </button>
                             ))}
                          </div>
                       </div>

                       <div className="space-y-6">
                          <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-3"><Palette size={18}/> {t.appearance}</h4>
                          <div className="grid grid-cols-2 gap-4">
                             {[
                               { id: 'light', icon: Sun, label: t.light },
                               { id: 'dark', icon: Moon, label: t.dark }
                             ].map(theme => (
                               <button 
                                 key={theme.id} 
                                 onClick={() => setFormData({...formData, theme: theme.id as Theme})}
                                 className={`p-8 rounded-[40px] flex flex-col items-center gap-4 border-4 transition-all ${formData.theme === theme.id ? 'border-indigo-600 bg-white dark:bg-slate-800 shadow-xl' : 'border-slate-50 dark:border-slate-950 opacity-60'}`}
                               >
                                  <theme.icon size={32} className={formData.theme === theme.id ? 'text-indigo-600' : 'text-slate-300'} />
                                  <span className="font-black text-xs uppercase tracking-widest dark:text-white">{theme.label}</span>
                               </button>
                             ))}
                          </div>
                          
                          <div className="p-8 bg-slate-50 dark:bg-slate-950 rounded-[40px] border border-slate-100 dark:border-slate-800 mt-6">
                             <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Currency Protocol</h5>
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                   <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Symbol</label>
                                   <input type="text" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full bg-white dark:bg-slate-800 rounded-xl py-3 px-4 font-black text-center text-xl dark:text-white outline-none" />
                                </div>
                                <div>
                                   <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Secondary (AFN)</label>
                                   <input type="text" value={formData.secondaryCurrency || ''} onChange={e => setFormData({...formData, secondaryCurrency: e.target.value})} className="w-full bg-white dark:bg-slate-800 rounded-xl py-3 px-4 font-black text-center text-xl dark:text-white outline-none" />
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
               )}

               {activeTab === 'templates' && (
                 <div className="space-y-12 animate-in slide-in-from-bottom-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                       <div className="md:col-span-4 space-y-6">
                          <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-3"><Type size={18}/> Formatting</h4>
                          <div className="space-y-4">
                             <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Invoice Prefix</label>
                                <input type="text" value={formData.invoicePrefix || ''} onChange={e => setFormData({...formData, invoicePrefix: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl py-4 px-6 font-black text-indigo-600 outline-none" placeholder="e.g. INV-" />
                             </div>
                             <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Business Reg ID</label>
                                <input type="text" value={formData.businessRegId || ''} onChange={e => setFormData({...formData, businessRegId: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl py-4 px-6 font-black text-xs dark:text-white outline-none" placeholder="TAX-ID-123" />
                             </div>
                             <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-[28px]">
                                <h5 className="text-[8px] font-black text-slate-400 uppercase mb-2">Feature Toggles</h5>
                                <button onClick={() => setFormData({...formData, showSignatures: !formData.showSignatures})} className="w-full flex items-center justify-between text-left group">
                                   <span className="text-[10px] font-black uppercase dark:text-white">Authorized Signatures</span>
                                   {formData.showSignatures ? <CheckSquare className="text-indigo-600" size={18}/> : <Square className="text-slate-300" size={18}/>}
                                </button>
                             </div>
                             <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Footer Message</label>
                                <textarea rows={3} value={formData.invoiceFooterNote || ''} onChange={e => setFormData({...formData, invoiceFooterNote: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl py-4 px-6 font-bold text-xs dark:text-white outline-none resize-none" placeholder="Policy, Contact, Thanks..." />
                             </div>
                          </div>
                       </div>

                       <div className="md:col-span-8 space-y-6">
                          <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-3"><Layout size={18}/> Layout Blueprint</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {[
                               { id: 'modern', label: 'Corporate Modern', desc: 'Standard A4 High DPI' },
                               { id: 'minimal', label: 'Minimalist', desc: 'Ink Efficient Architecture' },
                               { id: 'thermal', label: 'Retail Thermal', desc: '72mm POS Tape' },
                               { id: 'receipt', label: 'Compact Slips', desc: 'Dense Data Layout' }
                             ].map(layout => (
                               <button 
                                 key={layout.id} 
                                 onClick={() => setFormData({...formData, invoiceTemplate: layout.id})}
                                 className={`p-8 rounded-[40px] text-left border-4 transition-all flex flex-col gap-3 relative group overflow-hidden ${formData.invoiceTemplate === layout.id ? 'border-indigo-600 bg-white dark:bg-slate-800 shadow-xl' : 'border-slate-50 dark:border-slate-950 opacity-60'}`}
                               >
                                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${formData.invoiceTemplate === layout.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                     <FileText size={24}/>
                                  </div>
                                  <div>
                                     <p className="font-black text-sm dark:text-white uppercase">{layout.label}</p>
                                     <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{layout.desc}</p>
                                  </div>
                                  {formData.invoiceTemplate === layout.id && <div className="absolute top-4 right-4 text-indigo-600"><CheckCircle2 size={24}/></div>}
                               </button>
                             ))}
                          </div>

                          <div className="p-8 bg-slate-50 dark:bg-slate-950 rounded-[40px] border border-slate-100 dark:border-slate-800">
                             <div className="flex items-center justify-between mb-8">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Accent Color</h5>
                                <div className="w-10 h-10 rounded-xl shadow-lg border-2 border-white" style={{ backgroundColor: formData.brandColor }}></div>
                             </div>
                             <div className="grid grid-cols-5 gap-3">
                                {['#6366f1', '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#0f172a', '#475569'].map(c => (
                                  <button key={c} onClick={() => setFormData({...formData, brandColor: c})} className={`aspect-square rounded-2xl border-4 transition-all ${formData.brandColor === c ? 'border-white ring-4 ring-indigo-500 scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`} style={{backgroundColor: c}} />
                                ))}
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
               )}

               {activeTab === 'loyalty' && (
                 <div className="max-w-2xl mx-auto space-y-12 animate-in slide-in-from-bottom-4 py-6">
                    <div className="text-center space-y-4">
                       <div className="w-20 h-20 bg-amber-400 text-white rounded-[32px] flex items-center justify-center mx-auto shadow-2xl animate-bounce">
                          <Gift size={36}/>
                       </div>
                       <h4 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Reward Algorithms</h4>
                       <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Automated Customer Loyalty Engine</p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 rounded-[48px] border border-slate-100 dark:border-slate-800 p-10 space-y-10">
                       <div className="flex items-center justify-between">
                          <div>
                             <p className="font-black text-sm dark:text-white uppercase tracking-tight">Earning Protocol</p>
                             <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Points per unit of currency spent</p>
                          </div>
                          <div className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-2xl p-2 border shadow-sm">
                             <input type="number" value={formData.loyaltySettings.pointsPerUnit} onChange={e => setFormData({...formData, loyaltySettings: {...formData.loyaltySettings, pointsPerUnit: Number(e.target.value)}})} className="w-16 bg-transparent text-center font-black text-xl text-indigo-600 outline-none" />
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-4">PTS</span>
                          </div>
                       </div>

                       <div className="flex items-center justify-between border-t dark:border-slate-800 pt-10">
                          <div>
                             <p className="font-black text-sm dark:text-white uppercase tracking-tight">Redemption Value</p>
                             <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Value of 1 point in currency</p>
                          </div>
                          <div className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-2xl p-2 border shadow-sm">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-4">{formData.currency}</span>
                             <input type="number" step="0.01" value={formData.loyaltySettings.conversionRate} onChange={e => setFormData({...formData, loyaltySettings: {...formData.loyaltySettings, conversionRate: Number(e.target.value)}})} className="w-20 bg-transparent text-center font-black text-xl text-emerald-600 outline-none" />
                          </div>
                       </div>

                       <div className="p-8 bg-amber-50 dark:bg-amber-900/10 rounded-[32px] border border-amber-200 dark:border-amber-900/30 flex items-center gap-6">
                          <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-amber-500 shadow-sm"><BadgePercent size={24}/></div>
                          <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase leading-relaxed">System computes points automatically at settlement. Redemptions require authorized client identity.</p>
                       </div>
                    </div>
                 </div>
               )}

               {activeTab === 'security' && (
                 <div className="max-w-2xl mx-auto space-y-12 animate-in slide-in-from-bottom-4 py-6">
                    <div className="text-center space-y-4">
                       <div className="w-20 h-20 bg-indigo-600 text-white rounded-[32px] flex items-center justify-center mx-auto shadow-2xl">
                          <KeyRound size={36}/>
                       </div>
                       <h4 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Vault Defense</h4>
                       <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Access Control & Encryption Keys</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-[48px] border border-slate-100 dark:border-slate-800 p-10 space-y-8">
                       <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-950 rounded-[32px] border">
                          <div className="flex items-center gap-4">
                             <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg"><Lock size={20}/></div>
                             <p className="font-black text-xs uppercase tracking-widest dark:text-white">Master Passcode</p>
                          </div>
                          <input type="password" value={formData.security.passcode || ''} onChange={e => setFormData({...formData, security: {...formData.security, passcode: e.target.value}})} className="w-32 bg-white dark:bg-slate-800 rounded-xl py-3 px-4 font-black text-center tracking-[0.5em] outline-none border" placeholder="••••••" />
                       </div>

                       <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-950 rounded-[32px] border">
                          <div className="flex items-center gap-4">
                             <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg"><ShieldCheck size={20}/></div>
                             <div>
                                <p className="font-black text-xs uppercase tracking-widest dark:text-white">High Security Mode</p>
                                <p className="text-[8px] text-slate-400 font-black uppercase mt-0.5">Biometric/Question Verification</p>
                             </div>
                          </div>
                          <button onClick={() => setFormData({...formData, security: {...formData.security, highSecurityMode: !formData.security.highSecurityMode}})} className={`w-14 h-8 rounded-full relative transition-all ${formData.security.highSecurityMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                             <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${formData.security.highSecurityMode ? 'right-1' : 'left-1'}`} />
                          </button>
                       </div>

                       <div className="p-8 bg-rose-50 dark:bg-rose-900/10 rounded-[32px] border border-rose-200 dark:border-rose-900/30 flex items-center gap-6">
                          <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-rose-600 shadow-sm"><ShieldAlert size={24}/></div>
                          <p className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase leading-relaxed">Emergency System Reset PIN: 660167. Memorize this key; it bypasses all local encryption nodes.</p>
                       </div>
                    </div>
                 </div>
               )}

               {activeTab === 'backup' && (
                 <div className="space-y-12 animate-in slide-in-from-bottom-4">
                    <div className="text-center space-y-4">
                       <div className="w-20 h-20 bg-indigo-600 text-white rounded-[32px] flex items-center justify-center mx-auto shadow-2xl mb-6">
                          <Database size={32} />
                       </div>
                       <h4 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Vault Archives</h4>
                       <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Automatic local snapshots & manual archives</p>
                    </div>

                    <div className="space-y-6">
                       <div className="flex items-center justify-between px-2">
                          <h5 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><History size={14}/> Recent Temporal Snapshots</h5>
                          <button onClick={() => { createSnapshot(state, 'Manual User Snapshot').then(() => getSnapshots().then(setSnapshots)); }} className="text-[9px] font-black text-emerald-600 uppercase hover:underline">Force Manual Snapshot</button>
                       </div>
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
                                          <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Snapshot UID: {sn.id} | {sn.label}</p>
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

               {activeTab === 'about' && (
                 <div className="max-w-2xl mx-auto py-12 space-y-12 animate-in slide-in-from-bottom-4">
                    <div className="text-center space-y-6">
                       <div className="w-24 h-24 bg-indigo-600 rounded-[40px] mx-auto flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-indigo-500/20">S</div>
                       <div>
                          <h3 className="text-4xl font-black dark:text-white uppercase tracking-tighter">Sarvari Seller Pro</h3>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mt-2">Enterprise Edition v1.3.1</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-8 bg-slate-50 dark:bg-slate-950 rounded-[40px] border border-slate-100 dark:border-slate-800 text-center">
                          <Terminal size={32} className="mx-auto text-indigo-600 mb-4" />
                          <p className="font-black text-sm dark:text-white uppercase">Offline Engine</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Local Identity Vault</p>
                       </div>
                       <div className="p-8 bg-slate-50 dark:bg-slate-950 rounded-[40px] border border-slate-100 dark:border-slate-800 text-center">
                          <RefreshCw size={32} className="mx-auto text-emerald-500 mb-4" />
                          <p className="font-black text-sm dark:text-white uppercase">Real-time Sync</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Cross-Terminal State</p>
                       </div>
                    </div>

                    <div className="text-center">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                          Proprietary retail management infrastructure.<br/>
                          Engineered for zero-latency operational excellence.<br/>
                          © 2025 Sarvari Intelligence Systems.
                       </p>
                    </div>
                 </div>
               )}
            </div>
            
            {!['backup', 'about'].includes(activeTab) && (
              <footer className="p-10 border-t bg-slate-50/50 dark:bg-slate-950/20 shrink-0">
                 <button 
                   onClick={() => handleSaveSettings()} 
                   className="w-full py-6 bg-indigo-600 text-white rounded-[32px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-4"
                 >
                    <CheckCircle2 size={24}/> {t.saveChanges}
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
      case 'localization': return <Globe size={32} strokeWidth={2.5}/>;
      case 'card': return <IdCard size={32} strokeWidth={2.5}/>;
      case 'templates': return <Palette size={32} strokeWidth={2.5}/>;
      case 'security': return <ShieldAlert size={32} strokeWidth={2.5}/>;
      case 'backup': return <Database size={32} strokeWidth={2.5}/>;
      case 'loyalty': return <Gift size={32} strokeWidth={2.5}/>;
      case 'about': return <Info size={32} strokeWidth={2.5}/>;
      default: return <SettingsIcon size={32} strokeWidth={2.5}/>;
   }
};

export default Settings;
