import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Loader2, AlertCircle, CheckCircle2, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

export default function AuthModal() {
  const { authModalState, closeAuthModal, login, register } = useAuth();
  const [tab, setTab] = useState(authModalState.tab || 'login'); // 'login' | 'register' | 'forgot'

  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (authModalState.isOpen) {
      setTab(authModalState.tab || 'login');
      setError('');
      setSuccess('');
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeAuthModal();
      }
    };

    if (authModalState.isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authModalState, closeAuthModal]);

  if (!authModalState.isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (tab === 'login') {
        await login(email, password);
      } else if (tab === 'register') {
        await register(username, email, password);
      } else if (tab === 'forgot') {
        const res = await authAPI.forgotPassword(email);
        setSuccess(res.data.message || 'Password reset link sent to your email.');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Operation failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-md bg-[#111018] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl text-white overflow-hidden"
      >
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          aria-label="Close authentication modal"
          className="absolute top-4 right-4 text-[#94A3B8] hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#1E2028] border border-white/20 flex items-center justify-center">
              <Play className="w-4 h-4 fill-[#E2E8F0] text-[#E2E8F0] translate-x-0.5" />
            </div>
            <h2 id="auth-modal-title" className="text-2xl font-black tracking-tight text-white">
              Omni<span className="text-[#94A3B8]">Flex</span>
            </h2>
          </div>
          <p className="text-xs text-[#94A3B8]">
            {tab === 'login' && 'Sign in to access your personal watchlist and sync across devices'}
            {tab === 'register' && 'Create your free account to track movies, series and anime'}
            {tab === 'forgot' && 'Reset your account password'}
          </p>
        </div>

        {/* Tab Switcher */}
        {tab !== 'forgot' && (
          <div role="tablist" aria-label="Authentication modes" className="flex bg-[#0F1115] p-1 rounded-xl mb-6 border border-white/5">
            <button
              role="tab"
              aria-selected={tab === 'login'}
              onClick={() => {
                setTab('login');
                setError('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                tab === 'login' ? 'bg-[#E2E8F0] text-black font-bold shadow-sm' : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              role="tab"
              aria-selected={tab === 'register'}
              onClick={() => {
                setTab('register');
                setError('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                tab === 'register' ? 'bg-[#E2E8F0] text-black font-bold shadow-sm' : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Error / Success Notifications */}
        {error && (
          <div role="alert" className="mb-4 flex items-center gap-2 p-3 bg-red-950/60 border border-red-800/50 rounded-xl text-red-200 text-xs">
            <AlertCircle className="w-4 h-4 flex-none" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div role="status" className="mb-4 flex items-center gap-2 p-3 bg-green-950/60 border border-green-800/50 rounded-xl text-green-200 text-xs">
            <CheckCircle2 className="w-4 h-4 flex-none" />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {tab === 'register' && (
            <div>
              <label htmlFor="auth-username" className="block text-xs font-bold text-[#94A3B8] mb-1">Username</label>
              <div className="relative">
                <User className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="auth-username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  className="w-full bg-[#16181F] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-[#94A3B8]/50 outline-none focus:border-[#E2E8F0] transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-xs font-bold text-[#94A3B8] mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="auth-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full bg-[#16181F] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-[#94A3B8]/50 outline-none focus:border-[#E2E8F0] transition-colors"
              />
            </div>
          </div>

          {tab !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="auth-password" className="text-xs font-bold text-[#94A3B8]">Password</label>
                {tab === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setTab('forgot');
                      setError('');
                    }}
                    className="text-xs text-gray-300 hover:text-white hover:underline"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="auth-password"
                  name="password"
                  type="password"
                  required
                  autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#16181F] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-[#94A3B8]/50 outline-none focus:border-[#E2E8F0] transition-colors"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#E2E8F0] hover:bg-white text-black font-bold transition-all shadow-none flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : tab === 'login' ? (
              'Sign In'
            ) : tab === 'register' ? (
              'Create Account'
            ) : (
              'Send Reset Link'
            )}
          </button>

          {tab === 'forgot' && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setError('');
                }}
                className="text-xs text-gray-300 hover:text-white hover:underline"
              >
                ← Back to Sign In
              </button>
            </div>
          )}
        </form>
      </motion.div>
    </div>
  );
}

