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
  Github
} from 'lucide-react';
import { AppState, Language, Theme, CardDesign, InvoiceTemplate } from '../types';
import { translations } from '../translations';
import ConfirmDialog from './ConfirmDialog';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface Props {
  state: AppState;
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
}

type SettingsTab = 'profile' | 'localization' | 'templates' | 'card' | 'loyalty' | 'security' | 'backup' | 'about';

const Settings: React.FC<Props> = ({ state, updateState }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [formData, setFormData] = useState(state.settings);
  const [showSaved, setShowSaved] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingCard, setIsExportingCard] = useState(false);
  
  // Security States
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [showMasterKey, setShowMasterKey] = useState(false);
  const [showPin, setShowPin] = useState(false);
  
  // Template States
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<InvoiceTemplate> | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const t = translations[state.settings.language || 'en'];

  useEffect(() => {
    setFormData(state.settings);
  }, [state.settings]);

  const handleSaveSettings = (dataOverride?: any) => { 
    const finalData = dataOverride || formData;
    updateState('settings', finalData); 
    setShowSaved(true); 
    setTimeout(() => setShowSaved(false), 2000); 
  };

  const handleUpdateCard = (updates: Partial<CardDesign>) => {
    const newDesign = { ...formData.cardDesign, ...updates };
    const newSettings = { ...formData, cardDesign: newDesign };
    setFormData(newSettings);
    updateState('settings', newSettings);
  };

  const handleUpdateLoyalty = (updates: any) => {
    const newLoyalty = { ...formData.loyaltySettings, ...updates };
    const newSettings = { ...formData, loyaltySettings: newLoyalty };
    setFormData(newSettings);
    updateState('settings', newSettings);
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

  const handleOpenTemplateModal = (template?: InvoiceTemplate) => {
    if (template) {
      setEditingTemplate({ ...template });
    } else {
      setEditingTemplate({
        id: Math.random().toString(36).substr(2, 9),
        name: 'New Custom Template',
        layout: 'modern',
        brandColor: formData.brandColor || '#4f46e5',
        showLogo: true,
        headerText: '',
        footerText: ''
      });
    }
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate || !editingTemplate.name) return;
    const exists = state.templates.find(t => t.id === editingTemplate.id);
    if (exists) {
      updateState('templates', state.templates.map(t => t.id === editingTemplate.id ? editingTemplate as InvoiceTemplate : t));
    } else {
      updateState('templates', [...state.templates, editingTemplate as InvoiceTemplate]);
    }
    setIsTemplateModalOpen(false);
    setEditingTemplate(null);
  };

  const handleSetDefaultTemplate = (id: string) => {
    const newSettings = { ...formData, invoiceTemplate: id };
    setFormData(newSettings);
    handleSaveSettings(newSettings);
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

  const fonts = [
    { id: 'sans', label: 'Inter Sans', family: 'Inter, sans-serif' },
    { id: 'serif', label: 'Executive Serif', family: 'serif' },
    { id: 'mono', label: 'Tech Mono', family: 'monospace' }
  ];

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

  const handleDownloadSampleCard = async () => {
    if (isExportingCard) return;
    setIsExportingCard(true);
    const preview = document.getElementById('card-preview-container');
    if (!preview) return setIsExportingCard(false);

    try {
      const canvas = await html2canvas(preview, { scale: 4, useCORS: true, backgroundColor: null });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [85, 55] });
      pdf.addImage(imgData, 'PNG', 0, 0, 85, 55);
      pdf.save(`SARVARI_CARD_${formData.shopName.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExportingCard(false);
    }
  };

  const handlePrintSampleCard = () => {
    const preview = document.getElementById('card-preview-container');
    const holder = document.getElementById('print-holder');
    if (!preview || !holder) return;

    const clone = preview.cloneNode(true) as HTMLElement;
    clone.style.margin = '20mm auto';
    clone.style.boxShadow = 'none';
    clone.style.transform = 'none';
    
    holder.innerHTML = '';
    holder.appendChild(clone);
    window.print();
    holder.innerHTML = '';
  };

  const handleSaveSecurity = () => {
    if (newPasscode && newPasscode.length < 4) {
      alert("Security Protocol: System PIN must be at least 4 digits.");
      return;
    }
    if (newPasscode && newPasscode !== confirmPasscode) {
      alert("Key Mismatch: PIN verification failed.");
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

  const currentActiveTemplate = useMemo(() => 
    state.templates.find(t => t.id === formData.invoiceTemplate) || state.templates[0],
  [state.templates, formData.invoiceTemplate]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Settings Navigation Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-8 rounded-[48px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-[24px] flex items-center justify-center text-white shadow-xl">
             <SettingsTabIcon tab={activeTab} />
          </div>
          <div>
            <h3 className="text-3xl font-black uppercase tracking-tighter dark:text-white">Configuration Suite</h3>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
               System Architecture v5.1.0 <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" /> Edge Node 01
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 relative z-10">
           {showSaved && (
             <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl shadow-sm animate-in zoom-in">
               <CheckCircle2 size={16} className="text-emerald-600" />
               <span className="text-[10px] font-black text-emerald-600 uppercase">Snapshot Synchronized</span>
             </div>
           )}
           <button onClick={handleExportData} disabled={isExporting} className="flex items-center gap-3 px-6 py-3.5 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95">
             {isExporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />} Secure Export (.sa)
           </button>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
         {/* Navigation Sidebar */}
         <aside className="lg:col-span-3 space-y-2">
            {[ 
              {id: 'profile', icon: User, label: 'Owner Profile', desc: 'Identity & Enterprise Meta'}, 
              {id: 'localization', icon: Languages, label: 'Regional Config', desc: 'Interface Language & Theme'}, 
              {id: 'templates', icon: Brush, label: 'Invoice Designer', desc: 'Billing Preset Management'},
              {id: 'card', icon: IdCard, label: 'Member Card Studio', desc: 'Badge Aesthetic Orchestration'}, 
              {id: 'loyalty', icon: Gift, label: 'Reward Engine', desc: 'Algorithms & Tier Levels'},
              {id: 'security', icon: Lock, label: 'Security Vault', desc: 'Auth & Access Control'}, 
              {id: 'backup', icon: Database, label: 'Archive Console', desc: 'Persistence & Recovery'},
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

         {/* Content Area */}
         <div className="lg:col-span-9 bg-white dark:bg-slate-900 rounded-[56px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-[750px]">
            <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
               
               {activeTab === 'profile' && (
                 <div className="space-y-12 animate-in slide-in-from-bottom-4">
                    <div className="flex flex-col xl:flex-row gap-12">
                       <div className="xl:w-1/3 flex flex-col items-center">
                          <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-6 self-start px-2">Master Visual Identity</h4>
                          <div 
                            onClick={() => logoInputRef.current?.click()} 
                            className="w-full aspect-square max-w-[280px] rounded-[48px] bg-slate-50 dark:bg-slate-950 border-4 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center cursor-pointer overflow-hidden group shadow-inner relative transition-all hover:border-indigo-400"
                          >
                             {formData.shopLogo ? (
                               <img src={formData.shopLogo} className="w-full h-full object-contain p-8 transition-transform group-hover:scale-105" />
                             ) : (
                               <div className="flex flex-col items-center text-slate-300">
                                 <ImageIcon size={64} strokeWidth={1} />
                                 <p className="text-[10px] font-black uppercase mt-4 tracking-widest text-center">Enroll Brand Logo</p>
                               </div>
                             )}
                             <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                             <input ref={logoInputRef} type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                          </div>
                          <div className="mt-8 w-full p-6 bg-slate-50 dark:bg-slate-950 rounded-[32px] border border-slate-100 dark:border-slate-800 text-center">
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Global Owner / Manager</p>
                             <input 
                               type="text" 
                               value={formData.ownerName || ''} 
                               onChange={e => {setFormData({...formData, ownerName: e.target.value}); handleSaveSettings({...formData, ownerName: e.target.value});}}
                               className="w-full bg-transparent border-none text-center font-black text-lg text-indigo-600 outline-none" 
                               placeholder="Authorize Owner Name" 
                             />
                          </div>
                       </div>

                       <div className="xl:w-2/3 space-y-10">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Enterprise Commercial Label</label>
                                <input type="text" value={formData.shopName} onChange={e => {setFormData({...formData, shopName: e.target.value}); handleSaveSettings({...formData, shopName: e.target.value});}} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-3xl py-4 px-8 font-black text-2xl dark:text-white outline-none shadow-sm" />
                             </div>
                             <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Brand Tagline / Slogan</label>
                                <input type="text" value={formData.shopTagline || ''} onChange={e => {setFormData({...formData, shopTagline: e.target.value}); handleSaveSettings({...formData, shopTagline: e.target.value});}} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-8 font-bold text-sm dark:text-white outline-none shadow-sm" placeholder="e.g. Quality Beyond Expectations" />
                             </div>
                             <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Primary Telecom</label>
                                <div className="relative">
                                   <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                   <input type="text" value={formData.shopPhone || ''} onChange={e => setFormData({...formData, shopPhone: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 pl-14 pr-6 font-bold dark:text-white outline-none" />
                                </div>
                             </div>
                             <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Electronic Mail</label>
                                <div className="relative">
                                   <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                   <input type="email" value={formData.shopEmail || ''} onChange={e => setFormData({...formData, shopEmail: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 pl-14 pr-6 font-bold dark:text-white outline-none" />
                                </div>
                             </div>
                             <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Physical Headquarters</label>
                                <div className="relative">
                                   <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                   <input type="text" value={formData.shopAddress || ''} onChange={e => setFormData({...formData, shopAddress: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 pl-14 pr-6 font-bold dark:text-white outline-none" placeholder="Street, Sector, City Node" />
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
               )}

               {activeTab === 'templates' && (
                 <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 animate-in slide-in-from-bottom-4">
                    <div className="space-y-10">
                       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div>
                             <h4 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Invoice Designer</h4>
                             <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Managed Layout Blueprints for {formData.shopName}</p>
                          </div>
                          <button onClick={() => handleOpenTemplateModal()} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-3 active:scale-95 transition-all"><Plus size={18}/> New Blueprint</button>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {state.templates.map((tpl) => (
                            <div key={tpl.id} className={`p-6 rounded-[32px] border-4 transition-all relative overflow-hidden group flex flex-col justify-between ${formData.invoiceTemplate === tpl.id ? 'border-indigo-600 bg-white dark:bg-slate-900 shadow-xl' : 'border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50'}`}>
                               <div className="relative z-10 flex justify-between items-start mb-4">
                                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm"><FileText size={24} style={{ color: tpl.brandColor }} /></div>
                                  {formData.invoiceTemplate === tpl.id ? (
                                    <div className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest">Active Protocol</div>
                                  ) : (
                                    <button onClick={() => handleSetDefaultTemplate(tpl.id)} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-[7px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 rounded-lg transition-all">Activate</button>
                                  )}
                               </div>
                               <div className="relative z-10">
                                  <h5 className="font-black text-sm dark:text-white uppercase truncate">{tpl.name}</h5>
                                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Layout: {tpl.layout}</span>
                               </div>
                               <div className="relative z-10 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 mt-4">
                                  <div className="flex gap-2">
                                     <button onClick={() => handleOpenTemplateModal(tpl)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 transition-all"><Edit2 size={14}/></button>
                                     <button onClick={() => setTemplateToDelete(tpl.id)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-600 transition-all"><Trash2 size={14}/></button>
                                  </div>
                                  <div className="w-6 h-6 rounded-lg border-2 border-white shadow-sm" style={{ backgroundColor: tpl.brandColor }} />
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>

                    <div className="sticky top-0 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-950 rounded-[64px] border-4 border-dashed border-slate-100 dark:border-slate-800 min-h-[600px]">
                        {/* INVOICE LIVE PREVIEW CONTAINER */}
                        <div className="w-full max-w-[420px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in duration-700" style={{ minHeight: '580px', transform: 'scale(0.9)' }}>
                           <div className="p-8 border-b-2 space-y-4" style={{ borderColor: currentActiveTemplate.brandColor }}>
                              <div className="flex justify-between items-start">
                                 <div>
                                    {currentActiveTemplate.showLogo && formData.shopLogo ? (
                                      <img src={formData.shopLogo} className="h-10 object-contain mb-2" />
                                    ) : currentActiveTemplate.showLogo ? (
                                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-black" style={{ background: currentActiveTemplate.brandColor }}>{formData.shopName.charAt(0)}</div>
                                    ) : null}
                                    <h4 className="font-black text-sm uppercase tracking-tighter text-slate-800">{formData.shopName}</h4>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{formData.shopTagline || 'Enterprise Solutions'}</p>
                                 </div>
                                 <div className="text-right">
                                    <h1 className="text-2xl font-black uppercase tracking-tighter" style={{ color: currentActiveTemplate.brandColor }}>INVOICE</h1>
                                    <p className="text-[10px] font-bold text-slate-800 font-mono mt-1">#INV-SAMPLE</p>
                                 </div>
                              </div>
                           </div>
                           <div className="flex-1 p-8 space-y-6">
                              <div className="grid grid-cols-2 gap-4 border-b border-slate-50 pb-4">
                                 <div>
                                    <p className="text-[7px] font-black text-slate-400 uppercase mb-1">Bill To Identity</p>
                                    <p className="text-[10px] font-black uppercase">Sample Customer Account</p>
                                 </div>
                                 <div className="text-right">
                                    <p className="text-[7px] font-black text-slate-400 uppercase mb-1">Status</p>
                                    <p className="text-[10px] font-black text-emerald-500 uppercase">FULLY PAID</p>
                                 </div>
                              </div>
                              <table className="w-full">
                                 <thead className="border-b border-slate-50">
                                    <tr>
                                       <th className="text-[7px] font-black text-slate-400 uppercase text-left py-2">Item Description</th>
                                       <th className="text-[7px] font-black text-slate-400 uppercase text-right py-2">Total</th>
                                    </tr>
                                 </thead>
                                 <tbody>
                                    <tr className="border-b border-slate-50/50">
                                       <td className="py-2"><p className="text-[9px] font-black uppercase">Technical Service Layer</p></td>
                                       <td className="py-2 text-right"><p className="text-[9px] font-black">250.00</p></td>
                                    </tr>
                                 </tbody>
                              </table>
                              <div className="pt-4 flex flex-col items-end space-y-1">
                                 <div className="flex justify-between w-32 text-[8px] font-bold text-slate-400 uppercase"><span>Aggregate Sum</span><span>250.00</span></div>
                                 <div className="flex justify-between w-32 text-[9px] font-black text-slate-800 uppercase pt-2 border-t border-slate-100"><span>NET DUE</span><span className="text-lg">250.00</span></div>
                              </div>
                           </div>
                           <div className="p-8 bg-slate-50 mt-auto text-center border-t border-slate-100">
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{currentActiveTemplate.footerText || 'Authorized valid tax document.'}</p>
                           </div>
                        </div>
                        <p className="mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 animate-pulse"><Monitor size={12}/> Live Blueprint Render</p>
                    </div>
                 </div>
               )}

               {activeTab === 'card' && (
                 <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 animate-in slide-in-from-bottom-4">
                    <div className="space-y-8 max-h-[75vh] overflow-y-auto pr-6 custom-scrollbar">
                       <div className="space-y-1">
                          <h4 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Member Card Studio</h4>
                          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Architectural branding for {formData.shopName}</p>
                       </div>
                       
                       <div className="space-y-10">
                          <div className="p-8 bg-slate-50 dark:bg-slate-950 rounded-[40px] border border-slate-100 dark:border-slate-800 space-y-8 shadow-inner">
                             <div className="grid grid-cols-2 gap-6">
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-3 px-1">Identity Base</label><div className="relative group"><input type="color" value={formData.cardDesign.primaryColor} onChange={e => handleUpdateCard({ primaryColor: e.target.value })} className="w-full h-16 rounded-2xl cursor-pointer border-4 border-white dark:border-slate-800 bg-transparent shadow-sm" /><div className="absolute inset-0 pointer-events-none rounded-2xl flex items-center justify-center"><Check size={20} className="text-white drop-shadow-md opacity-0 group-hover:opacity-100" /></div></div></div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-3 px-1">Accent Hue</label><div className="relative group"><input type="color" value={formData.cardDesign.secondaryColor} onChange={e => handleUpdateCard({ secondaryColor: e.target.value })} className="w-full h-16 rounded-2xl cursor-pointer border-4 border-white dark:border-slate-800 bg-transparent shadow-sm" /><div className="absolute inset-0 pointer-events-none rounded-2xl flex items-center justify-center"><Check size={20} className="text-white drop-shadow-md opacity-0 group-hover:opacity-100" /></div></div></div>
                             </div>
                             
                             <div className="space-y-4">
                                <label className="block text-[10px] font-black text-slate-400 uppercase ml-1">Render Theme</label>
                                <div className="grid grid-cols-2 gap-2">
                                   {['solid', 'gradient', 'mesh', 'glass'].map(th => (
                                     <button key={th} onClick={() => handleUpdateCard({ theme: th as any })} className={`py-4 rounded-xl border-4 font-black text-[9px] uppercase transition-all ${formData.cardDesign.theme === th ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : 'border-slate-50 dark:border-slate-800 text-slate-400'}`}>{th}</button>
                                   ))}
                                </div>
                             </div>

                             <div className="space-y-4">
                                <label className="block text-[10px] font-black text-slate-400 uppercase ml-1">Pattern Overlay</label>
                                <div className="grid grid-cols-3 gap-2">
                                   {['none', 'mesh', 'dots', 'waves', 'circuit'].map(p => (
                                     <button key={p} onClick={() => handleUpdateCard({ pattern: p as any })} className={`py-3 rounded-xl border-2 font-black text-[8px] uppercase transition-all ${formData.cardDesign.pattern === p ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-50 dark:border-slate-800 text-slate-400'}`}>{p}</button>
                                   ))}
                                </div>
                             </div>
                          </div>

                          <div className="p-8 bg-slate-50 dark:bg-slate-950 rounded-[40px] border border-slate-100 dark:border-slate-800 space-y-6 shadow-inner">
                             <label className="block text-[10px] font-black text-slate-400 uppercase ml-1">Identity Switches</label>
                             <div className="grid grid-cols-2 gap-4">
                                {[
                                  { key: 'showQr', label: 'QR Matrix', icon: QrCode },
                                  { key: 'showPoints', label: 'Points Display', icon: Star },
                                  { key: 'showLogo', label: 'Brand Logo', icon: ImageIcon },
                                  { key: 'showJoinDate', label: 'Enrollment', icon: Calendar }
                                ].map(sw => (
                                  <button 
                                    key={sw.key} 
                                    onClick={() => handleUpdateCard({ [sw.key]: !formData.cardDesign[sw.key as keyof CardDesign] })}
                                    className={`p-4 rounded-2xl border-4 flex items-center gap-3 transition-all ${formData.cardDesign[sw.key as keyof CardDesign] ? 'border-indigo-600 bg-white dark:bg-slate-800 text-indigo-600 shadow-md' : 'border-slate-50 dark:border-slate-800 opacity-40 grayscale'}`}
                                  >
                                    <sw.icon size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{sw.label}</span>
                                  </button>
                                ))}
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="sticky top-0 flex flex-col items-center justify-center p-12 bg-slate-50 dark:bg-slate-950 rounded-[64px] border-4 border-dashed border-slate-100 dark:border-slate-800 min-h-[500px]">
                       <div id="card-preview-container" className="relative overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] transition-all duration-700 hover:rotate-2 group" style={{ width: '420px', height: '260px', borderRadius: `${formData.cardDesign.borderRadius}px`, background: formData.cardDesign.theme === 'gradient' ? `linear-gradient(135deg, ${formData.cardDesign.primaryColor}, ${formData.cardDesign.secondaryColor})` : formData.cardDesign.primaryColor, fontFamily: fonts.find(f => f.id === formData.cardDesign.fontFamily)?.family }}>
                          <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-40 transition-opacity group-hover:opacity-60" />
                          {formData.cardDesign.pattern !== 'none' && <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: getPatternStyle(formData.cardDesign.pattern), backgroundSize: '15px 15px' }} />}
                          
                          <div className={`p-10 h-full flex flex-col justify-between relative z-10 ${formData.cardDesign.textColor === 'light' ? 'text-white' : 'text-slate-900'}`}>
                             <div className="flex justify-between items-start">
                                <div>
                                   {formData.cardDesign.showLogo && formData.shopLogo ? (
                                      <img src={formData.shopLogo} className="h-10 object-contain drop-shadow-xl" />
                                   ) : formData.cardDesign.showLogo ? (
                                      <div className="w-12 h-12 rounded-[18px] bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xl border border-white/30 shadow-lg">S</div>
                                   ) : null}
                                   <h4 className="mt-5 font-black text-xl uppercase tracking-tighter leading-none">{formData.shopName}</h4>
                                   <p className="text-[9px] font-black opacity-60 uppercase tracking-[0.2em] mt-2">{formData.shopTagline || 'Enterprise Ecosystem Token'}</p>
                                </div>
                                <div className="text-right">
                                   <div className="text-xl font-black opacity-80 tabular-nums font-mono">#ID-001</div>
                                   <div className="text-[8px] font-black opacity-40 uppercase mt-1 tracking-widest">Master Ledger Identity</div>
                                </div>
                             </div>
                             
                             <div className="flex items-center gap-6">
                                <div className="w-20 h-20 rounded-[28px] bg-white/20 backdrop-blur-xl flex items-center justify-center font-black text-4xl border border-white/20 shadow-xl overflow-hidden">
                                   <div className="w-full h-full bg-slate-400/10 flex items-center justify-center">O</div>
                                </div>
                                <div>
                                   <h5 className="font-black text-2xl leading-none uppercase tracking-tight">System Owner</h5>
                                   <p className="text-[10px] font-black opacity-60 mt-1.5 uppercase tracking-[0.2em]">Authorized: {formData.ownerName || 'UNNAMED'}</p>
                                   {formData.cardDesign.showPoints && (
                                     <div className="flex items-center gap-1.5 mt-3"><Star size={12} fill="currentColor" className="text-amber-300" /><span className="text-[10px] font-black">MASTER LEVEL</span></div>
                                   )}
                                </div>
                                {formData.cardDesign.showQr && (
                                   <div className="ml-auto w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-2 shadow-2xl opacity-80"><QrCode size={40} className="text-slate-900" /></div>
                                )}
                             </div>
                          </div>
                       </div>
                       
                       <div className="mt-12 flex gap-3 w-full max-w-[420px]">
                          <button 
                            onClick={handleDownloadSampleCard}
                            disabled={isExportingCard}
                            className="flex-1 py-5 bg-indigo-600 text-white rounded-[32px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-indigo-700 transition-all active:scale-95"
                          >
                             {isExportingCard ? <RefreshCw size={18} className="animate-spin" /> : <FileDown size={18} />} Export PDF
                          </button>
                          <button 
                            onClick={handlePrintSampleCard}
                            className="flex-1 py-5 bg-white dark:bg-slate-800 text-slate-700 dark:text-white border-2 border-slate-100 dark:border-slate-700 rounded-[32px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-50 transition-all active:scale-95"
                          >
                             <Printer size={18} /> Print Sample
                          </button>
                       </div>
                    </div>
                 </div>
               )}

               {activeTab === 'localization' && (
                 <div className="space-y-12 animate-in slide-in-from-bottom-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                       <section className="space-y-8">
                          <h4 className="text-sm font-black text-indigo-600 uppercase tracking-[0.2em] border-b pb-4 flex items-center gap-3"><Globe size={18}/> Linguistic Configuration</h4>
                          <div>
                             <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1">System Interface Language</label>
                             <div className="grid grid-cols-3 gap-3">
                                {[
                                  {id: 'en', label: 'English'},
                                  {id: 'ps', label: 'پښتو'},
                                  {id: 'dr', label: 'دری'}
                                ].map(lang => (
                                  <button 
                                    key={lang.id}
                                    onClick={() => handleSaveSettings({...formData, language: lang.id as any})}
                                    className={`py-4 rounded-2xl border-4 font-black text-xs transition-all ${formData.language === lang.id ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-lg' : 'border-slate-50 dark:border-slate-800 text-slate-400 hover:border-indigo-200'}`}
                                  >
                                    {lang.label}
                                  </button>
                                ))}
                             </div>
                          </div>
                       </section>

                       <section className="space-y-8">
                          <h4 className="text-sm font-black text-emerald-600 uppercase tracking-[0.2em] border-b pb-4 flex items-center gap-3"><DollarSign size={18}/> Fiscal Parameters</h4>
                          <div className="grid grid-cols-2 gap-6">
                             <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1">Currency Symbol</label>
                                <input 
                                  type="text" 
                                  value={formData.currency} 
                                  onChange={e => setFormData({...formData, currency: e.target.value})}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-emerald-500 rounded-2xl py-4 px-6 font-black text-2xl dark:text-white outline-none" 
                                />
                             </div>
                             <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1">Global Tax Rate (%)</label>
                                <div className="relative">
                                   <Percent className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                                   <input 
                                     type="number" 
                                     value={formData.taxRate} 
                                     onChange={e => setFormData({...formData, taxRate: Number(e.target.value)})}
                                     className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-emerald-500 rounded-2xl py-4 pl-14 pr-6 font-black text-2xl dark:text-white outline-none" 
                                   />
                                </div>
                             </div>
                          </div>
                       </section>

                       <section className="col-span-full space-y-8">
                          <h4 className="text-sm font-black text-indigo-600 uppercase tracking-[0.2em] border-b pb-4 flex items-center gap-3"><Monitor size={18}/> Atmosphere Toggle</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <button 
                               onClick={() => handleSaveSettings({...formData, theme: 'light'})}
                               className={`flex items-center justify-between p-8 rounded-[40px] border-4 transition-all ${formData.theme === 'light' ? 'border-indigo-600 bg-white shadow-2xl' : 'border-slate-50 dark:border-slate-800 opacity-60'}`}
                             >
                                <div className="flex items-center gap-6">
                                   <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500"><Sun size={32}/></div>
                                   <div className="text-left">
                                      <p className="font-black text-lg dark:text-slate-900 uppercase tracking-tighter leading-none">Daylight Matrix</p>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">High-contrast light mode</p>
                                   </div>
                                </div>
                                {formData.theme === 'light' && <CheckCircle2 size={24} className="text-indigo-600" />}
                             </button>

                             <button 
                               onClick={() => handleSaveSettings({...formData, theme: 'dark'})}
                               className={`flex items-center justify-between p-8 rounded-[40px] border-4 transition-all ${formData.theme === 'dark' ? 'border-indigo-600 bg-slate-900 shadow-2xl' : 'border-slate-50 dark:border-slate-800 opacity-60'}`}
                             >
                                <div className="flex items-center gap-6">
                                   <div className="w-16 h-16 bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-400"><Moon size={32}/></div>
                                   <div className="text-left">
                                      <p className="font-black text-lg text-white uppercase tracking-tighter leading-none">Abyssal Terminal</p>
                                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Low-light optimized mode</p>
                                   </div>
                                </div>
                                {formData.theme === 'dark' && <CheckCircle2 size={24} className="text-indigo-600" />}
                             </button>
                          </div>
                       </section>
                    </div>
                 </div>
               )}

               {activeTab === 'loyalty' && (
                 <div className="space-y-12 animate-in slide-in-from-bottom-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                       <section className="space-y-10">
                          <h4 className="text-sm font-black text-amber-500 uppercase tracking-[0.2em] border-b pb-4 flex items-center gap-3"><Coins size={18}/> Points Engine</h4>
                          <div className="p-8 bg-slate-50 dark:bg-slate-950 rounded-[40px] border border-slate-100 dark:border-slate-800 space-y-8">
                             <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1">Points Accrual Step</label>
                                <div className="flex items-center gap-4">
                                   <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl py-4 px-6 font-black text-center text-xs dark:text-white">1 POINT PER</div>
                                   <div className="flex-1 relative">
                                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16}/>
                                      <input 
                                        type="number" 
                                        value={formData.loyaltySettings.pointsPerUnit}
                                        onChange={e => handleUpdateLoyalty({ pointsPerUnit: Number(e.target.value) })}
                                        className="w-full bg-white dark:bg-slate-800 border-2 border-transparent focus:border-amber-500 rounded-2xl py-4 pl-12 pr-4 font-black text-xl dark:text-white outline-none shadow-sm" 
                                      />
                                   </div>
                                </div>
                             </div>
                             <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1">Monetary Worth of 1 Point</label>
                                <div className="relative">
                                   <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16}/>
                                   <input 
                                     type="number" 
                                     step="0.001"
                                     value={formData.loyaltySettings.conversionRate}
                                     onChange={e => handleUpdateLoyalty({ conversionRate: Number(e.target.value) })}
                                     className="w-full bg-white dark:bg-slate-800 border-2 border-transparent focus:border-amber-500 rounded-2xl py-4 pl-12 pr-4 font-black text-xl dark:text-white outline-none shadow-sm" 
                                   />
                                </div>
                             </div>
                          </div>
                       </section>
                    </div>
                 </div>
               )}

               {activeTab === 'security' && (
                 <div className="max-w-4xl mx-auto space-y-12 animate-in slide-in-from-bottom-4">
                    <div className="text-center space-y-4">
                       <div className="w-24 h-24 bg-rose-600 text-white rounded-[40px] flex items-center justify-center mx-auto shadow-2xl shadow-rose-100 dark:shadow-none mb-8">
                          <Lock size={48} strokeWidth={2.5} />
                       </div>
                       <h4 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Security Vault Protocols</h4>
                       <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-relaxed">Infrastructure protection modulation for Manager {formData.ownerName}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                       <section className="space-y-6">
                          <h5 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest border-b pb-4 flex items-center gap-2"><Key size={14}/> PIN Modulation</h5>
                          <div className="space-y-4">
                             <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">Set 6-Digit Registry PIN</label>
                                <div className="relative">
                                  <input 
                                    type={showPin ? "text" : "password"} 
                                    maxLength={6}
                                    value={newPasscode}
                                    onChange={e => setNewPasscode(e.target.value.replace(/\D/g, ''))}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-6 font-black text-2xl tracking-[0.5em] text-center dark:text-white outline-none shadow-inner" 
                                    placeholder="••••••"
                                  />
                                  <button onClick={() => setShowPin(!showPin)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 p-2">{showPin ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
                                </div>
                             </div>
                             <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">Verify Identity Access</label>
                                <input 
                                  type="password" 
                                  maxLength={6}
                                  value={confirmPasscode}
                                  onChange={e => setConfirmPasscode(e.target.value.replace(/\D/g, ''))}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-6 font-black text-2xl tracking-[0.5em] text-center dark:text-white outline-none shadow-inner" 
                                  placeholder="••••••"
                                />
                             </div>
                             <button onClick={handleSaveSecurity} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all">Apply PIN Modulation</button>
                          </div>
                       </section>

                       <section className="space-y-6">
                          <h5 className="text-[11px] font-black text-amber-600 uppercase tracking-widest border-b pb-4 flex items-center gap-2"><HelpCircle size={14}/> Recovery Logic</h5>
                          <div className="space-y-4">
                             <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">Integrity Recovery Question</label>
                                <input 
                                  type="text" 
                                  value={formData.security.securityQuestion || ''} 
                                  onChange={e => setFormData({...formData, security: {...formData.security, securityQuestion: e.target.value}})} 
                                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-6 font-bold text-xs dark:text-white outline-none" 
                                  placeholder="e.g. My first pet's name?" 
                                />
                             </div>
                             <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">Verified Integrity Answer</label>
                                <input 
                                  type="password" 
                                  value={formData.security.securityAnswer || ''} 
                                  onChange={e => setFormData({...formData, security: {...formData.security, securityAnswer: e.target.value}})} 
                                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-6 font-bold text-xs dark:text-white outline-none" 
                                  placeholder="Answer for recovery..." 
                                />
                             </div>
                             <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800">
                                <div className="flex items-center gap-3">
                                   <ShieldAlert size={18} className="text-amber-600"/>
                                   <span className="text-[9px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">Dual-Factor Mode</span>
                                </div>
                                <button 
                                  onClick={() => {
                                    const next = !formData.security.highSecurityMode;
                                    setFormData({...formData, security: {...formData.security, highSecurityMode: next}});
                                    handleSaveSettings({...formData, security: {...formData.security, highSecurityMode: next}});
                                  }}
                                  className={`w-12 h-6 rounded-full relative transition-all ${formData.security.highSecurityMode ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                >
                                   <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.security.highSecurityMode ? 'left-7' : 'left-1'}`} />
                                </button>
                             </div>
                          </div>
                       </section>
                    </div>

                    {/* Master Emergency Section */}
                    <div className="bg-rose-50 dark:bg-rose-950/20 border-4 border-dashed border-rose-200 dark:border-rose-900/50 p-10 rounded-[48px] space-y-8 relative overflow-hidden group">
                       <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                          <div className="w-32 h-32 bg-rose-600 text-white rounded-[32px] flex items-center justify-center shadow-2xl shrink-0">
                             <ShieldAlert size={64} />
                          </div>
                          <div className="flex-1 space-y-4">
                             <div>
                                <h5 className="text-2xl font-black text-rose-600 dark:text-rose-400 uppercase tracking-tighter">Emergency Master Recovery</h5>
                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase leading-relaxed mt-2">In the event of total lockout or forgotten credentials, use this global fail-safe key to bypass standard encryption and restore access to the registry.</p>
                             </div>
                             <div className="flex items-center gap-4">
                                <div className={`px-10 py-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-rose-100 dark:border-rose-800 font-black text-4xl tracking-[0.4em] transition-all duration-500 ${showMasterKey ? 'blur-0 text-rose-600' : 'blur-xl select-none opacity-20'}`}>
                                   660167
                                </div>
                                <button 
                                  onMouseDown={() => setShowMasterKey(true)} 
                                  onMouseUp={() => setShowMasterKey(false)}
                                  onMouseLeave={() => setShowMasterKey(false)}
                                  className="p-5 bg-rose-600 text-white rounded-3xl shadow-xl hover:bg-rose-700 active:scale-95 transition-all"
                                >
                                   <Eye size={24} />
                                </button>
                             </div>
                             <p className="text-[8px] font-black text-rose-400 uppercase tracking-[0.2em] animate-pulse">Warning: Do not share this master key outside authorized management.</p>
                          </div>
                       </div>
                       <div className="absolute -bottom-10 -right-10 w-80 h-80 bg-rose-500/5 blur-[80px] rounded-full group-hover:scale-125 transition-transform duration-700" />
                    </div>

                    <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[40px] border flex items-center justify-between gap-6">
                       <div className="flex items-center gap-5">
                          <div className="w-14 h-14 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm"><Smartphone size={28}/></div>
                          <div>
                             <h5 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">Temporal Autolock Threshold</h5>
                             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Idle time before vault activation (minutes)</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-3">
                          <input 
                            type="number" 
                            min="0" 
                            value={formData.security.autoLockTimeout || 0} 
                            onChange={e => {
                              const next = Number(e.target.value);
                              setFormData({...formData, security: {...formData.security, autoLockTimeout: next}});
                              handleSaveSettings({...formData, security: {...formData.security, autoLockTimeout: next}});
                            }} 
                            className="w-20 bg-white dark:bg-slate-700 border rounded-xl py-3 px-4 font-black text-center dark:text-white outline-none focus:border-indigo-500 shadow-sm" 
                          />
                          <span className="text-[10px] font-black text-slate-400 uppercase">Min</span>
                       </div>
                    </div>
                 </div>
               )}

               {activeTab === 'backup' && (
                 <div className="max-w-4xl mx-auto space-y-12 animate-in slide-in-from-bottom-4">
                    <div className="text-center space-y-4">
                       <div className="w-24 h-24 bg-indigo-600 text-white rounded-[40px] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-100 dark:shadow-none mb-8">
                          <Database size={48} strokeWidth={2.5} />
                       </div>
                       <h4 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Persistence Management</h4>
                       <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-relaxed">Registry snapshotting for {formData.shopName}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="p-10 bg-white dark:bg-slate-800 border-4 border-slate-50 dark:border-slate-700 rounded-[48px] space-y-8 group hover:border-indigo-100 transition-all">
                          <div className="flex items-center gap-5">
                             <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform"><HardDrive size={32}/></div>
                             <div>
                                <h5 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">Manual Snapshot</h5>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Backup proprietary .sa to local device</p>
                             </div>
                          </div>
                          <button onClick={handleExportData} className="w-full py-5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:opacity-90 active:scale-95 transition-all">Generate .sa Archive</button>
                       </div>

                       <div className="p-10 bg-white dark:bg-slate-800 border-4 border-slate-50 dark:border-slate-700 rounded-[48px] space-y-8 group hover:border-emerald-100 transition-all">
                          <div className="flex items-center gap-5">
                             <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform"><UploadCloud size={32}/></div>
                             <div>
                                <h5 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">Archive Restoration</h5>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Import .sa recovery file only</p>
                             </div>
                          </div>
                          <label className="block w-full py-5 bg-emerald-600 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-lg text-center cursor-pointer hover:bg-emerald-700 active:scale-95 transition-all">
                             Locate .sa Archive
                             <input 
                                type="file" 
                                accept=".sa" 
                                className="hidden" 
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (!file.name.toLowerCase().endsWith('.sa')) {
                                      alert("Security Alert: System only accepts proprietary .sa archive files.");
                                      e.target.value = '';
                                      return;
                                    }
                                    const reader = new FileReader();
                                    reader.onload = (e) => {
                                      try {
                                        const restored = JSON.parse(e.target?.result as string);
                                        if (restored.settings && restored.invoices && restored.products) {
                                          if (confirm("Restore Protocol: Overwrite all local information with this archive?")) {
                                            updateState('products', restored.products);
                                            updateState('customers', restored.customers);
                                            updateState('invoices', restored.invoices);
                                            updateState('expenses', restored.expenses || []);
                                            updateState('workers', restored.workers || []);
                                            updateState('loanTransactions', restored.loanTransactions || []);
                                            updateState('settings', restored.settings);
                                            alert("Registry Re-Sychronized Successfully.");
                                            window.location.reload();
                                          }
                                        } else { throw new Error("Invalid structure"); }
                                      } catch(e) { alert("Archive Invalid: Failure in record integrity."); }
                                    };
                                    reader.readAsText(file);
                                  }
                                }} 
                             />
                          </label>
                       </div>
                    </div>
                 </div>
               )}

               {activeTab === 'about' && (
                 <div className="max-w-4xl mx-auto space-y-12 animate-in slide-in-from-bottom-4">
                    <div className="text-center space-y-4">
                       <div className="w-24 h-24 bg-indigo-600 text-white rounded-[40px] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200 dark:shadow-none mb-8">
                          <Cpu size={48} strokeWidth={2.5} />
                       </div>
                       <h4 className="text-3xl font-black dark:text-white uppercase tracking-tighter">System Credits</h4>
                       <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-relaxed">Software Architecture & Technical Development</p>
                    </div>

                    {/* Vercel Deployment Monitoring Module */}
                    <div className="p-8 bg-slate-900 rounded-[48px] border-4 border-slate-800 shadow-2xl relative overflow-hidden group">
                       <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-slate-900 shadow-xl shrink-0 group-hover:scale-110 transition-transform">
                             <CloudLightning size={40} />
                          </div>
                          <div className="flex-1 text-center md:text-left">
                             <div className="flex items-center gap-3 justify-center md:justify-start">
                                <h5 className="text-lg font-black text-white uppercase tracking-tighter">Production Deployment Context</h5>
                                <div className="px-3 py-1 bg-emerald-500 text-white rounded-full text-[8px] font-black uppercase animate-pulse">Live on Edge</div>
                             </div>
                             <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-6">
                                <div>
                                   <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Software Cluster</p>
                                   <p className="text-sm font-black text-indigo-400 uppercase">Sarvari POS v1.2.1</p>
                                </div>
                                <div>
                                   <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Host Node</p>
                                   <p className="text-sm font-black text-white uppercase">Vercel Global</p>
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                   <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Update Mode</p>
                                   <p className="text-sm font-black text-amber-400 uppercase">GitHub CI/CD</p>
                                </div>
                             </div>
                             <div className="mt-8 flex gap-3">
                                <a href="https://vercel.com" target="_blank" className="px-6 py-3 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-50 transition-all">
                                   <Monitor size={14}/> Dashboard
                                </a>
                                <button onClick={() => window.location.reload()} className="px-6 py-3 bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-700 transition-all border border-slate-700">
                                   <RefreshCw size={14}/> Check Updates
                                </button>
                             </div>
                          </div>
                       </div>
                       <Github size={200} className="absolute -bottom-20 -right-20 text-white opacity-[0.03] rotate-12 pointer-events-none" />
                    </div>

                    <div className="bg-white dark:bg-slate-900 border-4 border-slate-50 dark:border-slate-800 rounded-[56px] overflow-hidden p-12 relative group shadow-sm transition-all hover:shadow-2xl">
                       <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
                          <div className="w-40 h-40 bg-indigo-50 dark:bg-indigo-900/30 rounded-[48px] flex items-center justify-center text-indigo-600 shadow-inner group-hover:rotate-6 transition-transform duration-500 shrink-0">
                             <User size={80} strokeWidth={1} />
                          </div>
                          <div className="flex-1 text-center md:text-left space-y-6">
                             <div>
                                <h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-2">Lead Systems Architect</h5>
                                <h3 className="text-4xl font-black dark:text-white uppercase tracking-tighter">En.SefatUllah Sarvari</h3>
                             </div>
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <a href="https://wa.me/93795950136" target="_blank" className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all border border-transparent hover:border-emerald-200">
                                   <div className="p-3 bg-white dark:bg-slate-700 rounded-xl text-emerald-500 shadow-sm"><MessageSquare size={20} /></div>
                                   <div>
                                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">WhatsApp Direct</p>
                                      <p className="text-sm font-black dark:text-white">+93795950136</p>
                                   </div>
                                </a>
                                <a href="mailto:sefatullahsarvari144@gmail.com" className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all border border-transparent hover:border-indigo-200">
                                   <div className="p-3 bg-white dark:bg-slate-700 rounded-xl text-indigo-500 shadow-sm"><Mail size={20} /></div>
                                   <div>
                                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Official Email</p>
                                      <p className="text-sm font-black dark:text-white truncate max-w-[180px]">sefatullahsarvari144@gmail.com</p>
                                   </div>
                                </a>
                             </div>
                          </div>
                       </div>
                       <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full" />
                    </div>

                    <div className="p-8 bg-indigo-50 dark:bg-indigo-900/10 rounded-[40px] border border-indigo-100 dark:border-indigo-800/30 text-center">
                       <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed tracking-widest">Sarvari Seller Pro Terminal • Engineered for Offline-First Efficiency • © 2025 All Rights Reserved</p>
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
                    <CheckCircle2 size={24}/> Finalize Parameter Sychronization
                 </button>
              </footer>
            )}
         </div>
      </div>

      {/* Template Studio Modal */}
      {isTemplateModalOpen && editingTemplate && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[56px] w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col border border-white/10 animate-in zoom-in-95 duration-300">
              <header className="p-8 border-b flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10 shrink-0">
                 <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-[20px] flex items-center justify-center"><FileText size={24}/></div>
                    <div>
                       <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Blueprint Architect</h3>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Layout designer for {formData.shopName}</p>
                    </div>
                 </div>
                 <button onClick={() => setIsTemplateModalOpen(false)} className="p-4 bg-slate-100 dark:bg-slate-800 rounded-3xl text-slate-400 hover:text-rose-500 transition-all active:scale-90"><X size={28}/></button>
              </header>

              <div className="flex-1 overflow-y-auto p-12 custom-scrollbar space-y-10">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <section className="space-y-6">
                       <div>
                          <label className="block text-[11px] font-black text-slate-400 uppercase ml-1 mb-2">Designation Label</label>
                          <input type="text" value={editingTemplate.name} onChange={e => setEditingTemplate({...editingTemplate, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-6 font-black text-lg dark:text-white outline-none" />
                       </div>
                       
                       <label className="block text-[11px] font-black text-slate-400 uppercase ml-1">Base Architecture</label>
                       <div className="grid grid-cols-2 gap-3">
                          {['modern', 'classic', 'minimal', 'thermal', 'receipt'].map(ly => (
                            <button key={ly} onClick={() => setEditingTemplate({...editingTemplate, layout: ly as any})} className={`py-4 rounded-xl border-2 font-black text-[10px] uppercase transition-all ${editingTemplate.layout === ly ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-50 dark:border-slate-800 text-slate-400'}`}>{ly}</button>
                          ))}
                       </div>
                    </section>

                    <section className="space-y-6">
                       <label className="block text-[11px] font-black text-slate-400 uppercase ml-1">Accent Modulation</label>
                       <div className="flex items-center gap-6">
                          <input type="color" value={editingTemplate.brandColor} onChange={e => setEditingTemplate({...editingTemplate, brandColor: e.target.value})} className="w-20 h-20 rounded-2xl cursor-pointer border-none bg-transparent shadow-sm" />
                          <div className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-dashed text-center">
                             <p className="text-[10px] font-black text-slate-400 uppercase">Primary Hue</p>
                             <p className="text-lg font-black dark:text-white font-mono">{editingTemplate.brandColor?.toUpperCase()}</p>
                          </div>
                       </div>

                       <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800 rounded-[32px] border border-slate-100">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center text-indigo-600"><ImageIcon size={18}/></div>
                             <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Logo Visibility</span>
                          </div>
                          <button onClick={() => setEditingTemplate({...editingTemplate, showLogo: !editingTemplate.showLogo})} className={`w-12 h-6 rounded-full relative transition-all ${editingTemplate.showLogo ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                             <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editingTemplate.showLogo ? 'left-7' : 'left-1'}`} />
                          </button>
                       </div>
                    </section>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-10 border-t">
                    <div className="space-y-3">
                       <label className="block text-[11px] font-black text-slate-400 uppercase ml-1">Document Header Message</label>
                       <textarea value={editingTemplate.headerText || ''} onChange={e => setEditingTemplate({...editingTemplate, headerText: e.target.value})} rows={3} className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 font-bold text-xs outline-none focus:ring-4 ring-indigo-500/5 dark:text-white" placeholder="Official Shop Notes..." />
                    </div>
                    <div className="space-y-3">
                       <label className="block text-[11px] font-black text-slate-400 uppercase ml-1">Terminal Footer Note</label>
                       <textarea value={editingTemplate.footerText || ''} onChange={e => setEditingTemplate({...editingTemplate, footerText: e.target.value})} rows={3} className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 font-bold text-xs outline-none focus:ring-4 ring-indigo-500/5 dark:text-white" placeholder="Authorized registry message..." />
                    </div>
                 </div>
              </div>

              <footer className="p-10 border-t bg-white dark:bg-slate-900 flex gap-4 shrink-0">
                 <button onClick={() => setIsTemplateModalOpen(false)} className="flex-1 py-6 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-3xl font-black text-[11px] uppercase tracking-widest">Discard</button>
                 <button onClick={handleSaveTemplate} className="flex-[2] py-6 bg-indigo-600 text-white rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"><CheckCircle2 size={24}/> Commit Layout Blueprint</button>
              </footer>
           </div>
        </div>
      )}
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
      case 'about': return <Info size={32} strokeWidth={2.5}/>;
      default: return <SettingsIcon size={32} strokeWidth={2.5}/>;
   }
};

export default Settings;