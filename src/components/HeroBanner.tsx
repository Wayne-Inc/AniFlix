import React, { useState } from 'react';
import { Play, Info, Plus, Check, Volume2, VolumeX, Sparkles, Star } from 'lucide-react';
import { AnimeItem } from '../types/anime';

interface HeroBannerProps {
  featuredItems: AnimeItem[];
  onPlay: (item: AnimeItem) => void;
  onMoreInfo: (item: AnimeItem) => void;
  onToggleMyList: (item: AnimeItem) => void;
  isInMyList: (id: number) => boolean;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  featuredItems,
  onPlay,
  onMoreInfo,
  onToggleMyList,
  isInMyList,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  if (!featuredItems || featuredItems.length === 0) return null;

  const currentItem = featuredItems[selectedIndex] || featuredItems[0];
  const inList = isInMyList(currentItem.id);
  return (
    <div className="relative w-full h-[75vh] min-h-[520px] max-h-[820px] overflow-hidden select-none">
      {/* Background Media Backdrop */}
      <div className="absolute inset-0">
        <img
          src={currentItem.backdropPath || currentItem.posterPath}
          alt={currentItem.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center transform scale-105 transition-all duration-1000 ease-out"
        />

        {/* Cinematic Scrim & Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#111115] via-[#111115]/75 to-transparent w-full md:w-3/4"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#111115] via-[#111115]/30 to-transparent"></div>
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#0a0a0d]/80 to-transparent"></div>
      </div>

      {/* Content Container */}
      <div className="relative max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-16 z-20">
        <div className="max-w-2xl space-y-4">
          {/* Category Tag & Kanji Subtitle */}
          <div className="flex items-center gap-3 text-xs font-semibold tracking-wider">
            {currentItem.japaneseTitle && (
              <span className="text-red-400 font-medium tracking-widest text-sm drop-shadow">
                {currentItem.japaneseTitle}
              </span>
            )}
            <span className="text-zinc-400">·</span>
            <span className="text-zinc-300 uppercase tracking-widest text-[11px] font-bold">
              {currentItem.type === 'movie' ? 'Anime Movie' : 'TV Anime Series'}
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight drop-shadow-lg text-balance">
            {currentItem.title}
          </h1>

          {/* Metadata Row (StreamFlix Netflix Style) */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-zinc-300 font-medium">
            <span className="text-emerald-400 font-bold tracking-tight">
              {currentItem.matchScore}% Match
            </span>
            <span>·</span>
            <span>{currentItem.releaseYear}</span>
            <span>·</span>
            <span className="border border-zinc-600 px-1.5 py-0.2 rounded text-[11px] text-zinc-300 font-mono">
              {currentItem.ageRating}
            </span>
            <span>·</span>
            <span>
              {currentItem.type === 'movie'
                ? currentItem.duration || ''
                : currentItem.episodesCount
                ? `${currentItem.episodesCount} Episodes`
                : ''}
            </span>
            {currentItem.studios && currentItem.studios[0] && (
              <>
                <span>·</span>
                <span className="text-zinc-400">{currentItem.studios[0]}</span>
              </>
            )}
          </div>

          {/* Synopsis */}
          <p className="text-zinc-300 text-sm sm:text-base line-clamp-3 leading-relaxed drop-shadow max-w-xl">
            {currentItem.overview}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => onPlay(currentItem)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-sm transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
            >
              <>
                <Play className="w-4 h-4 fill-current text-zinc-950" />
                Play Episode 1
              </>
            </button>

            <button
              onClick={() => onMoreInfo(currentItem)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/90 text-white font-semibold text-sm transition-all backdrop-blur-sm border border-zinc-600/50 hover:border-zinc-500 cursor-pointer"
            >
              <Info className="w-4 h-4" />
              More Info
            </button>

            <button
              onClick={() => onToggleMyList(currentItem)}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                inList
                  ? 'bg-red-600/90 border-red-500 text-white'
                  : 'bg-zinc-900/60 border-zinc-700/60 hover:border-zinc-500 text-zinc-300 hover:text-white'
              }`}
              title={inList ? 'Remove from My List' : 'Add to My List'}
            >
              {inList ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Bottom Bar: Sound Toggle & Featured Anime Carousel Switcher */}
        <div className="absolute right-4 sm:right-8 bottom-12 flex items-center gap-4">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2.5 rounded-full bg-zinc-900/70 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 transition-colors backdrop-blur-sm cursor-pointer"
            title={isMuted ? 'Unmute Trailer Audio' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Quick Carousel Selector */}
          <div className="hidden sm:flex items-center gap-1.5 bg-zinc-900/80 p-1.5 rounded-lg border border-zinc-800 backdrop-blur-md">
            {featuredItems.slice(0, 5).map((item, idx) => (
              <button
                key={item.id}
                onClick={() => setSelectedIndex(idx)}
                className={`relative w-12 h-7 rounded overflow-hidden transition-all cursor-pointer ${
                  selectedIndex === idx
                    ? 'ring-2 ring-red-500 scale-105 opacity-100'
                    : 'opacity-50 hover:opacity-80'
                }`}
              >
                <img
                  src={item.posterPath || item.backdropPath}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
