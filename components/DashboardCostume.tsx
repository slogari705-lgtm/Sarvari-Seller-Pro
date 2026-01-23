
import React, { useState } from 'react';
import { Layout, Check, Shield, TrendingUp, ShoppingBag, Scale, Activity, Save, Sparkles } from 'lucide-react';
import { AppState, View } from '../types';

interface Props {
  state: AppState;
  setCurrentView: (view: View) => void;
}

const DashboardCostume: React.FC<Props> = ({ state, setCurrentView }) => {
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>(() => {
    const saved = localStorage.getItem('dashboard_costume');
    return saved ? JSON.parse(saved) : ['totalSales', 'orders', 'totalDebt', 'netProfit'];
  });

  const toggleWidget = (id: string) => {
    setVisibleWidgets(prev => 
      prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    localStorage.setItem('dashboard_costume', JSON.stringify(visibleWidgets));
    // Dispatch storage event manually for same-tab updates
    window.dispatchEvent(new Event('storage'));
    setCurrentView('dashboard');
  };

  const widgetOptions = [
    { id: 'totalSales', label: 'Total Sales Revenue', icon: TrendingUp, desc: 'Display total gross income collected from transactions.' },
    { id: 'orders', label: 'Transaction Count', icon: ShoppingBag, desc: 'Count of completed sales recorded in database.' },
    { id: 'totalDebt', label: 'Outstanding Debt', icon: Scale, desc: 'Total credit amount owed by active customers.' },
    { id: 'netProfit', label: 'Net Business Profit', icon: Activity, desc: 'Real profit after inventory cost and overhead expenses.' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
      <div className="text-center space-y-4">
        <div className="w-24 h-24 bg-indigo-600 text-white rounded-[40px] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200 dark:shadow-none mb-8 relative group">
          <Layout size={48} />
          <div className="absolute -top-2 -right-2 bg-amber-400 text-white p-2 rounded-2xl shadow-lg animate-pulse">
             <Sparkles size={16} strokeWidth={3} />
          </div>
        </div>
        <h2 className="text-5xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">Workspace Designer</h2>
        <p className="text-slate-400 dark:text-slate-500 font-bold text-sm uppercase tracking-[0.2em]">Curate your dashboard for peak operational efficiency</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {widgetOptions.map((opt) => {
          const isActive = visibleWidgets.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => toggleWidget(opt.id)}
              className={`flex flex-col p-8 rounded-[48px] border-4 transition-all text-left relative group overflow-hidden ${
                isActive 
                  ? 'bg-white dark:bg-slate-900 border-indigo-600 shadow-2xl shadow-indigo-100 dark:shadow-none' 
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 opacity-60 grayscale hover:grayscale-0 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between mb-6 w-full">
                 <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center transition-all ${isActive ? 'bg-indigo-600 text-white shadow-xl rotate-3' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                   <opt.icon size={32} strokeWidth={2.5} />
                 </div>
                 <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${isActive ? 'bg-indigo-600 border-indigo-600 text-white scale-110 shadow-lg' : 'border-slate-300 dark:border-slate-700 text-transparent'}`}>
                   <Check size={20} strokeWidth={4} />
                 </div>
              </div>
              
              <div className="relative z-10">
                <h4 className="font-black text-xl dark:text-white uppercase tracking-tight mb-2">{opt.label}</h4>
                <p className="text-sm font-bold text-slate-400 leading-relaxed">{opt.desc}</p>
              </div>

              {isActive && <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl"></div>}
            </button>
          );
        })}
      </div>

      <div className="pt-10 flex flex-col sm:flex-row gap-6">
        <button 
          onClick={() => setCurrentView('dashboard')}
          className="flex-1 py-6 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black rounded-[32px] uppercase tracking-[0.2em] text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
        >
          Discard Changes
        </button>
        <button 
          onClick={handleSave}
          className="flex-[2] py-6 bg-indigo-600 text-white font-black rounded-[32px] shadow-2xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-4 uppercase tracking-[0.2em] text-xs"
        >
          <Save size={20} strokeWidth={3} />
          Confirm Architecture
        </button>
      </div>

      <div className="p-10 bg-indigo-50 dark:bg-indigo-950/20 rounded-[48px] border border-indigo-100 dark:border-indigo-900/30 flex items-start gap-6 relative overflow-hidden">
        <Shield className="text-indigo-600 shrink-0 mt-1" size={32} />
        <div className="relative z-10">
          <h5 className="font-black text-indigo-900 dark:text-indigo-200 uppercase text-xs tracking-widest mb-2">Privacy & Sync Note</h5>
          <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 leading-relaxed opacity-80 uppercase tracking-wide">
            Your workspace configuration is saved locally on this terminal. Changes here do not delete any business data; they only modify the visual layout for this device.
          </p>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full blur-2xl"></div>
      </div>
    </div>
  );
};

export default DashboardCostume;
