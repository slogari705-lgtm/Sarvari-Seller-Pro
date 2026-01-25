
import React, { useState, useRef } from 'react';
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
  PenTool,
  Hash,
  ShieldCheck
} from 'lucide-react';
import { AppState, Language, Theme } from '../types';
import { translations } from '../translations';

interface Props {
  state: AppState;
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
}

const Settings: React.FC<Props> = ({ state, updateState }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'localization' | 'backup'>('profile');
  const [formData, setFormData] = useState(state.settings);
  const [showSaved, setShowSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const t = translations[state.settings.language || 'en'];

  const handleSave = () => { 
    updateState('settings', formData); 
    setShowSaved(true); 
    setTimeout(() => setShowSaved(false), 2000); 
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, shopLogo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBackup = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `sarvari_backup_${new Date().toISOString().split('T')[0]}.SA`);
    link.click();
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!confirm(t.dataRestoreConfirm)) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target?.result as string);
        ['products', 'customers', 'invoices', 'expenses', 'loanTransactions', 'settings'].forEach(key => updateState(key as any, imported[key]));
        alert(t.restoreSuccess); window.location.reload();
      } catch (err) { alert("Restore failed: Invalid file."); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h3 className="text-xl lg:text-2xl font-black uppercase tracking-tighter dark:text-white">Sarvari System Control</h3>
        {showSaved && <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg uppercase border border-emerald-100 animate-bounce">Saved Successfully</span>}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
         {[{id: 'profile', icon: Store, label: 'Shop Identity'}, {id: 'localization', icon: Languages, label: 'Locale & Visuals'}, {id: 'backup', icon: Database, label: 'Cloud Backup'}].map(tab => (
           <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 border transition-all ${activeTab === tab.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800'}`}><tab.icon size={14}/> {tab.label}</button>
         ))}
      </div>

      <div className="bg-white dark:bg-slate-900 p-5 lg:p-8 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm">
         {activeTab === 'profile' && (
           <div className="space-y-8 animate-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="md:col-span-1">
                   <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4">Official Logo</h4>
                   <div 
                    onClick={() => logoInputRef.current?.click()}
                    className="aspect-square w-full rounded-3xl border-4 border-dashed border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 transition-all overflow-hidden relative group"
                   >
                     {formData.shopLogo ? (
                       <div className="relative w-full h-full">
                         <img src={formData.shopLogo} className="w-full h-full object-contain p-4" />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                            <span className="text-white text-[8px] font-black uppercase">Change Image</span>
                         </div>
                       </div>
                     ) : (
                       <div className="flex flex-col items-center text-slate-300">
                          <ImageIcon size={48} strokeWidth={1} />
                          <span className="text-[9px] font-black mt-3 uppercase tracking-widest">Select Logo</span>
                       </div>
                     )}
                     <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                   </div>
                   {formData.shopLogo && (
                     <button onClick={() => setFormData({...formData, shopLogo: undefined})} className="w-full mt-3 flex items-center justify-center gap-2 py-2 bg-rose-50 text-rose-600 rounded-xl text-[9px] font-black uppercase tracking-widest"><X size={12}/> Remove Logo</button>
                   )}
                </div>

                <div className="md:col-span-2 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="sm:col-span-2"><label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 ml-1">Company / Shop Name</label><input type="text" value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-xl py-2.5 px-4 font-bold text-sm dark:text-white transition-all shadow-inner" /></div>
                     <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 ml-1">Business Reg. ID / Tax ID</label><div className="relative"><ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/><input type="text" value={formData.businessRegId || ''} onChange={e => setFormData({...formData, businessRegId: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-xl py-2.5 pl-9 pr-4 font-bold text-sm dark:text-white" placeholder="License #" /></div></div>
                     <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 ml-1">Invoice Prefix</label><div className="relative"><Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/><input type="text" value={formData.invoicePrefix || ''} onChange={e => setFormData({...formData, invoicePrefix: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-xl py-2.5 pl-9 pr-4 font-bold text-sm dark:text-white uppercase" placeholder="e.g. RCP-" /></div></div>
                     <div className="sm:col-span-2"><label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 ml-1">Physical Location</label><input type="text" value={formData.shopAddress} onChange={e => setFormData({...formData, shopAddress: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-xl py-2.5 px-4 font-bold text-sm dark:text-white transition-all shadow-inner" placeholder="City, Street, Building..." /></div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              <div>
                 <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><PenTool size={14}/> Professional Options</h4>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">Custom Header Field (e.g. Vat ID)</label><textarea rows={2} value={formData.invoiceHeaderNote || ''} onChange={e => setFormData({...formData, invoiceHeaderNote: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-3 px-4 font-bold text-xs dark:text-white transition-all resize-none shadow-inner" placeholder="VAT: 12345..." /></div>
                       <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">Legal Footer Note (Terms)</label><textarea rows={3} value={formData.invoiceFooterNote || ''} onChange={e => setFormData({...formData, invoiceFooterNote: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-3 px-4 font-bold text-xs dark:text-white transition-all resize-none shadow-inner" placeholder="No returns after 3 days..." /></div>
                    </div>
                    <div className="space-y-6">
                       <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-[28px] border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center justify-between">
                             <div><p className="text-[10px] font-black dark:text-white uppercase tracking-widest">Signatures</p><p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Show verification lines</p></div>
                             <button onClick={() => setFormData({...formData, showSignatures: !formData.showSignatures})} className={`w-12 h-6 rounded-full transition-all relative ${formData.showSignatures ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.showSignatures ? 'left-7' : 'left-1'}`} /></button>
                          </div>
                       </div>
                       <div className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-[28px] border border-indigo-100 dark:border-indigo-900/40">
                          <div className="flex items-center justify-between mb-4">
                             <div><p className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">Brand Accent</p></div>
                             <div className="w-10 h-10 rounded-xl border-2 border-white shadow-lg" style={{backgroundColor: formData.brandColor}} />
                          </div>
                          <input type="color" value={formData.brandColor} onChange={e => setFormData({...formData, brandColor: e.target.value})} className="w-full h-8 cursor-pointer rounded-lg bg-transparent" />
                       </div>
                    </div>
                 </div>
              </div>

              <button onClick={handleSave} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition-all active:scale-[0.98]">Update System Identity</button>
           </div>
         )}

         {activeTab === 'localization' && (
           <div className="space-y-8 animate-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest flex items-center gap-2"><Languages size={14}/> Language</label>
                    <div className="grid grid-cols-3 gap-3">
                       {[ {id: 'en', label: 'English'}, {id: 'ps', label: 'Pashto'}, {id: 'dr', label: 'Dari'} ].map(l => (
                         <button key={l.id} onClick={() => { setFormData({...formData, language: l.id as Language}); }} className={`py-4 rounded-2xl border-2 font-black text-sm transition-all ${formData.language === l.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-transparent hover:bg-slate-100'}`}>{l.label}</button>
                       ))}
                    </div>
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest flex items-center gap-2"><Palette size={14}/> Environment</label>
                    <div className="grid grid-cols-2 gap-3">
                       {[ {id: 'light', label: 'Light', icon: Sun}, {id: 'dark', label: 'Dark', icon: Moon} ].map(t => (
                         <button key={t.id} onClick={() => { setFormData({...formData, theme: t.id as Theme}); }} className={`flex flex-col items-center justify-center py-4 rounded-2xl border-2 transition-all ${formData.theme === t.id ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-transparent'}`}><t.icon size={20}/><span className="font-black text-xs uppercase mt-2">{t.label}</span></button>
                       ))}
                    </div>
                 </div>
                 <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 border-t dark:border-slate-800">
                    <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">Currency Signature</label><input type="text" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-xl py-2.5 px-4 font-black text-sm dark:text-white" /></div>
                    <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">Tax Percentage (%)</label><input type="number" value={formData.taxRate} onChange={e => setFormData({...formData, taxRate: Number(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-xl py-2.5 px-4 font-black text-sm dark:text-white" /></div>
                 </div>
              </div>
              <button onClick={handleSave} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition-all active:scale-[0.98]">Save Visual Parameters</button>
           </div>
         )}

         {activeTab === 'backup' && (
           <div className="space-y-6 animate-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <button onClick={handleBackup} className="p-8 bg-slate-50 dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center gap-3 group hover:border-indigo-500 transition-all shadow-inner"><Download size={32} className="text-indigo-600 group-hover:scale-110 transition-transform"/><span className="text-[11px] font-black uppercase tracking-widest">Export .SA Backup</span></button>
                 <button onClick={() => fileInputRef.current?.click()} className="p-8 bg-slate-50 dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center gap-3 group hover:border-amber-500 transition-all shadow-inner"><UploadCloud size={32} className="text-amber-600 group-hover:scale-110 transition-transform"/><span className="text-[11px] font-black uppercase tracking-widest">Restore Database</span><input type="file" ref={fileInputRef} className="hidden" accept=".SA" onChange={handleRestore}/></button>
              </div>
           </div>
         )}
      </div>
    </div>
  );
};

export default Settings;
