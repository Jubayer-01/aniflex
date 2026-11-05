import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Star, Play, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { searchAnime } from '../services/anilistService';

export default function SearchBar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const data = await searchAnime(query.trim(), null, 'SEARCH_MATCH', 10);
      setResults(data);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    onClose();
    navigate(`/explore?q=${encodeURIComponent(query.trim())}`);
  };

  if (!isOpen) return null;

  const quickGenres = ['Action', 'Romance', 'Fantasy', 'Comedy', 'Sci-Fi'];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="w-full max-w-2xl bg-[#111318] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Search Input Bar (Form with Enter & Button Submit) */}
        <form onSubmit={handleSearchSubmit} className="flex items-center px-4 py-3.5 border-b border-white/10 gap-3">
          <Search className="w-5 h-5 text-[#94A3B8] flex-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearchSubmit(e);
              }
            }}
            placeholder="Search anime title (e.g. Naruto, Bleach, Solo Leveling)..."
            className="flex-1 bg-transparent text-white placeholder-[#AAA2B7] text-base outline-none"
          />
          {loading && <Loader2 className="w-5 h-5 text-[#94A3B8] animate-spin flex-none" />}
          {query && !loading && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-[#AAA2B7] hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            disabled={!query.trim()}
            className="px-3.5 py-1.5 rounded-xl bg-[#E2E8F0] hover:bg-white disabled:opacity-40 text-black font-bold text-xs transition-all shadow-none active:scale-95 flex-none"
          >
            Search
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-xs bg-white/10 hover:bg-white/20 text-gray-300 px-2.5 py-1.5 rounded-xl flex-none"
          >
            ESC
          </button>
        </form>

        {/* Quick Suggestion Pills */}
        <div className="px-4 py-2.5 bg-[#060709]/50 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar border-b border-white/5">
          <span className="text-[#AAA2B7] font-semibold flex-none">Popular Tags:</span>
          {quickGenres.map((g) => (
            <button
              key={g}
              onClick={() => setQuery(g)}
              className="flex-none px-3 py-1 rounded-full bg-white/5 hover:bg-white hover:text-black text-gray-300 transition-colors"
            >
              {g}
            </button>
          ))}
        </div>

        {/* Search Results */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-1">
          {results.length > 0 ? (
            results.map((anime) => {
              const title = anime.title?.english || anime.title?.romaji || 'Anime';
              const cover = anime.coverImage?.medium || anime.coverImage?.large;
              const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;
              return (
                <div
                  key={anime.id}
                  onClick={() => {
                    onClose();
                    navigate(`/watch/${anime.id}`);
                  }}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer group transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={cover}
                      alt={title}
                      className="w-12 h-16 object-cover rounded-lg flex-none"
                    />
                    <div>
                      <h4 className="font-bold text-sm text-white group-hover:text-[#E2E8F0] transition-colors line-clamp-1">
                        {title}
                      </h4>
                      <p className="text-xs text-[#AAA2B7]">
                        {anime.seasonYear || 'Anime'} • {anime.format || 'TV'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {score && (
                      <div className="flex items-center gap-1 text-xs text-amber-400 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{score}</span>
                      </div>
                    )}
                    <div className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-white group-hover:text-black flex items-center justify-center text-white transition-colors">
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </div>
                  </div>
                </div>
              );
            })
          ) : query ? (
            !loading && (
              <div className="p-8 text-center text-sm text-[#AAA2B7]">
                No anime found matching "<span className="text-white font-medium">{query}</span>"
              </div>
            )
          ) : (
            <div className="p-8 text-center text-xs text-[#AAA2B7]">
              Search live titles across upto 20,000+ Anime.
            </div>
          )}
        </div>

        {/* View All on Search Page Footer Button */}
        {query.trim() && (
          <button
            onClick={handleSearchSubmit}
            className="w-full p-3 bg-[#15171E] hover:bg-white/10 border-t border-white/10 text-center text-xs font-semibold text-gray-300 hover:text-white cursor-pointer flex items-center justify-center gap-2 transition-colors"
          >
            <span>View all results for "{query.trim()}" on Search Page</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </motion.div>
    </div>
  );
}

