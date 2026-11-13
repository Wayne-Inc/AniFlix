import React, { useState } from 'react';
import { Plus, Check, Heart, Star } from 'lucide-react';
import { AnimeItem } from '../types/anime';

/**
 * Compact tracker state for the card corner. Only rendered after a sync has
 * recorded a status, so unsynced items stay visually unchanged.
 */
function anilistBadge(item: AnimeItem): string {
  switch (item.anilistStatus) {
    case 'COMPLETED':
      return 'DONE';
    case 'CURRENT':
      return `${item.anilistProgress ?? 0} EP`;
    case 'PLANNING':
      return 'PLANNED';
    case 'REPEATING':
      return 'REWATCH';
    case 'PAUSED':
      return 'PAUSED';
    case 'DROPPED':
      return 'DROPPED';
    default:
      return item.anilistStatus ?? '';
  }
}

function malBadge(item: AnimeItem): string {
  switch (item.malStatus) {
    case 'completed':
      return 'MAL DONE';
    case 'watching':
      return `MAL ${item.malProgress ?? 0} EP`;
    case 'plan_to_watch':
      return 'MAL PLAN';
    case 'on_hold':
      return 'MAL HOLD';
    case 'dropped':
      return 'MAL DROP';
    default:
      return item.malStatus ?? '';
  }
}

interface AnimeCardProps {
  item: AnimeItem;
  onSelect: (item: AnimeItem) => void;
  onPlay: (item: AnimeItem) => void;
  onToggleMyList: (item: AnimeItem) => void;
  isInMyList: (id: number) => boolean;
  aspectRatio?: 'poster' | 'backdrop';
  cardSize?: 'compact' | 'large';
}

export const AnimeCard: React.FC<AnimeCardProps> = ({
  item,
  onSelect,
  onPlay,
  onToggleMyList,
  isInMyList,
  aspectRatio = 'poster',
  cardSize = 'compact',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imgSrc =
    aspectRatio === 'backdrop'
      ? item.backdropPath || item.posterPath
      : item.posterPath || item.backdropPath;

  return (
    <div
      className="group relative shrink-0 transition-transform duration-300 ease-out z-10 hover:z-30 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(item)}
    >
      {/* Base Card Frame */}
      <div
        className={`relative overflow-hidden rounded-md bg-zinc-900 border border-zinc-800/80 shadow-md transition-all duration-300 ${
          aspectRatio === 'backdrop'
            ? cardSize === 'large'
              ? 'w-80 sm:w-96 md:w-[360px] aspect-[16/9]'
              : 'w-64 sm:w-72 aspect-[16/9]'
            : cardSize === 'large'
              ? 'w-48 sm:w-60 md:w-72 aspect-[2/3]'
              : 'w-36 sm:w-44 md:w-48 aspect-[2/3]'
        } ${isHovered ? 'scale-105 shadow-2xl border-zinc-700' : ''}`}
      >
        {!imageError && imgSrc ? (
          <img
            src={imgSrc}
            alt={item.title}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex flex-col justify-end p-3 text-left">
            <span className="text-xs font-bold text-red-500 uppercase tracking-wider">
              {item.type}
            </span>
            <p className="text-xs font-semibold text-white line-clamp-2">{item.title}</p>
          </div>
        )}

        {/* StreamFlix Overlay Badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          {item.type === 'movie' && (
            <span className="bg-amber-600/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
              MOVIE
            </span>
          )}
          {item.voteAverage >= 8.7 && (
            <span className="bg-red-600/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5 fill-current" /> TOP
            </span>
          )}
        </div>

        {(item.anilistStatus || item.malStatus) && (
          <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
            {item.anilistStatus && (
              <span
                className="rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-sky-300 shadow ring-1 ring-sky-400/30"
                title={`AniList: ${item.anilistStatus}${item.anilistProgress != null ? ` · ${item.anilistProgress} episodes` : ''}`}
              >
                {anilistBadge(item)}
              </span>
            )}
            {item.malStatus && (
              <span
                className="rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-indigo-300 shadow ring-1 ring-indigo-400/30"
                title={`MyAnimeList: ${item.malStatus}${item.malProgress != null ? ` · ${item.malProgress} episodes` : ''}`}
              >
                {malBadge(item)}
              </span>
            )}
          </div>
        )}

        {/* Hover Action Overlay (My List + title info) */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-3 flex flex-col justify-end transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleMyList(item);
              }}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                isInMyList(item.id)
                  ? 'bg-red-600 border-red-500 text-white'
                  : 'bg-zinc-900/80 border-zinc-600 text-zinc-300 hover:text-white hover:border-zinc-400'
              }`}
              title={isInMyList(item.id) ? 'Remove from List' : 'Add to List'}
            >
              {isInMyList(item.id) ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Title & Metadata */}
          <h4 className="text-xs font-bold text-white line-clamp-1 mb-1">{item.title}</h4>

          <div className="flex items-center gap-1.5 text-[11px] text-zinc-300">
            <span className="text-emerald-400 font-bold">{item.matchScore}% Match</span>
            <span>·</span>
            <span className="text-[10px] border border-zinc-700 px-1 rounded text-zinc-400 font-mono">
              {item.ageRating}
            </span>
            <span>·</span>
            <span className="text-zinc-400 text-[10px]">
              {item.type === 'movie'
                ? item.duration || ''
                : item.episodesCount
                ? `${item.episodesCount} Ep`
                : ''}
            </span>
          </div>

          <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-400 truncate">
            {item.genres.slice(0, 2).map((g, idx) => (
              <span key={g}>
                {idx > 0 && <span className="mx-1">·</span>}
                {g}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
