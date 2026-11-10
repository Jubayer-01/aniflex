import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Hero from '../components/Hero';
import AnimeRow from '../components/AnimeRow';
import { getHomePageCatalog } from '../services/anilistService';
import {
  getTrendingAll,
  getHollywoodMovies,
  getBollywoodMovies,
  getPopularSeries,
  getTMDBImageUrl,
} from '../services/tmdbService';

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
  // Initialize with cached hero items for instant zero-delay LCP paint
  const [heroItems, setHeroItems] = useState(() => {
    try {
      const cached = sessionStorage.getItem('omni_hero_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
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

        // Fetch Hero data first so LCP element can resolve immediately
        const heroPromise = getTrendingAll().then((omniTrending) => {
          if (!isMounted || !omniTrending) return;
          const movieTvHeroes = omniTrending.slice(0, 6).map((m) => ({
            id: m.id,
            title: { english: m.title || m.name, romaji: m.original_title || m.original_name },
            backdrop_path: m.backdrop_path,
            bannerImage: getTMDBImageUrl(m.backdrop_path, 'w1280'),
            coverImage: { extraLarge: getTMDBImageUrl(m.poster_path, 'w342') },
            score: m.vote_average ? m.vote_average.toFixed(1) : '8.5',
            year: m.release_date?.slice(0, 4) || m.first_air_date?.slice(0, 4) || '2026',
            description: m.overview,
            genres: [m.media_type === 'tv' ? 'TV Series' : 'Blockbuster Movie'],
            media_type: m.media_type || (m.first_air_date ? 'tv' : 'movie'),
          }));
          setTrendingAll(omniTrending);
          setHeroItems(movieTvHeroes);
          try {
            sessionStorage.setItem('omni_hero_cache', JSON.stringify(movieTvHeroes));
          } catch {}
        });

        // Fetch remaining shelf rows in parallel without blocking hero
        const shelfPromises = Promise.allSettled([
          getHollywoodMovies(1),
          getBollywoodMovies(1),
          getPopularSeries(1),
          getHomePageCatalog(false),
        ]).then(([hwRes, bwRes, tvRes, animeRes]) => {
          if (!isMounted) return;
          if (hwRes.status === 'fulfilled') setHollywoodMovies(hwRes.value || []);
          if (bwRes.status === 'fulfilled') setBollywoodMovies(bwRes.value || []);
          if (tvRes.status === 'fulfilled') setTvSeries(tvRes.value || []);
          if (animeRes.status === 'fulfilled') setAnimeList(animeRes.value?.trending || []);
        });

        await Promise.all([heroPromise, shelfPromises]);
      } catch (err) {
        console.error('Omni home load error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadOmniData();

    return () => {
      isMounted = false;
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
      {/* 1. Master Omni Hero Spotlight (Zero CLS with matched skeleton) */}
      {heroItems.length > 0 ? (
        <Hero
          anime={heroItems[0]}
          items={heroItems}
          onOpenDetails={handlePlayMedia}
        />
      ) : (
        <div className="relative w-full h-[75vh] min-h-[580px] max-h-[820px] bg-[#060709] flex items-end pb-12 sm:pb-16 lg:pb-20 pt-16 px-4 sm:px-6 md:px-10 lg:px-12 animate-pulse border-b border-white/5">
          <div className="space-y-4 max-w-2xl w-full">
            <div className="w-28 h-6 rounded-full bg-white/10" />
            <div className="w-3/4 h-12 rounded-xl bg-white/10" />
            <div className="w-1/2 h-4 rounded-lg bg-white/5" />
            <div className="w-full h-16 rounded-xl bg-white/5" />
            <div className="flex gap-3 pt-2">
              <div className="w-32 h-10 rounded-full bg-white/15" />
              <div className="w-32 h-10 rounded-full bg-white/10" />
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Entertainment Shelves */}
      <div className="relative z-20 pt-6 space-y-3 pb-16">
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
      </div>
    </div>
  );
}
