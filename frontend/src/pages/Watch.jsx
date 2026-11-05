import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';
import AnimeRow from '../components/AnimeRow';
import { getAnimeDetails, FALLBACK_HERO } from '../services/anilistService';
import { getMovieDetails, getTVDetails, getTVSeason, getTMDBImageUrl } from '../services/tmdbService';
import { saveWatchProgress, getLastWatchedEpisode } from '../services/watchHistoryService';
import {
  ThumbsUp, ThumbsDown, Bookmark, Check, Share2, ArrowLeft,
  Star, Play, Tv, ChevronDown, ChevronUp, ChevronLeft, ChevronRight
} from 'lucide-react';

export default function Watch() {
  const { type: urlType, id } = useParams();
  const mediaType = urlType || 'anime'; // 'movie' | 'tv' | 'anime'
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Anime & playback state
  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeasonIdx, setSelectedSeasonIdx] = useState(0);
  const [selectedChunkIdx, setSelectedChunkIdx] = useState(0);
  const [currentEpisodeNum, setCurrentEpisodeNum] = useState(1);
  const [isSaved, setIsSaved] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [activeServer, setActiveServer] = useState('Sub (JP)');
  const [streamServer, setStreamServer] = useState('server1'); // 'server1' (HD Stream) | 'server2' (Backup Node) | 'hls' (Custom HLS)
  const [likes, setLikes] = useState(6640);
  const [dislikes, setDislikes] = useState(127);
  const [userReaction, setUserReaction] = useState(null);

  const CHUNK_SIZE = 25;

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setSelectedSeasonIdx(0);

    const queryEp = searchParams.get('ep') || searchParams.get('e');
    const savedEp = queryEp ? Number(queryEp) : getLastWatchedEpisode(id);
    const initialEp = savedEp && savedEp > 0 ? savedEp : 1;

    setCurrentEpisodeNum(initialEp);
    setSelectedChunkIdx(Math.floor((initialEp - 1) / CHUNK_SIZE));

    if (mediaType === 'movie') {
      getMovieDetails(id).then((movieData) => {
        if (!isMounted) return;
        if (movieData) {
          const formatted = {
            id: movieData.id,
            title: { english: movieData.title, romaji: movieData.original_title },
            bannerImage: getTMDBImageUrl(movieData.backdrop_path, 'original'),
            coverImage: { extraLarge: getTMDBImageUrl(movieData.poster_path, 'w500') },
            averageScore: Math.round((movieData.vote_average || 8) * 10),
            description: movieData.overview,
            genres: movieData.genres?.map((g) => g.name) || ['Cinema'],
            episodes: 1,
            media_type: 'movie',
            release_date: movieData.release_date,
          };
          setAnime(formatted);
          saveWatchProgress({
            id,
            title: movieData.title,
            episodeNumber: 1,
            totalEpisodes: 1,
            banner: formatted.bannerImage,
            cover: formatted.coverImage.extraLarge,
            progressPercent: 100,
          });
        }
        setLoading(false);
      });
    } else if (mediaType === 'tv') {
      getTVDetails(id).then((tvData) => {
        if (!isMounted) return;
        if (tvData) {
          const totalEps = tvData.number_of_episodes || 12;
          const formatted = {
            id: tvData.id,
            title: { english: tvData.name, romaji: tvData.original_name },
            bannerImage: getTMDBImageUrl(tvData.backdrop_path, 'original'),
            coverImage: { extraLarge: getTMDBImageUrl(tvData.poster_path, 'w500') },
            averageScore: Math.round((tvData.vote_average || 8) * 10),
            description: tvData.overview,
            genres: tvData.genres?.map((g) => g.name) || ['TV Series'],
            episodes: totalEps,
            seasons: tvData.number_of_seasons || 1,
            media_type: 'tv',
          };
          setAnime(formatted);
          saveWatchProgress({
            id,
            title: tvData.name,
            episodeNumber: initialEp,
            totalEpisodes: totalEps,
            banner: formatted.bannerImage,
            cover: formatted.coverImage.extraLarge,
            progressPercent: Math.round((initialEp / totalEps) * 100),
          });
        }
        setLoading(false);
      });
    } else {
      getAnimeDetails(id || 101922).then((data) => {
        if (!isMounted) return;
        const loadedAnime = data || FALLBACK_HERO;
        setAnime(loadedAnime);
        setLoading(false);

        const title = loadedAnime.title?.english || loadedAnime.title?.romaji || 'Anime';
        const banner = loadedAnime.bannerImage || loadedAnime.coverImage?.extraLarge;
        const cover = loadedAnime.coverImage?.large || loadedAnime.coverImage?.extraLarge;
        const total = loadedAnime.episodes || 12;

        saveWatchProgress({
          id: id || 101922,
          title,
          episodeNumber: initialEp,
          totalEpisodes: total,
          banner,
          cover,
          progressPercent: Math.round((initialEp / total) * 100),
        });
      });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    return () => {
      isMounted = false;
    };
  }, [id, mediaType]);

  const animeTitle = anime?.title?.english || anime?.title?.romaji || 'Demon Slayer: Kimetsu no Yaiba';
  const score = anime?.averageScore ? (anime.averageScore / 10).toFixed(1) : '9.2';
  const studio = anime?.studios?.nodes?.[0]?.name || 'Ufotable / Studio Pierrot';
  const cleanSeriesDesc = (anime?.description || '').replace(/<[^>]*>?/gm, '');

  const recommendedAnime = useMemo(() => {
    return (
      anime?.recommendations?.nodes
        ?.map((n) => n.mediaRecommendation)
        ?.filter(Boolean) || []
    );
  }, [anime]);

  // 1. Compute exact total episodes for this specific anime
  const totalEpisodes = useMemo(() => {
    if (anime?.episodes && anime.episodes > 0) return anime.episodes;
    if (anime?.nextAiringEpisode?.episode) return Math.max(1, anime.nextAiringEpisode.episode - 1);
    return 12;
  }, [anime]);

  // 2. Compute related seasons & sequels from AniList relations
  const relatedSeasons = useMemo(() => {
    const list = [
      {
        id: Number(id || 101922),
        name: animeTitle,
        format: anime?.format || 'TV',
        episodesCount: totalEpisodes,
        isCurrent: true,
      },
    ];

    if (anime?.relations?.edges) {
      const validFormats = ['TV', 'TV_SHORT', 'MOVIE', 'OVA', 'ONA'];
      const validRelations = ['SEQUEL', 'PREQUEL', 'SIDE_STORY', 'ALTERNATIVE'];
      const seenIds = new Set([Number(id || 101922)]);

      anime.relations.edges.forEach((edge) => {
        const node = edge.node;
        if (node && validFormats.includes(node.format) && validRelations.includes(edge.relationType)) {
          if (!seenIds.has(node.id)) {
            seenIds.add(node.id);
            const title = node.title?.english || node.title?.romaji || 'Related Series';
            list.push({
              id: node.id,
              name: title,
              format: node.format,
              episodesCount: node.episodes || 12,
              isCurrent: false,
              relationType: edge.relationType,
            });
          }
        }
      });
    }

    return list;
  }, [anime, animeTitle, id, totalEpisodes]);

  // Clean formatted labels matching standard Season / Part / Special naming
  const formattedSeasons = useMemo(() => {
    const result = [];
    const currentAnimeItem = relatedSeasons.find((s) => s.isCurrent) || relatedSeasons[0];
    const otherRelations = relatedSeasons.filter((s) => !s.isCurrent);

    // If the anime has more than 50 episodes (e.g. Black Clover 170 eps, Bleach, Naruto),
    // Crunchyroll & standard streaming services divide into broadcast year parts (~51-52 eps each)
    if (totalEpisodes > 50) {
      const partSizes = [];
      let remaining = totalEpisodes;
      while (remaining > 0) {
        if (remaining <= 52) {
          partSizes.push(remaining);
          remaining = 0;
        } else if (remaining - 51 <= 15) {
          const take = Math.min(52, remaining);
          partSizes.push(take);
          remaining -= take;
        } else {
          partSizes.push(51);
          remaining -= 51;
        }
      }

      let startEp = 1;
      partSizes.forEach((count, pIdx) => {
        const endEp = startEp + count - 1;
        const partNumber = pIdx + 1;
        const isPartCurrent = currentEpisodeNum >= startEp && currentEpisodeNum <= endEp;
        result.push({
          key: `part-${partNumber}`,
          id: Number(id || 101922),
          name: `${animeTitle} Part ${partNumber}`,
          cleanLabel: `Season 1 Part ${partNumber}`,
          episodesCount: count,
          partStart: startEp,
          partEnd: endEp,
          isCurrent: isPartCurrent,
          isPart: true,
        });
        startEp = endEp + 1;
      });
    } else {
      // Normal single season entry (< 50 eps)
      const raw = currentAnimeItem?.name || '';
      let clean = 'Season 1';
      const sMatch = raw.match(/Season\s*(\d+)/i) || raw.match(/(\d+)(?:st|nd|rd|th)\s*Season/i);
      const pMatch = raw.match(/Part\s*(\d+)/i) || raw.match(/Cour\s*(\d+)/i);
      if (sMatch && pMatch) clean = `Season ${sMatch[1]} Part ${pMatch[1]}`;
      else if (sMatch) clean = `Season ${sMatch[1]}`;
      else if (pMatch) clean = `Season 1 Part ${pMatch[1]}`;

      result.push({
        ...currentAnimeItem,
        key: `season-curr-${currentAnimeItem?.id || id}`,
        cleanLabel: clean,
        partStart: 1,
        partEnd: totalEpisodes,
        isCurrent: true,
      });
    }

    // Now format relations (Sequels, OVAs, Movies, Side Stories)
    otherRelations.forEach((season, idx) => {
      const raw = season.name || '';
      let clean = raw;

      if (season.format === 'OVA' || (season.relationType === 'SIDE_STORY' && season.format !== 'TV')) {
        clean = 'SP: OVA';
      } else if (season.format === 'MOVIE') {
        const shortName = raw.replace(animeTitle, '').replace(/^[:\-\s]+/, '').trim();
        clean = shortName ? `Movie: ${shortName}` : 'Movie';
      } else {
        const sMatch = raw.match(/Season\s*(\d+)/i) || raw.match(/(\d+)(?:st|nd|rd|th)\s*Season/i);
        const pMatch = raw.match(/Part\s*(\d+)/i) || raw.match(/Cour\s*(\d+)/i);

        if (sMatch && pMatch) {
          clean = `Season ${sMatch[1]} Part ${pMatch[1]}`;
        } else if (sMatch) {
          clean = `Season ${sMatch[1]}`;
        } else if (pMatch) {
          clean = `Season 1 Part ${pMatch[1]}`;
        } else {
          const nextSeasonNum = result.filter((r) => !r.cleanLabel.startsWith('SP:') && !r.cleanLabel.startsWith('Movie:')).length + 1;
          const arc = raw.replace(animeTitle, '').replace(/^[:\-\s]+/, '').trim();
          clean = arc ? `Season ${nextSeasonNum}: ${arc}` : `Season ${nextSeasonNum}`;
        }
      }

      result.push({
        ...season,
        key: `season-rel-${season.id}-${idx}`,
        cleanLabel: clean,
        isCurrent: false,
      });
    });

    return result;
  }, [relatedSeasons, totalEpisodes, animeTitle, id, currentEpisodeNum]);

  const currentSeason = useMemo(() => {
    return formattedSeasons.find((s) => s.isCurrent) || formattedSeasons[0];
  }, [formattedSeasons]);

  // 3. Generate every individual episode from 1 to totalEpisodes
  const allCurrentEpisodes = useMemo(() => {
    const thumbnail =
      anime?.bannerImage ||
      anime?.coverImage?.extraLarge ||
      anime?.coverImage?.large ||
      'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101922-WBsBl0ClmgLd.jpg';

    return Array.from({ length: totalEpisodes }, (_, i) => {
      const epNum = i + 1;
      return {
        number: epNum,
        title: `Episode ${epNum}`,
        duration: '24m',
        released: anime?.seasonYear ? `${anime.seasonYear}` : 'Episode Release',
        thumbnail,
        synopsis: cleanSeriesDesc || `Episode ${epNum} of ${animeTitle}.`,
      };
    });
  }, [totalEpisodes, anime, animeTitle, cleanSeriesDesc]);

  // 4. Batching for anime with 25+ episodes (e.g. Black Clover, Naruto, One Piece)
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

  // Current playing episode object
  const currentEpData = useMemo(() => {
    return (
      allCurrentEpisodes.find((ep) => ep.number === currentEpisodeNum) ||
      allCurrentEpisodes[0] || {
        number: currentEpisodeNum,
        title: `Episode ${currentEpisodeNum}`,
        duration: '24m',
        released: 'Recent',
        synopsis: cleanSeriesDesc,
      }
    );
  }, [allCurrentEpisodes, currentEpisodeNum, cleanSeriesDesc]);

  // Next and Previous episodes for in-player controls
  const prevEpData = useMemo(() => {
    return currentEpisodeNum > 1 ? allCurrentEpisodes[currentEpisodeNum - 2] : null;
  }, [allCurrentEpisodes, currentEpisodeNum]);

  const nextEpData = useMemo(() => {
    return currentEpisodeNum < totalEpisodes ? allCurrentEpisodes[currentEpisodeNum] : null;
  }, [allCurrentEpisodes, currentEpisodeNum, totalEpisodes]);

  const rangeContainerRef = useRef(null);

  const scrollRange = (direction) => {
    if (rangeContainerRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      rangeContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (rangeContainerRef.current && rangeContainerRef.current.children[selectedChunkIdx]) {
      rangeContainerRef.current.children[selectedChunkIdx].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [selectedChunkIdx]);

  const handleSelectEpisode = (epNumber) => {
    setCurrentEpisodeNum(epNumber);
    const chunkIdx = Math.floor((epNumber - 1) / CHUNK_SIZE);
    setSelectedChunkIdx(chunkIdx);
    setSearchParams({ ep: epNumber }, { replace: true });
    window.scrollTo({ top: 120, behavior: 'smooth' });

    // Update watch history
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

  return (
    <div className="min-h-screen bg-[#060709] text-white pt-20 pb-20 selection:bg-white/20 selection:text-white">
      {/* 1. CINEMA VIDEO PLAYER STAGE */}
      <section className="relative w-full bg-black border-b border-white/10 shadow-2xl">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6">
          {/* Top Bar: Back button, Server Switcher & Audio Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3 px-2">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#AAA2B7] hover:text-white transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Browse</span>
            </button>

            <div className="flex flex-wrap items-center gap-2">
              {/* Server Switcher */}
              <div className="flex items-center gap-1 bg-[#111318] border border-white/10 rounded-full px-2 py-1 text-xs">
                <span className="text-[#AAA2B7] text-[11px] px-2 font-medium">Server:</span>
                <button
                  onClick={() => setStreamServer('server1')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${streamServer === 'server1'
                    ? 'bg-[#E2E8F0] text-black shadow-sm'
                    : 'text-[#AAA2B7] hover:text-white hover:bg-white/5'
                    }`}
                >
                  Server 1 (HD Stream)
                </button>
                <button
                  onClick={() => setStreamServer('server2')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${streamServer === 'server2'
                    ? 'bg-[#E2E8F0] text-black shadow-sm'
                    : 'text-[#AAA2B7] hover:text-white hover:bg-white/5'
                    }`}
                >
                  Server 2 (Backup Node)
                </button>
                <button
                  onClick={() => setStreamServer('hls')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${streamServer === 'hls'
                    ? 'bg-[#E2E8F0] text-black shadow-sm'
                    : 'text-[#AAA2B7] hover:text-white hover:bg-white/5'
                    }`}
                >
                  Server 3 (HLS Test)
                </button>
              </div>

              {/* Audio Language Switcher */}
              <div className="flex items-center gap-1 bg-[#111318] border border-white/10 rounded-full px-2 py-1 text-xs">
                <span className="text-[#AAA2B7] text-[11px] px-2 font-medium">Audio:</span>
                {['Sub (JP)', 'Dub (EN)'].map((srv) => (
                  <button
                    key={srv}
                    onClick={() => setActiveServer(srv)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${activeServer === srv
                      ? 'bg-[#E2E8F0] text-black shadow-sm'
                      : 'text-[#AAA2B7] hover:text-white hover:bg-white/5'
                      }`}
                  >
                    {srv}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Video Player Display */}
          {streamServer === 'hls' ? (
            <VideoPlayer
              src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
              poster={currentEpData.thumbnail || anime?.bannerImage || anime?.coverImage?.extraLarge}
              title={`${animeTitle} — E${currentEpData.number}`}
              episodeTitle={currentEpData.title}
              animeId={id}
              episodeNum={currentEpData.number}
              hasNext={Boolean(nextEpData)}
              hasPrev={Boolean(prevEpData)}
              onNextEpisode={() => nextEpData && handleSelectEpisode(nextEpData.number)}
              onPrevEpisode={() => prevEpData && handleSelectEpisode(prevEpData.number)}
            />
          ) : mediaType === 'movie' ? (
            <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10">
              <iframe
                key={`movie-${id}-${streamServer}`}
                src={
                  streamServer === 'server2'
                    ? `https://vidsrc.to/embed/movie/${id}`
                    : `https://vidlink.pro/movie/${id}`
                }
                className="w-full h-full border-0"
                allowFullScreen
                referrerPolicy="no-referrer"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                title={`${animeTitle} - Full Movie`}
              />
            </div>
          ) : mediaType === 'tv' ? (
            <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10">
              <iframe
                key={`tv-${id}-${currentEpisodeNum}-${streamServer}`}
                src={
                  streamServer === 'server2'
                    ? `https://vidsrc.to/embed/tv/${id}/1/${currentEpisodeNum}`
                    : `https://vidlink.pro/tv/${id}/1/${currentEpisodeNum}`
                }
                className="w-full h-full border-0"
                allowFullScreen
                referrerPolicy="no-referrer"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                title={`${animeTitle} Season 1 Episode ${currentEpisodeNum}`}
              />
            </div>
          ) : (
            <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10">
              <iframe
                key={`anime-${id}-${currentEpData.number}-${streamServer}-${activeServer}`}
                src={`https://www.animeembed.com/embed/ani/${id || 101922}/${currentEpData.number}?track=${activeServer.startsWith('Dub') ? 'dub' : 'sub'}&server=${streamServer === 'server2' ? '2' : '1'}&autoPlay=0&autoSkip=1&accent=8955EF`}
                className="w-full h-full border-0"
                allowFullScreen
                referrerPolicy="no-referrer"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                title={`${animeTitle} Episode ${currentEpData.number}`}
              />
            </div>
          )}

          {/* Stream Player Controls & Fallback */}
          <div className="flex items-center justify-between text-xs text-[#AAA2B7]/70 mt-3 px-2 flex-wrap gap-2">
            <span>
              {mediaType === 'movie'
                ? 'Streaming in 4K/1080p. Switch between Server 1 and Server 2 if any node buffers.'
                : mediaType === 'tv'
                ? 'Streaming TV Series. Toggle between Server 1 and Server 2 if needed.'
                : 'Video not loading? Toggle between Server 1 and Server 2, or switch Audio (Sub/Dub).'}
            </span>
            <div className="flex items-center gap-3">
              <a
                href={
                  mediaType === 'movie'
                    ? `https://vidlink.pro/movie/${id}`
                    : mediaType === 'tv'
                    ? `https://vidlink.pro/tv/${id}/1/${currentEpisodeNum}`
                    : `https://www.animeembed.com/embed/ani/${id || 101922}/${currentEpData.number}?track=${activeServer.startsWith('Dub') ? 'dub' : 'sub'}&autoPlay=1`
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all text-[11px] font-medium border border-white/10"
              >
                <span>Direct Player ↗</span>
              </a>
              <span className="hidden sm:inline font-mono text-[11px] text-[#94A3B8]">
                {mediaType.toUpperCase()} ID: {id || 101922} {mediaType !== 'movie' ? `• Ep ${currentEpisodeNum}` : ''}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. ANIME & CURRENT EPISODE DETAILS (Queue cards removed, consolidated anime info) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-[#111318] rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl flex flex-col md:flex-row gap-6 sm:gap-8 items-start">
          {/* Anime Poster Card */}
          <div className="w-32 sm:w-44 aspect-[2/3] rounded-2xl overflow-hidden flex-none shadow-2xl border border-white/10 mx-auto md:mx-0">
            <img
              src={anime?.coverImage?.large || anime?.coverImage?.extraLarge || 'https://images.alphacoders.com/891/891040.jpg'}
              alt={animeTitle}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Details Column */}
          <div className="space-y-4 flex-1 w-full">
            {/* Top Row: Series Title + Status */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link
                  to={`/explore?q=${encodeURIComponent(animeTitle)}`}
                  className="text-xs sm:text-sm font-bold text-[#94A3B8] hover:underline uppercase tracking-wider block"
                >
                  {animeTitle}
                </Link>
                {/* Current Episode Title */}
                <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight mt-1">
                  E{currentEpData.number} - {currentEpData.title}
                </h1>
              </div>

              {/* Status & Rating Badges */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-[#15171E] px-3 py-1 rounded-xl border border-white/10 text-amber-400 font-bold text-xs sm:text-sm">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span>{score}</span>
                </div>
                <span className="bg-white/10 text-gray-200 border border-white/20 px-3 py-1 rounded-xl text-xs font-bold">
                  {anime?.status || 'Finished Airing'}
                </span>
              </div>
            </div>

            {/* Badges row: 14+ | Sub | Dub | Released | Studio */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-[#AAA2B7] font-medium">
              <span className="bg-[#15171E] border border-white/10 px-2.5 py-0.5 rounded text-white font-bold">
                14+
              </span>
              <span>•</span>
              <span className="text-gray-300 font-semibold">Sub | Dub</span>
              <span>•</span>
              <span>Released: {currentEpData.released || 'Dec 8, 2020'}</span>
              <span>•</span>
              <span>Studio: <strong className="text-white">{studio}</strong></span>
              <span>•</span>
              <span>Total Seasons: <strong className="text-white">{relatedSeasons.length}</strong></span>
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-2 pt-0.5">
              {anime?.genres?.map((g) => (
                <span
                  key={g}
                  className="bg-[#15171E] border border-white/10 text-white text-xs font-medium px-2.5 py-0.5 rounded-lg"
                >
                  {g}
                </span>
              ))}
            </div>

            {/* Action Buttons: Like, Dislike, Watchlist, Share */}
            <div className="flex items-center gap-2 pt-1 text-xs">
              <button
                onClick={handleLike}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all ${userReaction === 'like'
                  ? 'bg-[#E2E8F0] text-black border-[#E2E8F0]'
                  : 'bg-[#15171E] border-white/10 text-gray-300 hover:text-white hover:border-white/20'
                  }`}
              >
                <ThumbsUp className={`w-4 h-4 ${userReaction === 'like' ? 'fill-black' : ''}`} />
                <span className="font-bold">{(likes / 1000).toFixed(1)}k</span>
              </button>

              <button
                onClick={handleDislike}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all ${userReaction === 'dislike'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-[#15171E] border-white/10 text-gray-300 hover:text-white hover:border-white/20'
                  }`}
              >
                <ThumbsDown className={`w-4 h-4 ${userReaction === 'dislike' ? 'fill-white' : ''}`} />
                <span className="font-bold">{dislikes}</span>
              </button>

              <button
                onClick={() => setIsSaved(!isSaved)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all ${isSaved
                  ? 'bg-[#E2E8F0] text-black border-[#E2E8F0]'
                  : 'bg-[#15171E] border-white/10 text-gray-300 hover:text-white hover:border-white/20'
                  }`}
                title="Add to Watchlist"
              >
                {isSaved ? <Check className="w-4 h-4 stroke-[3]" /> : <Bookmark className="w-4 h-4" />}
                <span className="font-bold">{isSaved ? 'In Watchlist' : 'Watchlist'}</span>
              </button>

              <button
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  alert('Episode link copied to clipboard!');
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#15171E] border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-all"
                title="Share Episode"
              >
                <Share2 className="w-4 h-4" />
                <span className="font-bold">Share</span>
              </button>
            </div>

            {/* Episode & Series Synopsis */}
            <div className="pt-2 border-t border-white/5">
              <p
                className={`text-sm text-[#AAA2B7] leading-relaxed transition-all ${showFullDesc ? '' : 'line-clamp-2'
                  }`}
              >
                {currentEpData.synopsis ? (
                  <span>
                    <strong className="text-gray-200">Episode synopsis: </strong>
                    {currentEpData.synopsis}
                    <br className="my-1.5" />
                    <strong className="text-gray-200">About the series: </strong>
                    {cleanSeriesDesc}
                  </span>
                ) : (
                  cleanSeriesDesc
                )}
              </p>
              <button
                onClick={() => setShowFullDesc(!showFullDesc)}
                className="mt-1.5 text-xs font-bold text-[#94A3B8] hover:underline uppercase tracking-wider flex items-center gap-1"
              >
                <span>{showFullDesc ? 'SHOW LESS' : 'SHOW MORE'}</span>
                {showFullDesc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SEASONS TABS & EPISODES CATALOG */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
              <Tv className="w-6 h-6 text-[#94A3B8]" />
              <span>Seasons & Episodes</span>
            </h2>
            <p className="text-xs text-[#AAA2B7] mt-1">
              Select an episode to stream instantly in HD.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[#94A3B8] bg-white/5 border border-white/10 px-3 py-2 rounded-xl">
              {totalEpisodes} Total Episodes
            </span>
          </div>
        </div>

        {/* Episode Batch Range Filter (for 25+ eps like Black Clover / One Piece) */}
        {episodeChunks.length > 0 && (
          <div className="relative flex items-center gap-2 w-full">
            <span className="text-xs font-semibold text-[#AAA2B7] flex-none pr-1">Episode Range:</span>

            {/* Left Scroll Arrow */}
            <button
              onClick={() => scrollRange('left')}
              aria-label="Scroll episode ranges left"
              className="flex-none p-1.5 rounded-xl bg-[#15171E] hover:bg-white hover:text-black border border-white/10 text-gray-300 transition-all shadow-md active:scale-95"
              title="Previous ranges"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Scrollable Range Buttons Container */}
            <div
              ref={rangeContainerRef}
              className="flex items-center gap-2 overflow-x-auto scroll-smooth no-scrollbar py-1 flex-1"
            >
              {episodeChunks.map((chunk, idx) => (
                <button
                  key={chunk.label}
                  onClick={() => setSelectedChunkIdx(idx)}
                  className={`flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    selectedChunkIdx === idx
                      ? 'bg-[#E2E8F0] text-black border-[#E2E8F0] shadow-sm'
                      : 'bg-[#15171E] border-white/10 text-[#94A3B8] hover:text-white hover:border-white/20'
                  }`}
                >
                  {chunk.label}
                </button>
              ))}
            </div>

            {/* Right Scroll Arrow */}
            <button
              onClick={() => scrollRange('right')}
              aria-label="Scroll episode ranges right"
              className="flex-none p-1.5 rounded-xl bg-[#15171E] hover:bg-white hover:text-black border border-white/10 text-gray-300 transition-all shadow-md active:scale-95"
              title="Next ranges"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Episodes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 pt-2">
          {visibleEpisodes.map((ep) => {
            const isPlaying = ep.number === currentEpData.number;
            return (
              <div
                key={ep.number}
                onClick={() => handleSelectEpisode(ep.number)}
                className={`group relative rounded-2xl overflow-hidden bg-[#15171E] border transition-all duration-300 cursor-pointer hover:-translate-y-1 shadow-lg ${
                  isPlaying
                    ? 'border-[#E2E8F0] ring-1 ring-white/40 shadow-xl'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                {/* 16:9 Thumbnail */}
                <div className="relative aspect-video w-full overflow-hidden bg-black/50">
                  <img
                    src={ep.thumbnail}
                    alt={ep.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#15171E] via-transparent to-transparent opacity-80" />

                  {/* Playing or Play Icon Overlay */}
                  <div
                    className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                      isPlaying
                        ? 'opacity-100 bg-white/10'
                        : 'opacity-0 group-hover:opacity-100 bg-black/40'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-black text-black translate-x-0.5" />
                    </div>
                  </div>

                  {/* Episode Number Badge */}
                  <div className="absolute top-2.5 left-2.5 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[11px] font-black text-white">
                    E{ep.number}
                  </div>

                  {/* Duration Badge */}
                  <div className="absolute bottom-2.5 right-2.5 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-gray-200">
                    {ep.duration}
                  </div>
                </div>

                {/* Episode Details */}
                <div className="p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4
                      className={`text-sm font-bold leading-snug line-clamp-1 transition-colors ${
                        isPlaying ? 'text-[#E2E8F0]' : 'text-white group-hover:text-gray-200'
                      }`}
                    >
                      {ep.title}
                    </h4>
                    {isPlaying && (
                      <span className="flex-none bg-[#E2E8F0] text-black text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                        Playing
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#AAA2B7] line-clamp-2 leading-relaxed">
                    {ep.synopsis}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-[#AAA2B7] pt-1 border-t border-white/5">
                    <span>{ep.released}</span>
                    <span className="text-gray-400 font-medium">Sub | Dub</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. SIMILAR ANIME RECOMMENDATIONS */}
      {recommendedAnime.length > 0 && (
        <section className="border-t border-white/10 pt-6">
          <AnimeRow
            title="You Might Also Like"
            items={recommendedAnime}
            onSelectAnime={(a) => navigate(`/watch/${a.id}`)}
            onPlayAnime={(a) => navigate(`/watch/${a.id}`)}
          />
        </section>
      )}
    </div>
  );
}
