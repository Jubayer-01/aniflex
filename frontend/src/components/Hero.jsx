import React, { useState, useEffect } from 'react';
import { Play, Info, Bookmark, Star, ChevronLeft, ChevronRight, Plus, Film } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const SLIDE_DURATION_MS = 7000; // 7-second auto loop

export default function Hero({ items = [], anime, onOpenDetails }) {
  const navigate = useNavigate();

  // Top 5-6 trending anime feed
  const trendingList = items && items.length > 0 ? items.slice(0, 6) : (anime ? [anime] : []);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Auto-rotation loop (every 7 seconds, pauses on mouse hover)
  useEffect(() => {
    if (trendingList.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % trendingList.length);
    }, SLIDE_DURATION_MS);

    return () => clearInterval(timer);
  }, [trendingList.length, isPaused, activeIdx]);

  const currentAnime = trendingList[activeIdx] || trendingList[0] || anime;
  if (!currentAnime) return null;

  const title = currentAnime.title?.english || currentAnime.title?.romaji || 'Demon Slayer: Kimetsu no Yaiba';
  const subtitle = currentAnime.title?.romaji && currentAnime.title?.english ? currentAnime.title.romaji : null;
  const banner = currentAnime.bannerImage || currentAnime.coverImage?.extraLarge || 'https://images.alphacoders.com/131/1314905.jpeg';
  const score = currentAnime.score || (currentAnime.averageScore ? (currentAnime.averageScore / 10).toFixed(1) : '9.2');
  const year = currentAnime.year || currentAnime.seasonYear || '2024';
  const format = currentAnime.format ? currentAnime.format.replace('_', ' ') : 'TV Series';
  const rating = currentAnime.rating || 'PG-13';
  const description = (currentAnime.description || '').replace(/<[^>]*>?/gm, '') ||
    'A family is attacked by demons and only two members survive - Tanjiro and his sister Nezuko, who is turned into a demon slowly. Tanjiro sets out to become a demon slayer to avenge his family and cure his sister.';

  const handlePrev = () => {
    setActiveIdx((prev) => (prev - 1 + trendingList.length) % trendingList.length);
  };

  const handleNext = () => {
    setActiveIdx((prev) => (prev + 1) % trendingList.length);
  };

  const handlePlayNow = () => {
    if (currentAnime.media_type === 'movie') {
      navigate(`/watch/movie/${currentAnime.id}`);
    } else if (currentAnime.media_type === 'tv') {
      navigate(`/watch/tv/${currentAnime.id}?s=1&e=1`);
    } else {
      navigate(`/watch/${currentAnime.id || 101922}`);
    }
  };

  return (
    <section
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full h-[75vh] min-h-[580px] max-h-[820px] flex items-end justify-start overflow-hidden pb-12 sm:pb-16 lg:pb-20 pt-16 bg-[#060709]"
    >
      {/* 1. CINEMA WIDESCREEN BACKDROP */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentAnime.id || activeIdx}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="absolute inset-0 z-0 bg-[#060709]"
        >
          {/* Ambient blurred backdrop layer */}
          <img
            src={banner}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-20 filter brightness-50 pointer-events-none"
          />

          {/* Crisp Widescreen Foreground Banner */}
          <img
            src={banner}
            alt={title}
            className="w-full h-full object-cover object-[center_20%] lg:object-[center_15%] filter brightness-[0.85] transition-all duration-700"
          />

          {/* Cinematic Gradient Masks */}
          {/* Left Edge Shadow for Text Legibility */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#060709] via-[#060709]/60 to-transparent w-full md:w-3/5 lg:w-1/2 z-10" />
          {/* Bottom Blend to dark page */}
          <div className="absolute inset-x-0 bottom-0 h-48 lg:h-64 bg-gradient-to-t from-[#060709] via-[#060709]/70 to-transparent z-10" />
          {/* Top Subtle Vignette */}
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#060709]/70 via-transparent to-transparent z-10" />
        </motion.div>
      </AnimatePresence>

      {/* 2. FLOATING EDGE NAVIGATION ARROWS (Left & Right) */}
      {trendingList.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            aria-label="Previous Slide"
            className="absolute left-3 sm:left-6 lg:left-8 top-1/2 -translate-y-1/2 z-30 w-10 sm:w-11 h-10 sm:h-11 rounded-full bg-black/40 hover:bg-black/75 border border-white/15 text-white/80 hover:text-white flex items-center justify-center backdrop-blur-md transition-all duration-200 hover:scale-110 active:scale-95 shadow-2xl"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={handleNext}
            aria-label="Next Slide"
            className="absolute right-3 sm:right-6 lg:right-8 top-1/2 -translate-y-1/2 z-30 w-10 sm:w-11 h-10 sm:h-11 rounded-full bg-black/40 hover:bg-black/75 border border-white/15 text-white/80 hover:text-white flex items-center justify-center backdrop-blur-md transition-all duration-200 hover:scale-110 active:scale-95 shadow-2xl"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* 3. BOTTOM-LEFT CINEMA CONTENT */}
      <div className="relative z-20 w-full px-4 sm:px-6 md:px-10 lg:px-12">
        <div className="max-w-2xl space-y-3.5">
          {/* Stylized Cinema Title */}
          <motion.div
            key={`title-${currentAnime.id || activeIdx}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-1"
          >
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white uppercase drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)] leading-[1.05]">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs sm:text-sm font-semibold text-[#94A3B8] tracking-wider uppercase drop-shadow-md">
                {subtitle}
              </p>
            )}
          </motion.div>

          {/* Metadata Row (Year, Format, Rating, Score) */}
          <motion.div
            key={`meta-${currentAnime.id || activeIdx}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="flex items-center gap-2.5 text-xs font-semibold text-gray-300 drop-shadow-md"
          >
            <span className="text-white font-bold">{year}</span>
            <span>•</span>
            <span className="bg-white/15 text-gray-200 text-[11px] font-bold px-2 py-0.5 rounded tracking-wide uppercase">
              {format}
            </span>
            <span>•</span>
            <span className="text-gray-300">{rating}</span>
            <span>•</span>
            <div className="flex items-center gap-1 text-amber-400 font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span className="text-white">{score}</span>
            </div>
          </motion.div>

          {/* Synopsis */}
          <motion.p
            key={`desc-${currentAnime.id || activeIdx}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-xs sm:text-sm text-gray-300/90 line-clamp-3 leading-relaxed max-w-lg drop-shadow-md"
          >
            {description}
          </motion.p>

          {/* Action Buttons Matching Reference Style */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1.5">
            {/* Play Now: Solid White Pill */}
            <button
              onClick={handlePlayNow}
              className="flex items-center gap-2 bg-white text-black hover:bg-gray-200 px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-xl cursor-pointer"
            >
              <Play className="w-4 h-4 fill-black text-black" />
              <span>Play Now</span>
            </button>

            {/* + Watchlist: Translucent Glass Pill */}
            <button
              onClick={() => setIsSaved(!isSaved)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 hover:scale-105 active:scale-95 border backdrop-blur-md cursor-pointer ${
                isSaved
                  ? 'bg-[#E2E8F0] text-black border-[#E2E8F0] shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
            >
              {isSaved ? <Bookmark className="w-4 h-4 fill-black" /> : <Plus className="w-4 h-4 text-white" />}
              <span>{isSaved ? 'In Watchlist' : 'Watchlist'}</span>
            </button>

            {/* Circular Info Button */}
            <button
              onClick={() => onOpenDetails && onOpenDetails(currentAnime)}
              aria-label="More Info"
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 shadow-md cursor-pointer"
              title="More Details"
            >
              <Info className="w-4 h-4" />
            </button>

            {/* Circular Film / Watch Button */}
            <button
              onClick={handlePlayNow}
              aria-label="Stream Now"
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 shadow-md cursor-pointer"
              title="Stream Now"
            >
              <Film className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. BOTTOM-RIGHT SLEEK PAGINATION INDICATOR */}
      {trendingList.length > 1 && (
        <div className="absolute bottom-6 sm:bottom-8 right-6 sm:right-10 lg:right-14 z-30 flex items-center gap-2">
          {trendingList.map((_, dotIdx) => {
            const isActive = activeIdx === dotIdx;
            return (
              <button
                key={dotIdx}
                onClick={() => setActiveIdx(dotIdx)}
                aria-label={`Go to slide ${dotIdx + 1}`}
                className={`transition-all duration-300 ${
                  isActive
                    ? 'w-7 sm:w-8 h-1 rounded-full bg-white shadow-lg'
                    : 'w-1.5 h-1.5 rounded-full bg-white/40 hover:bg-white/70'
                }`}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
