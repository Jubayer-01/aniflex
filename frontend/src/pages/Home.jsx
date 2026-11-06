import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Film, Tv, Play, Sparkles, Clapperboard, Star } from 'lucide-react';
import Hero from '../components/Hero';
import ContinueWatchingRow from '../components/ContinueWatchingRow';
import AnimeRow from '../components/AnimeRow';
import { getHomePageCatalog, FALLBACK_HERO } from '../services/anilistService';
import {
  getTrendingAll,
  getHollywoodMovies,
  getBollywoodMovies,
  getPopularSeries,
  getTMDBImageUrl,
} from '../services/tmdbService';
import { getWatchHistory } from '../services/watchHistoryService';

// Lightweight GPU-accelerated scroll fade-in wrapper
function FadeInRow({ children, className = '' }) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [continueWatching, setContinueWatching] = useState(() => getWatchHistory());
  const [heroItems, setHeroItems] = useState([FALLBACK_HERO]);
  const [trendingAll, setTrendingAll] = useState([]);
  const [hollywoodMovies, setHollywoodMovies] = useState([]);
  const [bollywoodMovies, setBollywoodMovies] = useState([]);
  const [tvSeries, setTvSeries] = useState([]);
  const [animeList, setAnimeList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadOmniData() {
      try {
        setLoading(true);
        const [omniTrending, hw1, hw2, bw1, bw2, tv1, tv2, animeCatalog] = await Promise.all([
          getTrendingAll(),
          getHollywoodMovies(1),
          getHollywoodMovies(2),
          getBollywoodMovies(1),
          getBollywoodMovies(2),
          getPopularSeries(1),
          getPopularSeries(2),
          getHomePageCatalog(false),
        ]);

        if (!isMounted) return;

        setTrendingAll(omniTrending || []);
        setHollywoodMovies([...(hw1 || []), ...(hw2 || [])]);
        setBollywoodMovies([...(bw1 || []), ...(bw2 || [])]);
        setTvSeries([...(tv1 || []), ...(tv2 || [])]);

        const topAnime = animeCatalog?.trending || [];
        setAnimeList(topAnime);

        // Build Hero banner strictly from trending Movies & TV Series (Zero Anime)
        const movieTvHeroes = (omniTrending || []).slice(0, 6).map((m) => ({
          id: m.id,
          title: { english: m.title || m.name, romaji: m.original_title || m.original_name },
          bannerImage: getTMDBImageUrl(m.backdrop_path, 'original'),
          coverImage: { extraLarge: getTMDBImageUrl(m.poster_path, 'w500') },
          score: m.vote_average ? m.vote_average.toFixed(1) : '8.5',
          year: m.release_date?.slice(0, 4) || m.first_air_date?.slice(0, 4) || '2026',
          description: m.overview,
          genres: [m.media_type === 'tv' ? 'TV Series' : 'Blockbuster Movie'],
          media_type: m.media_type || (m.first_air_date ? 'tv' : 'movie'),
        }));

        const fallbackMovieHero = {
          id: 969681,
          title: { english: 'The Odyssey', romaji: 'The Odyssey' },
          bannerImage: 'https://image.tmdb.org/t/p/original/zOpe0eHbgF3pr5NGaswhR48b6p0.jpg',
          coverImage: { extraLarge: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg' },
          score: '8.5',
          year: '2025',
          description: 'After a decade of battle, a Greek king embarks on a perilous voyage home.',
          genres: ['Blockbuster Movie'],
          media_type: 'movie',
        };

        setHeroItems(movieTvHeroes.length > 0 ? movieTvHeroes : [fallbackMovieHero]);
      } catch (err) {
        console.error('Omni home load error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadOmniData();

    // Watch history listener
    const handleHistoryUpdate = (e) => {
      if (e.detail) setContinueWatching(e.detail);
      else setContinueWatching(getWatchHistory());
    };

    window.addEventListener('aniflex:watchHistoryUpdate', handleHistoryUpdate);
    window.addEventListener('storage', handleHistoryUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('aniflex:watchHistoryUpdate', handleHistoryUpdate);
      window.removeEventListener('storage', handleHistoryUpdate);
    };
  }, []);

  const handlePlayMedia = (item) => {
    if (item.media_type === 'tv') {
      navigate(`/watch/tv/${item.id}?s=1&e=1`);
    } else if (item.media_type === 'movie' || item.release_date) {
      navigate(`/watch/movie/${item.id}`);
    } else {
      navigate(`/watch/anime/${item.id}`);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#060709] text-white overflow-x-hidden font-sans">
      {/* 1. Master Omni Hero Spotlight */}
      <Hero
        anime={heroItems[0]}
        items={heroItems}
        onOpenDetails={handlePlayMedia}
      />

      {/* 2. Main Entertainment Shelves */}
      <div className="relative z-20 -mt-16 space-y-3 pb-16">
        {/* Continue Watching Shelf */}
        <ContinueWatchingRow items={continueWatching} />

        {/* Global Trending Now */}
        <FadeInRow>
          <AnimeRow
            title="Trending Now"
            items={trendingAll.map((item) => ({
              ...item,
              media_type: item.media_type || 'movie',
            }))}
            loading={loading && trendingAll.length === 0}
            seeAllLink="/movies"
            onSelectAnime={handlePlayMedia}
            onPlayAnime={handlePlayMedia}
          />
        </FadeInRow>

        {/* Hollywood Blockbusters */}
        <FadeInRow>
          <AnimeRow
            title="Hollywood Blockbusters"
            items={hollywoodMovies.map((m) => ({ ...m, media_type: 'movie' }))}
            loading={loading && hollywoodMovies.length === 0}
            seeAllLink="/movies"
            onSelectAnime={handlePlayMedia}
            onPlayAnime={handlePlayMedia}
          />
        </FadeInRow>

        {/* Bollywood Cinema */}
        <FadeInRow>
          <AnimeRow
            title="Bollywood Cinema (Hindi Hits)"
            items={bollywoodMovies.map((m) => ({ ...m, media_type: 'movie' }))}
            loading={loading && bollywoodMovies.length === 0}
            seeAllLink="/movies"
            onSelectAnime={handlePlayMedia}
            onPlayAnime={handlePlayMedia}
          />
        </FadeInRow>

        {/* Trending TV & Web Series */}
        <FadeInRow>
          <AnimeRow
            title="Popular TV & Web Series"
            items={tvSeries.map((s) => ({ ...s, media_type: 'tv' }))}
            loading={loading && tvSeries.length === 0}
            seeAllLink="/series"
            onSelectAnime={handlePlayMedia}
            onPlayAnime={handlePlayMedia}
          />
        </FadeInRow>

        {/* Anime Spotlight */}
        <FadeInRow>
          <AnimeRow
            title="Anime Spotlight"
            items={animeList}
            loading={loading && animeList.length === 0}
            seeAllLink="/anime"
            onSelectAnime={handlePlayMedia}
            onPlayAnime={handlePlayMedia}
          />
        </FadeInRow>

        {/* Explore All Hubs Banner */}
        <FadeInRow>
          <div className="w-full px-4 sm:px-6 md:px-10 lg:px-12 pt-8">
            <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[#141622] via-[#10121C] to-[#0A0B11] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
              <div className="space-y-2 text-center md:text-left">
                <span className="text-xs font-bold text-[#94A3B8] tracking-wider uppercase">Unlimited Entertainment</span>
                <h3 className="text-2xl sm:text-3xl font-black text-white">One App for All Your Streaming</h3>
                <p className="text-xs sm:text-sm text-[#AAA2B7] max-w-xl">
                  Switch instantly between Hollywood cinema, Bollywood blockbusters, trending TV dramas, and full anime seasons.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap justify-center">
                <Link
                  to="/movies"
                  className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white text-white hover:text-black font-bold text-xs transition-all border border-white/10"
                >
                  Browse Movies
                </Link>
                <Link
                  to="/series"
                  className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white text-white hover:text-black font-bold text-xs transition-all border border-white/10"
                >
                  Browse Series
                </Link>
                <Link
                  to="/anime"
                  className="px-5 py-2.5 rounded-full bg-[#E2E8F0] hover:bg-white text-black font-bold text-xs transition-all shadow-md hover:scale-105 active:scale-95"
                >
                  Open Anime Hub
                </Link>
              </div>
            </div>
          </div>
        </FadeInRow>
      </div>
    </div>
  );
}
