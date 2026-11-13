import React, { useEffect } from 'react';
import { X, Heart, Trash2, Check, AlertCircle } from 'lucide-react';
import type { AnimeItem } from '@/types/anime';

interface RemoveFromListDialogProps {
  item: AnimeItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mode: 'local' | 'anilist' | 'mal' | 'all') => void;
}

export const RemoveFromListDialog: React.FC<RemoveFromListDialogProps> = ({
  item,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !item) return null;

  const isSyncedToAniList = !!item.anilistId;
  const isSyncedToMAL = !!item.malId;
  const isSynced = isSyncedToAniList || isSyncedToMAL;

  // If not synced, just close and let the parent handle local removal
  useEffect(() => {
    if (isOpen && !isSynced) {
      onConfirm('local');
    }
  }, [isOpen, isSynced, onConfirm]);

  if (!isSynced) return null;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md bg-[#18181f] rounded-xl border border-zinc-800 shadow-2xl overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
        {/* Header with X button */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            Remove from list?
          </h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Cancel"
            aria-label="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Item info */}
          <div className="flex items-center gap-4 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <img
              src={item.posterPath || item.backdropPath}
              alt={item.title}
              className="w-16 h-24 object-cover rounded-lg flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{item.title}</p>
              <p className="text-xs text-zinc-400 capitalize">{item.type}</p>
            </div>
          </div>

          {/* Synced trackers warning */}
          <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-red-400 text-sm mb-2">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">This title is synced to external trackers:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {isSyncedToAniList && (
                <span className="px-2.5 py-1 bg-sky-500/20 border border-sky-500/30 text-sky-400 text-xs rounded-full font-medium">
                  AniList
                </span>
              )}
              {isSyncedToMAL && (
                <span className="px-2.5 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-xs rounded-full font-medium">
                  MyAnimeList
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-2">
              Choose how you want to handle the removal:
            </p>
          </div>

          {/* Removal options */}
          <div className="space-y-2">
            {/* Option 1: Remove from all */}
            {(isSyncedToAniList || isSyncedToMAL) && (
              <button
                onClick={() => {
                  onConfirm('all');
                  onClose();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 hover:border-red-500/50 transition-all text-left cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center flex-shrink-0 group-hover:bg-red-600/30 transition-colors">
                  <Trash2 className="w-5 h-5 text-red-400 group-hover:text-red-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">Remove from AniFlix + all connected trackers</p>
                  <p className="text-xs text-zinc-400">
                    Deletes locally and from {[
                      isSyncedToAniList ? 'AniList' : null,
                      isSyncedToMAL ? 'MyAnimeList' : null,
                    ]
                      .filter(Boolean)
                      .join(' + ')} permanently.
                  </p>
                </div>
                <Check className="w-5 h-5 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}

            {/* Option 2: Remove from AniList only */}
            {isSyncedToAniList && (
              <button
                onClick={() => {
                  onConfirm('anilist');
                  onClose();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 hover:border-sky-500/50 transition-all text-left cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center flex-shrink-0 group-hover:bg-sky-500/30 transition-colors">
                  <Heart className="w-5 h-5 text-sky-400 group-hover:text-sky-300 stroke-current" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">Remove from AniFlix + AniList only</p>
                  <p className="text-xs text-zinc-400">Keeps your MyAnimeList entry intact.</p>
                </div>
                <Check className="w-5 h-5 text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}

            {/* Option 3: Remove from MAL only */}
            {isSyncedToMAL && (
              <button
                onClick={() => {
                  onConfirm('mal');
                  onClose();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 hover:border-indigo-500/50 transition-all text-left cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-500/30 transition-colors">
                  <Heart className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300 stroke-current" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">Remove from AniFlix + MyAnimeList only</p>
                  <p className="text-xs text-zinc-400">Keeps your AniList entry intact.</p>
                </div>
                <Check className="w-5 h-5 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}

            {/* Option 4: Remove locally only */}
            <button
              onClick={() => {
                onConfirm('local');
                onClose();
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 hover:border-zinc-600 transition-all text-left cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0 group-hover:bg-zinc-700 transition-colors">
                <Heart className="w-5 h-5 text-zinc-500 group-hover:text-zinc-400 stroke-current" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium">Remove from AniFlix only (keep synced)</p>
                <p className="text-xs text-zinc-400">
                  Your AniList/MyAnimeList entries stay untouched. Next sync may re-add this title.
                </p>
              </div>
              <Check className="w-5 h-5 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>

          {/* Cancel button */}
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-lg text-zinc-300 hover:text-white font-medium text-sm transition-colors border border-zinc-700 bg-transparent hover:bg-zinc-800"
          >
            Cancel — don't remove anything
          </button>
        </div>
      </div>
    </div>
  );
};