import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 pt-24 pb-16">
      <div className="w-20 h-20 rounded-3xl bg-[#15171E] border border-white/10 flex items-center justify-center text-[#8955EF] mb-6 shadow-2xl">
        <Compass className="w-10 h-10 animate-spin-slow" />
      </div>

      <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full uppercase tracking-wider mb-3">
        404 Page Not Found
      </span>

      <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-3">
        Lost in the Multiverse
      </h1>

      <p className="text-sm sm:text-base text-[#AAA2B7] max-w-md mb-8 leading-relaxed">
        The title, page, or universe you are searching for does not exist or has been shifted to another timeline.
      </p>

      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-black font-bold text-sm hover:bg-gray-200 transition-all shadow-xl hover:scale-105 active:scale-95"
        >
          <Home className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
        <Link
          to="/explore"
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#15171E] hover:bg-white/10 text-white font-bold text-sm border border-white/10 transition-all"
        >
          <span>Explore Catalog</span>
        </Link>
      </div>
    </div>
  );
}
