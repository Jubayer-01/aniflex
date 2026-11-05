import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Star, Film, Flame, Sparkles, Clapperboard, Filter } from 'lucide-react';
import AnimeCard from '../components/AnimeCard';
import {
  getHollywoodMovies,
  getBollywoodMovies,
  getTMDBImageUrl,
  FALLBACK_MOVIES,
} from '../services/tmdbService';

const MOVIE_CATEGORIES = [
  { id: 'all', label: 'All Movies' },
  { id: 'hollywood', label: 'Hollywood Blockbusters' },
  { id: 'bollywood', label: 'Bollywood Cinema (Hindi)' },
  { id: 'action', label: 'Action & Thrillers', genreId: 28 },
  { id: 'scifi', label: 'Sci-Fi & Fantasy', genreId: 878 },
  { id: 'comedy', label: 'Comedy', genreId: 35 },
];

export default function Movies() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [hollywoodList, setHollywoodList] = useState([]);
  const [bollywoodList, setBollywoodList] = useState([]);
  const [genreMovies, setGenreMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    async function loadMovieCatalogs() {
      try {
        const [hollywood, bollywood] = await Promise.all([
          getHollywoodMovies(1),
          getBollywoodMovies(1),
        ]);

        if (!isMounted) return;
        setHollywoodList(hollywood.length > 0 ? hollywood : FALLBACK_MOVIES);
        setBollywoodList(bollywood.length > 0 ? bollywood : []);
      } catch (err) {
        console.error('Movies catalog fetch error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadMovieCatalogs();

    return () => {
      isMounted = false;
    };
  }, []);

  // When clicking a genre filter
  useEffect(() => {
    let isMounted = true;
    const currentCat = MOVIE_CATEGORIES.find((c) => c.id === activeTab);

    if (currentCat?.genreId) {
      setLoading(true);
      getHollywoodMovies(1, currentCat.genreId).then((data) => {
        if (!isMounted) return;
        setGenreMovies(data);
        setLoading(false);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  // Featured Hero Movie
  const heroMovie = useMemo(() => {
    return hollywoodList[0] || bollywoodList[0] || FALLBACK_MOVIES[0];
  }, [hollywoodList, bollywoodList]);

  // Displayed items based on active tab
  const displayedMovies = useMemo(() => {
    if (activeTab === 'bollywood') return bollywoodList;
    if (activeTab === 'hollywood') return hollywoodList;
    if (activeTab === 'all') {
      // Interleave Hollywood and Bollywood
      const combined = [];
      const maxLen = Math.max(hollywoodList.length, bollywoodList.length);
      for (let i = 0; i < maxLen; i++) {
        if (hollywoodList[i]) combined.push(hollywoodList[i]);
        if (bollywoodList[i]) combined.push(bollywoodList[i]);
      }
      return combined;
    }
    return genreMovies.length > 0 ? genreMovies : hollywoodList;
  }, [activeTab, hollywoodList, bollywoodList, genreMovies]);

  const handlePlayMovie = (movie) => {
    navigate(`/watch/movie/${movie.id}`);
  };

  return (
    <div className="min-h-screen bg-[#07080B] text-white pt-24 pb-16 font-sans">
      {/* 1. Cinematic Spotlight Banner */}
      {heroMovie && (
        <section className="relative w-full h-[55vh] min-h-[420px] max-h-[600px] overflow-hidden -mt-24 mb-10">
          <img
            src={getTMDBImageUrl(heroMovie.backdrop_path, 'original')}
            alt={heroMovie.title}
            className="w-full h-full object-cover object-top filter brightness-75 scale-105"
          />
          {/* Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#07080B] via-[#07080B]/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#07080B] via-[#07080B]/60 to-transparent w-full lg:w-2/3" />

          {/* Hero Content */}
          <div className="absolute bottom-12 left-0 right-0 w-full px-4 sm:px-6 md:px-10 lg:px-12 z-20">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-bold tracking-wider uppercase">
                <Clapperboard className="w-3.5 h-3.5" />
                <span>Featured Premiere</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                {heroMovie.title}
              </h1>

              <div className="flex items-center gap-3 text-xs text-[#AAA2B7] font-semibold">
                <span className="flex items-center gap-1 text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  {heroMovie.vote_average ? heroMovie.vote_average.toFixed(1) : '8.5'}
                </span>
                <span>•</span>
                <span>{heroMovie.release_date?.slice(0, 4) || '2026'}</span>
                <span>•</span>
                <span className="px-2 py-0.5 rounded bg-white/10 text-white text-[10px]">4K Ultra HD</span>
              </div>

              <p className="text-xs sm:text-sm text-[#AAA2B7] line-clamp-3 leading-relaxed">
                {heroMovie.overview}
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => handlePlayMovie(heroMovie)}
                  className="flex items-center gap-2.5 px-6 py-3 bg-[#E2E8F0] hover:bg-white text-black font-bold rounded-xl text-xs sm:text-sm transition-all shadow-xl hover:scale-105 active:scale-95"
                >
                  <Play className="w-4 h-4 fill-black text-black" />
                  <span>Watch Movie</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. Category Filter Navigation */}
      <section className="w-full px-4 sm:px-6 md:px-10 lg:px-12 mb-8">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Film className="w-6 h-6 text-[#8955EF]" />
              <span>Cinema & Movies</span>
            </h2>
            <p className="text-xs text-[#AAA2B7] mt-1">
              Browse Hollywood blockbusters, Bollywood blockbusters, and international features.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {MOVIE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === cat.id
                    ? 'bg-[#8955EF] text-white shadow-md shadow-[#8955EF]/30 scale-105'
                    : 'bg-[#15171E] text-[#AAA2B7] hover:text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Movies Grid Display */}
      <section className="w-full px-4 sm:px-6 md:px-10 lg:px-12">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] rounded-2xl bg-[#15171E] animate-pulse border border-white/5"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
            {displayedMovies.map((movie) => (
              <AnimeCard
                key={movie.id}
                anime={{
                  id: movie.id,
                  title: movie.title || movie.original_title,
                  poster_path: movie.poster_path,
                  vote_average: movie.vote_average,
                  release_date: movie.release_date,
                  media_type: 'movie',
                }}
                className="w-full"
                onClick={() => handlePlayMovie(movie)}
                onPlay={() => handlePlayMovie(movie)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
