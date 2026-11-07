import React, { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, X, Loader2, Sparkles } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AnimeCard from '../components/AnimeCard';
import {
  instantAlphabetSearch,
  getLocalCatalogMatches,
} from '../services/anilistService';
import { searchTMDB } from '../services/tmdbService';

export default function Search() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
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

    // 2. Query remote AniList and TMDB (Movies & Series) in parallel
    let isCancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const [fullAnime, tmdbData] = await Promise.all([
          instantAlphabetSearch(clean, 24),
          searchTMDB(clean, 1),
        ]);

        if (isCancelled) return;

        const formattedTMDB = (tmdbData || []).map((m) => ({
          id: m.id,
          title: { english: m.title || m.name, romaji: m.original_title || m.original_name },
          coverImage: {
            extraLarge: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
            large: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
          },
          bannerImage: m.backdrop_path ? `https://image.tmdb.org/t/p/w500${m.backdrop_path}` : null,
          averageScore: Math.round((m.vote_average || 7) * 10),
          seasonYear: m.release_date?.slice(0, 4) || m.first_air_date?.slice(0, 4) || '2025',
          media_type: m.media_type || (m.first_air_date ? 'tv' : 'movie'),
        }));

        const merged = [...(fullAnime || []), ...formattedTMDB];
        if (merged.length > 0) {
          setResults(merged);
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

  const handleOpenWatch = (item) => {
    if (item.media_type === 'movie') {
      navigate(`/watch/movie/${item.id}`);
    } else if (item.media_type === 'tv') {
      navigate(`/watch/tv/${item.id}?s=1&e=1`);
    } else {
      navigate(`/watch/${item.id}`);
    }
  };

  const isSearching = Boolean(query.trim());

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
              placeholder="Search movies, series, or anime by title, actor, or genre..."
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
        </div>

        {/* RESULTS OR EMPTY STATE */}
        {isSearching ? (
          <>
            {/* SECTION HEADER & RESULTS COUNTER */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-[#94A3B8]" />
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Search Results for <span className="text-white font-bold">"{query.trim()}"</span>
                </h2>
              </div>

              <span className="text-xs font-bold text-[#94A3B8] font-mono bg-white/5 px-3 py-1 rounded-full border border-white/10">
                {results.length} {results.length === 1 ? 'Result' : 'Results'}
              </span>
            </div>

            {/* RESULTS GRID */}
            {results.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-4 sm:gap-6">
                {results.map((item) => (
                  <AnimeCard
                    key={`${item.media_type || 'anime'}-${item.id}`}
                    anime={item}
                    className="w-full"
                    onClick={handleOpenWatch}
                    onPlay={handleOpenWatch}
                  />
                ))}
              </div>
            ) : (
              !loading && (
                <div className="py-20 text-center space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-[#16181F] border border-white/10 flex items-center justify-center mx-auto text-[#94A3B8] shadow-2xl">
                    <SearchIcon className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-black text-white">
                    No titles found matching "{query}"
                  </h3>
                  <p className="text-sm text-[#94A3B8] max-w-md mx-auto">
                    Check your spelling, or try searching with another keyword or title.
                  </p>
                </div>
              )
            )}
          </>
        ) : (
          <div className="py-24 text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-[#16181F] border border-white/10 flex items-center justify-center mx-auto text-[#94A3B8] shadow-2xl">
              <SearchIcon className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-white">Search OmniFLEX</h3>
            <p className="text-sm text-[#94A3B8] max-w-md mx-auto">
              Type any movie, TV series, or anime title to start searching.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

