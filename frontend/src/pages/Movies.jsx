import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Star, Film, Flame, Sparkles, Clapperboard, Filter, Loader2 } from 'lucide-react';
import AnimeCard from '../components/AnimeCard';
import {
  getHollywoodMovies,
  getBollywoodMovies,
  getTMDBImageUrl,
} from '../services/tmdbService';

const MOVIE_CATEGORIES = [
  { id: 'all', label: 'All Movies' },
  { id: 'hollywood', label: 'Hollywood Blockbusters' },
  { id: 'bollywood', label: 'Bollywood Cinema (Hindi)' },
  { id: 'action', label: 'Action & Thrillers', genreId: 28 },
  { id: 'scifi', label: 'Sci-Fi & Fantasy', genreId: 878 },
  { id: 'comedy', label: 'Comedy', genreId: 35 },
  { id: 'horror', label: 'Horror & Suspense', genreId: 27 },
  { id: 'crime', label: 'Crime & Mystery', genreId: 80 },
  { id: 'animation', label: 'Animation Features', genreId: 16 },
];

export default function Movies() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [hollywoodList, setHollywoodList] = useState([]);
  const [bollywoodList, setBollywoodList] = useState([]);
  const [genreMovies, setGenreMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(2);
  const [genrePage, setGenrePage] = useState(1);

  // Initial catalog loader (fetches pages 1 and 2 concurrently for fast initial paint)
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    async function loadMovieCatalogs() {
      try {
        const [hw1, hw2, bw1, bw2] = await Promise.all([
          getHollywoodMovies(1),
          getHollywoodMovies(2),
          getBollywoodMovies(1),
          getBollywoodMovies(2),
        ]);

        if (!isMounted) return;
        const allHollywood = [...hw1, ...hw2];
        const allBollywood = [...bw1, ...bw2];

        setHollywoodList(allHollywood);
        setBollywoodList(allBollywood);
        setPage(2);
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
      setGenrePage(2);
      // Fetch pages 1 and 2 of this genre concurrently
      Promise.all([
        getHollywoodMovies(1, currentCat.genreId),
        getHollywoodMovies(2, currentCat.genreId),
      ]).then(([g1, g2]) => {
        if (!isMounted) return;
        setGenreMovies([...g1, ...g2]);
        setLoading(false);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  // Load More Handler (Infinite catalog expansion)
  const handleLoadMore = async () => {
    setLoadingMore(true);
    const currentCat = MOVIE_CATEGORIES.find((c) => c.id === activeTab);

    try {
      if (currentCat?.genreId) {
        const nextPage = genrePage + 1;
        const newBatch = await getHollywoodMovies(nextPage, currentCat.genreId);
        if (newBatch && newBatch.length > 0) {
          setGenreMovies((prev) => [...prev, ...newBatch]);
          setGenrePage(nextPage);
        }
      } else if (activeTab === 'bollywood') {
        const nextPage = page + 1;
        const newBatch = await getBollywoodMovies(nextPage);
        if (newBatch && newBatch.length > 0) {
          setBollywoodList((prev) => [...prev, ...newBatch]);
          setPage(nextPage);
        }
      } else if (activeTab === 'hollywood') {
        const nextPage = page + 1;
        const newBatch = await getHollywoodMovies(nextPage);
        if (newBatch && newBatch.length > 0) {
          setHollywoodList((prev) => [...prev, ...newBatch]);
          setPage(nextPage);
        }
      } else {
        // 'all': fetch next page of both Hollywood and Bollywood
        const nextPage = page + 1;
        const [nextHw, nextBw] = await Promise.all([
          getHollywoodMovies(nextPage),
          getBollywoodMovies(nextPage),
        ]);
        if (nextHw?.length > 0) setHollywoodList((prev) => [...prev, ...nextHw]);
        if (nextBw?.length > 0) setBollywoodList((prev) => [...prev, ...nextBw]);
        setPage(nextPage);
      }
    } catch (err) {
      console.error('Load more movies failed:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Featured Hero Movie
  const heroMovie = useMemo(() => {
    return hollywoodList[0] || bollywoodList[0] || null;
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
    <div className="min-h-screen bg-[#060709] text-white pt-24 pb-16 font-sans">
      {/* 1. Cinematic Spotlight Banner (Zero CLS with matched skeleton) */}
      {heroMovie ? (
        <section className="relative w-full h-[55vh] min-h-[420px] max-h-[600px] overflow-hidden -mt-24 mb-10">
          <img
            src={getTMDBImageUrl(heroMovie.backdrop_path, 'w1280')}
            alt={heroMovie.title}
            loading="eager"
            fetchpriority="high"
            decoding="async"
            className="w-full h-full object-cover object-top filter brightness-75 scale-105"
          />
          {/* Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#060709] via-[#060709]/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#060709] via-[#060709]/60 to-transparent w-full lg:w-2/3" />

          {/* Hero Content */}
          <div className="absolute bottom-12 left-0 right-0 w-full px-4 sm:px-6 md:px-10 lg:px-12 z-20">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/15 text-[#E2E8F0] text-xs font-bold tracking-wider uppercase backdrop-blur-md">
                <Clapperboard className="w-3.5 h-3.5 text-[#E2E8F0]" />
                <span>Featured Premiere</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                {heroMovie.title}
              </h1>

              <div className="flex items-center gap-3 text-xs text-[#94A3B8] font-semibold">
                <span className="flex items-center gap-1 text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  {heroMovie.vote_average ? heroMovie.vote_average.toFixed(1) : '8.5'}
                </span>
                <span>•</span>
                <span>{heroMovie.release_date?.slice(0, 4) || '2026'}</span>
                <span>•</span>
                <span className="px-2 py-0.5 rounded bg-white/10 text-white text-[10px]">4K Ultra HD</span>
              </div>

              <p className="text-xs sm:text-sm text-[#94A3B8] line-clamp-3 leading-relaxed">
                {heroMovie.overview}
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => handlePlayMovie(heroMovie)}
                  className="flex items-center gap-2.5 px-6 py-2.5 bg-[#E2E8F0] hover:bg-white text-black font-bold rounded-full text-xs sm:text-sm transition-all shadow-xl hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-black text-black" />
                  <span>Watch Movie</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div className="relative w-full h-[55vh] min-h-[420px] max-h-[600px] -mt-24 mb-10 bg-[#060709] animate-pulse border-b border-white/5" />
      )}

      {/* 2. Category Filter Navigation */}
      <section className="w-full px-4 sm:px-6 md:px-10 lg:px-12 mb-8">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Film className="w-6 h-6 text-[#E2E8F0]" />
              <span>Cinema & Movies</span>
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1">
              Browse Hollywood blockbusters, Bollywood blockbusters, and international features.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {MOVIE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${activeTab === cat.id
                    ? 'bg-[#E2E8F0] text-black shadow-md font-bold scale-105'
                    : 'bg-[#16181F] text-[#94A3B8] hover:text-white hover:bg-white/10 border border-white/5'
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
            {Array.from({ length: 18 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] rounded-2xl bg-[#16181F] animate-pulse border border-white/5"
              />
            ))}
          </div>
        ) : (
          <>
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

            {/* Load More Movies Button */}
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-8 py-3 bg-[#16181F] hover:bg-white hover:text-black text-white font-bold text-xs sm:text-sm rounded-full border border-white/10 hover:border-white shadow-xl transition-all duration-300 flex items-center gap-2.5 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Fetching more cinema titles...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Load More Movies</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

