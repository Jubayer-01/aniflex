import React, { useState } from 'react';
import { Play, Wrench, ShieldAlert, Sparkles, ArrowRight, Lock } from 'lucide-react';

export default function UnderDevelopment({ onUnlock }) {
  const [passcode, setPasscode] = useState('');
  const [showPasscodeInput, setShowPasscodeInput] = useState(false);
  const [error, setError] = useState(false);

  const handleBypass = (e) => {
    e.preventDefault();
    if (passcode.trim().toLowerCase() === 'admin' || passcode.trim().toLowerCase() === 'preview') {
      localStorage.setItem('aniflex_dev_bypass', 'true');
      if (onUnlock) onUnlock();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080B] text-white flex flex-col items-center justify-center px-4 relative overflow-hidden font-sans selection:bg-[#8955EF] selection:text-white">
      {/* Background Glowing Ambient Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#8955EF]/15 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-indigo-500/10 blur-[120px] pointer-events-none rounded-full" />

      {/* Main Glass Card */}
      <div className="relative z-10 max-w-lg w-full bg-[#111319]/80 border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#8955EF] to-indigo-500 flex items-center justify-center shadow-lg shadow-[#8955EF]/30">
            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
          </div>
          <span className="text-2xl font-black tracking-widest text-white">ANIFLEX</span>
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-6">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>Under Active Development</span>
        </div>

        {/* Title & Description */}
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-3">
          We’re Crafting Something Great
        </h1>
        <p className="text-sm text-[#AAA2B7] leading-relaxed mb-8">
          ANIFLEX is currently offline for scheduled infrastructure upgrades, database optimizations, and design tuning.
          The platform will return shortly.
        </p>

        {/* Feature Teasers */}
        <div className="grid grid-cols-2 gap-3 mb-8 text-left text-xs">
          <div className="p-3 rounded-2xl bg-[#161822] border border-white/5 flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-[#8955EF] flex-none" />
            <span className="text-slate-300 font-medium">Faster Video Streams</span>
          </div>
          <div className="p-3 rounded-2xl bg-[#161822] border border-white/5 flex items-center gap-2.5">
            <Wrench className="w-4 h-4 text-indigo-400 flex-none" />
            <span className="text-slate-300 font-medium">Enhanced Catalogs</span>
          </div>
        </div>

        {/* Owner Bypass Trigger */}
        {!showPasscodeInput ? (
          <button
            onClick={() => setShowPasscodeInput(true)}
            className="text-[11px] text-[#AAA2B7]/50 hover:text-white transition-colors inline-flex items-center gap-1.5"
          >
            <Lock className="w-3 h-3" />
            <span>Developer Access</span>
          </button>
        ) : (
          <form onSubmit={handleBypass} className="flex items-center gap-2 max-w-xs mx-auto">
            <input
              type="password"
              placeholder="Enter passcode (admin)"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className={`w-full px-3.5 py-2 text-xs bg-[#090A0F] border rounded-xl focus:outline-none transition-all ${
                error ? 'border-red-500 text-red-400' : 'border-white/10 text-white focus:border-[#8955EF]'
              }`}
              autoFocus
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#8955EF] hover:bg-[#7843DE] text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-all flex-none"
            >
              <span>Enter</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </form>
        )}
      </div>

      {/* Footer copyright note */}
      <div className="relative z-10 mt-8 text-[11px] text-[#AAA2B7]/40">
        © 2026 ANIFLEX • Private Development Sandbox
      </div>
    </div>
  );
}

