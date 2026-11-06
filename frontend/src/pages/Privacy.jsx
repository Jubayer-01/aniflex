import React from 'react';
import { ArrowLeft, Shield, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#060709] text-white pt-28 pb-20 px-4 sm:px-6 md:px-10 lg:px-16 max-w-4xl mx-auto">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs font-semibold text-[#94A3B8] hover:text-white mb-6 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Home</span>
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-black">Privacy Policy</h1>
          <p className="text-xs text-[#94A3B8]">Last updated: November 2026</p>
        </div>
      </div>

      <div className="space-y-6 text-sm text-[#94A3B8] leading-relaxed bg-[#0F1115] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">1. Information We Collect</h2>
          <p>
            When registering an account on OmniFlex, we collect your username and email address. Password credentials are salted and hashed using bcrypt before storage; plaintext passwords are never saved or accessible.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">2. Local Storage & Watch History</h2>
          <p>
            Your current playback timestamps, volume preferences, and client UI settings are stored locally on your device via standard browser local storage for fast instant resumption.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">3. Third-Party Services & Analytics</h2>
          <p>
            We use privacy-focused analytics (Vercel Web Analytics) to monitor platform health, performance, and error rates without collecting personally identifiable tracking cookies.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">4. Data Retention & Deletion</h2>
          <p>
            You may request deletion of your account and associated watchlists at any time by contacting our administrator team through your profile dashboard.
          </p>
        </section>
      </div>
    </div>
  );
}

