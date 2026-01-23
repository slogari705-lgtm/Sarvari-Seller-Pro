
import React, { useState, useRef, useEffect } from 'react';
import { 
  Store, 
  Coins, 
  Percent, 
  Save, 
  Bell, 
  Lock, 
  Database,
  CloudUpload,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  LayoutList,
  Palette,
  FileText,
  Languages,
  Moon,
  Sun,
  Briefcase,
  Type,
  Phone,
  Mail,
  MapPin,
  Globe,
  RefreshCcw,
  ShieldCheck,
  History,
  User,
  ArrowRight,
  Fingerprint,
  Receipt,
  ScrollText
} from 'lucide-react';
import { AppState, Language, Theme } from '../types';
import { translations } from '../translations';

interface Props {
  state: AppState;
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
}

type SettingsTab = 'profile' | 'branding' | 'localization' | 'backup';

const Settings: React.FC<Props> = ({ state, updateState }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [formData, setFormData] = useState(state.settings);
  const [showSaved, setShowSaved] = useState(false);
  const [lastLocalSave, setLastLocalSave] = useState<string>(new Date().toLocaleTimeString());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = translations[state.settings.language || 'en'];

  // Sync formData if state.settings changes externally (e.g., header theme toggle)
  useEffect(() => {
    setFormData(state.settings);
  }, [state.settings]);

  useEffect(() => {
    const timer = setInterval(() => {
      setLastLocalSave(new Date().toLocaleTimeString());
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleSave = () => {
    updateState('settings', formData);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 3000);
  };

  const handleInstantSetting = <K extends keyof AppState['settings']>(key: K, value: AppState['settings'][K]) => {
    const newSettings = { ...formData, [key]: value };
    setFormData(newSettings);
    updateState('settings', newSettings);
  };

  const handleBackup = () => {
    try {
      const dataStr = JSON.stringify(state, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = `sarvari_backup_${new Date().toISOString().split('T')[0]}_${new Date().getTime()}.SA`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (err) {
      alert("Failed to generate backup file.");
    }
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!window.confirm(t.dataRestoreConfirm)) {
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedState = JSON.parse(content) as AppState;
        
        if (importedState.products && importedState.settings && importedState.invoices) {
          updateState('products', importedState.products);
          updateState('customers', importedState.customers || []);
          updateState('invoices', importedState.invoices);
          updateState('expenses', importedState.expenses || []);
          updateState('templates', importedState.templates || state.templates);
          updateState('loanTransactions', importedState.loanTransactions || []);
          updateState('settings', importedState.settings);
          setFormData(importedState.settings);
          alert(t.restoreSuccess);
        } else {
          throw new Error("Invalid file format");
        }
      } catch (err) {
        alert(t.restoreFailed + " Please ensure you are using a valid .SA backup file.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const currencyPresets = [
    { symbol: '$', label: 'USD' },
    { symbol: '؋', label: 'AFN' },
    { symbol: '€', label: 'EUR' },
    { symbol: '£', label: 'GBP' },
    { symbol: '₹', label: 'INR' },
    { symbol: '¥', label: 'JPY' },
    { symbol: 'SR', label: 'SAR' },
    { symbol: 'AED', label: 'AED' },
  ];

  const templates = [
    { id: 'modern', label: t.modernStudio, icon: LayoutList },
    { id: 'minimal', label: t.thermalSlim, icon: FileText },
    { id: 'classic', label: t.corporate, icon: Briefcase },
    { id: 'thermal', label: 'Classic Receipt', icon: Receipt },
    { id: 'receipt', label: 'Modern Receipt', icon: ScrollText }
  ];

  return (
    <div className="max-w-6xl space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight uppercase">{t.settings}</h3>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Configure your professional selling environment</p>
        </div>
        {showSaved && (
          <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-6 py-3 rounded-2xl font-black text-sm animate-in fade-in slide-in-from-right-4 border border-emerald-100 dark:border-emerald-500/20 shadow-xl shadow-emerald-100 dark:shadow-none">
            <CheckCircle2 size={18}/> {t.invoiceSuccess}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <div className="space-y-3">
          <nav className="space-y-2 sticky top-24">
            {[
              { id: 'profile', icon: Store, label: t.shopProfile },
              { id: 'localization', icon: Languages, label: t.localization },
              { id: 'branding', icon: Palette, label: t.branding },
              { id: 'backup', icon: Database, label: t.backup }
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-[20px] font-black text-xs uppercase tracking-widest transition-all text-left border ${
                  activeTab === tab.id 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xl shadow-indigo-200 dark:shadow-none translate-x-2' 
                    : 'text-slate-400 border-transparent hover:bg-white dark:hover:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-800'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="lg:col-span-3">
          {activeTab === 'profile' ? (
            <div className="bg-white dark:bg-slate-900 p-8 lg:p-12 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-100 dark:shadow-none space-y-10 animate-in fade-in slide-in-from-bottom-4">
              <section className="space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Store size={14} /> {t.shopProfile}
                </h4>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-3 ml-1">{t.shopName}</label>
                    <div className="relative">
                      <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                      <input 
                        type="text" 
                        value={formData.shopName}
                        onChange={(e) => setFormData({...formData, shopName: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-6 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold dark:text-white"
                      />
                    </div>
                  </div>

                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mt-4">Professional Business Credentials</h4>
                   
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                         <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-3 ml-1">Business ID / Tax ID</label>
                         <div className="relative">
                            <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input 
                              type="text" 
                              value={formData.businessId || ''}
                              onChange={(e) => setFormData({...formData, businessId: e.target.value})}
                              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-6 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold dark:text-white text-sm"
                              placeholder="e.g. VAT-12345678"
                            />
                         </div>
                      </div>
                      <div>
                         <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-3 ml-1">Website URL</label>
                         <div className="relative">
                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input 
                              type="text" 
                              value={formData.shopWebsite || ''}
                              onChange={(e) => setFormData({...formData, shopWebsite: e.target.value})}
                              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-6 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold dark:text-white text-sm"
                              placeholder="www.myshop.com"
                            />
                         </div>
                      </div>
                   </div>

                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mt-4">Contact Information</h4>
                   
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                         <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-3 ml-1">Phone Number</label>
                         <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input 
                              type="text" 
                              value={formData.shopPhone || ''}
                              onChange={(e) => setFormData({...formData, shopPhone: e.target.value})}
                              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-6 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold dark:text-white text-sm"
                              placeholder="+1 234 567 890"
                            />
                         </div>
                      </div>
                      <div>
                         <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-3 ml-1">Email Address</label>
                         <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input 
                              type="text" 
                              value={formData.shopEmail || ''}
                              onChange={(e) => setFormData({...formData, shopEmail: e.target.value})}
                              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-6 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold dark:text-white text-sm"
                              placeholder="contact@shop.com"
                            />
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 gap-6">
                      <div>
                         <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-3 ml-1">Physical Address</label>
                         <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input 
                              type="text" 
                              value={formData.shopAddress || ''}
                              onChange={(e) => setFormData({...formData, shopAddress: e.target.value})}
                              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-6 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold dark:text-white text-sm"
                              placeholder="123 Market St, City"
                            />
                         </div>
                      </div>
                   </div>

                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mt-4">POS Terminal Configuration</h4>
                   <div className="grid grid-cols-1 gap-6">
                      <div>
                         <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-3 ml-1">Default Terminal Customer</label>
                         <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <select 
                              value={formData.defaultCustomerId || ''}
                              onChange={(e) => setFormData({...formData, defaultCustomerId: e.target.value})}
                              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-6 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold dark:text-white text-sm appearance-none"
                            >
                               <option value="">{t.walkInCustomer} (None)</option>
                               {state.customers.map(c => (
                                 <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                               ))}
                            </select>
                         </div>
                      </div>
                   </div>

                </div>
              </section>

              <section className="space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Coins size={14} /> {t.financialSummary}
                </h4>
                <div className="grid grid-cols-1 gap-8">
                  <div>
                    <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-4 ml-1">
                      {t.currencySymbol}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                      {currencyPresets.map((curr) => (
                        <button
                          key={curr.symbol}
                          onClick={() => setFormData({...formData, currency: curr.symbol})}
                          className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all group ${
                            formData.currency === curr.symbol
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-300'
                          }`}
                        >
                          <span className={`text-2xl font-black mb-1 ${formData.currency === curr.symbol ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
                            {curr.symbol}
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-widest opacity-60`}>
                            {curr.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-3 ml-1">
                      {t.taxRate} (%)
                    </label>
                    <div className="relative">
                      <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                      <input 
                        type="number" 
                        value={formData.taxRate}
                        onChange={(e) => setFormData({...formData, taxRate: Number(e.target.value)})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-6 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-black dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </section>

              <div className="pt-10 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button 
                  onClick={handleSave}
                  className="flex items-center gap-3 px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all active:scale-[0.98] shadow-2xl shadow-indigo-100 dark:shadow-none uppercase tracking-widest text-xs"
                >
                  <Save size={20} />
                  {t.save}
                </button>
              </div>
            </div>
          ) : activeTab === 'localization' ? (
            <div className="bg-white dark:bg-slate-900 p-8 lg:p-12 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-100 dark:shadow-none space-y-10 animate-in fade-in slide-in-from-bottom-4">
              <section className="space-y-8">
                <div>
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                    <Languages size={14} /> {t.language}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { id: 'en', label: 'English', native: 'English' },
                      { id: 'ps', label: 'Pashto', native: 'پښتو' },
                      { id: 'dr', label: 'Dari', native: 'دری' }
                    ].map(lang => (
                      <button
                        key={lang.id}
                        onClick={() => handleInstantSetting('language', lang.id as Language)}
                        className={`p-6 rounded-[32px] border-4 transition-all text-center flex flex-col items-center gap-2 group ${
                          formData.language === lang.id 
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xl shadow-indigo-100 dark:shadow-none' 
                            : 'bg-slate-50 dark:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                        }`}
                      >
                        <span className="text-xl font-black">{lang.native}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest opacity-60`}>{lang.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-10 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                    {formData.theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />} 
                    {t.appearance}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {[
                      { id: 'light', label: t.light, icon: Sun },
                      { id: 'dark', label: t.dark, icon: Moon }
                    ].map(theme => (
                      <button
                        key={theme.id}
                        onClick={() => handleInstantSetting('theme', theme.id as Theme)}
                        className={`p-8 rounded-[32px] border-4 transition-all text-left flex items-center justify-between group ${
                          formData.theme === theme.id 
                            ? 'bg-slate-900 border-slate-900 text-white shadow-2xl' 
                            : 'bg-slate-50 dark:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-4 rounded-2xl ${formData.theme === theme.id ? 'bg-white/10 text-white' : 'bg-white dark:bg-slate-700 text-slate-400 shadow-sm'}`}>
                             <theme.icon size={28} />
                          </div>
                          <span className="text-lg font-black">{theme.label}</span>
                        </div>
                        {formData.theme === theme.id && <CheckCircle2 size={24} className="text-indigo-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          ) : activeTab === 'branding' ? (
            <div className="bg-white dark:bg-slate-900 p-8 lg:p-12 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-100 dark:shadow-none space-y-10 animate-in fade-in slide-in-from-bottom-4">
              <section className="space-y-10">
                <div>
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{t.branding}</h4>
                   <div className="flex flex-wrap gap-4">
                    {['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#3b82f6', '#1e293b'].map(color => (
                      <button
                        key={color}
                        onClick={() => setFormData({...formData, brandColor: color})}
                        className={`w-14 h-14 rounded-3xl border-8 transition-all relative ${formData.brandColor === color ? 'border-white dark:border-slate-800 scale-110 shadow-2xl ring-4 ring-indigo-500' : 'border-transparent opacity-50 hover:opacity-100'}`}
                        style={{ backgroundColor: color }}
                      >
                         {formData.brandColor === color && <CheckCircle2 size={16} className="absolute -top-2 -right-2 bg-white text-indigo-600 rounded-full" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{t.advancedBuilder}</h4>
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {templates.map(template => (
                      <button
                        key={template.id}
                        onClick={() => setFormData({...formData, invoiceTemplate: template.id as any})}
                        className={`p-6 rounded-[32px] border-4 transition-all text-left group ${formData.invoiceTemplate === template.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xl' : 'bg-slate-50 dark:bg-slate-800 border-transparent'}`}
                      >
                         <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${formData.invoiceTemplate === template.id ? 'bg-white/20' : 'bg-white dark:bg-slate-700 shadow-sm text-slate-400'}`}>
                           <template.icon size={24} />
                         </div>
                         <p className="font-black text-sm">{template.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <div className="pt-10 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button onClick={handleSave} className="px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-2xl shadow-indigo-100 dark:shadow-none uppercase tracking-widest text-xs">
                   {t.updateBranding}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 p-8 lg:p-12 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-100 dark:shadow-none space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-2xl font-black dark:text-white uppercase tracking-tighter">{t.backup} & Restore</h4>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Manage your business data snapshots</p>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-full">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active Protection</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div 
                    onClick={handleBackup}
                    className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[32px] border-2 border-transparent hover:border-indigo-500 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer group shadow-sm hover:shadow-2xl"
                  >
                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Download size={32} />
                    </div>
                    <h5 className="text-lg font-black dark:text-white uppercase tracking-tight">Download Local Backup</h5>
                    <p className="text-xs font-medium text-slate-400 mt-2 leading-relaxed">Securely export your entire database including products, customers, and financial history to a .SA file.</p>
                    <div className="mt-8 flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest group-hover:gap-4 transition-all">
                      Generate File <ArrowRight size={14} />
                    </div>
                  </div>

                  <div 
                    onClick={handleRestoreClick}
                    className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[32px] border-2 border-transparent hover:border-amber-500 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer group shadow-sm hover:shadow-2xl"
                  >
                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/20 text-amber-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <UploadCloud size={32} />
                    </div>
                    <h5 className="text-lg font-black dark:text-white uppercase tracking-tight">Restore Architecture</h5>
                    <p className="text-xs font-medium text-slate-400 mt-2 leading-relaxed">Import a previous state from a .SA file. Warning: This action will replace all current data with the backup contents.</p>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".SA,.json" onChange={handleFileChange} />
                    <div className="mt-8 flex items-center gap-2 text-[10px] font-black text-amber-600 uppercase tracking-widest group-hover:gap-4 transition-all">
                      Select File <ArrowRight size={14} />
                    </div>
                  </div>
                </div>

                <div className="mt-10 p-6 bg-slate-900 rounded-3xl text-white flex flex-col sm:flex-row items-center justify-between gap-4 overflow-hidden relative">
                   <div className="flex items-center gap-4 relative z-10">
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center animate-pulse">
                         <RefreshCcw size={20} className="text-indigo-400" />
                      </div>
                      <div>
                         <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-0.5">Automated Persistence</p>
                         <h6 className="text-sm font-bold">Local Storage Sync Engine</h6>
                      </div>
                   </div>
                   <div className="flex flex-col items-center sm:items-end relative z-10">
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase">
                         <History size={12} /> Last Sync: <span className="text-white">{lastLocalSave}</span>
                      </div>
                      <p className="text-[9px] text-slate-500 font-bold mt-1 uppercase">Backup heartbeat active every 3 seconds</p>
                   </div>
                   <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full"></div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;