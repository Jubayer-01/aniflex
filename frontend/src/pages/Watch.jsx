import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import AnimeRow from '../components/AnimeRow';
import NotFound from './NotFound';
import { getAnimeDetails } from '../services/anilistService';
import { getMovieDetails, getTVDetails, getTVSeason, getTMDBImageUrl } from '../services/tmdbService';
import { saveWatchProgress, getLastWatchedEpisode } from '../services/watchHistoryService';
import {
  ThumbsUp, ThumbsDown, Bookmark, Check, Share2, ArrowLeft,
  Star, Play, Tv, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  RotateCcw, SkipBack, SkipForward
} from 'lucide-react';

export default function Watch() {
  const { type: urlType, id } = useParams();
  const mediaType = urlType || 'anime'; // 'movie' | 'tv' | 'anime'
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Validate ID: All valid TMDB and AniList IDs are strictly numeric
  const isValidNumericId = Boolean(id && /^\d+$/.test(String(id)));
  const [hasError, setHasError] = useState(false);

  // Anime & playback state
  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeasonIdx, setSelectedSeasonIdx] = useState(0);
  const [selectedChunkIdx, setSelectedChunkIdx] = useState(0);
  const [currentEpisodeNum, setCurrentEpisodeNum] = useState(1);
  const [isSaved, setIsSaved] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [activeServer, setActiveServer] = useState('Sub (JP)');
  const [streamServer, setStreamServer] = useState('server1'); // 'server1' (HD Stream) | 'server2' (Backup Node)
  const [likes, setLikes] = useState(6640);
  const [dislikes, setDislikes] = useState(127);
  const [userReaction, setUserReaction] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // TV Multi-Season & Real Episode State (matching unified season selector)
  const [tvSeasonNum, setTvSeasonNum] = useState(1);
  const [tvSeasonsList, setTvSeasonsList] = useState([]);
  const [tvEpisodesList, setTvEpisodesList] = useState([]);
  const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState(false);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

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
    const querySeason = searchParams.get('season') || searchParams.get('s');
    if (querySeason) setTvSeasonNum(Number(querySeason));

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
            coverImage: {
              extraLarge: getTMDBImageUrl(movieData.poster_path, 'w500'),
              large: getTMDBImageUrl(movieData.poster_path, 'w500'),
            },
            averageScore: Math.round((movieData.vote_average || 8) * 10),
            description: movieData.overview,
            tagline: movieData.tagline,
            genres: movieData.genres?.map((g) => g.name) || ['Cinema'],
            episodes: 1,
            media_type: 'movie',
            release_date: movieData.release_date,
            runtime: movieData.runtime,
            directors: movieData.credits?.crew?.filter((c) => c.job === 'Director')?.map((c) => c.name) || [],
            cast: movieData.credits?.cast?.slice(0, 4)?.map((c) => c.name) || [],
            country: movieData.production_countries?.[0]?.name || 'United States',
            recommendations: movieData.recommendations?.results?.map((m) => ({
              id: m.id,
              title: { english: m.title, romaji: m.original_title },
              bannerImage: getTMDBImageUrl(m.backdrop_path, 'w500'),
              coverImage: {
                extraLarge: getTMDBImageUrl(m.poster_path, 'w500'),
                large: getTMDBImageUrl(m.poster_path, 'w500'),
              },
              averageScore: Math.round((m.vote_average || 7) * 10),
              media_type: 'movie',
              release_date: m.release_date,
            })) || [],
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
        } else {
          setHasError(true);
        }
        setLoading(false);
      });
    } else if (mediaType === 'tv') {
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
            title: { english: tvData.name, romaji: tvData.original_name },
            bannerImage: getTMDBImageUrl(tvData.backdrop_path, 'original'),
            coverImage: {
              extraLarge: getTMDBImageUrl(tvData.poster_path, 'w500'),
              large: getTMDBImageUrl(tvData.poster_path, 'w500'),
            },
            averageScore: Math.round((tvData.vote_average || 8) * 10),
            description: tvData.overview,
            tagline: tvData.tagline,
            genres: tvData.genres?.map((g) => g.name) || ['TV Series'],
            episodes: totalEps,
            seasons: tvData.number_of_seasons || 1,
            media_type: 'tv',
            release_date: tvData.first_air_date,
            country: tvData.production_countries?.[0]?.name || tvData.origin_country?.[0] || 'United States',
            directors: tvData.created_by?.map((c) => c.name) || [],
            cast: tvData.credits?.cast?.slice(0, 4)?.map((c) => c.name) || [],
            recommendations: tvData.recommendations?.results?.map((m) => ({
              id: m.id,
              title: { english: m.name, romaji: m.original_name },
              bannerImage: getTMDBImageUrl(m.backdrop_path, 'w500'),
              coverImage: {
                extraLarge: getTMDBImageUrl(m.poster_path, 'w500'),
                large: getTMDBImageUrl(m.poster_path, 'w500'),
              },
              averageScore: Math.round((m.vote_average || 7) * 10),
              media_type: 'tv',
              release_date: m.first_air_date,
            })) || [],
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
        } else {
          setHasError(true);
        }
        setLoading(false);
      });
    } else {
      getAnimeDetails(id).then((data) => {
        if (!isMounted) return;
        if (data) {
          setAnime(data);
          const title = data.title?.english || data.title?.romaji || 'Anime';
          const banner = data.bannerImage || data.coverImage?.extraLarge;
          const cover = data.coverImage?.large || data.coverImage?.extraLarge;
          const total = data.episodes || 12;

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
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    return () => {
      isMounted = false;
    };
  }, [id, mediaType]);

  // Fetch real episodes when tvSeasonNum changes for TV Series
  useEffect(() => {
    if (mediaType === 'tv' && id) {
      setLoadingEpisodes(true);
      getTVSeason(id, tvSeasonNum).then((seasonData) => {
        if (seasonData?.episodes && seasonData.episodes.length > 0) {
          setTvEpisodesList(seasonData.episodes);
        } else {
          const fallback = Array.from({ length: 12 }, (_, i) => ({
            episode_number: i + 1,
            name: `Episode ${i + 1}`,
            overview: `Episode ${i + 1} of the series.`,
            air_date: '2024',
            runtime: 45,
          }));
          setTvEpisodesList(fallback);
        }
        setLoadingEpisodes(false);
      });
    }
  }, [id, mediaType, tvSeasonNum]);

  const animeTitle = anime?.title?.english || anime?.title?.romaji || 'Demon Slayer: Kimetsu no Yaiba';
  const score = anime?.averageScore ? (anime.averageScore / 10).toFixed(1) : '9.2';
  const studio = anime?.studios?.nodes?.[0]?.name || 'Ufotable / Studio Pierrot';
  const cleanSeriesDesc = (anime?.description || '').replace(/<[^>]*>?/gm, '');

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

  const formattedMovieDuration = useMemo(() => {
    if (!anime?.runtime) return '2h 15m';
    const hours = Math.floor(anime.runtime / 60);
    const mins = anime.runtime % 60;
    return `${hours}h ${mins < 10 ? '0' : ''}${mins}m`;
  }, [anime?.runtime]);

  const movieReleaseYear = anime?.release_date ? anime.release_date.slice(0, 4) : '2025';
  const movieDirector = anime?.directors?.length > 0 ? anime.directors.join(', ') : 'Not specified';
  const movieCast = anime?.cast?.length > 0 ? anime.cast.join(', ') : 'Ensemble Cast';
  const movieCountry = anime?.country || 'United States';

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

  // Sync episode state if embedded player emits a cross-origin postMessage
  useEffect(() => {
    const handlePlayerMessage = (event) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (
          data?.event === 'episode_change' ||
          data?.type === 'episode_change' ||
          data?.action === 'next_episode' ||
          data?.type === 'next'
        ) {
          const nextEp = Number(data.episode || data.episode_number || data.ep);
          if (nextEp && nextEp !== currentEpisodeNum && nextEp <= totalEpisodes) {
            handleSelectEpisode(nextEp);
          }
        }
      } catch {
        // Ignore non-JSON postMessages
      }
    };
    window.addEventListener('message', handlePlayerMessage);
    return () => window.removeEventListener('message', handlePlayerMessage);
  }, [currentEpisodeNum, totalEpisodes, anime]);

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

  useEffect(() => {
    if (anime) {
      const activeTitle = anime.title?.english || anime.title?.romaji || 'Watch';
      document.title = `${activeTitle} — Watch on OmniFlex`;
    }
  }, [anime]);

  if (!isValidNumericId || hasError) {
    return <NotFound />;
  }

  if (loading && !anime) {
    return (
      <div className="min-h-[70vh] bg-[#060709] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-2 border-[#E2E8F0] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-[#94A3B8] font-medium tracking-wide animate-pulse">Loading Title...</span>
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
              className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#94A3B8] hover:text-white transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Browse</span>
            </button>

            <div className="flex flex-wrap items-center gap-2">
              {/* Server Switcher */}
              <div className="flex items-center gap-1 bg-[#0F1115] border border-white/10 rounded-full px-2 py-1 text-xs">
                <span className="text-[#94A3B8] text-[11px] px-2 font-medium">Server:</span>
                <button
                  onClick={() => setStreamServer('server1')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${streamServer === 'server1'
                    ? 'bg-[#E2E8F0] text-black shadow-sm'
                    : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
                    }`}
                >
                  Server 1 (Direct Stream)
                </button>
                <button
                  onClick={() => setStreamServer('server2')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${streamServer === 'server2'
                    ? 'bg-[#E2E8F0] text-black shadow-sm'
                    : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
                    }`}
                >
                  Server 2 (HD Node)
                </button>
                <button
                  onClick={() => setStreamServer('server3')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${streamServer === 'server3'
                    ? 'bg-[#E2E8F0] text-black shadow-sm'
                    : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
                    }`}
                >
                  Server 3 (Backup Node)
                </button>
              </div>

              {/* Audio Language Switcher (Anime only) */}
              {mediaType === 'anime' && (
                <div className="flex items-center gap-1 bg-[#0F1115] border border-white/10 rounded-full px-2 py-1 text-xs">
                  <span className="text-[#94A3B8] text-[11px] px-2 font-medium">Audio:</span>
                  {['Sub (JP)', 'Dub (EN)'].map((srv) => (
                    <button
                      key={srv}
                      onClick={() => setActiveServer(srv)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${activeServer === srv
                        ? 'bg-[#E2E8F0] text-black shadow-sm'
                        : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
                        }`}
                    >
                      {srv}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Video Player Display */}
          {mediaType === 'movie' ? (
            <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10">
              <iframe
                key={`movie-${id}-${streamServer}-${reloadKey}`}
                src={
                  streamServer === 'server3'
                    ? `https://vidsrc.cc/v2/embed/movie/${id}`
                    : streamServer === 'server2'
                    ? `https://vidsrc.to/embed/movie/${id}`
                    : `https://vidsrc.me/embed/movie?tmdb=${id}`
                }
                className="w-full h-full border-0"
                allowFullScreen
                referrerPolicy="origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                title={`${animeTitle} - Full Movie`}
              />
            </div>
          ) : mediaType === 'tv' ? (
            <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10">
              <iframe
                key={`tv-${id}-${tvSeasonNum}-${currentEpisodeNum}-${streamServer}-${reloadKey}`}
                src={
                  streamServer === 'server3'
                    ? `https://vidsrc.cc/v2/embed/tv/${id}/${tvSeasonNum}/${currentEpisodeNum}`
                    : streamServer === 'server2'
                    ? `https://vidsrc.to/embed/tv/${id}/${tvSeasonNum}/${currentEpisodeNum}`
                    : `https://vidsrc.me/embed/tv?tmdb=${id}&season=${tvSeasonNum}&episode=${currentEpisodeNum}`
                }
                className="w-full h-full border-0"
                allowFullScreen
                referrerPolicy="origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                title={`${animeTitle} Season ${tvSeasonNum} Episode ${currentEpisodeNum}`}
              />
            </div>
          ) : (
            <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10">
              <iframe
                key={`anime-${id}-${currentEpData.number}-${streamServer}-${activeServer}-${reloadKey}`}
                src={
                  streamServer === 'server3'
                    ? `https://animeembed.com/embed/ani/${id || 101922}/${currentEpData.number}?track=${activeServer.startsWith('Dub') ? 'dub' : 'sub'}&server=1&autoPlay=0&accent=E2E8F0&captions=en`
                    : streamServer === 'server2'
                    ? `https://animeembed.com/embed/ani/${id || 101922}/${currentEpData.number}?track=${activeServer.startsWith('Dub') ? 'dub' : 'sub'}&server=1&autoPlay=0&autoSkip=1&accent=E2E8F0`
                    : `https://vidsrc.pm/embed/anime/${id || 101922}/${currentEpData.number}`
                }
                className="w-full h-full border-0"
                allowFullScreen
                referrerPolicy="origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                title={`${animeTitle} Episode ${currentEpData.number}`}
              />
            </div>
          )}

          {/* Quick Episode Navigation & Embed Recovery Bar */}
          {mediaType !== 'movie' && (
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
                  title="Reload embed if stream expires or shows playback disabled"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reload Player</span>
                </button>
              </div>
            </div>
          )}

          {/* Stream Player Controls & Fallback */}
          <div className="flex items-center justify-between text-xs text-[#94A3B8]/70 mt-3 px-2 flex-wrap gap-2">
            <span>
              {mediaType === 'movie'
                ? 'Streaming in 4K/1080p. Switch between Server 1 and Server 2 if any node buffers.'
                : mediaType === 'tv'
                ? `Streaming TV Series (Season ${tvSeasonNum}, Ep ${currentEpisodeNum}). Switch servers if needed.`
                : 'Video not loading? Toggle between Server 1 and Server 2, or switch Audio (Sub/Dub).'}
            </span>
            <div className="flex items-center gap-3">
              <a
                href={
                  mediaType === 'movie'
                    ? `https://vidlink.pro/movie/${id}`
                    : mediaType === 'tv'
                    ? `https://vidlink.pro/tv/${id}/${tvSeasonNum}/${currentEpisodeNum}`
                    : streamServer === 'server1'
                    ? `https://vidsrc.pm/embed/anime/${id || 101922}/${currentEpData.number}`
                    : `https://animeembed.com/embed/ani/${id || 101922}/${currentEpData.number}?track=${activeServer.startsWith('Dub') ? 'dub' : 'sub'}&server=1&autoPlay=0`
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all text-[11px] font-medium border border-white/10"
              >
                <span>Direct Player ↗</span>
              </a>
              <span className="hidden sm:inline font-mono text-[11px] text-[#94A3B8]">
                {mediaType.toUpperCase()} ID: {id || 101922} {mediaType === 'tv' ? `• S${tvSeasonNum} E${currentEpisodeNum}` : mediaType !== 'movie' ? `• Ep ${currentEpisodeNum}` : ''}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. MEDIA DETAILS CARD (Dedicated Titanium Layout for Movies matching reference) */}
      {mediaType === 'movie' ? (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-[#0F1115] rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl flex flex-col md:flex-row gap-6 sm:gap-8 items-start">
            {/* Movie Poster (Clean, no trailer button per request) */}
            <div className="w-36 sm:w-52 aspect-[2/3] rounded-2xl overflow-hidden flex-none shadow-2xl border border-white/10 mx-auto md:mx-0 bg-black/60">
              <img
                src={anime?.coverImage?.large || anime?.coverImage?.extraLarge || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500'}
                alt={animeTitle}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Details Column */}
            <div className="space-y-4 flex-1 w-full">
              {/* Title & Action Buttons Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight">
                    {animeTitle}
                  </h1>
                  {anime?.tagline && (
                    <p className="text-xs sm:text-sm text-emerald-400 font-medium italic mt-1">
                      "{anime.tagline}"
                    </p>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-900/30 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Stream in HD</span>
                  </button>
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
                      alert('Movie link copied to clipboard!');
                    }}
                    className="p-2.5 rounded-xl bg-[#16181F] border border-white/10 text-gray-300 hover:text-white transition-all text-xs cursor-pointer"
                    title="Share Movie"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Storyline / Synopsis */}
              <p className="text-sm text-[#94A3B8] italic leading-relaxed pt-1">
                {cleanSeriesDesc || 'No synopsis available for this feature film.'}
              </p>

              {/* 2-Column Metadata Grid (Matching Reference Screenshot) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 pt-3 border-t border-white/10 text-xs sm:text-sm">
                {/* Left Column */}
                <div className="space-y-2.5">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-white min-w-[70px]">Genre:</span>
                    <span className="text-emerald-400 font-semibold">
                      {anime?.genres?.join(', ') || 'Cinema'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-white min-w-[70px]">Actor:</span>
                    <span className="text-[#94A3B8] line-clamp-1">{movieCast}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-white min-w-[70px]">Director:</span>
                    <span className="text-[#94A3B8]">{movieDirector}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-white min-w-[70px]">Country:</span>
                    <span className="text-emerald-400 font-medium">{movieCountry}</span>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white min-w-[70px]">Quality:</span>
                    <span className="bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded shadow">
                      HD
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-white min-w-[70px]">Duration:</span>
                    <span className="text-[#94A3B8]">{formattedMovieDuration}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-white min-w-[70px]">Release:</span>
                    <span className="text-emerald-400 font-semibold">{movieReleaseYear}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-white min-w-[70px]">IMDb:</span>
                    <span className="text-amber-400 font-bold">{score} / 10</span>
                  </div>
                </div>
              </div>

              {/* Keywords / Tags */}
              <div className="flex items-center gap-2 pt-3 border-t border-white/5 flex-wrap text-xs">
                <span className="font-bold text-white">Keywords:</span>
                {anime?.genres?.map((g) => (
                  <span key={g} className="text-emerald-400/80 hover:text-emerald-300 font-medium transition-colors">
                    #{g.toLowerCase().replace(/\s+/g, '')}
                  </span>
                ))}
                <span className="text-emerald-400/80">#hollywood</span>
                <span className="text-emerald-400/80">#cinema</span>
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* Series / Anime Standard Details Card */
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-[#0F1115] rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl flex flex-col md:flex-row gap-6 sm:gap-8 items-start">
            <div className="w-32 sm:w-44 aspect-[2/3] rounded-2xl overflow-hidden flex-none shadow-2xl border border-white/10 mx-auto md:mx-0">
              <img
                src={anime?.coverImage?.large || anime?.coverImage?.extraLarge || 'https://images.alphacoders.com/891/891040.jpg'}
                alt={animeTitle}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-4 flex-1 w-full">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Link
                    to={`/explore?q=${encodeURIComponent(animeTitle)}`}
                    className="text-xs sm:text-sm font-bold text-[#94A3B8] hover:underline uppercase tracking-wider block"
                  >
                    {animeTitle}
                  </Link>
                  <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight mt-1">
                    {mediaType === 'tv'
                      ? `S${tvSeasonNum} E${currentEpisodeNum} - ${tvEpisodesList.find(e => e.episode_number === currentEpisodeNum)?.name || `Episode ${currentEpisodeNum}`}`
                      : `E${currentEpData.number} - ${currentEpData.title}`}
                  </h1>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-[#16181F] px-3 py-1 rounded-xl border border-white/10 text-amber-400 font-bold text-xs sm:text-sm">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span>{score}</span>
                  </div>
                  <span className="bg-white/10 text-gray-200 border border-white/20 px-3 py-1 rounded-xl text-xs font-bold">
                    {anime?.status || (mediaType === 'tv' ? 'Active Series' : 'Finished Airing')}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-[#94A3B8] font-medium">
                <span className="bg-[#16181F] border border-white/10 px-2.5 py-0.5 rounded text-white font-bold">
                  14+
                </span>
                <span>•</span>
                <span className="text-gray-300 font-semibold">Sub | Dub</span>
                <span>•</span>
                <span>{mediaType === 'tv' ? `Country: ${movieCountry}` : `Studio: ${studio}`}</span>
                <span>•</span>
                <span>
                  {mediaType === 'tv'
                    ? `Total Seasons: ${tvSeasonsList.length || 1}`
                    : `Total Seasons: ${relatedSeasons.length}`}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 pt-0.5">
                {anime?.genres?.map((g) => (
                  <span
                    key={g}
                    className="bg-[#16181F] border border-white/10 text-white text-xs font-medium px-2.5 py-0.5 rounded-lg"
                  >
                    {g}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1 text-xs">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all ${userReaction === 'like'
                    ? 'bg-[#E2E8F0] text-black border-[#E2E8F0]'
                    : 'bg-[#16181F] border-white/10 text-gray-300 hover:text-white hover:border-white/20'
                    }`}
                >
                  <ThumbsUp className={`w-4 h-4 ${userReaction === 'like' ? 'fill-black' : ''}`} />
                  <span className="font-bold">{(likes / 1000).toFixed(1)}k</span>
                </button>

                <button
                  onClick={handleDislike}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all ${userReaction === 'dislike'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-[#16181F] border-white/10 text-gray-300 hover:text-white hover:border-white/20'
                    }`}
                >
                  <ThumbsDown className={`w-4 h-4 ${userReaction === 'dislike' ? 'fill-white' : ''}`} />
                  <span className="font-bold">{dislikes}</span>
                </button>

                <button
                  onClick={() => setIsSaved(!isSaved)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all ${isSaved
                    ? 'bg-[#E2E8F0] text-black border-[#E2E8F0]'
                    : 'bg-[#16181F] border-white/10 text-gray-300 hover:text-white hover:border-white/20'
                    }`}
                  title="Add to Watchlist"
                >
                  {isSaved ? <Check className="w-4 h-4 stroke-[3]" /> : <Bookmark className="w-4 h-4" />}
                  <span className="font-bold">{isSaved ? 'In Watchlist' : 'Watchlist'}</span>
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    alert('Link copied to clipboard!');
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#16181F] border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-all"
                  title="Share"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="font-bold">Share</span>
                </button>
              </div>

              <div className="pt-2 border-t border-white/5">
                <p className={`text-sm text-[#94A3B8] leading-relaxed transition-all ${showFullDesc ? '' : 'line-clamp-2'}`}>
                  {cleanSeriesDesc}
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
      )}

      {/* 3. SEASONS TABS & EPISODES CATALOG (Completely Hidden for Movies) */}
      {mediaType !== 'movie' && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* TV SERIES: Unified Season Dropdown + Row List Layout (Matching Reference Image) */}
          {mediaType === 'tv' ? (
            <div className="space-y-4">
              {/* Header with Season Dropdown in One Place */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
                <div className="relative">
                  <button
                    onClick={() => setIsSeasonDropdownOpen(!isSeasonDropdownOpen)}
                    className="flex items-center gap-2.5 bg-[#16181F] hover:bg-[#16181F] text-white border border-emerald-500/40 hover:border-emerald-500/70 px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition-all cursor-pointer"
                  >
                    <Tv className="w-4 h-4 text-emerald-400" />
                    <span>
                      {tvSeasonsList.find((s) => s.season_number === tvSeasonNum)?.name || `Season ${tvSeasonNum}`}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-[#94A3B8] transition-transform ${isSeasonDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {isSeasonDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsSeasonDropdownOpen(false)}
                      />
                      <div className="absolute left-0 mt-2 w-56 bg-[#0F1115] border border-white/15 rounded-2xl shadow-2xl py-2 z-50 backdrop-blur-2xl max-h-80 overflow-y-auto no-scrollbar">
                        {tvSeasonsList.map((season) => (
                          <button
                            key={season.id || season.season_number}
                            onClick={() => {
                              setTvSeasonNum(season.season_number);
                              setCurrentEpisodeNum(1);
                              setIsSeasonDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                              tvSeasonNum === season.season_number
                                ? 'bg-emerald-600/20 text-emerald-400 font-bold'
                                : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <span>{season.name || `Season ${season.season_number}`}</span>
                            <span className="text-[10px] text-[#94A3B8]">
                              {season.episode_count} Eps
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <span className="text-xs text-[#94A3B8] font-medium">
                  {tvEpisodesList.length} Episodes Available
                </span>
              </div>

              {/* Episode Row Cards (Matching Reference Screenshot) */}
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
                    const epStill = getTMDBImageUrl(ep.still_path, 'w500') || anime?.coverImage?.large;
                    return (
                      <div
                        key={ep.id || ep.episode_number}
                        onClick={() => {
                          setCurrentEpisodeNum(ep.episode_number);
                          window.scrollTo({ top: 100, behavior: 'smooth' });
                        }}
                        className={`group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
                          isPlaying
                            ? 'bg-[#16181F] border-emerald-500/50 ring-1 ring-emerald-500/30 shadow-xl'
                            : 'bg-[#0F1115]/70 hover:bg-[#16181F] border-white/5 hover:border-white/15'
                        }`}
                      >
                        {/* 16:9 Thumbnail with Play Overlay */}
                        <div className="relative w-full sm:w-44 aspect-video rounded-xl overflow-hidden bg-black/60 flex-none border border-white/10">
                          <img
                            src={epStill}
                            alt={ep.name}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                              isPlaying ? 'bg-emerald-500 text-black scale-105' : 'bg-white/80 group-hover:bg-white text-black group-hover:scale-110'
                            }`}>
                              <Play className="w-4 h-4 fill-black translate-x-0.5" />
                            </div>
                          </div>
                          <div className="absolute top-1.5 left-1.5 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-black text-white">
                            E{ep.episode_number}
                          </div>
                        </div>

                        {/* Episode Info */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className={`text-sm sm:text-base font-bold line-clamp-1 transition-colors ${
                              isPlaying ? 'text-emerald-400' : 'text-white group-hover:text-emerald-300'
                            }`}>
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

                        {/* Runtime Badge */}
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
          ) : (
            /* ANIME: Standard Seasons Tabs & Chunks Catalog */
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
                    <Tv className="w-6 h-6 text-[#94A3B8]" />
                    <span>Seasons & Episodes</span>
                  </h2>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    Select an episode to stream instantly in HD.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-[#94A3B8] bg-white/5 border border-white/10 px-3 py-2 rounded-xl">
                    {totalEpisodes} Total Episodes
                  </span>
                </div>
              </div>

              {/* Episode Batch Range Filter */}
              {episodeChunks.length > 0 && (
                <div className="relative flex items-center gap-2 w-full">
                  <span className="text-xs font-semibold text-[#94A3B8] flex-none pr-1">Episode Range:</span>

                  <button
                    onClick={() => scrollRange('left')}
                    aria-label="Scroll episode ranges left"
                    className="flex-none p-1.5 rounded-xl bg-[#16181F] hover:bg-white hover:text-black border border-white/10 text-gray-300 transition-all shadow-md active:scale-95"
                    title="Previous ranges"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

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
                            : 'bg-[#16181F] border-white/10 text-[#94A3B8] hover:text-white hover:border-white/20'
                        }`}
                      >
                        {chunk.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => scrollRange('right')}
                    aria-label="Scroll episode ranges right"
                    className="flex-none p-1.5 rounded-xl bg-[#16181F] hover:bg-white hover:text-black border border-white/10 text-gray-300 transition-all shadow-md active:scale-95"
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
                      className={`group relative rounded-2xl overflow-hidden bg-[#16181F] border transition-all duration-300 cursor-pointer hover:-translate-y-1 shadow-lg ${
                        isPlaying
                          ? 'border-[#E2E8F0] ring-1 ring-white/40 shadow-xl'
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
                            isPlaying
                              ? 'opacity-100 bg-white/10'
                              : 'opacity-0 group-hover:opacity-100 bg-black/40'
                          }`}
                        >
                          <div className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                            <Play className="w-5 h-5 fill-black text-black translate-x-0.5" />
                          </div>
                        </div>

                        <div className="absolute top-2.5 left-2.5 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[11px] font-black text-white">
                          E{ep.number}
                        </div>

                        <div className="absolute bottom-2.5 right-2.5 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-gray-200">
                          {ep.duration}
                        </div>
                      </div>

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

                        <p className="text-xs text-[#94A3B8] line-clamp-2 leading-relaxed">
                          {ep.synopsis}
                        </p>

                        <div className="flex items-center justify-between text-[11px] text-[#94A3B8] pt-1 border-t border-white/5">
                          <span>{ep.released}</span>
                          <span className="text-gray-400 font-medium">Sub | Dub</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}

      {/* 4. SIMILAR RECOMMENDATIONS ("You May Also Like") */}
      {recommendedAnime.length > 0 && (
        <section className="border-t border-white/10 pt-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 bg-emerald-600 text-white font-black text-xs sm:text-sm px-4 py-1.5 rounded-xl mb-4 shadow-lg shadow-emerald-900/20 uppercase tracking-wide">
            You May Also Like
          </div>
          <AnimeRow
            title=""
            items={recommendedAnime}
            onSelectAnime={(a) => {
              const nextType = a.media_type || (mediaType === 'movie' ? 'movie' : mediaType === 'tv' ? 'tv' : 'anime');
              navigate(nextType === 'anime' ? `/watch/${a.id}` : `/watch/${nextType}/${a.id}`);
            }}
            onPlayAnime={(a) => {
              const nextType = a.media_type || (mediaType === 'movie' ? 'movie' : mediaType === 'tv' ? 'tv' : 'anime');
              navigate(nextType === 'anime' ? `/watch/${a.id}` : `/watch/${nextType}/${a.id}`);
            }}
          />
        </section>
      )}
    </div>
  );
}
