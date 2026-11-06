import React from 'react';
import { Play, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { removeWatchHistoryItem } from '../services/watchHistoryService';

export default function ContinueWatchingRow({ items = [] }) {
  const navigate = useNavigate();

  if (!items || items.length === 0) return null;

  return (
    <section className="w-full px-4 sm:px-6 md:px-10 lg:px-12 py-5">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
          Continue Watching
        </h2>
        <button
          onClick={() => navigate('/mylist')}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#94A3B8] hover:text-white transition-colors group"
        >
          <span>See All</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Horizontal Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => navigate(`/watch/${item.id}?ep=${item.episodeNumber || 1}`)}
            className="group relative bg-[#16181F] rounded-2xl overflow-hidden border border-white/10 hover:border-white/30 transition-all duration-300 cursor-pointer shadow-lg hover:-translate-y-1"
          >
            {/* Thumbnail */}
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0F1115]">
              <img
                src={item.banner || item.cover || "https://images.alphacoders.com/131/1314905.jpeg"}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = item.cover || "https://images.alphacoders.com/131/1314905.jpeg";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#16181F] via-transparent to-transparent opacity-80" />

              {/* Floating Remove Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeWatchHistoryItem(item.id);
                }}
                className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 text-gray-300 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                title="Remove from history"
                aria-label="Remove from history"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Floating Play Button */}
              <div className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-white text-black flex items-center justify-center transition-all duration-300 shadow-md">
                <Play className="w-4 h-4 fill-black text-black translate-x-0.5" />
              </div>
            </div>

            {/* Info & Progress */}
            <div className="p-3.5 space-y-2">
              <div>
                <h3 className="font-bold text-white text-sm truncate group-hover:text-[#E2E8F0] transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-[#94A3B8] font-medium">
                  {item.episode || `Ep. ${item.episodeNumber || 1}`} • <span className="text-gray-200 font-semibold">{item.progress}%</span>
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#CBD5E1] rounded-full transition-all duration-500"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

