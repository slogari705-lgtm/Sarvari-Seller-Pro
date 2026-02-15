
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
  Square,
  Archive,
  Zap,
  Activity,
  Upload,
  AlertTriangle,
  FileSearch,
  RotateCcw
} from 'lucide-react';
import { AppState, DbSnapshot, Language, Theme } from '../types';
import { translations } from '../translations';
import { getSnapshots, createSnapshot } from '../db';
import ConfirmDialog from './ConfirmDialog';

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
  const [restoreConfirm, setRestoreConfirm] = useState<DbSnapshot | null>(null);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const t = translations[state.settings.language || 'en'];

  useEffect(() => {
    setFormData(state.settings);
    if (activeTab === 'backup') refreshSnapshots();
  }, [state.settings, activeTab]);

  const refreshSnapshots = async () => {
    const list = await getSnapshots();
    setSnapshots(list.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  };

  const handleSaveSettings = (dataOverride?: any) => { 
    const finalData = dataOverride || formData;
    updateState('settings', finalData); 
    setShowSaved(true); 
    setTimeout(() => setShowSaved(false), 2000); 
  };

  const handleRestoreSnapshot = (snapshot: DbSnapshot) => {
    updateState('products', snapshot.data.products);
    updateState('customers', snapshot.data.customers);
    updateState('invoices', snapshot.data.invoices);
    updateState('expenses', snapshot.data.expenses);
    updateState('settings', snapshot.data.settings);
    updateState('loanTransactions', snapshot.data.loanTransactions || []);
    setRestoreConfirm(null);
    alert("System Overwrite Successful. Re-initialization node active.");
    window.location.reload();
  };

  const handleExportData = () => {
    setIsExporting(true);
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const filename = `SARVARI_VAULT_${new Date().toISOString().replace(/[:.]/g, '-')}.sa`;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    setTimeout(() => setIsExporting(false), 1000);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string) as AppState;
        if (!importedData.products || !importedData.settings) throw new Error();
        if (confirm("Authorize destructive overwrite with this archive?")) {
          updateState('products', importedData.products);
          updateState('customers', importedData.customers);
          updateState('invoices', importedData.invoices);
          updateState('settings', importedData.settings);
          window.location.reload();
        }
      } catch (err) { alert("ERROR: Invalid Archive Schema Detected."); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <ConfirmDialog 
        isOpen={!!restoreConfirm}
        onClose={() => setRestoreConfirm(null)}
        onConfirm={() => restoreConfirm && handleRestoreSnapshot(restoreConfirm)}
        title="Authorize Rollback?"
        message={`Restore to ${restoreConfirm ? new Date(restoreConfirm.timestamp).toLocaleString() : ''}? Current data will be replaced.`}
        confirmText="Execute"
        type="warning"
      />

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-8 rounded-[48px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-[24px] flex items-center justify-center text-white shadow-xl">
             {activeTab === 'backup' ? <Database size={32}/> : <SettingsIcon size={32}/>}
          </div>
          <div>
            <h3 className="text-3xl font-black uppercase tracking-tighter dark:text-white">{t.settings}</h3>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Enterprise Configuration Node</p>
          </div>
        </div>
        {showSaved && <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase">Synchronized</div>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
         <aside className="lg:col-span-3 space-y-2">
            {[ 
              {id: 'profile', icon: User, label: t.shopProfile}, 
              {id: 'localization', icon: Globe, label: t.localization}, 
              {id: 'templates', icon: Palette, label: t.invoiceSettings},
              {id: 'security', icon: Lock, label: t.security}, 
              {id: 'backup', icon: Database, label: t.backup},
              {id: 'about', icon: Info, label: t.about} 
            ].map(tab => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as any)} 
                className={`w-full p-5 rounded-[28px] text-left transition-all border group flex items-center gap-4 ${activeTab === tab.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' : 'bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800'}`}
              >
                <tab.icon size={20} />
                <span className="font-black text-[11px] uppercase tracking-widest">{tab.label}</span>
              </button>
            ))}
         </aside>

         <div className="lg:col-span-9 bg-white dark:bg-slate-900 rounded-[56px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
            <div className="flex-1 p-10 overflow-y-auto">
               {activeTab === 'profile' && (
                 <div className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="md:col-span-2">
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Shop Designation</label>
                          <input type="text" value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl py-4 px-6 font-black text-2xl dark:text-white outline-none" />
                       </div>
                       <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Telecom</label>
                          <input type="text" value={formData.shopPhone || ''} onChange={e => setFormData({...formData, shopPhone: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl py-4 px-6 font-bold dark:text-white outline-none" />
                       </div>
                       <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Currency Symbol</label>
                          <input type="text" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl py-4 px-6 font-black dark:text-white outline-none" />
                       </div>
                    </div>
                 </div>
               )}

               {activeTab === 'backup' && (
                 <div className="space-y-12 animate-in slide-in-from-bottom-4">
                    <div className="bg-indigo-600 rounded-[48px] p-10 text-white shadow-2xl relative overflow-hidden group">
                       <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                          <div className="space-y-4">
                             <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/30"><ShieldCheck size={32}/></div>
                                <h4 className="text-3xl font-black uppercase tracking-tighter">Vault Integrity</h4>
                             </div>
                             <div className="flex flex-wrap gap-4">
                                <div className="px-4 py-2 bg-white/10 rounded-full border border-white/20 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                                   <Activity size={12}/> Current Volume: {(state.products.length + state.customers.length + state.invoices.length)} Entities
                                </div>
                             </div>
                          </div>
                          <button 
                            onClick={async () => { setIsExporting(true); await createSnapshot(state, 'Manual Checkpoint'); refreshSnapshots(); setIsExporting(false); }}
                            className="px-10 py-5 bg-white text-indigo-600 rounded-[32px] font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-105 transition-all flex items-center gap-3"
                          >
                             {isExporting ? <RefreshCw className="animate-spin" size={20}/> : <Database size={20}/>} Create Checkpoint
                          </button>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-6">
                          <h5 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-3 px-2"><Archive size={16}/> Physical Archiving</h5>
                          <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 space-y-4">
                             <button onClick={handleExportData} className="w-full py-4 bg-white dark:bg-slate-900 border-2 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3">
                                <Download size={14} /> Export .SA File
                             </button>
                             <button onClick={() => importInputRef.current?.click()} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3">
                                <Upload size={14} /> Import Archive
                             </button>
                             <input ref={importInputRef} type="file" className="hidden" accept=".sa,application/json" onChange={handleImportData} />
                          </div>
                       </div>

                       <div className="space-y-6">
                          <h5 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-3 px-2"><History size={16}/> Recovery Points</h5>
                          <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col max-h-[400px] overflow-y-auto">
                             {snapshots.length > 0 ? snapshots.map(sn => (
                               <div key={sn.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex items-center justify-between group">
                                  <div className="min-w-0">
                                     <p className="text-xs font-black dark:text-white uppercase truncate">{sn.label}</p>
                                     <div className="flex items-center gap-3 text-[9px] font-bold text-slate-400 uppercase mt-1">
                                        <span>{new Date(sn.timestamp).toLocaleString()}</span>
                                        {sn.stats && <span className="text-indigo-500">{sn.stats.products}P • {sn.stats.invoices}I</span>}
                                     </div>
                                  </div>
                                  <button onClick={() => setRestoreConfirm(sn)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-indigo-600 hover:text-white rounded-2xl transition-all">
                                     <RotateCcw size={18}/>
                                  </button>
                               </div>
                             )) : <div className="py-20 text-center opacity-30 text-[10px] font-black uppercase">No recovery points</div>}
                          </div>
                       </div>
                    </div>
                 </div>
               )}
            </div>
            {!['backup', 'about'].includes(activeTab) && (
              <footer className="p-10 border-t bg-slate-50/50 dark:bg-slate-950/20">
                 <button onClick={() => handleSaveSettings()} className="w-full py-6 bg-indigo-600 text-white rounded-[32px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-4">
                    <CheckCircle2 size={24}/> {t.saveChanges}
                 </button>
              </footer>
            )}
         </div>
      </div>
    </div>
  );
};

export default Settings;
