import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AnimeCard from './AnimeCard';

export default function AnimeRow({ title, items = [], loading = false, seeAllLink, onSelectAnime, onPlayAnime }) {
  const scrollRef = useRef(null);
  const navigate = useNavigate();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 20);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 20);
    }
  };

  const scroll = (direction) => {
    if (scrollRef.current) {
      const clientWidth = scrollRef.current.clientWidth || 800;
      const amount = direction === 'left' ? -Math.round(clientWidth * 0.75) : Math.round(clientWidth * 0.75);
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  return (
    <section className="relative w-full px-4 sm:px-6 md:px-10 lg:px-12 py-5 group/row">
      {/* Category Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide flex items-center gap-2">
          {title}
        </h2>

        {seeAllLink && (
          <button
            onClick={() => navigate(seeAllLink)}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#94A3B8] hover:text-white transition-colors group"
          >
            <span>See All</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>

      {/* Relative Carousel Container */}
      <div className="relative">
        {/* Left Arrow Button */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-[#0F1115]/90 hover:bg-white hover:text-black border border-white/20 text-white flex items-center justify-center transition-all shadow-xl backdrop-blur-md opacity-0 group-hover/row:opacity-100"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Right Arrow Button */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-[#0F1115]/90 hover:bg-white hover:text-black border border-white/20 text-white flex items-center justify-center transition-all shadow-xl backdrop-blur-md opacity-0 group-hover/row:opacity-100"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Horizontal List */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth py-2 px-1"
        >
          {loading
            ? Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex-none w-[145px] sm:w-[170px] md:w-[190px] lg:w-[205px] xl:w-[215px] aspect-[2/3] rounded-2xl bg-[#16181F] animate-pulse border border-white/5"
                />
              ))
            : items.map((anime) => (
                <AnimeCard
                  key={anime.id}
                  anime={anime}
                  onClick={onSelectAnime}
                  onPlay={onPlayAnime}
                />
              ))}
        </div>
      </div>
    </section>
  );
}

