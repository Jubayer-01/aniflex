import React from 'react';
import { Play, Star, Plus } from 'lucide-react';

export default function AnimeCard({ anime, onClick, onPlay, className = '' }) {
  if (!anime) return null;

  // Universal Media Adapter (Supports AniList and TMDB structures)
  const title =
    typeof anime.title === 'string'
      ? anime.title
      : anime.title?.english || anime.title?.romaji || anime.title?.native || anime.name || 'Untitled';

  const cover =
    anime.coverImage?.large ||
    anime.coverImage?.extraLarge ||
    anime.coverImage?.medium ||
    (anime.poster_path ? `https://image.tmdb.org/t/p/w342${anime.poster_path}` : null) ||
    anime.poster_url ||
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=342&auto=format&fit=crop&q=60';

  const score = anime.averageScore
    ? (anime.averageScore / 10).toFixed(1)
    : anime.vote_average
    ? anime.vote_average.toFixed(1)
    : anime.score || null;

  const year =
    anime.seasonYear ||
    anime.year ||
    (anime.release_date ? anime.release_date.slice(0, 4) : null) ||
    (anime.first_air_date ? anime.first_air_date.slice(0, 4) : null);

  const isUpcoming = Boolean(
    (anime.release_date && new Date(anime.release_date) > new Date()) ||
    (anime.first_air_date && new Date(anime.first_air_date) > new Date())
  );

  const formatBadge = isUpcoming
    ? 'COMING SOON'
    : anime.media_type === 'movie'
    ? 'Movie'
    : anime.media_type === 'tv'
    ? 'Series'
    : anime.format
    ? anime.format === 'TV_SHORT'
      ? 'TV'
      : anime.format
    : anime.genres?.[0] || 'HD';

  return (
    <div
      onClick={() => onClick && onClick(anime)}
      className={`group relative aspect-[2/3] rounded-2xl overflow-hidden bg-[#16181F] border border-white/10 hover:border-white/40 transition-all duration-300 cursor-pointer shadow-lg hover:-translate-y-1.5 select-none ${
        className || 'flex-none w-[145px] sm:w-[170px] md:w-[190px] lg:w-[205px] xl:w-[215px]'
      }`}
    >
      {/* Anime Poster Image */}
      <img
        src={cover}
        alt={title}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />

      {/* Layered Vignette Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#060709] via-[#060709]/30 to-transparent opacity-90 group-hover:opacity-95 transition-opacity" />

      {/* Top Badges */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
        {score ? (
          <div className="flex items-center gap-1 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10 text-xs font-bold text-amber-400">
            <Star className="w-3 h-3 fill-amber-400" />
            <span>{score}</span>
          </div>
        ) : <div />}

        {formatBadge && (
          <span
            className={`backdrop-blur-md text-[10px] px-2 py-0.5 rounded-lg border ${
              formatBadge === 'COMING SOON'
                ? 'bg-rose-500 text-white border-rose-400 font-black shadow-md tracking-wider'
                : formatBadge === 'Movie' || formatBadge === 'HD'
                ? 'bg-amber-500 text-black border-amber-400 font-black shadow-md'
                : 'bg-white/15 text-white border-white/20 font-semibold'
            }`}
          >
            {formatBadge === 'Movie' ? 'HD' : formatBadge}
          </span>
        )}
      </div>

      {/* Center Quick-Play Trigger on Hover */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlay && onPlay(anime);
          }}
          aria-label={`Play ${title}`}
          className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-xl pointer-events-auto transform group-hover:scale-110 active:scale-95 transition-all"
        >
          <Play className="w-5 h-5 fill-black text-black translate-x-0.5" />
        </button>
      </div>

      {/* Bottom Title & Details */}
      <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1">
        <h4 className="text-white font-bold text-sm sm:text-base leading-snug line-clamp-2 drop-shadow-md group-hover:text-[#E2E8F0] transition-colors">
          {title}
        </h4>
        <div className="flex items-center gap-2 text-[11px] text-[#94A3B8] font-medium">
          {year && <span>{year}</span>}
          {anime.episodes && (
            <>
              <span>•</span>
              <span>{anime.episodes} eps</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

