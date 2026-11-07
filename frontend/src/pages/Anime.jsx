import React, { useEffect, useState, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import Hero from '../components/Hero';
import AnimeRow from '../components/AnimeRow';
import {
  getHomePageCatalog
} from '../services/anilistService';
import { useNavigate } from 'react-router-dom';

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

export default function Anime() {
  const navigate = useNavigate();
  const [heroAnime, setHeroAnime] = useState(null);
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

    return () => {
      isMounted = false;
      clearInterval(refreshTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handlePlayAnime = (anime) => {
    navigate(`/watch/anime/${anime.id}`);
  };

  return (
    <div className="relative min-h-screen bg-[#060709] text-white overflow-x-hidden">
      {/* Hero Spotlight Section: Top 6 Side-by-Side Trending Anime with 7s Loop */}
      {heroAnime && (
        <Hero
          anime={heroAnime}
          items={catalog.trending && catalog.trending.length > 0 ? catalog.trending.slice(0, 6) : [heroAnime]}
          onOpenDetails={(anime) => handlePlayAnime(anime)}
        />
      )}

      {/* Main Content Shelves */}
      <div className="relative z-20 -mt-16 space-y-3 pb-12">
        {/* Trending Now */}
        <FadeInRow>
          <AnimeRow
            title="Trending Anime"
            items={catalog.trending}
            loading={loading && catalog.trending.length === 0}
            seeAllLink="/explore?sort=TRENDING_DESC"
            onSelectAnime={handlePlayAnime}
            onPlayAnime={handlePlayAnime}
          />
        </FadeInRow>

        {/* Popular Anime */}
        <FadeInRow>
          <AnimeRow
            title="All-Time Popular Anime"
            items={catalog.popular}
            loading={loading && catalog.popular.length === 0}
            seeAllLink="/explore?sort=POPULARITY_DESC"
            onSelectAnime={handlePlayAnime}
            onPlayAnime={handlePlayAnime}
          />
        </FadeInRow>

        {/* Action & Adventure */}
        <FadeInRow>
          <AnimeRow
            title="Action & Shonen"
            items={catalog.action}
            loading={loading && catalog.action.length === 0}
            seeAllLink="/explore?genre=Action"
            onSelectAnime={handlePlayAnime}
            onPlayAnime={handlePlayAnime}
          />
        </FadeInRow>

        {/* Romance */}
        <FadeInRow>
          <AnimeRow
            title="Romance & Slice of Life"
            items={catalog.romance}
            loading={loading && catalog.romance.length === 0}
            seeAllLink="/explore?genre=Romance"
            onSelectAnime={handlePlayAnime}
            onPlayAnime={handlePlayAnime}
          />
        </FadeInRow>

        {/* Anime Movies */}
        <FadeInRow>
          <AnimeRow
            title="Anime Feature Films"
            items={catalog.movies}
            loading={loading && catalog.movies.length === 0}
            seeAllLink="/explore?format=MOVIE"
            onSelectAnime={handlePlayAnime}
            onPlayAnime={handlePlayAnime}
          />
        </FadeInRow>

        {/* Recently Added */}
        <FadeInRow>
          <AnimeRow
            title="Recently Released Anime"
            items={catalog.recent}
            loading={loading && catalog.recent.length === 0}
            seeAllLink="/explore?sort=START_DATE_DESC"
            onSelectAnime={handlePlayAnime}
            onPlayAnime={handlePlayAnime}
          />
        </FadeInRow>

        {/* View More Button */}
        <FadeInRow>
          <div className="flex justify-center pt-8 pb-4">
            <button
              onClick={() => navigate('/explore')}
              className="group flex items-center gap-3 px-8 py-3.5 rounded-full bg-[#16181F] hover:bg-[#E2E8F0] hover:text-black border border-white/10 hover:border-white text-white font-bold text-sm tracking-wide transition-all shadow-lg hover:scale-105 active:scale-95"
            >
              <span>Explore All Anime</span>
              <ArrowRight className="w-4 h-4 text-[#94A3B8] group-hover:text-black group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        </FadeInRow>
      </div>
    </div>
  );
}

