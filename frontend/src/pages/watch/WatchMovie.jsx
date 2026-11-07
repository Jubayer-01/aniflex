import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AnimeRow from '../../components/AnimeRow';
import NotFound from '../NotFound';
import { getMovieDetails, getTMDBImageUrl } from '../../services/tmdbService';
import { saveWatchProgress } from '../../services/watchHistoryService';
import {
  ThumbsUp, ThumbsDown, Bookmark, Check, Share2, ArrowLeft,
  Star, Play, RotateCcw
} from 'lucide-react';

const EMBED_SERVERS = [
  { id: 'multiembed', name: 'Server 1: MultiEmbed (Eng/Hindi)', url: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1` },
  { id: 'vidlink', name: 'Server 2: VidLink (Fast)', url: (id) => `https://vidlink.pro/movie/${id}` },
  { id: 'vidsrc_sh', name: 'Server 3: VidSrc SH', url: (id) => `https://vidsrc.sh/embed/movie?tmdb=${id}` },
];

export default function WatchMovie() {
  const { id } = useParams();
  const navigate = useNavigate();

  const isValidNumericId = Boolean(id && /^\d+$/.test(String(id)));
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [streamServer, setStreamServer] = useState('multiembed');
  const [reloadKey, setReloadKey] = useState(0);
  const [likes, setLikes] = useState(5420);
  const [dislikes, setDislikes] = useState(84);
  const [userReaction, setUserReaction] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (!isValidNumericId) {
      setHasError(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setHasError(false);

    getMovieDetails(id).then((movieData) => {
      if (!isMounted) return;
      if (movieData) {
        const formatted = {
          id: movieData.id,
          title: movieData.title || movieData.original_title || 'Feature Film',
          original_title: movieData.original_title,
          bannerImage: getTMDBImageUrl(movieData.backdrop_path, 'original'),
          coverImage: getTMDBImageUrl(movieData.poster_path, 'w500'),
          score: movieData.vote_average ? movieData.vote_average.toFixed(1) : '8.0',
          description: movieData.overview || 'No synopsis available for this feature film.',
          tagline: movieData.tagline,
          genres: movieData.genres?.map((g) => g.name) || ['Cinema'],
          release_date: movieData.release_date,
          runtime: movieData.runtime,
          directors: movieData.credits?.crew?.filter((c) => c.job === 'Director')?.map((c) => c.name) || [],
          cast: movieData.credits?.cast?.slice(0, 4)?.map((c) => c.name) || [],
          country: movieData.production_countries?.[0]?.name || 'United States',
          recommendations: movieData.recommendations?.results?.map((m) => ({
            id: m.id,
            title: m.title || m.original_title,
            bannerImage: getTMDBImageUrl(m.backdrop_path, 'w500'),
            coverImage: {
              large: getTMDBImageUrl(m.poster_path, 'w500'),
              extraLarge: getTMDBImageUrl(m.poster_path, 'w500'),
            },
            averageScore: Math.round((m.vote_average || 7) * 10),
            media_type: 'movie',
            release_date: m.release_date,
          })) || [],
        };

        setMovie(formatted);
        document.title = `${formatted.title} — Watch Movie on OmniFlex`;

        saveWatchProgress({
          id,
          title: formatted.title,
          episodeNumber: 1,
          totalEpisodes: 1,
          banner: formatted.bannerImage,
          cover: formatted.coverImage,
          progressPercent: 100,
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

  const formattedDuration = useMemo(() => {
    if (!movie?.runtime) return '2h 15m';
    const hours = Math.floor(movie.runtime / 60);
    const mins = movie.runtime % 60;
    return `${hours}h ${mins < 10 ? '0' : ''}${mins}m`;
  }, [movie?.runtime]);

  const releaseYear = movie?.release_date ? movie.release_date.slice(0, 4) : '2025';
  const director = movie?.directors?.length > 0 ? movie.directors.join(', ') : 'Not specified';
  const cast = movie?.cast?.length > 0 ? movie.cast.join(', ') : 'Ensemble Cast';
  const isUpcoming = Boolean(movie?.release_date && new Date(movie.release_date) > new Date());

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

  if (loading && !movie) {
    return (
      <div className="min-h-[70vh] bg-[#060709] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-2 border-[#E2E8F0] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-[#94A3B8] font-medium tracking-wide animate-pulse">Loading Movie...</span>
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
              <span>Back to Movies</span>
            </button>

            {/* Server Switcher */}
            <div className="flex items-center gap-1 bg-[#0F1115] border border-white/10 rounded-full px-2 py-1 text-xs overflow-x-auto max-w-full">
              <span className="text-[#94A3B8] text-[11px] px-1 font-medium shrink-0">Server:</span>
              {EMBED_SERVERS.map((srv) => (
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

          {/* Upcoming Release Notice */}
          {isUpcoming && (
            <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3 text-amber-200 shadow-lg">
              <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-black text-xs font-black uppercase tracking-wider shrink-0">
                Coming Soon
              </span>
              <p className="text-xs sm:text-sm font-medium">
                <strong>{movie.title}</strong> is scheduled for release on{' '}
                <span className="font-bold underline text-white">{movie.release_date}</span>. Digital streams activate once the film premieres.
              </p>
            </div>
          )}

          {/* Video Player Display */}
          <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10">
            <iframe
              key={`movie-${id}-${streamServer}-${reloadKey}`}
              src={
                (EMBED_SERVERS.find((s) => s.id === streamServer) || EMBED_SERVERS[0]).url(id)
              }
              className="w-full h-full border-0"
              allowFullScreen
              referrerPolicy="no-referrer"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              title={`${movie.title} - Full Movie`}
            />
          </div>

          {/* Quick Reload and Direct Link Bar */}
          <div className="flex items-center justify-between text-xs text-[#94A3B8]/70 mt-3 px-2 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span>Streaming in 4K/1080p. Switch between servers if any node buffers.</span>
              <button
                onClick={() => setReloadKey((prev) => prev + 1)}
                className="inline-flex items-center gap-1 text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
                title="Reload video player"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reload</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={(EMBED_SERVERS.find((s) => s.id === streamServer) || EMBED_SERVERS[0]).url(id)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all text-[11px] font-medium border border-white/10"
              >
                <span>Direct Player ↗</span>
              </a>
              <span className="hidden sm:inline font-mono text-[11px] text-[#94A3B8]">
                TMDB ID: {id}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. MOVIE DETAILS CARD */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-[#0F1115] rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl flex flex-col md:flex-row gap-6 sm:gap-8 items-start">
          {/* Movie Poster */}
          <div className="w-36 sm:w-52 aspect-[2/3] rounded-2xl overflow-hidden flex-none shadow-2xl border border-white/10 mx-auto md:mx-0 bg-black/60">
            <img
              src={movie.coverImage || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500'}
              alt={movie.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Details Column */}
          <div className="space-y-4 flex-1 w-full">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight">
                  {movie.title}
                </h1>
                {movie.tagline && (
                  <p className="text-xs sm:text-sm text-emerald-400 font-medium italic mt-1">
                    "{movie.tagline}"
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
              {movie.description}
            </p>

            {/* 2-Column Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 pt-3 border-t border-white/10 text-xs sm:text-sm">
              <div className="space-y-2.5">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-white min-w-[70px]">Genre:</span>
                  <span className="text-emerald-400 font-semibold">{movie.genres?.join(', ')}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-white min-w-[70px]">Actor:</span>
                  <span className="text-[#94A3B8] line-clamp-1">{cast}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-white min-w-[70px]">Director:</span>
                  <span className="text-[#94A3B8]">{director}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-white min-w-[70px]">Country:</span>
                  <span className="text-emerald-400 font-medium">{movie.country}</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white min-w-[70px]">Quality:</span>
                  <span className="bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded shadow">
                    HD
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-white min-w-[70px]">Duration:</span>
                  <span className="text-[#94A3B8]">{formattedDuration}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-white min-w-[70px]">Release:</span>
                  <span className="text-emerald-400 font-semibold">{releaseYear}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-white min-w-[70px]">Score:</span>
                  <span className="text-amber-400 font-bold">{movie.score} / 10</span>
                </div>
              </div>
            </div>

            {/* Like / Dislike reactions */}
            <div className="flex items-center gap-4 pt-3 border-t border-white/5">
              <div className="flex items-center gap-2 bg-[#16181F] border border-white/10 rounded-full px-3 py-1 text-xs">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                    userReaction === 'like' ? 'text-emerald-400 font-bold' : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{likes.toLocaleString()}</span>
                </button>
                <div className="w-[1px] h-3 bg-white/10" />
                <button
                  onClick={handleDislike}
                  className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                    userReaction === 'dislike' ? 'text-rose-400 font-bold' : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  <span>{dislikes}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SIMILAR MOVIES CAROUSEL */}
      {movie.recommendations?.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <AnimeRow
            title="Recommended Movies"
            animeList={movie.recommendations}
            onCardClick={(m) => navigate(`/watch/movie/${m.id}`)}
          />
        </section>
      )}
    </div>
  );
}

