import React, { useState } from 'react';
import { Heart, Play, Film, Tv, Trash2 } from 'lucide-react';
import { AnimeItem, MediaType } from '../types/anime';

interface MyListViewProps {
  myList: AnimeItem[];
  loaded: boolean;
  onSelect: (item: AnimeItem) => void;
  onPlay: (item: AnimeItem) => void;
  onRemove: (item: AnimeItem) => void;
  isInMyList: (id: number) => boolean;
}

export const MyListView: React.FC<MyListViewProps> = ({
  myList,
  loaded,
  onSelect,
  onPlay,
  onRemove,
  isInMyList,
}) => {
  const [filterType, setFilterType] = useState<'all' | MediaType>('all');

  const filteredItems =
    filterType === 'all' ? myList : myList.filter((item) => item.type === filterType);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-[60vh]">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-5 h-5 text-red-500 fill-current" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              My Watchlist
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400">
            Keep track of your saved anime series and movies. Synced across devices via Firebase.
          </p>
        </div>

        {/* Filter Segmented Controls */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-lg text-xs font-medium">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              filterType === 'all'
                ? 'bg-red-600 text-white font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            All ({myList.length})
          </button>
          <button
            onClick={() => setFilterType('anime')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
              filterType === 'anime'
                ? 'bg-red-600 text-white font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Tv className="w-3 h-3" />
            Anime TV
          </button>
          <button
            onClick={() => setFilterType('movie')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
              filterType === 'movie'
                ? 'bg-red-600 text-white font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Film className="w-3 h-3" />
            Movies
          </button>
        </div>
      </div>

      {!loaded ? (
        <div className="text-center py-20">
          <p className="text-zinc-400 text-sm">Loading your watchlist...</p>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6 mt-8">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="group relative bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-all hover:shadow-2xl flex flex-col justify-between"
            >
              <div
                className="relative aspect-[2/3] overflow-hidden cursor-pointer"
                onClick={() => onSelect(item)}
              >
                <img
                  src={item.posterPath || item.backdropPath}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Badges */}
                <div className="absolute top-2 left-2 flex items-center gap-1">
                  <span className="bg-black/80 backdrop-blur-sm text-[10px] font-bold text-red-400 px-2 py-0.5 rounded border border-red-500/30">
                    {item.type.toUpperCase()}
                  </span>
                </div>

                {/* Play Overlay on Hover */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlay(item);
                    }}
                    className="w-12 h-12 rounded-full bg-white text-zinc-950 flex items-center justify-center hover:scale-110 transition-transform shadow-xl cursor-pointer"
                  >
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </button>
                </div>
              </div>

              {/* Info & Actions */}
              <div className="p-3">
                <h4
                  onClick={() => onSelect(item)}
                  className="text-xs font-bold text-white truncate hover:text-red-400 transition-colors cursor-pointer"
                >
                  {item.title}
                </h4>
                <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
                  <span className="text-emerald-400 font-semibold">{item.matchScore}% Match</span>
                  <span>{item.releaseYear ?? '—'}</span>
                </div>

                <div className="flex items-center justify-between pt-3 mt-2 border-t border-zinc-800/80">
                  <button
                    onClick={() => onPlay(item)}
                    className="text-xs text-white hover:text-red-400 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    Stream
                  </button>

                  <button
                    onClick={() => onRemove(item)}
                    className="p-1 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                    title="Remove from list"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-zinc-900/30 border border-zinc-800/60 rounded-2xl mt-8 p-6">
          <Heart className="w-12 h-12 text-zinc-600 mx-auto mb-3 stroke-[1.5]" />
          <h3 className="text-base font-bold text-white mb-1">Your list is currently empty</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4">
            Click the bookmark icon on any anime or film title to save it here. Synced to Firebase.
          </p>
        </div>
      )}
    </div>
  );
};
