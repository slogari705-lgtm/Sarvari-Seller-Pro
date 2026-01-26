import React, { useState, useEffect } from 'react';
import { Shield, Delete, Lock, Unlock, HelpCircle, ShieldAlert, Timer, ShieldCheck, Fingerprint, RefreshCw, ArrowLeft } from 'lucide-react';

interface Props {
  correctPasscode: string;
  securityQuestion?: string;
  securityAnswer?: string;
  highSecurityMode?: boolean;
  onUnlock: () => void;
  shopName: string;
}

const LockScreen: React.FC<Props> = ({ 
  correctPasscode, 
  securityQuestion, 
  securityAnswer, 
  highSecurityMode = false,
  onUnlock, 
  shopName 
}) => {
  const [pin, setPin] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [error, setError] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Stages: 'pin' -> 'question'
  const [stage, setStage] = useState<'pin' | 'question'>('pin');
  const [answerInput, setAnswerInput] = useState('');
  const [questionError, setQuestionError] = useState(false);
  const [wasForgotTriggered, setWasForgotTriggered] = useState(false);

  /**
   * EMERGENCY MASTER RECOVERY KEY
   * This PIN is hardcoded as a fail-safe override for the system.
   */
  const MASTER_PIN = '660167';

  useEffect(() => {
    let interval: any;
    if (lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  const handleKeyPress = (num: string) => {
    // Block input only if we are currently animating the unlock transition
    if (isAnimating) return;
    
    if (pin.length < 6) {
      setPin(prev => prev + num);
      setError(false);
    }
  };

  const handleDelete = () => {
    if (isAnimating) return;
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const handleFailedAttempt = () => {
    const newAttempts = failedAttempts + 1;
    setFailedAttempts(newAttempts);
    setError(true);
    setPin('');
    
    if (newAttempts >= 5) {
      setLockoutTimer(30); 
    }
    
    setTimeout(() => setError(false), 500);
  };

  const handleQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTimer > 0 || isAnimating) return;

    if (securityAnswer && answerInput.toLowerCase().trim() === securityAnswer.toLowerCase().trim()) {
      setIsAnimating(true);
      setTimeout(() => onUnlock(), 500);
    } else {
      setQuestionError(true);
      setAnswerInput('');
      handleFailedAttempt();
      setTimeout(() => setQuestionError(false), 2000);
    }
  };

  const handleForgotPIN = () => {
    if (securityQuestion && securityAnswer) {
      setWasForgotTriggered(true);
      setStage('question');
      setPin('');
    } else {
      alert("No recovery question configured. Please use the Emergency Master PIN (660167).");
    }
  };

  /**
   * PIN VALIDATION LOGIC
   * Priority 1: Master PIN (Bypass all)
   * Priority 2: Standard PIN (Check lockout and high-security mode)
   */
  useEffect(() => {
    if (stage === 'pin' && pin.length === 6) {
      // 1. Check for Emergency Master PIN (Overwrites lockout and stage logic)
      if (pin === MASTER_PIN) {
        setIsAnimating(true);
        setTimeout(() => onUnlock(), 500);
        return;
      }

      // 2. Prevent standard pin validation during lockout
      if (lockoutTimer > 0) {
        setPin('');
        setError(true);
        setTimeout(() => setError(false), 500);
        return;
      }

      // 3. Standard Passcode Logic
      if (pin === correctPasscode) {
        if (highSecurityMode && securityQuestion && securityAnswer) {
          setStage('question');
          setPin('');
        } else {
          setIsAnimating(true);
          setTimeout(() => onUnlock(), 500);
        }
      } else {
        handleFailedAttempt();
      }
    }
  }, [pin, correctPasscode, lockoutTimer, stage, highSecurityMode, securityQuestion, securityAnswer]);

  const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'];

  return (
    <div className={`fixed inset-0 z-[2000] bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 transition-transform duration-700 ease-in-out ${isAnimating ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
      <div className="max-w-md w-full space-y-12 animate-in fade-in duration-500">
        
        {/* Visual Security Core */}
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <div className={`w-28 h-28 mx-auto rounded-[40px] flex items-center justify-center transition-all duration-500 shadow-2xl ${
              lockoutTimer > 0 ? 'bg-rose-600 animate-pulse' : 
              error || questionError ? 'bg-rose-500 animate-shake' : 
              stage === 'question' ? 'bg-amber-500' : 'bg-indigo-600'
            }`}>
              {lockoutTimer > 0 ? <ShieldAlert className="text-white" size={48} /> :
               stage === 'pin' ? <Lock className="text-white" size={48} /> : 
               <Fingerprint className="text-white" size={48} />}
            </div>
            <div className={`absolute -top-3 -right-3 p-2.5 rounded-2xl shadow-xl border-4 border-slate-50 dark:border-slate-950 transition-colors ${highSecurityMode ? 'bg-emerald-500' : 'bg-amber-400'}`}>
              {highSecurityMode ? <ShieldCheck size={20} className="text-white" /> : <Shield size={20} className="text-white" />}
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">{shopName}</h2>
            <div className="flex flex-col items-center gap-1 mt-2">
              <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]">
                {lockoutTimer > 0 ? 'Security Lockout - Wait for timer or use Master PIN' : 
                 stage === 'question' ? 'Identity Verification' :
                 highSecurityMode ? 'Dual-Factor Auth Required' : 'Authentication Required'}
              </p>
              {failedAttempts > 0 && lockoutTimer === 0 && (
                <span className="text-[9px] font-black text-rose-500 uppercase px-3 py-1 bg-rose-50 dark:bg-rose-900/20 rounded-full mt-2">
                  Attempt {failedAttempts} / 5
                </span>
              )}
            </div>
          </div>
        </div>

        {stage === 'pin' ? (
          <div className="space-y-12">
            <div className="flex justify-center gap-5">
              {[...Array(6)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                    i < pin.length 
                      ? (error ? 'bg-rose-500 border-rose-500 scale-125' : 'bg-indigo-600 border-indigo-600 scale-110 shadow-[0_0_15px_rgba(79,70,229,0.4)]') 
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-[340px] mx-auto">
              {buttons.map((btn, i) => {
                if (btn === '') return <div key={i} />;
                if (btn === 'delete') {
                  return (
                    <button 
                      key={i} 
                      onClick={handleDelete}
                      className="h-20 rounded-[32px] flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-90"
                    >
                      <Delete size={28} />
                    </button>
                  );
                }
                return (
                  <button 
                    key={i} 
                    onClick={() => handleKeyPress(btn)}
                    className="h-20 rounded-[32px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center hover:border-indigo-500 dark:hover:border-indigo-500 group transition-all active:scale-90"
                  >
                    <span className="text-3xl font-black text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors">{btn}</span>
                  </button>
                );
              })}
            </div>

            {lockoutTimer > 0 && (
               <div className="text-center animate-pulse">
                  <p className="text-[11px] font-black text-rose-500 uppercase tracking-widest flex items-center justify-center gap-2">
                     <Timer size={14}/> Lockout active for {lockoutTimer}s
                  </p>
               </div>
            )}

            <div className="text-center">
              <button 
                onClick={handleForgotPIN}
                className="text-[11px] font-black text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2 mx-auto transition-colors"
              >
                <HelpCircle size={14} /> Forgot PIN? Use Security Question
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in slide-in-from-right duration-300">
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[48px] border-4 border-amber-100 dark:border-amber-900/30 shadow-2xl space-y-8">
              <div className="flex items-center gap-4 text-amber-600">
                <HelpCircle size={32} />
                <span className="text-xs font-black uppercase tracking-[0.2em]">Identity Verification</span>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Question</p>
                <p className="text-xl font-black dark:text-white leading-tight">
                  {securityQuestion || "No security question set."}
                </p>
              </div>
              <form onSubmit={handleQuestionSubmit} className="space-y-4">
                <input 
                  type="text"
                  autoFocus
                  placeholder="Answer precisely..."
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  className={`w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-3xl py-5 px-8 font-bold text-sm dark:text-white outline-none transition-all ${
                    questionError ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/10' : 'border-transparent focus:border-amber-500'
                  }`}
                />
                <button type="submit" className="w-full py-5 bg-amber-500 text-white rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-xl hover:bg-amber-600 transition-all active:scale-[0.98]">
                   Validate Identity
                </button>
              </form>
            </div>

            <button 
              onClick={() => { setStage('pin'); setWasForgotTriggered(false); }}
              className="text-[11px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest flex items-center gap-2 mx-auto transition-colors"
            >
              <ArrowLeft size={14} /> Back to PIN Entry
            </button>
          </div>
        )}

        <div className="text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
            <ShieldCheck size={14} className={highSecurityMode ? 'text-emerald-500' : 'text-indigo-500'} />
            System Encrypted & Secured
          </p>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default LockScreen;