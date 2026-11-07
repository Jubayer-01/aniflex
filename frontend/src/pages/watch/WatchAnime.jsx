import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import AnimeRow from '../../components/AnimeRow';
import NotFound from '../NotFound';
import { getAnimeDetails } from '../../services/anilistService';
import { saveWatchProgress, getLastWatchedEpisode } from '../../services/watchHistoryService';
import {
  ThumbsUp, ThumbsDown, Bookmark, Check, Share2, ArrowLeft,
  Star, Play, ChevronLeft, ChevronRight, RotateCcw,
  SkipBack, SkipForward, Maximize, Minimize
} from 'lucide-react';

export default function WatchAnime() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const isValidNumericId = Boolean(id && /^\d+$/.test(String(id)));
  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [activeServer, setActiveServer] = useState('Sub (JP)');
  const [streamServer, setStreamServer] = useState('server1'); // 'server1' (vidsrc.sh) | 'server2' (animeembed) | 'server3' (vidsrc.pm)
  const [reloadKey, setReloadKey] = useState(0);

  const [selectedSeasonIdx, setSelectedSeasonIdx] = useState(0);
  const [selectedChunkIdx, setSelectedChunkIdx] = useState(0);
  const [currentEpisodeNum, setCurrentEpisodeNum] = useState(1);

  const [likes, setLikes] = useState(6640);
  const [dislikes, setDislikes] = useState(127);
  const [userReaction, setUserReaction] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const playerContainerRef = useRef(null);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      if (playerContainerRef.current.requestFullscreen) {
        playerContainerRef.current.requestFullscreen().catch(() => {});
      } else if (playerContainerRef.current.webkitRequestFullscreen) {
        playerContainerRef.current.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  };

  const CHUNK_SIZE = 25;

  useEffect(() => {
    let isMounted = true;
    if (!isValidNumericId) {
      setHasError(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setHasError(false);
    setSelectedSeasonIdx(0);

    const queryEp = searchParams.get('ep') || searchParams.get('e');
    const savedEp = queryEp ? Number(queryEp) : getLastWatchedEpisode(id);
    const initialEp = savedEp && savedEp > 0 ? savedEp : 1;

    setCurrentEpisodeNum(initialEp);
    setSelectedChunkIdx(Math.floor((initialEp - 1) / CHUNK_SIZE));

    getAnimeDetails(id).then((data) => {
      if (!isMounted) return;
      if (data) {
        setAnime(data);
        const title = data.title?.english || data.title?.romaji || 'Anime';
        const banner = data.bannerImage || data.coverImage?.extraLarge;
        const cover = data.coverImage?.large || data.coverImage?.extraLarge;
        const total = data.episodes || 12;

        document.title = `${title} — Watch Anime on OmniFlex`;

        saveWatchProgress({
          id,
          title,
          episodeNumber: initialEp,
          totalEpisodes: total,
          banner,
          cover,
          progressPercent: Math.round((initialEp / total) * 100),
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

  const animeTitle = anime?.title?.english || anime?.title?.romaji || 'Anime';
  const score = anime?.averageScore ? (anime.averageScore / 10).toFixed(1) : '9.0';
  const studio = anime?.studios?.nodes?.[0]?.name || 'Animation Studio';
  const cleanSeriesDesc = (anime?.description || '').replace(/<[^>]*>?/gm, '');

  const totalEpisodes = useMemo(() => {
    if (anime?.episodes && anime.episodes > 0) return anime.episodes;
    if (anime?.nextAiringEpisode?.episode) return Math.max(1, anime.nextAiringEpisode.episode - 1);
    return 12;
  }, [anime]);

  const allCurrentEpisodes = useMemo(() => {
    const thumbnail =
      anime?.bannerImage ||
      anime?.coverImage?.extraLarge ||
      anime?.coverImage?.large ||
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500';

    return Array.from({ length: totalEpisodes }, (_, i) => {
      const epNum = i + 1;
      return {
        number: epNum,
        title: `Episode ${epNum}`,
        duration: '24m',
        thumbnail,
        synopsis: cleanSeriesDesc || `Episode ${epNum} of ${animeTitle}.`,
      };
    });
  }, [totalEpisodes, anime, animeTitle, cleanSeriesDesc]);

  const episodeChunks = useMemo(() => {
    if (totalEpisodes <= CHUNK_SIZE) return [];
    const chunks = [];
    for (let i = 0; i < totalEpisodes; i += CHUNK_SIZE) {
      const start = i + 1;
      const end = Math.min(i + CHUNK_SIZE, totalEpisodes);
      chunks.push({ start, end, label: `${start} - ${end}` });
    }
    return chunks;
  }, [totalEpisodes]);

  const visibleEpisodes = useMemo(() => {
    if (episodeChunks.length === 0) return allCurrentEpisodes;
    const start = selectedChunkIdx * CHUNK_SIZE;
    return allCurrentEpisodes.slice(start, start + CHUNK_SIZE);
  }, [allCurrentEpisodes, episodeChunks, selectedChunkIdx]);

  const currentEpData = useMemo(() => {
    return (
      allCurrentEpisodes.find((ep) => ep.number === currentEpisodeNum) ||
      allCurrentEpisodes[0] || {
        number: currentEpisodeNum,
        title: `Episode ${currentEpisodeNum}`,
        duration: '24m',
      }
    );
  }, [allCurrentEpisodes, currentEpisodeNum]);

  const rangeContainerRef = useRef(null);

  const scrollRange = (direction) => {
    if (rangeContainerRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      rangeContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleSelectEpisode = (epNumber) => {
    setCurrentEpisodeNum(epNumber);
    const chunkIdx = Math.floor((epNumber - 1) / CHUNK_SIZE);
    setSelectedChunkIdx(chunkIdx);
    setSearchParams({ ep: epNumber }, { replace: true });
    window.scrollTo({ top: 120, behavior: 'smooth' });

    if (anime) {
      saveWatchProgress({
        id: id || 101922,
        title: animeTitle,
        episodeNumber: epNumber,
        totalEpisodes,
        banner: anime.bannerImage || anime.coverImage?.extraLarge,
        cover: anime.coverImage?.large || anime.coverImage?.extraLarge,
        progressPercent: Math.round((epNumber / totalEpisodes) * 100),
      });
    }
  };

  const recommendedAnime = useMemo(() => {
    if (anime?.recommendations && Array.isArray(anime.recommendations) && anime.recommendations.length > 0) {
      return anime.recommendations;
    }
    return (
      anime?.recommendations?.nodes
        ?.map((n) => n.mediaRecommendation)
        ?.filter(Boolean) || []
    );
  }, [anime]);

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

  if (loading && !anime) {
    return (
      <div className="min-h-[70vh] bg-[#060709] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-2 border-[#E2E8F0] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-[#94A3B8] font-medium tracking-wide animate-pulse">Loading Anime...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060709] text-white pt-20 pb-20 selection:bg-white/20 selection:text-white">
      {/* 1. CINEMA VIDEO PLAYER STAGE */}
      <section className="relative w-full bg-black border-b border-white/10 shadow-2xl">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6">
          {/* Top Bar: Back button, Server Switcher & Audio Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3 px-2">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#94A3B8] hover:text-white transition-colors group cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Anime</span>
            </button>

            <div className="flex flex-wrap items-center gap-2">
              {/* Server Switcher */}
              <div className="flex items-center gap-1 bg-[#0F1115] border border-white/10 rounded-full px-2 py-1 text-xs">
                <span className="text-[#94A3B8] text-[11px] px-2 font-medium">Server:</span>
                <button
                  onClick={() => setStreamServer('server1')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    streamServer === 'server1'
                      ? 'bg-[#E2E8F0] text-black shadow-sm'
                      : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
                  }`}
                >
                  Server 1 (VidPlus)
                </button>
                <button
                  onClick={() => setStreamServer('server2')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    streamServer === 'server2'
                      ? 'bg-[#E2E8F0] text-black shadow-sm'
                      : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
                  }`}
                >
                  Server 2 (HD Node)
                </button>
                <button
                  onClick={() => setStreamServer('server3')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    streamServer === 'server3'
                      ? 'bg-[#E2E8F0] text-black shadow-sm'
                      : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
                  }`}
                >
                  Server 3 (Backup Node)
                </button>
              </div>

              {/* Audio Language Switcher */}
              <div className="flex items-center gap-1 bg-[#0F1115] border border-white/10 rounded-full px-2 py-1 text-xs">
                <span className="text-[#94A3B8] text-[11px] px-2 font-medium">Audio:</span>
                {['Sub (JP)', 'Dub (EN)'].map((srv) => (
                  <button
                    key={srv}
                    onClick={() => setActiveServer(srv)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      activeServer === srv
                        ? 'bg-[#E2E8F0] text-black shadow-sm'
                        : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {srv}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Video Player Display */}
          <div
            ref={playerContainerRef}
            className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10"
          >
            <iframe
              key={`anime-${id}-${currentEpData.number}-${streamServer}-${activeServer}-${reloadKey}`}
              src={
                streamServer === 'server3'
                  ? `https://vidsrc.pm/embed/anime/${id || 101922}/${currentEpData.number}`
                  : streamServer === 'server2'
                  ? `https://animeembed.com/embed/ani/${id || 101922}/${currentEpData.number}?track=${activeServer.startsWith('Dub') ? 'dub' : 'sub'}&server=1&autoPlay=0&autoSkip=1&accent=E2E8F0`
                  : `https://player.vidplus.to/embed/anime/${id || 101922}/${currentEpData.number}?dub=${activeServer.startsWith('Dub') ? 'true' : 'false'}&autoplay=false`
              }
              className="w-full h-full border-0"
              allowFullScreen
              webkitallowfullscreen="true"
              mozallowfullscreen="true"
              referrerPolicy="no-referrer"
              allow="accelerometer; autoplay *; clipboard-write *; encrypted-media *; gyroscope; picture-in-picture *; fullscreen *"
              title={`${animeTitle} Episode ${currentEpData.number}`}
            />
          </div>

          {/* Quick Episode Navigation & Embed Recovery Bar */}
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
                Episode {currentEpisodeNum} <span className="text-[#94A3B8] font-normal">/ {totalEpisodes}</span>
              </span>

              <button
                onClick={() => handleSelectEpisode(currentEpisodeNum + 1)}
                disabled={currentEpisodeNum >= totalEpisodes}
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
                <span>Reload Player</span>
              </button>
              <button
                onClick={toggleFullscreen}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-xs text-[#94A3B8] hover:text-white transition-all cursor-pointer"
                title="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
              </button>
            </div>
          </div>

          {/* Quick Direct Link Bar */}
          <div className="flex items-center justify-between text-xs text-[#94A3B8]/70 mt-3 px-2 flex-wrap gap-2">
            <span>Video not loading? Toggle between Server 1 and Server 2, or switch Audio (Sub/Dub).</span>
            <div className="flex items-center gap-3">
              <a
                href={
                  streamServer === 'server1'
                    ? `https://player.vidplus.to/embed/anime/${id || 101922}/${currentEpData.number}?dub=${activeServer.startsWith('Dub') ? 'true' : 'false'}&autoplay=false`
                    : streamServer === 'server2'
                    ? `https://animeembed.com/embed/ani/${id || 101922}/${currentEpData.number}?track=${activeServer.startsWith('Dub') ? 'dub' : 'sub'}&server=1&autoPlay=0`
                    : `https://vidsrc.pm/embed/anime/${id || 101922}/${currentEpData.number}`
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all text-[11px] font-medium border border-white/10"
              >
                <span>Direct Player ↗</span>
              </a>
              <span className="hidden sm:inline font-mono text-[11px] text-[#94A3B8]">
                ANIME ID: {id || 101922} • Ep {currentEpisodeNum}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. ANIME OVERVIEW CARD */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-[#0F1115] rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl flex flex-col md:flex-row gap-6 sm:gap-8 items-start">
          <div className="w-36 sm:w-52 aspect-[2/3] rounded-2xl overflow-hidden flex-none shadow-2xl border border-white/10 mx-auto md:mx-0 bg-black/60">
            <img
              src={anime.coverImage?.large || anime.coverImage?.extraLarge}
              alt={animeTitle}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-4 flex-1 w-full">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight">
                  {animeTitle}
                </h1>
                <p className="text-xs sm:text-sm text-emerald-400 font-medium mt-1">
                  {anime.title?.native || anime.title?.romaji}
                </p>
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
                    alert('Anime link copied to clipboard!');
                  }}
                  className="p-2.5 rounded-xl bg-[#16181F] border border-white/10 text-gray-300 hover:text-white transition-all text-xs cursor-pointer"
                  title="Share Anime"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-sm text-[#94A3B8] leading-relaxed line-clamp-3">
              {cleanSeriesDesc}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 pt-3 border-t border-white/10 text-xs sm:text-sm">
              <div className="space-y-2.5">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-white min-w-[70px]">Genres:</span>
                  <span className="text-emerald-400 font-semibold">{anime.genres?.join(', ')}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-white min-w-[70px]">Studio:</span>
                  <span className="text-[#94A3B8]">{studio}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-white min-w-[70px]">Format:</span>
                  <span className="text-emerald-400 font-medium">{anime.format || 'TV'}</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-white min-w-[70px]">Episodes:</span>
                  <span className="text-white font-bold">{totalEpisodes} Total Episodes</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-white min-w-[70px]">Status:</span>
                  <span className="text-[#94A3B8]">{anime.status || 'Finished'}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-white min-w-[70px]">Score:</span>
                  <span className="text-amber-400 font-bold">{score} / 10</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. EPISODE GRID & PAGINATION CHUNKS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">
        <div className="bg-[#0F1115] rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-xl sm:text-2xl font-black text-white">Episodes</h2>

            {/* Chunk Range Buttons (e.g. 1-25, 26-50) */}
            {episodeChunks.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                {episodeChunks.map((chunk, idx) => (
                  <button
                    key={chunk.label}
                    onClick={() => setSelectedChunkIdx(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      selectedChunkIdx === idx
                        ? 'bg-[#E2E8F0] text-black border-[#E2E8F0] shadow-sm'
                        : 'bg-[#16181F] border-white/10 text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    {chunk.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Episode Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {visibleEpisodes.map((ep) => {
              const isPlaying = ep.number === currentEpisodeNum;
              return (
                <div
                  key={ep.number}
                  onClick={() => handleSelectEpisode(ep.number)}
                  className={`group relative rounded-2xl overflow-hidden bg-[#16181F] border transition-all duration-300 cursor-pointer hover:-translate-y-1 shadow-lg ${
                    isPlaying
                      ? 'border-emerald-500 ring-1 ring-emerald-400/30 shadow-xl'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-black/50">
                    <img
                      src={ep.thumbnail}
                      alt={ep.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#16181F] via-transparent to-transparent opacity-80" />
                    <div
                      className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                        isPlaying ? 'opacity-100 bg-white/10' : 'opacity-0 group-hover:opacity-100 bg-black/40'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                        <Play className="w-4 h-4 fill-black text-black translate-x-0.5" />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold line-clamp-1 ${isPlaying ? 'text-emerald-400' : 'text-white'}`}>
                        {ep.title}
                      </span>
                      {isPlaying && (
                        <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-1 rounded">
                          Playing
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#94A3B8]">{ep.duration}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. RECOMMENDED ANIME ROW */}
      {recommendedAnime.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <AnimeRow
            title="Recommended Anime"
            animeList={recommendedAnime}
            onCardClick={(a) => navigate(`/watch/anime/${a.id}`)}
          />
        </section>
      )}
    </div>
  );
}

