import React from 'react';
import { ArrowLeft, Shield, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="min-h-screen bg-[#07080B] text-white pt-28 pb-20 px-4 sm:px-6 md:px-10 lg:px-16 max-w-4xl mx-auto">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs font-semibold text-[#AAA2B7] hover:text-white mb-6 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Home</span>
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-[#E2E8F0]">
          <FileText className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-black">Terms of Service</h1>
          <p className="text-xs text-[#AAA2B7]">Last updated: November 2026</p>
        </div>
      </div>

      <div className="space-y-6 text-sm text-[#AAA2B7] leading-relaxed bg-[#111318] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">1. Acceptance of Terms</h2>
          <p>
            By accessing or using OmniFlex, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the application.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">2. Informational & Educational Demonstration</h2>
          <p>
            OmniFlex is an open-source omni-entertainment catalog demonstration platform. OmniFlex does not store, host, or upload video files onto its servers. All video streams and metadata are indexed from publicly accessible third-party APIs (including TMDB and AniList) and external embed providers.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">3. User Accounts & Security</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">4. Intellectual Property & Copyright Claims</h2>
          <p>
            All trademarks, logos, and media assets belong to their respective copyright owners. If you believe any content infringes your copyright, please contact the third-party hosting service directly or send a notice to our developer team.
          </p>
        </section>
      </div>
    </div>
  );
}

