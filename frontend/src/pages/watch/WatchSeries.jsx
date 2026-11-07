import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import AnimeRow from '../../components/AnimeRow';
import NotFound from '../NotFound';
import { getTVDetails, getTVSeason, getTMDBImageUrl } from '../../services/tmdbService';
import { saveWatchProgress, getLastWatchedEpisode } from '../../services/watchHistoryService';
import {
  ThumbsUp, ThumbsDown, Bookmark, Check, Share2, ArrowLeft,
  Star, Play, Tv, ChevronDown, ChevronUp, RotateCcw,
  SkipBack, SkipForward
} from 'lucide-react';

const TV_EMBED_SERVERS = [
  { id: 'multiembed', name: 'Server 1: MultiEmbed (Eng/Hindi)', url: (id, s, e) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}` },
  { id: 'vidlink', name: 'Server 2: VidLink (Fast)', url: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}` },
  { id: 'vidsrc_sh', name: 'Server 3: VidSrc SH', url: (id, s, e) => `https://vidsrc.sh/embed/tv?tmdb=${id}&season=${s}&episode=${e}` },
];

export default function WatchSeries() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const isValidNumericId = Boolean(id && /^\d+$/.test(String(id)));
  const [series, setSeries] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [streamServer, setStreamServer] = useState('multiembed');
  const [reloadKey, setReloadKey] = useState(0);

  // TV Seasons & Episodes State
  const querySeason = searchParams.get('season') || searchParams.get('s');
  const queryEp = searchParams.get('ep') || searchParams.get('e');
  const [tvSeasonNum, setTvSeasonNum] = useState(querySeason ? Number(querySeason) : 1);
  const [currentEpisodeNum, setCurrentEpisodeNum] = useState(queryEp ? Number(queryEp) : 1);
  const [tvSeasonsList, setTvSeasonsList] = useState([]);
  const [tvEpisodesList, setTvEpisodesList] = useState([]);
  const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState(false);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  const [likes, setLikes] = useState(7890);
  const [dislikes, setDislikes] = useState(115);
  const [userReaction, setUserReaction] = useState(null);

  // Initial Series Metadata Fetch
  useEffect(() => {
    let isMounted = true;
    if (!isValidNumericId) {
      setHasError(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setHasError(false);

    const savedEp = queryEp ? Number(queryEp) : getLastWatchedEpisode(id);
    const initialEp = savedEp && savedEp > 0 ? savedEp : 1;
    setCurrentEpisodeNum(initialEp);

    getTVDetails(id).then((tvData) => {
      if (!isMounted) return;
      if (tvData) {
        const seasons = (tvData.seasons || []).filter((s) => s.season_number > 0);
        const specials = (tvData.seasons || []).filter((s) => s.season_number === 0);
        const allSeasons = [...seasons, ...specials];
        setTvSeasonsList(allSeasons.length > 0 ? allSeasons : [{ id: 1, name: 'Season 1', season_number: 1, episode_count: tvData.number_of_episodes || 12 }]);

        const initialSeason = querySeason ? Number(querySeason) : 1;
        setTvSeasonNum(initialSeason);

        const totalEps = tvData.number_of_episodes || 12;
        const formatted = {
          id: tvData.id,
          title: tvData.name || tvData.original_name || 'TV Series',
          bannerImage: getTMDBImageUrl(tvData.backdrop_path, 'original'),
          coverImage: getTMDBImageUrl(tvData.poster_path, 'w500'),
          score: tvData.vote_average ? tvData.vote_average.toFixed(1) : '8.0',
          description: tvData.overview || 'No synopsis available for this television series.',
          tagline: tvData.tagline,
          genres: tvData.genres?.map((g) => g.name) || ['TV Series'],
          episodes: totalEps,
          seasons: tvData.number_of_seasons || 1,
          release_date: tvData.first_air_date,
          country: tvData.production_countries?.[0]?.name || tvData.origin_country?.[0] || 'United States',
          directors: tvData.created_by?.map((c) => c.name) || [],
          cast: tvData.credits?.cast?.slice(0, 4)?.map((c) => c.name) || [],
          recommendations: tvData.recommendations?.results?.map((m) => ({
            id: m.id,
            title: m.name || m.original_name,
            bannerImage: getTMDBImageUrl(m.backdrop_path, 'w500'),
            coverImage: {
              large: getTMDBImageUrl(m.poster_path, 'w500'),
              extraLarge: getTMDBImageUrl(m.poster_path, 'w500'),
            },
            averageScore: Math.round((m.vote_average || 7) * 10),
            media_type: 'tv',
            release_date: m.first_air_date,
          })) || [],
        };

        setSeries(formatted);
        document.title = `${formatted.title} — Watch TV Series on OmniFlex`;

        saveWatchProgress({
          id,
          title: formatted.title,
          episodeNumber: initialEp,
          totalEpisodes: totalEps,
          banner: formatted.bannerImage,
          cover: formatted.coverImage,
          progressPercent: Math.round((initialEp / totalEps) * 100),
        });
      } else {
        setHasError(true);
      }
      setLoading(false);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    return () => {
      isMounted = false;
    };
  }, [id, isValidNumericId]);

  // Fetch Season Episodes when tvSeasonNum changes
  useEffect(() => {
    if (isValidNumericId) {
      setLoadingEpisodes(true);
      getTVSeason(id, tvSeasonNum).then((seasonData) => {
        if (seasonData?.episodes && seasonData.episodes.length > 0) {
          setTvEpisodesList(seasonData.episodes);
        } else {
          const fallback = Array.from({ length: 12 }, (_, i) => ({
            episode_number: i + 1,
            name: `Episode ${i + 1}`,
            overview: `Episode ${i + 1} of Season ${tvSeasonNum}.`,
            air_date: '2024',
            runtime: 45,
          }));
          setTvEpisodesList(fallback);
        }
        setLoadingEpisodes(false);
      });
    }
  }, [id, tvSeasonNum, isValidNumericId]);

  const totalSeasonEpisodes = tvEpisodesList.length || 12;

  const handleSelectEpisode = (epNum) => {
    setCurrentEpisodeNum(epNum);
    setSearchParams({ season: tvSeasonNum, ep: epNum }, { replace: true });
    window.scrollTo({ top: 120, behavior: 'smooth' });

    if (series) {
      saveWatchProgress({
        id,
        title: `${series.title} (S${tvSeasonNum} E${epNum})`,
        episodeNumber: epNum,
        totalEpisodes: series.episodes || 12,
        banner: series.bannerImage,
        cover: series.coverImage,
        progressPercent: Math.round((epNum / (series.episodes || 12)) * 100),
      });
    }
  };

  const handleSelectSeason = (sNum) => {
    setTvSeasonNum(sNum);
    setCurrentEpisodeNum(1);
    setIsSeasonDropdownOpen(false);
    setSearchParams({ season: sNum, ep: 1 }, { replace: true });
  };

  const handleLike = () => {
    if (userReaction === 'like') {
      setUserReaction(null);
      setLikes((prev) => prev - 1);
    } else {
      if (userReaction === 'dislike') setDislikes((prev) => prev - 1);
      setUserReaction('like');
      setLikes((prev) => prev + 1);
    }
  };

  const handleDislike = () => {
    if (userReaction === 'dislike') {
      setUserReaction(null);
      setDislikes((prev) => prev - 1);
    } else {
      if (userReaction === 'like') setLikes((prev) => prev - 1);
      setUserReaction('dislike');
      setDislikes((prev) => prev + 1);
    }
  };

  if (!isValidNumericId || hasError) {
    return <NotFound />;
  }

  if (loading && !series) {
    return (
      <div className="min-h-[70vh] bg-[#060709] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-2 border-[#E2E8F0] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-[#94A3B8] font-medium tracking-wide animate-pulse">Loading Series...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060709] text-white pt-20 pb-20 selection:bg-white/20 selection:text-white">
      {/* 1. CINEMA VIDEO PLAYER STAGE */}
      <section className="relative w-full bg-black border-b border-white/10 shadow-2xl">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6">
          {/* Top Bar: Back button & Server Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3 px-2">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#94A3B8] hover:text-white transition-colors group cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Series</span>
            </button>

            {/* Server Switcher */}
            <div className="flex items-center gap-1 bg-[#0F1115] border border-white/10 rounded-full px-2 py-1 text-xs overflow-x-auto max-w-full">
              <span className="text-[#94A3B8] text-[11px] px-1 font-medium shrink-0">Server:</span>
              {TV_EMBED_SERVERS.map((srv) => (
                <button
                  key={srv.id}
                  onClick={() => setStreamServer(srv.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    streamServer === srv.id
                      ? 'bg-[#E2E8F0] text-black shadow-sm'
                      : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
                  }`}
                >
                  {srv.name}
                </button>
              ))}
            </div>
          </div>

          {/* Video Player Display */}
          <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10">
            <iframe
              key={`tv-${id}-${tvSeasonNum}-${currentEpisodeNum}-${streamServer}-${reloadKey}`}
              src={
                (TV_EMBED_SERVERS.find((s) => s.id === streamServer) || TV_EMBED_SERVERS[0]).url(
                  id,
                  tvSeasonNum,
                  currentEpisodeNum
                )
              }
              className="w-full h-full border-0"
              allowFullScreen
              referrerPolicy="no-referrer"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              title={`${series.title} Season ${tvSeasonNum} Episode ${currentEpisodeNum}`}
            />
          </div>

          {/* Quick Episode Navigation Bar */}
          <div className="flex items-center justify-between bg-[#0F1115] border border-white/10 rounded-2xl p-2.5 px-4 mt-3 flex-wrap gap-2 shadow-lg">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSelectEpisode(currentEpisodeNum - 1)}
                disabled={currentEpisodeNum <= 1}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-bold text-white disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                title="Previous Episode"
              >
                <SkipBack className="w-3.5 h-3.5" />
                <span>Prev Ep</span>
              </button>

              <span className="text-xs font-mono font-bold text-emerald-400 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                Season {tvSeasonNum} • Ep {currentEpisodeNum} <span className="text-[#94A3B8] font-normal">/ {totalSeasonEpisodes}</span>
              </span>

              <button
                onClick={() => handleSelectEpisode(currentEpisodeNum + 1)}
                disabled={currentEpisodeNum >= totalSeasonEpisodes}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                title="Next Episode"
              >
                <span>Next Ep</span>
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setReloadKey((prev) => prev + 1)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-xs text-[#94A3B8] hover:text-white transition-all cursor-pointer"
                title="Reload video player"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reload</span>
              </button>
            </div>
          </div>

          {/* Quick Direct Link Bar */}
          <div className="flex items-center justify-between text-xs text-[#94A3B8]/70 mt-3 px-2 flex-wrap gap-2">
            <span>Streaming TV Series (Season {tvSeasonNum}, Ep {currentEpisodeNum}). Switch servers if needed.</span>
            <div className="flex items-center gap-3">
              <a
                href={
                  streamServer === 'server3'
                    ? `https://vidsrc.mov/embed/tv/${id}/${tvSeasonNum}/${currentEpisodeNum}`
                    : streamServer === 'server2'
                    ? `https://vidsrc.to/embed/tv/${id}/${tvSeasonNum}/${currentEpisodeNum}`
                    : `https://vidsrc.sh/embed/tv/${id}/${tvSeasonNum}/${currentEpisodeNum}`
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all text-[11px] font-medium border border-white/10"
              >
                <span>Direct Player ↗</span>
              </a>
              <span className="hidden sm:inline font-mono text-[11px] text-[#94A3B8]">
                TMDB ID: {id} • S{tvSeasonNum} E{currentEpisodeNum}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. TV SEASONS & REAL EPISODE LIST */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-[#0F1115] rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl space-y-6">
          {/* Header & Season Dropdown */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                <Tv className="w-5 h-5 text-emerald-400" />
                <span>Episodes & Seasons</span>
              </h2>
              <p className="text-xs text-[#94A3B8]">
                Select a season and episode to start watching immediately.
              </p>
            </div>

            {/* Season Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsSeasonDropdownOpen(!isSeasonDropdownOpen)}
                className="flex items-center justify-between gap-3 bg-[#16181F] border border-white/10 hover:border-white/20 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg transition-all cursor-pointer min-w-[180px]"
              >
                <span>{tvSeasonsList.find((s) => s.season_number === tvSeasonNum)?.name || `Season ${tvSeasonNum}`}</span>
                {isSeasonDropdownOpen ? <ChevronUp className="w-4 h-4 text-[#94A3B8]" /> : <ChevronDown className="w-4 h-4 text-[#94A3B8]" />}
              </button>

              {isSeasonDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 max-h-64 overflow-y-auto bg-[#16181F] border border-white/15 rounded-xl shadow-2xl z-50 p-1.5 space-y-1">
                  {tvSeasonsList.map((season) => (
                    <button
                      key={season.id || season.season_number}
                      onClick={() => handleSelectSeason(season.season_number)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                        tvSeasonNum === season.season_number
                          ? 'bg-emerald-500 text-black font-bold'
                          : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span>{season.name}</span>
                      <span className="text-[10px] opacity-70">{season.episode_count || 12} eps</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Episode List */}
          {loadingEpisodes ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="h-24 rounded-2xl bg-[#16181F] animate-pulse border border-white/5" />
              ))}
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {tvEpisodesList.map((ep) => {
                const isPlaying = ep.episode_number === currentEpisodeNum;
                const epStill = getTMDBImageUrl(ep.still_path, 'w500') || series?.coverImage;
                return (
                  <div
                    key={ep.id || ep.episode_number}
                    onClick={() => handleSelectEpisode(ep.episode_number)}
                    className={`group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
                      isPlaying
                        ? 'bg-[#16181F] border-emerald-500/50 ring-1 ring-emerald-500/30 shadow-xl'
                        : 'bg-[#0F1115]/70 hover:bg-[#16181F] border-white/5 hover:border-white/15'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="relative w-full sm:w-44 aspect-video rounded-xl overflow-hidden bg-black/60 flex-none border border-white/10">
                      <img
                        src={epStill}
                        alt={ep.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                            isPlaying ? 'bg-emerald-500 text-black scale-105' : 'bg-white/80 group-hover:bg-white text-black group-hover:scale-110'
                          }`}
                        >
                          <Play className="w-4 h-4 fill-black translate-x-0.5" />
                        </div>
                      </div>
                      <div className="absolute top-1.5 left-1.5 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-black text-white">
                        E{ep.episode_number}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4
                          className={`text-sm sm:text-base font-bold line-clamp-1 transition-colors ${
                            isPlaying ? 'text-emerald-400' : 'text-white group-hover:text-emerald-300'
                          }`}
                        >
                          {ep.episode_number}. {ep.name || `Episode ${ep.episode_number}`}
                        </h4>
                        {isPlaying && (
                          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                            Playing
                          </span>
                        )}
                      </div>
                      {ep.air_date && (
                        <div className="text-[11px] text-[#94A3B8] font-medium">
                          {new Date(ep.air_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>
                      )}
                      <p className="text-xs text-[#94A3B8] line-clamp-2 leading-relaxed">
                        {ep.overview || 'No synopsis available for this episode.'}
                      </p>
                    </div>

                    {/* Runtime */}
                    {ep.runtime && (
                      <div className="hidden sm:block flex-none text-right">
                        <span className="text-[11px] font-mono text-[#94A3B8] bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                          {ep.runtime}m
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 3. SERIES OVERVIEW & DETAILS CARD */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="bg-[#0F1115] rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl flex flex-col md:flex-row gap-6 sm:gap-8 items-start">
          <div className="w-36 sm:w-52 aspect-[2/3] rounded-2xl overflow-hidden flex-none shadow-2xl border border-white/10 mx-auto md:mx-0 bg-black/60">
            <img
              src={series.coverImage}
              alt={series.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-4 flex-1 w-full">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight">
                  {series.title}
                </h1>
                {series.tagline && (
                  <p className="text-xs sm:text-sm text-emerald-400 font-medium italic mt-1">
                    "{series.tagline}"
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setIsSaved(!isSaved)}
                  className={`p-2.5 rounded-xl border transition-all text-xs flex items-center gap-1.5 cursor-pointer ${
                    isSaved
                      ? 'bg-white text-black border-white'
                      : 'bg-[#16181F] border-white/10 text-gray-300 hover:text-white hover:border-white/20'
                  }`}
                  title="Add to Watchlist"
                >
                  {isSaved ? <Check className="w-4 h-4 stroke-[3]" /> : <Bookmark className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    alert('Series link copied to clipboard!');
                  }}
                  className="p-2.5 rounded-xl bg-[#16181F] border border-white/10 text-gray-300 hover:text-white transition-all text-xs cursor-pointer"
                  title="Share Series"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-sm text-[#94A3B8] italic leading-relaxed pt-1">
              {series.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 pt-3 border-t border-white/10 text-xs sm:text-sm">
              <div className="space-y-2.5">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-white min-w-[70px]">Genre:</span>
                  <span className="text-emerald-400 font-semibold">{series.genres?.join(', ')}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-white min-w-[70px]">Creators:</span>
                  <span className="text-[#94A3B8]">{series.directors?.join(', ') || 'Not specified'}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-white min-w-[70px]">Country:</span>
                  <span className="text-emerald-400 font-medium">{series.country}</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-white min-w-[70px]">Seasons:</span>
                  <span className="text-white font-bold">{series.seasons} Seasons</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-white min-w-[70px]">Episodes:</span>
                  <span className="text-[#94A3B8]">{series.episodes} Total Episodes</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-white min-w-[70px]">Score:</span>
                  <span className="text-amber-400 font-bold">{series.score} / 10</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SIMILAR SERIES CAROUSEL */}
      {series.recommendations?.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <AnimeRow
            title="Recommended Series"
            animeList={series.recommendations}
            onCardClick={(s) => navigate(`/watch/tv/${s.id}`)}
          />
        </section>
      )}
    </div>
  );
}

