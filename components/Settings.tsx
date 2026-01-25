
import React, { useState, useRef } from 'react';
import { 
  Store, 
  Coins, 
  Database,
  Download,
  UploadCloud,
  CheckCircle2,
  Palette,
  Languages,
  Moon,
  Sun,
  Save,
  Globe,
  Phone,
  Mail,
  MapPin,
  Fingerprint
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
  const t = translations[state.settings.language || 'en'];

  const handleSave = () => { updateState('settings', formData); setShowSaved(true); setTimeout(() => setShowSaved(false), 2000); };

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
        <h3 className="text-xl lg:text-2xl font-black uppercase tracking-tighter dark:text-white">Sarvari System</h3>
        {showSaved && <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg uppercase border border-emerald-100 animate-bounce">Saved Successfully</span>}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
         {[{id: 'profile', icon: Store, label: 'Profile'}, {id: 'localization', icon: Languages, label: 'Language'}, {id: 'backup', icon: Database, label: 'Backup'}].map(tab => (
           <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 border transition-all ${activeTab === tab.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800'}`}><tab.icon size={14}/> {tab.label}</button>
         ))}
      </div>

      <div className="bg-white dark:bg-slate-900 p-5 lg:p-8 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm">
         {activeTab === 'profile' && (
           <div className="space-y-6 animate-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="sm:col-span-2"><label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Shop Name</label><input type="text" value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-2 px-4 font-bold text-sm dark:text-white" /></div>
                 <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Phone</label><input type="text" value={formData.shopPhone} onChange={e => setFormData({...formData, shopPhone: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-2 px-4 font-bold text-sm dark:text-white" placeholder="Sarvari Hot-line" /></div>
                 <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Email</label><input type="text" value={formData.shopEmail} onChange={e => setFormData({...formData, shopEmail: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-2 px-4 font-bold text-sm dark:text-white" placeholder="sales@sarvari.com" /></div>
              </div>
              <button onClick={handleSave} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg">Update Profile</button>
           </div>
         )}

         {activeTab === 'localization' && (
           <div className="space-y-8 animate-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-3">System Language</label><div className="grid grid-cols-3 gap-2">{['en', 'ps', 'dr'].map(l => <button key={l} onClick={() => { setFormData({...formData, language: l as Language}); updateState('settings', {...state.settings, language: l as Language}); }} className={`py-2 rounded-lg font-black text-[10px] border transition-all ${formData.language === l ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>{l.toUpperCase()}</button>)}</div></div>
                 <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-3">System Theme</label><div className="grid grid-cols-2 gap-2">{['light', 'dark'].map(t => <button key={t} onClick={() => { setFormData({...formData, theme: t as Theme}); updateState('settings', {...state.settings, theme: t as Theme}); }} className={`py-2 rounded-lg font-black text-[10px] border transition-all ${formData.theme === t ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>{t.toUpperCase()}</button>)}</div></div>
              </div>
           </div>
         )}

         {activeTab === 'backup' && (
           <div className="space-y-6 animate-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <button onClick={handleBackup} className="p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center gap-2 group hover:border-indigo-500 transition-all"><Download size={24} className="text-indigo-600"/><span className="text-[10px] font-black uppercase">Export .SA Backup</span></button>
                 <button onClick={() => fileInputRef.current?.click()} className="p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center gap-2 group hover:border-amber-500 transition-all"><UploadCloud size={24} className="text-amber-600"/><span className="text-[10px] font-black uppercase">Restore Data</span><input type="file" ref={fileInputRef} className="hidden" accept=".SA" onChange={handleRestore}/></button>
              </div>
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-[9px] font-bold text-indigo-700 dark:text-indigo-300 uppercase leading-relaxed text-center">Sarvari Cloud-Sync Engine: Auto-saving is active every 3 seconds to LocalStorage. Export backups weekly to stay safe.</div>
           </div>
         )}
      </div>
    </div>
  );
};

export default Settings;
