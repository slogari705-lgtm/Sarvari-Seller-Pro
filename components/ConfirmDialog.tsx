
import React from 'react';
import { X, AlertTriangle, Info, Trash2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info' | 'warning';
}

const ConfirmDialog: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirm Action", 
  cancelText = "Discard",
  type = 'danger' 
}) => {
  if (!isOpen) return null;

  const themes = {
    danger: {
      bg: 'bg-rose-50 dark:bg-rose-950/20',
      icon: <Trash2 className="text-rose-600" size={28} />,
      btn: 'bg-rose-600 hover:bg-rose-700 shadow-rose-100',
      border: 'border-rose-100 dark:border-rose-900/50'
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      icon: <AlertTriangle className="text-amber-600" size={28} />,
      btn: 'bg-amber-600 hover:bg-amber-700 shadow-amber-100',
      border: 'border-amber-100 dark:border-amber-900/50'
    },
    info: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/20',
      icon: <Info className="text-indigo-600" size={28} />,
      btn: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100',
      border: 'border-indigo-100 dark:border-indigo-900/50'
    }
  };

  const theme = themes[type];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-sm shadow-2xl relative animate-in zoom-in duration-300 border border-white/10 overflow-hidden">
        <div className={`p-8 ${theme.bg} border-b ${theme.border} flex justify-center`}>
          <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg">
            {theme.icon}
          </div>
        </div>
        
        <div className="p-8 text-center">
          <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter mb-2">{title}</h3>
          <p className="text-sm font-bold text-slate-400 dark:text-slate-500 leading-relaxed uppercase tracking-wide">
            {message}
          </p>
        </div>

        <div className="p-8 pt-0 grid grid-cols-2 gap-3">
          <button 
            onClick={onClose}
            className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-200 transition-all active:scale-95"
          >
            {cancelText}
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }}
            className={`py-4 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 ${theme.btn}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
