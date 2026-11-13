import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimeItem } from '../types/anime';
import { AnimeCard } from './AnimeCard';
import { navigate } from "@/lib/navigation";

interface AnimeRowProps {
  title: string;
  subtitle?: string;
  items: AnimeItem[];
  onSelect: (item: AnimeItem) => void;
  onPlay: (item: AnimeItem) => void;
  onToggleMyList: (item: AnimeItem) => void;
  isInMyList: (id: number) => boolean;
  aspectRatio?: 'poster' | 'backdrop';
  cardSize?: 'compact' | 'large';
}

export const AnimeRow: React.FC<AnimeRowProps> = ({
  title,
  subtitle,
  items,
  onSelect,
  onPlay,
  onToggleMyList,
  isInMyList,
  aspectRatio = 'poster',
  cardSize = 'compact',
}) => {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = clientWidth * 0.75;
      rowRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="relative my-6 sm:my-8 px-4 sm:px-6 lg:px-8 group">
      {/* Row Header */}
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-baseline gap-2.5">
          <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight hover:text-red-400 transition-colors cursor-pointer">
            {title}
          </h3>
          {subtitle && (
            <span className="text-xs text-zinc-400 font-normal hidden sm:inline">
              {subtitle}
            </span>
          )}
        </div>
        <span className="text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer" onClick={() => navigate('/search')}>
          Explore All ({items.length})
        </span>
      </div>

      {/* Row Horizontal Scroll Container */}
      <div className="relative">
        {/* Left Arrow Button */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-0 z-30 w-10 sm:w-12 bg-black/60 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm rounded-r cursor-pointer"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Carousel Container */}
        <div
          ref={rowRef}
          className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth py-3 px-1"
        >
          {items.map((item) => (
            <AnimeCard
              key={`${item.type}-${item.id}`}
              item={item}
              onSelect={onSelect}
              onPlay={onPlay}
              onToggleMyList={onToggleMyList}
              isInMyList={isInMyList}
              aspectRatio={aspectRatio}
              cardSize={cardSize}
            />
          ))}
        </div>

        {/* Right Arrow Button */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-0 z-30 w-10 sm:w-12 bg-black/60 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm rounded-l cursor-pointer"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
