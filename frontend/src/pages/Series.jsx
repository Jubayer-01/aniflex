import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Star, Tv, Flame, Sparkles, Clapperboard, Loader2 } from 'lucide-react';
import AnimeCard from '../components/AnimeCard';
import {
  getPopularSeries,
  getKDramas,
  getTMDBImageUrl,
} from '../services/tmdbService';

const SERIES_CATEGORIES = [
  { id: 'all', label: 'All TV Series' },
  { id: 'trending', label: 'Trending Web Shows' },
  { id: 'kdrama', label: 'KDramas & Asian Hits' },
  { id: 'drama', label: 'Crime & Drama', genreId: 18 },
  { id: 'scifi', label: 'Sci-Fi & Fantasy', genreId: 10765 },
  { id: 'action', label: 'Action & Adventure', genreId: 10759 },
  { id: 'comedy', label: 'Comedy Shows', genreId: 35 },
  { id: 'animation', label: 'Animation & Anime Series', genreId: 16 },
];

export default function Series() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [seriesList, setSeriesList] = useState([]);
  const [kdramaList, setKdramaList] = useState([]);
  const [genreSeries, setGenreSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(3);
  const [genrePage, setGenrePage] = useState(1);

  // Multi-page batch loader on mount (fetches pages 1, 2, and 3 concurrently)
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    async function loadSeriesCatalogs() {
      try {
        const [s1, s2, s3, k1, k2, k3] = await Promise.all([
          getPopularSeries(1),
          getPopularSeries(2),
          getPopularSeries(3),
          getKDramas(1),
          getKDramas(2),
          getKDramas(3),
        ]);

        if (!isMounted) return;
        const allSeries = [...s1, ...s2, ...s3];
        const allKdramas = [...k1, ...k2, ...k3];

        setSeriesList(allSeries);
        setKdramaList(allKdramas);
        setPage(3);
      } catch (err) {
        console.error('Series catalog fetch error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadSeriesCatalogs();

    return () => {
      isMounted = false;
    };
  }, []);

  // When clicking a genre filter
  useEffect(() => {
    let isMounted = true;
    const currentCat = SERIES_CATEGORIES.find((c) => c.id === activeTab);

    if (currentCat?.genreId) {
      setLoading(true);
      setGenrePage(2);
      Promise.all([
        getPopularSeries(1, currentCat.genreId),
        getPopularSeries(2, currentCat.genreId),
      ]).then(([g1, g2]) => {
        if (!isMounted) return;
        setGenreSeries([...g1, ...g2]);
        setLoading(false);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  // Load More Handler (Infinite catalog expansion for series)
  const handleLoadMore = async () => {
    setLoadingMore(true);
    const currentCat = SERIES_CATEGORIES.find((c) => c.id === activeTab);

    try {
      if (currentCat?.genreId) {
        const nextPage = genrePage + 1;
        const newBatch = await getPopularSeries(nextPage, currentCat.genreId);
        if (newBatch && newBatch.length > 0) {
          setGenreSeries((prev) => [...prev, ...newBatch]);
          setGenrePage(nextPage);
        }
      } else if (activeTab === 'kdrama') {
        const nextPage = page + 1;
        const newBatch = await getKDramas(nextPage);
        if (newBatch && newBatch.length > 0) {
          setKdramaList((prev) => [...prev, ...newBatch]);
          setPage(nextPage);
        }
      } else {
        const nextPage = page + 1;
        const [nextSeries, nextKdramas] = await Promise.all([
          getPopularSeries(nextPage),
          getKDramas(nextPage),
        ]);
        if (nextSeries?.length > 0) setSeriesList((prev) => [...prev, ...nextSeries]);
        if (nextKdramas?.length > 0) setKdramaList((prev) => [...prev, ...nextKdramas]);
        setPage(nextPage);
      }
    } catch (err) {
      console.error('Load more series failed:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Featured Hero Series
  const heroSeries = useMemo(() => {
    return seriesList[0] || kdramaList[0];
  }, [seriesList, kdramaList]);

  // Displayed items based on active tab
  const displayedSeries = useMemo(() => {
    if (activeTab === 'kdrama') return kdramaList;
    if (activeTab === 'all') {
      const combined = [];
      const maxLen = Math.max(seriesList.length, kdramaList.length);
      for (let i = 0; i < maxLen; i++) {
        if (seriesList[i]) combined.push(seriesList[i]);
        if (kdramaList[i]) combined.push(kdramaList[i]);
      }
      return combined;
    }
    return genreSeries.length > 0 ? genreSeries : seriesList;
  }, [activeTab, seriesList, kdramaList, genreSeries]);

  const handlePlaySeries = (series) => {
    navigate(`/watch/tv/${series.id}?s=1&e=1`);
  };

  return (
    <div className="min-h-screen bg-[#060709] text-white pt-24 pb-16 font-sans">
      {/* 1. Cinematic Spotlight Banner */}
      {heroSeries && (
        <section className="relative w-full h-[55vh] min-h-[420px] max-h-[600px] overflow-hidden -mt-24 mb-10">
          <img
            src={getTMDBImageUrl(heroSeries.backdrop_path, 'original')}
            alt={heroSeries.name}
            className="w-full h-full object-cover object-top filter brightness-75 scale-105"
          />
          {/* Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#060709] via-[#060709]/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#060709] via-[#060709]/60 to-transparent w-full lg:w-2/3" />

          {/* Hero Content */}
          <div className="absolute bottom-12 left-0 right-0 w-full px-4 sm:px-6 md:px-10 lg:px-12 z-20">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-xs font-bold tracking-wider uppercase">
                <Tv className="w-3.5 h-3.5" />
                <span>Featured TV Series</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                {heroSeries.name}
              </h1>

              <div className="flex items-center gap-3 text-xs text-[#94A3B8] font-semibold">
                <span className="flex items-center gap-1 text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  {heroSeries.vote_average ? heroSeries.vote_average.toFixed(1) : '8.7'}
                </span>
                <span>•</span>
                <span>{heroSeries.first_air_date?.slice(0, 4) || '2026'}</span>
                <span>•</span>
                <span className="px-2 py-0.5 rounded bg-white/10 text-white text-[10px]">Full Seasons</span>
              </div>

              <p className="text-xs sm:text-sm text-[#94A3B8] line-clamp-3 leading-relaxed">
                {heroSeries.overview}
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => handlePlaySeries(heroSeries)}
                  className="flex items-center gap-2.5 px-6 py-3 bg-[#E2E8F0] hover:bg-white text-black font-bold rounded-xl text-xs sm:text-sm transition-all shadow-xl hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-black text-black" />
                  <span>Start Season 1</span>
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
              <Tv className="w-6 h-6 text-indigo-400" />
              <span>TV Series & Shows</span>
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1">
              Binge Western dramas, HBO/Netflix originals, and trending Korean dramas.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {SERIES_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === cat.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105'
                    : 'bg-[#16181F] text-[#94A3B8] hover:text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Series Grid Display */}
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
              {displayedSeries.map((series) => (
                <AnimeCard
                  key={series.id}
                  anime={{
                    id: series.id,
                    title: series.name || series.original_name,
                    poster_path: series.poster_path,
                    vote_average: series.vote_average,
                    first_air_date: series.first_air_date,
                    media_type: 'tv',
                  }}
                  className="w-full"
                  onClick={() => handlePlaySeries(series)}
                  onPlay={() => handlePlaySeries(series)}
                />
              ))}
            </div>

            {/* Load More Series Button */}
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-8 py-3.5 bg-[#16181F] hover:bg-white hover:text-black text-white font-bold text-xs sm:text-sm rounded-2xl border border-white/10 hover:border-white shadow-xl transition-all duration-300 flex items-center gap-2.5 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    <span>Fetching more TV series...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>Load More Series</span>
                  </>
                )}
              </button>
              <p className="text-xs text-[#94A3B8]/70 font-mono">
                Showing {displayedSeries.length} TV series from TMDB catalog
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

