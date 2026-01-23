
import React, { useState, useEffect } from 'react';
import { Layout, Check, Shield, TrendingUp, ShoppingBag, Scale, Activity, Save } from 'lucide-react';
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
    setCurrentView('dashboard');
  };

  const widgetOptions = [
    { id: 'totalSales', label: 'Total Sales Revenue', icon: TrendingUp, desc: 'Shows the gross income from all invoices.' },
    { id: 'orders', label: 'Transaction Count', icon: ShoppingBag, desc: 'Shows the number of completed sales.' },
    { id: 'totalDebt', label: 'Outstanding Debt', icon: Scale, desc: 'Shows total money owed by customers.' },
    { id: 'netProfit', label: 'Net Business Profit', icon: Activity, desc: 'Shows profit after subtracting expenses.' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in duration-500">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-indigo-600 text-white rounded-[32px] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200 dark:shadow-none">
          <Layout size={40} />
        </div>
        <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">Dashboard Costume</h2>
        <p className="text-slate-500 dark:text-slate-400 font-bold text-sm uppercase tracking-widest">Tailor your workspace to your business needs</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {widgetOptions.map((opt) => {
          const isActive = visibleWidgets.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => toggleWidget(opt.id)}
              className={`flex items-center gap-6 p-8 rounded-[32px] border-4 transition-all text-left group ${
                isActive 
                  ? 'bg-white dark:bg-slate-900 border-indigo-600 shadow-xl' 
                  : 'bg-slate-50 dark:bg-slate-800 border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                <opt.icon size={28} />
              </div>
              <div className="flex-1">
                <h4 className="font-black text-lg dark:text-white uppercase tracking-tight">{opt.label}</h4>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{opt.desc}</p>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${isActive ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 dark:border-slate-700'}`}>
                {isActive && <Check size={20} strokeWidth={3} />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="pt-10 flex flex-col sm:flex-row gap-4">
        <button 
          onClick={() => setCurrentView('dashboard')}
          className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-[24px] uppercase tracking-widest text-xs"
        >
          Cancel
        </button>
        <button 
          onClick={handleSave}
          className="flex-[2] py-5 bg-indigo-600 text-white font-black rounded-[24px] shadow-2xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
        >
          <Save size={18} />
          Save Costume & Preview
        </button>
      </div>

      <div className="p-8 bg-amber-50 dark:bg-amber-900/20 rounded-[32px] border border-amber-100 dark:border-amber-800 flex items-start gap-4">
        <Shield className="text-amber-600 shrink-0" size={24} />
        <div>
          <h5 className="font-black text-amber-900 dark:text-amber-200 uppercase text-xs tracking-widest mb-1">Privacy Notice</h5>
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400 leading-relaxed">
            Changing these settings only affects the display on this device. Your sales data is always stored safely regardless of what you choose to hide or show here.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardCostume;
