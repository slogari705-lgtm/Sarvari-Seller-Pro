
import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ShieldCheck, Cpu, Key, ArrowRight, UserCheck } from 'lucide-react';
import { AppState, User as UserType } from '../types';

interface Props {
  state: AppState;
  onLogin: (user: UserType) => void;
}

const Login: React.FC<Props> = ({ state, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSetup, setIsSetup] = useState(state.users.length === 0);

  // For first-time setup
  const [setupData, setSetupData] = useState({ name: '', username: '', password: '', confirm: '' });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = state.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.isActive);
    
    // In a real offline app, we'd use Web Crypto API to hash and compare
    // For this implementation, we compare against a simple hash or stored value
    if (user && user.passwordHash === password) {
       onLogin(user);
    } else {
       setError('Identity verification failed. Invalid credentials.');
       setTimeout(() => setError(''), 3000);
    }
  };

  const handleSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (setupData.password !== setupData.confirm) return setError('Passwords mismatch');
    
    const adminUser: UserType = {
      id: 'admin-01',
      username: setupData.username,
      passwordHash: setupData.password, // Store directly for simple offline proof-of-concept
      role: 'admin',
      name: setupData.name,
      isActive: true,
      lastLogin: new Date().toISOString()
    };
    onLogin(adminUser);
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-slate-950 flex items-center justify-center p-6 overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      
      <div className="w-full max-w-[440px] relative z-10">
        <div className="bg-slate-900/50 backdrop-blur-3xl border border-white/10 rounded-[48px] p-10 shadow-2xl shadow-black/50">
          
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-indigo-600 rounded-[28px] mx-auto mb-6 flex items-center justify-center text-white shadow-2xl shadow-indigo-500/20 relative group">
              <Cpu size={40} className="group-hover:rotate-90 transition-transform duration-700" />
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 p-1.5 rounded-xl border-4 border-slate-900 shadow-lg">
                <ShieldCheck size={16} className="text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">{state.settings.shopName}</h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">
              {isSetup ? 'Initial Systems Initialization' : 'Proprietary Auth Terminal'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center animate-in zoom-in duration-300">
               <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest">{error}</p>
            </div>
          )}

          {isSetup ? (
            <form onSubmit={handleSetup} className="space-y-5">
               <div className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input required type="text" placeholder="Your Legal Name" value={setupData.name} onChange={e => setSetupData({...setupData, name: e.target.value})} className="w-full bg-slate-800/50 border border-white/5 focus:border-indigo-500 rounded-2xl py-4 pl-14 pr-6 text-white font-bold outline-none transition-all" />
                  </div>
                  <div className="relative">
                    <Cpu className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input required type="text" placeholder="System Username" value={setupData.username} onChange={e => setSetupData({...setupData, username: e.target.value})} className="w-full bg-slate-800/50 border border-white/5 focus:border-indigo-500 rounded-2xl py-4 pl-14 pr-6 text-white font-bold outline-none transition-all" />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input required type="password" placeholder="Master Key" value={setupData.password} onChange={e => setSetupData({...setupData, password: e.target.value})} className="w-full bg-slate-800/50 border border-white/5 focus:border-indigo-500 rounded-2xl py-4 pl-14 pr-6 text-white font-bold outline-none transition-all" />
                  </div>
                  <div className="relative">
                    <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input required type="password" placeholder="Confirm Key" value={setupData.confirm} onChange={e => setSetupData({...setupData, confirm: e.target.value})} className="w-full bg-slate-800/50 border border-white/5 focus:border-indigo-500 rounded-2xl py-4 pl-14 pr-6 text-white font-bold outline-none transition-all" />
                  </div>
               </div>
               <button type="submit" className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-3 active:scale-95 mt-4">
                 Initialize Admin <ArrowRight size={18} strokeWidth={3} />
               </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div className="group relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors">
                    <User size={20} />
                  </div>
                  <input 
                    type="text" 
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="IDENT-ID"
                    className="w-full bg-slate-800/50 border border-white/5 focus:border-indigo-500 rounded-3xl py-5 pl-14 pr-6 text-white font-black text-sm uppercase outline-none transition-all placeholder:text-slate-600"
                  />
                </div>

                <div className="group relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors">
                    <Lock size={20} />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="PASS-KEY"
                    className="w-full bg-slate-800/50 border border-white/5 focus:border-indigo-500 rounded-3xl py-5 pl-14 pr-14 text-white font-black text-sm outline-none transition-all placeholder:text-slate-600"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between px-2">
                 <label className="flex items-center gap-3 cursor-pointer">
                    <div className="w-5 h-5 bg-slate-800 border border-white/10 rounded flex items-center justify-center">
                       <div className="w-2.5 h-2.5 bg-indigo-500 rounded-sm" />
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Persist Node</span>
                 </label>
                 <button type="button" className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300">Recover Key</button>
              </div>

              <button 
                type="submit"
                className="w-full py-5 bg-white text-slate-950 hover:bg-indigo-50 rounded-[32px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl transition-all flex items-center justify-center gap-4 active:scale-95 mt-4"
              >
                Access Terminal <UserCheck size={20} strokeWidth={3} />
              </button>
            </form>
          )}

          <div className="mt-12 text-center">
             <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.2em]">Offline Vault Integrated</span>
             </div>
          </div>
        </div>
        
        <p className="text-center mt-8 text-slate-600 font-bold text-[9px] uppercase tracking-[0.4em]">Powered by Sarvari Seller Pro 2025</p>
      </div>
    </div>
  );
};

export default Login;
