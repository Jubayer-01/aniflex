import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { searchAnime } from '../services/anilistService';
import {
  searchTMDB,
  getHollywoodMovies,
  getPopularSeries,
  getTrendingAll,
  getTMDBImageUrl
} from '../services/tmdbService';
import AnimeCard from '../components/AnimeCard';
import {
  Search, Loader2, Sparkles, ChevronDown, X,
  SlidersHorizontal, RotateCcw, Tv, Film, Clapperboard
} from 'lucide-react';

const MEDIA_TYPES = [
  { label: 'All Media', value: 'all', icon: Sparkles },
  { label: 'Movies', value: 'movie', icon: Film },
  { label: 'TV Series', value: 'tv', icon: Tv },
  { label: 'Anime', value: 'anime', icon: Clapperboard },
];

const GENRES = [
  'All', 'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 
  'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller'
];

const FORMATS = [
  { label: 'All Formats', value: 'All' },
  { label: 'TV Series', value: 'TV' },
  { label: 'Movie', value: 'MOVIE' },
  { label: 'OVA', value: 'OVA' },
  { label: 'Special', value: 'SPECIAL' },
  { label: 'ONA', value: 'ONA' }
];

const STATUSES = [
  { label: 'All Status', value: 'All' },
  { label: 'Airing', value: 'RELEASING' },
  { label: 'Completed', value: 'FINISHED' },
  { label: 'Upcoming', value: 'NOT_YET_RELEASED' }
];

const YEARS = [
  'All', '2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015', '2010'
];

const MIN_SCORES = [
  { label: 'All Ratings', value: 'All' },
  { label: '⭐ 8.0+ Masterpiece', value: '80' },
  { label: '⭐ 7.0+ Great', value: '70' },
  { label: '⭐ 6.0+ Good', value: '60' }
];

const SORTS = [
  { label: 'Most Popular', value: 'POPULARITY_DESC' },
  { label: 'Trending', value: 'TRENDING_DESC' },
  { label: 'Top Rated', value: 'SCORE_DESC' },
  { label: 'Newest', value: 'START_DATE_DESC' },
];

function adaptTMDB(item, fallbackType = 'movie') {
  const isTV = item.media_type === 'tv' || fallbackType === 'tv' || Boolean(item.first_air_date);
  return {
    id: item.id,
    title: item.title || item.name || item.original_title || item.original_name || 'Untitled',
    name: item.name,
    media_type: isTV ? 'tv' : 'movie',
    poster_path: item.poster_path,
    poster_url: item.poster_path ? getTMDBImageUrl(item.poster_path, 'w342') : null,
    backdrop_path: item.backdrop_path,
    vote_average: item.vote_average || 7.0,
    release_date: item.release_date || item.first_air_date,
    first_air_date: item.first_air_date,
    format: isTV ? 'TV' : 'Movie',
    genres: item.genres?.map((g) => g.name) || [isTV ? 'TV Series' : 'Movie'],
  };
}

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Read URL params
  const typeParam = searchParams.get('type') || 'all';
  const queryParam = searchParams.get('q') || searchParams.get('search') || '';
  const genreParam = searchParams.get('genre') || 'All';
  const formatParam = searchParams.get('format') ? searchParams.get('format').toUpperCase() : 'All';
  const statusParam = searchParams.get('status') ? searchParams.get('status').toUpperCase() : 'All';
  const yearParam = searchParams.get('year') || 'All';
  const minScoreParam = searchParams.get('minScore') || 'All';
  const sortParam = searchParams.get('sort') || (queryParam ? 'SEARCH_MATCH' : 'POPULARITY_DESC');

  // Filter States
  const [mediaType, setMediaType] = useState(typeParam);
  const [query, setQuery] = useState(queryParam);
  const [selectedGenre, setSelectedGenre] = useState(genreParam);
  const [selectedFormat, setSelectedFormat] = useState(formatParam);
  const [selectedStatus, setSelectedStatus] = useState(statusParam);
  const [selectedYear, setSelectedYear] = useState(yearParam);
  const [selectedMinScore, setSelectedMinScore] = useState(minScoreParam);
  const [selectedSort, setSelectedSort] = useState(sortParam);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Results State
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Sync state whenever URL query params change
  useEffect(() => {
    setMediaType(typeParam);
    setQuery(queryParam);
    setSelectedGenre(genreParam);
    setSelectedFormat(formatParam);
    setSelectedStatus(statusParam);
    setSelectedYear(yearParam);
    setSelectedMinScore(minScoreParam);
    setSelectedSort(sortParam);
  }, [searchParams]);

  // Count active non-default filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (mediaType !== 'all') count++;
    if (selectedGenre !== 'All') count++;
    if (selectedFormat !== 'All') count++;
    if (selectedStatus !== 'All') count++;
    if (selectedYear !== 'All') count++;
    if (selectedMinScore !== 'All') count++;
    if (query.trim()) count++;
    return count;
  }, [mediaType, selectedGenre, selectedFormat, selectedStatus, selectedYear, selectedMinScore, query]);

  // Main catalog fetch
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setPage(1);
    setHasMore(true);

    async function loadData() {
      try {
        let results = [];

        if (mediaType === 'anime') {
          results = await searchAnime({
            search: query,
            genre: selectedGenre,
            format: selectedFormat,
            status: selectedStatus,
            seasonYear: selectedYear !== 'All' ? selectedYear : null,
            minScore: selectedMinScore !== 'All' ? selectedMinScore : null,
            sort: selectedSort,
            perPage: 24,
            page: 1,
          });
        } else if (mediaType === 'movie') {
          if (query.trim()) {
            const tmdbRes = await searchTMDB(query.trim(), 1);
            results = (tmdbRes || [])
              .filter((m) => m.media_type === 'movie' || (!m.media_type && m.title))
              .map((m) => adaptTMDB(m, 'movie'));
          } else {
            const movies = await getHollywoodMovies(1, selectedGenre !== 'All' ? selectedGenre : null);
            results = (movies || []).map((m) => adaptTMDB(m, 'movie'));
          }
        } else if (mediaType === 'tv') {
          if (query.trim()) {
            const tmdbRes = await searchTMDB(query.trim(), 1);
            results = (tmdbRes || [])
              .filter((m) => m.media_type === 'tv' || (!m.media_type && m.name))
              .map((m) => adaptTMDB(m, 'tv'));
          } else {
            const series = await getPopularSeries(1, selectedGenre !== 'All' ? selectedGenre : null);
            results = (series || []).map((s) => adaptTMDB(s, 'tv'));
          }
        } else {
          // 'all' media
          const [animeRes, tmdbRes] = await Promise.allSettled([
            searchAnime({
              search: query,
              genre: selectedGenre,
              format: selectedFormat,
              status: selectedStatus,
              seasonYear: selectedYear !== 'All' ? selectedYear : null,
              minScore: selectedMinScore !== 'All' ? selectedMinScore : null,
              sort: selectedSort,
              perPage: 14,
              page: 1,
            }),
            query.trim()
              ? searchTMDB(query.trim(), 1)
              : getTrendingAll()
          ]);

          const animes = animeRes.status === 'fulfilled' && Array.isArray(animeRes.value) ? animeRes.value : [];
          const tmdbItems = tmdbRes.status === 'fulfilled' && Array.isArray(tmdbRes.value)
            ? tmdbRes.value.map((m) => adaptTMDB(m))
            : [];

          const combined = [];
          const maxLen = Math.max(animes.length, tmdbItems.length);
          for (let i = 0; i < maxLen; i++) {
            if (i < animes.length) combined.push(animes[i]);
            if (i < tmdbItems.length) combined.push(tmdbItems[i]);
          }
          results = combined;
        }

        if (isMounted) {
          setMediaList(results || []);
          if ((results || []).length < 12) setHasMore(false);
          setLoading(false);
        }
      } catch (err) {
        console.error('Explore fetch error:', err);
        if (isMounted) {
          setMediaList([]);
          setHasMore(false);
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [mediaType, query, selectedGenre, selectedFormat, selectedStatus, selectedYear, selectedMinScore, selectedSort]);

  // URL State Updater Helper
  const updateFilterParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (!value || value === 'All' || value === 'all') {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleMediaTypeChange = (val) => {
    setMediaType(val);
    updateFilterParam('type', val);
  };

  const handleQueryChange = (val) => {
    setQuery(val);
    const newParams = new URLSearchParams(searchParams);
    if (val.trim()) {
      newParams.set('q', val.trim());
    } else {
      newParams.delete('q');
      newParams.delete('search');
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleClearQuery = () => {
    setQuery('');
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('q');
    newParams.delete('search');
    setSearchParams(newParams, { replace: true });
  };

  const handleResetAllFilters = () => {
    setMediaType('all');
    setQuery('');
    setSelectedGenre('All');
    setSelectedFormat('All');
    setSelectedStatus('All');
    setSelectedYear('All');
    setSelectedMinScore('All');
    setSelectedSort('POPULARITY_DESC');
    setSearchParams({}, { replace: true });
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;

    try {
      let moreData = [];

      if (mediaType === 'anime') {
        moreData = await searchAnime({
          search: query,
          genre: selectedGenre,
          format: selectedFormat,
          status: selectedStatus,
          seasonYear: selectedYear !== 'All' ? selectedYear : null,
          minScore: selectedMinScore !== 'All' ? selectedMinScore : null,
          sort: selectedSort,
          perPage: 24,
          page: nextPage,
        });
      } else if (mediaType === 'movie') {
        const movies = await getHollywoodMovies(nextPage, selectedGenre !== 'All' ? selectedGenre : null);
        moreData = (movies || []).map((m) => adaptTMDB(m, 'movie'));
      } else if (mediaType === 'tv') {
        const series = await getPopularSeries(nextPage, selectedGenre !== 'All' ? selectedGenre : null);
        moreData = (series || []).map((s) => adaptTMDB(s, 'tv'));
      } else {
        const moreAnime = await searchAnime({
          search: query,
          genre: selectedGenre,
          format: selectedFormat,
          status: selectedStatus,
          seasonYear: selectedYear !== 'All' ? selectedYear : null,
          minScore: selectedMinScore !== 'All' ? selectedMinScore : null,
          sort: selectedSort,
          perPage: 12,
          page: nextPage,
        });
        const moreMovies = await getHollywoodMovies(nextPage);
        moreData = [...(moreAnime || []), ...(moreMovies || []).map((m) => adaptTMDB(m, 'movie'))];
      }

      if (moreData.length > 0) {
        setMediaList((prev) => [...prev, ...moreData]);
        setPage(nextPage);
        if (moreData.length < 12) setHasMore(false);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to load more media:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleOpenWatch = (item) => {
    if (item.media_type === 'movie') {
      navigate(`/watch/movie/${item.id}`);
    } else if (item.media_type === 'tv') {
      navigate(`/watch/tv/${item.id}`);
    } else {
      navigate(`/watch/anime/${item.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#060709] text-white pt-24 pb-20 px-4 sm:px-6 md:px-10 lg:px-12 w-full space-y-6">
      {/* 1. Header & Live Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <span>{query.trim() ? `Results for "${query.trim()}"` : 'Explore Catalog'}</span>
            <Sparkles className="w-6 h-6 text-[#94A3B8]" />
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Filter through thousands of Movies, TV Series, and Anime with unified criteria.
          </p>
        </div>

        {/* Search Input, Filter Toggle & Sort */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search title, actor, studio..."
              className="w-full bg-[#0F1115] border border-white/10 rounded-xl pl-10 pr-9 py-2 text-sm text-white placeholder-[#94A3B8] outline-none focus:border-[#E2E8F0] transition-colors"
            />
            {query && (
              <button
                onClick={handleClearQuery}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white"
                title="Clear Search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Toggle Filters Button */}
          <button
            onClick={() => setShowFiltersPanel((prev) => !prev)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              showFiltersPanel
                ? 'bg-[#E2E8F0] text-black border-[#E2E8F0]'
                : 'bg-[#0F1115] text-gray-300 hover:text-white border-white/10 hover:border-white/20'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                showFiltersPanel ? 'bg-black text-white' : 'bg-[#E2E8F0] text-black'
              }`}>
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Sort Selector */}
          <select
            value={selectedSort}
            onChange={(e) => updateFilterParam('sort', e.target.value)}
            className="bg-[#0F1115] border border-white/10 rounded-xl px-3.5 py-2 text-xs font-semibold text-white outline-none cursor-pointer focus:border-[#E2E8F0] transition-colors"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value} className="bg-[#0F1115]">
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Media Type Selector Pill Bar */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {MEDIA_TYPES.map((type) => {
          const Icon = type.icon;
          const isActive = mediaType === type.value;
          return (
            <button
              key={type.value}
              onClick={() => handleMediaTypeChange(type.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border cursor-pointer select-none ${
                isActive
                  ? 'bg-[#E2E8F0] text-black border-[#E2E8F0] shadow-md shadow-white/5'
                  : 'bg-[#0F1115] text-[#94A3B8] hover:text-white border-white/10 hover:border-white/20'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{type.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Collapsible Advanced Filters Drawer */}
      {showFiltersPanel && (
        <div className="bg-[#0F1115] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Format Dropdown (relevant for Anime or General) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Format</label>
              <select
                value={selectedFormat}
                onChange={(e) => updateFilterParam('format', e.target.value)}
                className="w-full bg-[#16181F] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer focus:border-[#E2E8F0] transition-colors"
              >
                {FORMATS.map((f) => (
                  <option key={f.value} value={f.value} className="bg-[#16181F]">
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => updateFilterParam('status', e.target.value)}
                className="w-full bg-[#16181F] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer focus:border-[#E2E8F0] transition-colors"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value} className="bg-[#16181F]">
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => updateFilterParam('year', e.target.value)}
                className="w-full bg-[#16181F] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer focus:border-[#E2E8F0] transition-colors"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y} className="bg-[#16181F]">
                    {y === 'All' ? 'All Years' : y}
                  </option>
                ))}
              </select>
            </div>

            {/* Minimum Score Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Min Rating</label>
              <select
                value={selectedMinScore}
                onChange={(e) => updateFilterParam('minScore', e.target.value)}
                className="w-full bg-[#16181F] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer focus:border-[#E2E8F0] transition-colors"
              >
                {MIN_SCORES.map((sc) => (
                  <option key={sc.value} value={sc.value} className="bg-[#16181F]">
                    {sc.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Genre Quick Filter Pills */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Genres</span>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {GENRES.map((g) => (
                <button
                  key={g}
                  onClick={() => updateFilterParam('genre', g)}
                  className={`flex-none px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selectedGenre === g
                      ? 'bg-[#E2E8F0] text-black font-bold shadow-sm'
                      : 'bg-[#16181F] text-[#94A3B8] hover:text-white border border-white/5 hover:border-white/20'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Active Filters Chips & Reset Row */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0F1115]/60 p-3 rounded-xl border border-white/5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#94A3B8] font-semibold">Active Filters:</span>

            {mediaType !== 'all' && (
              <span className="flex items-center gap-1.5 bg-[#16181F] border border-white/10 text-white text-xs px-2.5 py-1 rounded-lg">
                <span>Category: {MEDIA_TYPES.find((m) => m.value === mediaType)?.label || mediaType}</span>
                <button onClick={() => handleMediaTypeChange('all')} className="hover:text-red-400">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {query.trim() && (
              <span className="flex items-center gap-1.5 bg-[#16181F] border border-white/10 text-white text-xs px-2.5 py-1 rounded-lg">
                <span>"{query.trim()}"</span>
                <button onClick={handleClearQuery} className="hover:text-red-400">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedGenre !== 'All' && (
              <span className="flex items-center gap-1.5 bg-[#16181F] border border-white/10 text-white text-xs px-2.5 py-1 rounded-lg">
                <span>Genre: {selectedGenre}</span>
                <button onClick={() => updateFilterParam('genre', 'All')} className="hover:text-red-400">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedFormat !== 'All' && (
              <span className="flex items-center gap-1.5 bg-[#16181F] border border-white/10 text-white text-xs px-2.5 py-1 rounded-lg">
                <span>Format: {selectedFormat}</span>
                <button onClick={() => updateFilterParam('format', 'All')} className="hover:text-red-400">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedStatus !== 'All' && (
              <span className="flex items-center gap-1.5 bg-[#16181F] border border-white/10 text-white text-xs px-2.5 py-1 rounded-lg">
                <span>Status: {STATUSES.find((s) => s.value === selectedStatus)?.label || selectedStatus}</span>
                <button onClick={() => updateFilterParam('status', 'All')} className="hover:text-red-400">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedYear !== 'All' && (
              <span className="flex items-center gap-1.5 bg-[#16181F] border border-white/10 text-white text-xs px-2.5 py-1 rounded-lg">
                <span>Year: {selectedYear}</span>
                <button onClick={() => updateFilterParam('year', 'All')} className="hover:text-red-400">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedMinScore !== 'All' && (
              <span className="flex items-center gap-1.5 bg-[#16181F] border border-white/10 text-white text-xs px-2.5 py-1 rounded-lg">
                <span>Score: {selectedMinScore}+</span>
                <button onClick={() => updateFilterParam('minScore', 'All')} className="hover:text-red-400">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          <button
            onClick={handleResetAllFilters}
            className="flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-white font-semibold transition-colors ml-auto cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All</span>
          </button>
        </div>
      )}

      {/* 5. Grid of Media Cards */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-4">
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] rounded-2xl bg-[#16181F] animate-pulse border border-white/5"
            />
          ))}
        </div>
      ) : mediaList.length > 0 ? (
        <div className="space-y-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-4 sm:gap-6">
            {mediaList.map((item, index) => (
              <AnimeCard
                key={`${item.media_type || 'anime'}-${item.id}-${index}`}
                anime={item}
                className="w-full"
                onClick={handleOpenWatch}
                onPlay={handleOpenWatch}
              />
            ))}
          </div>

          {/* Load More Pagination Button */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 bg-[#16181F] hover:bg-white hover:text-black border border-white/10 hover:border-white text-white px-8 py-3.5 rounded-2xl font-bold transition-all shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 text-sm cursor-pointer"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Loading more titles...</span>
                  </>
                ) : (
                  <>
                    <span>Load More</span>
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="py-20 text-center space-y-3 bg-[#0F1115] rounded-3xl border border-white/5 p-8 max-w-xl mx-auto">
          <p className="text-lg text-white font-bold">No titles found matching your filters.</p>
          <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
            Try adjusting your category, genre, or score requirements to see more titles.
          </p>
          <button
            onClick={handleResetAllFilters}
            className="mt-2 text-xs bg-[#E2E8F0] hover:bg-white text-black font-bold px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      )}
    </div>
  );
}
