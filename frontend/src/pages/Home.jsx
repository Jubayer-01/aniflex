import React, { useEffect, useState, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import Hero from '../components/Hero';
import ContinueWatchingRow from '../components/ContinueWatchingRow';
import AnimeRow from '../components/AnimeRow';
import {
  getHomePageCatalog,
  FALLBACK_HERO
} from '../services/anilistService';
import { getWatchHistory } from '../services/watchHistoryService';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  const [heroAnime, setHeroAnime] = useState(FALLBACK_HERO);
  const [continueWatching, setContinueWatching] = useState(() => getWatchHistory());
  const [catalog, setCatalog] = useState({
    trending: [],
    popular: [],
    action: [],
    romance: [],
    movies: [],
    recent: [],
  });
  const [loading, setLoading] = useState(true);
  const lastFetchedRef = useRef(Date.now());

  useEffect(() => {
    let isMounted = true;

    async function loadCatalog(force = false) {
      try {
        if (!force) setLoading(true);
        const data = await getHomePageCatalog(force);
        if (!isMounted) return;

        if (data) {
          setCatalog(data);
          if (data.trending && data.trending.length > 0) {
            setHeroAnime(data.trending[0]);
          }
          lastFetchedRef.current = Date.now();
        }
      } catch (err) {
        console.error('Failed to load anime catalog:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadCatalog();

    // 1. Auto-refresh trending anime every 10 minutes from AniList
    const refreshTimer = setInterval(() => {
      loadCatalog(true);
    }, 10 * 60 * 1000);

    // 2. Auto-refresh when user returns to tab if >10 min passed
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastFetchedRef.current;
        if (elapsed > 10 * 60 * 1000) {
          loadCatalog(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 3. Reactively update Continue Watching when any episode is watched
    const handleHistoryUpdate = (e) => {
      if (e.detail) {
        setContinueWatching(e.detail);
      } else {
        setContinueWatching(getWatchHistory());
      }
    };

    window.addEventListener('aniflex:watchHistoryUpdate', handleHistoryUpdate);
    window.addEventListener('storage', handleHistoryUpdate);

    return () => {
      isMounted = false;
      clearInterval(refreshTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('aniflex:watchHistoryUpdate', handleHistoryUpdate);
      window.removeEventListener('storage', handleHistoryUpdate);
    };
  }, []);

  const handlePlayAnime = (anime) => {
    navigate(`/watch/${anime.id}`);
  };

  return (
    <div className="relative min-h-screen bg-[#060709] text-white overflow-x-hidden">
      {/* Hero Spotlight Section: Top 6 Side-by-Side Trending Anime with 7s Loop */}
      <Hero
        anime={heroAnime}
        items={catalog.trending && catalog.trending.length > 0 ? catalog.trending.slice(0, 6) : [heroAnime]}
        onOpenDetails={(anime) => handlePlayAnime(anime)}
      />

      {/* Main Content Shelves */}
      <div className="relative z-20 -mt-16 space-y-3 pb-12">
        {/* Continue Watching Shelf */}
        <ContinueWatchingRow items={continueWatching} />

        {/* Trending Now */}
        <AnimeRow
          title="Trending Now"
          items={catalog.trending}
          loading={loading && catalog.trending.length === 0}
          seeAllLink="/explore?sort=TRENDING_DESC"
          onSelectAnime={handlePlayAnime}
          onPlayAnime={handlePlayAnime}
        />

        {/* Popular Anime */}
        <AnimeRow
          title="Popular Anime"
          items={catalog.popular}
          loading={loading && catalog.popular.length === 0}
          seeAllLink="/explore?sort=POPULARITY_DESC"
          onSelectAnime={handlePlayAnime}
          onPlayAnime={handlePlayAnime}
        />

        {/* Action & Adventure */}
        <AnimeRow
          title="Action & Adventure"
          items={catalog.action}
          loading={loading && catalog.action.length === 0}
          seeAllLink="/explore?genre=Action"
          onSelectAnime={handlePlayAnime}
          onPlayAnime={handlePlayAnime}
        />

        {/* Romance */}
        <AnimeRow
          title="Romance"
          items={catalog.romance}
          loading={loading && catalog.romance.length === 0}
          seeAllLink="/explore?genre=Romance"
          onSelectAnime={handlePlayAnime}
          onPlayAnime={handlePlayAnime}
        />

        {/* Anime Movies */}
        <AnimeRow
          title="Anime Movies"
          items={catalog.movies}
          loading={loading && catalog.movies.length === 0}
          seeAllLink="/explore?format=MOVIE"
          onSelectAnime={handlePlayAnime}
          onPlayAnime={handlePlayAnime}
        />

        {/* Recently Added */}
        <AnimeRow
          title="Recently Added"
          items={catalog.recent}
          loading={loading && catalog.recent.length === 0}
          seeAllLink="/explore?sort=START_DATE_DESC"
          onSelectAnime={handlePlayAnime}
          onPlayAnime={handlePlayAnime}
        />

        {/* View More Button */}
        <div className="flex justify-center pt-8 pb-4">
          <button
            onClick={() => navigate('/explore')}
            className="group flex items-center gap-3 px-8 py-3.5 rounded-full bg-[#15171E] hover:bg-[#E2E8F0] hover:text-black border border-white/10 hover:border-white text-white font-bold text-sm tracking-wide transition-all shadow-lg hover:scale-105 active:scale-95"
          >
            <span>View More</span>
            <ArrowRight className="w-4 h-4 text-[#94A3B8] group-hover:text-black group-hover:translate-x-1 transition-all" />
          </button>
        </div>
      </div>
    </div>
  );
}
