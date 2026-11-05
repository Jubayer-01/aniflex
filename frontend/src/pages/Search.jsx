import React, { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, X, Loader2, Sparkles, TrendingUp, Flame } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AnimeCard from '../components/AnimeCard';
import {
  instantAlphabetSearch,
  getLocalCatalogMatches,
  getHomePageCatalog,
  FALLBACK_CATALOG
} from '../services/anilistService';

const POPULAR_TAGS = [
  'Solo Leveling',
  'One Piece',
  'Bleach',
  'Demon Slayer',
  'Jujutsu Kaisen',
  'Attack on Titan',
  'Naruto',
  'Chainsaw Man',
  'Frieren',
  'Black Clover',
  'Kaiju No. 8'
];

export default function Search() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [trendingAnime, setTrendingAnime] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
    // Load trending anime for empty state
    getHomePageCatalog().then((data) => {
      if (data?.trending) {
        setTrendingAnime(data.trending.slice(0, 18));
      } else {
        setTrendingAnime(FALLBACK_CATALOG);
      }
    });
  }, []);

  // Sync state if URL param changes
  useEffect(() => {
    const q = searchParams.get('q') || '';
    if (q !== query) {
      setQuery(q);
    }
  }, [searchParams]);

  // Real-time instant alphabet matching on every keystroke
  useEffect(() => {
    const clean = query.trim();

    if (!clean) {
      setResults([]);
      setLoading(false);
      return;
    }

    // 1. Instant synchronous local match (<5ms)
    const instantLocal = getLocalCatalogMatches(clean);
    setResults(instantLocal);

    // 2. Query remote AniList in parallel for full database breadth
    let isCancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const fullResults = await instantAlphabetSearch(clean, 30);
        if (!isCancelled && fullResults && fullResults.length > 0) {
          setResults(fullResults);
        }
      } catch (err) {
        console.warn('Search fetch error:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }, clean.length === 1 ? 100 : 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const handleInputChange = (val) => {
    setQuery(val);
    const newParams = new URLSearchParams(searchParams);
    if (val.trim()) {
      newParams.set('q', val.trim());
    } else {
      newParams.delete('q');
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleClear = () => {
    setQuery('');
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('q');
    setSearchParams(newParams, { replace: true });
    inputRef.current?.focus();
  };

  const handleSelectTag = (tag) => {
    handleInputChange(tag);
    inputRef.current?.focus();
  };

  const handleOpenWatch = (anime) => {
    navigate(`/watch/${anime.id}`);
  };

  const isSearching = Boolean(query.trim());
  const displayList = isSearching ? results : trendingAnime;

  return (
    <div className="min-h-screen bg-[#060709] text-white pt-28 pb-24 px-4 sm:px-6 md:px-10 lg:px-12 selection:bg-white/20 selection:text-white">
      <div className="w-full space-y-10">
        
        {/* TOP SEARCH BAR (Crunchyroll-style Cinema Layout) */}
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="relative group">
            {/* Search Icon */}
            <div className="absolute left-1 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
              <SearchIcon className="w-6 sm:w-7 h-6 sm:h-7 text-[#94A3B8]" />
            </div>

            {/* Main Cinema Search Input */}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Search anime by title, character, or genre..."
              className="w-full bg-transparent text-xl sm:text-3xl lg:text-4xl font-extrabold text-white placeholder-gray-500 pl-10 sm:pl-12 pr-12 py-3 outline-none border-b-2 border-white/20 focus:border-[#E2E8F0] transition-all duration-300 drop-shadow-none tracking-tight"
            />

            {/* Right Status / Clear Button */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {loading && <Loader2 className="w-5 h-5 text-[#94A3B8] animate-spin" />}
              {query && (
                <button
                  onClick={handleClear}
                  className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  title="Clear input"
                  aria-label="Clear input"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Popular Tags */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2">
            <span className="text-xs font-bold text-[#AAA2B7] flex items-center gap-1 flex-none uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5 text-[#94A3B8]" />
              <span>Trending:</span>
            </span>
            {POPULAR_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => handleSelectTag(tag)}
                className={`flex-none px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  query.toLowerCase() === tag.toLowerCase()
                    ? 'bg-[#E2E8F0] text-black border-[#E2E8F0] shadow-sm'
                    : 'bg-[#111318] border-white/10 text-gray-300 hover:text-white hover:border-white/30 hover:bg-white/5'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* SECTION HEADER & RESULTS COUNTER */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            {isSearching ? (
              <>
                <Sparkles className="w-5 h-5 text-[#94A3B8]" />
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Search Results for <span className="text-white font-bold">"{query.trim()}"</span>
                </h2>
              </>
            ) : (
              <>
                <Flame className="w-5 h-5 text-[#94A3B8]" />
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Top Trending & Recommended
                </h2>
              </>
            )}
          </div>

          <span className="text-xs font-bold text-[#AAA2B7] font-mono bg-white/5 px-3 py-1 rounded-full border border-white/10">
            {displayList.length} {displayList.length === 1 ? 'Anime' : 'Animes'}
          </span>
        </div>

        {/* ANIME RESULTS GRID */}
        {displayList.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-4 sm:gap-6">
            {displayList.map((anime) => (
              <AnimeCard
                key={anime.id}
                anime={anime}
                className="w-full"
                onClick={handleOpenWatch}
                onPlay={handleOpenWatch}
              />
            ))}
          </div>
        ) : (
          !loading && isSearching && (
            <div className="py-20 text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-[#15171E] border border-white/10 flex items-center justify-center mx-auto text-[#94A3B8] shadow-2xl">
                <SearchIcon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white">
                No anime found matching "{query}"
              </h3>
              <p className="text-sm text-[#AAA2B7] max-w-md mx-auto">
                Check your spelling, or try searching with another keyword, character name, or official Romaji title.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

