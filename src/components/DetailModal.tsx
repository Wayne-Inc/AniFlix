import React, { useState, useEffect } from 'react';
import { X, Play, Plus, Check, Star, Volume2, VolumeX, Clock, Film, Tv, Sparkles, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { AnimeItem, Episode } from '../types/anime';
import { fetchAnimeDetails, GENRE_NAME_TO_ID } from '../services/tmdb';
import { setWatched, isWatched } from '../lib/continue-watching-firestore';

interface DetailModalProps {
  item: AnimeItem | null;
  onClose: () => void;
  onPlay: (item: AnimeItem, episode?: Episode) => void;
  onToggleMyList: (item: AnimeItem) => void;
  isInMyList: boolean;
  similarItems: AnimeItem[];
  onSelectSimilar: (item: AnimeItem) => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  item,
  onClose,
  onPlay,
  onToggleMyList,
  isInMyList,
  similarItems,
  onSelectSimilar,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'episodes' | 'trailer'>('overview');
  const [isMuted, setIsMuted] = useState(true);
  if (!item) return null;

  const [detailItem, setDetailItem] = useState<AnimeItem | null>(item);
  const displayItem: AnimeItem = detailItem || item;

  // Enrich the item with live TMDB data (trailer, cast, status, runtime/episode count)
  useEffect(() => {
    if (!item.tmdbId) return;
    let cancelled = false;
    fetchAnimeDetails(item).then((enriched) => {
      if (!cancelled) setDetailItem(enriched);
    });
    return () => {
      cancelled = true;
    };
  }, [item]);

  // Watched state
  const [isWatchedState, setIsWatchedState] = useState(false);

  useEffect(() => {
    if (!item.tmdbId) return;
    isWatched(item).then(setIsWatchedState);
  }, [item]);

  const toggleWatched = async () => {
    const next = !isWatchedState;
    setIsWatchedState(next);
    if (!item.tmdbId) return;
    await setWatched(item, next);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex justify-center items-start p-2 sm:p-4 md:p-6 animate-fadeIn">
      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-[#18181f] text-white rounded-xl shadow-2xl overflow-hidden border border-zinc-800 my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-40 w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-colors cursor-pointer"
          title="Close details"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Hero Header */}
        <div className="relative w-full h-72 sm:h-96 overflow-hidden">
          <img
            src={displayItem.backdropPath || displayItem.posterPath}
            alt={displayItem.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#18181f] via-[#18181f]/40 to-transparent"></div>

          {/* Action Row on Backdrop */}
          <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
            <div className="space-y-3 max-w-xl">
              {displayItem.japaneseTitle && (
                <p className="text-red-400 font-medium tracking-widest text-sm drop-shadow">
                  {displayItem.japaneseTitle}
                </p>
              )}
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
                {displayItem.title}
              </h2>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => onPlay(displayItem)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-sm transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <>
                    <Play className="w-4 h-4 fill-current text-zinc-950" />
                    Play
                  </>
                </button>

                <button
                  onClick={() => onToggleMyList(displayItem)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isInMyList
                      ? 'bg-red-600 border-red-500 text-white'
                      : 'bg-zinc-900/80 border-zinc-600 hover:border-zinc-400 text-zinc-200'
                  }`}
                  title={isInMyList ? 'Remove from My List' : 'Add to My List'}
                >
                  {isInMyList ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>

                <button
                  onClick={toggleWatched}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isWatchedState
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-zinc-900/80 border-zinc-600 text-zinc-200 hover:border-zinc-400'
                  }`}
                  title={isWatchedState ? 'Mark as Unwatched' : 'Mark as Watched'}
                >
                  {isWatchedState ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2.5 rounded-full bg-black/60 hover:bg-black/90 border border-zinc-700 text-white transition-colors cursor-pointer hidden sm:block"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-4 px-6 border-b border-zinc-800 text-sm font-semibold text-zinc-400">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'border-red-500 text-white font-bold'
                : 'border-transparent hover:text-zinc-200'
            }`}
          >
            Overview
          </button>
          {displayItem.episodes && displayItem.episodes.length > 0 && (
            <button
              onClick={() => setActiveTab('episodes')}
              className={`py-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'episodes'
                  ? 'border-red-500 text-white font-bold'
                  : 'border-transparent hover:text-zinc-200'
              }`}
            >
              Episodes ({displayItem.episodes.length})
            </button>
          )}
          {displayItem.trailerYoutubeKey && (
            <button
              onClick={() => setActiveTab('trailer')}
              className={`py-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'trailer'
                  ? 'border-red-500 text-white font-bold'
                  : 'border-transparent hover:text-zinc-200'
              }`}
            >
              Official Trailer
            </button>
          )}
        </div>

        {/* Modal Body Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 2-Column Split: Specs & Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left 2 Cols: Main Info */}
                <div className="md:col-span-2 space-y-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-300">
                    <span className="text-emerald-400 font-bold">{displayItem.matchScore}% Match</span>
                    <span>·</span>
                    <span>{displayItem.releaseYear}</span>
                    <span>·</span>
                    <span className="border border-zinc-700 px-1.5 py-0.2 rounded font-mono text-zinc-300">
                      {displayItem.ageRating}
                    </span>
                    <span>·</span>
                    <span>
                      {displayItem.type === 'movie'
                        ? displayItem.duration || ''
                        : displayItem.episodesCount
                        ? `${displayItem.episodesCount} Episodes`
                        : ''}
                    </span>
                    <span className="border border-zinc-700 px-1 rounded text-[10px] text-zinc-400">
                      HD 1080p
                    </span>
                  </div>

                  <p className="text-zinc-300 text-sm leading-relaxed">{displayItem.overview}</p>

                  {/* Cast / Voice Actors list if available */}
                  {displayItem.cast && displayItem.cast.length > 0 && (
                    <div className="pt-2">
                      <h4 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">
                        Voice Cast (Seiyuu)
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {displayItem.cast.map((actor) => (
                          <div
                            key={actor.character}
                            className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg p-1.5 pr-3 text-xs"
                          >
                            {actor.image && (
                              <img
                                src={actor.image}
                                alt={actor.actor}
                                className="w-7 h-7 rounded-full object-cover"
                              />
                            )}
                            <div>
                              <div className="text-white font-medium">{actor.actor}</div>
                              <div className="text-zinc-500 text-[10px]">{actor.character}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right 1 Col: Metadata & Tags */}
                <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/80 space-y-3 text-xs">
                  <div>
                    <span className="text-zinc-500 block mb-0.5">Genres:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {displayItem.genres.map((g) => {
                        const genreId = GENRE_NAME_TO_ID[g.toLowerCase()];
                        const streamflixUrl = genreId
                          ? `https://streamflix.dpdns.org/explore/${genreId}?q=${encodeURIComponent(g)}`
                          : null;
                        return (
                          <a
                            key={g}
                            href={streamflixUrl || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded hover:border-emerald-500 hover:text-white hover:bg-emerald-500/10 transition-colors cursor-pointer"
                            title={`Browse ${g} on StreamFlix`}
                          >
                            {g}
                            {streamflixUrl && <ExternalLink className="w-2 h-2" />}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                  {displayItem.studios && (
                    <div>
                      <span className="text-zinc-500 block mb-0.5">Studio / Animation:</span>
                      <span className="text-zinc-200">{displayItem.studios.join(', ')}</span>
                    </div>
                  )}
                  {displayItem.author && (
                    <div>
                      <span className="text-zinc-500 block mb-0.5">Author:</span>
                      <span className="text-zinc-200">{displayItem.author}</span>
                    </div>
                  )}
                  {displayItem.audioLanguages && (
                    <div>
                      <span className="text-zinc-500 block mb-0.5">Audio Tracks:</span>
                      <span className="text-zinc-200">{displayItem.audioLanguages.join(', ')}</span>
                    </div>
                  )}
                  {displayItem.subtitles && (
                    <div>
                      <span className="text-zinc-500 block mb-0.5">Subtitles:</span>
                      <span className="text-zinc-200">{displayItem.subtitles.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* More Like This (Similar Recommendations) */}
              {similarItems && similarItems.length > 0 && (
                <div className="pt-4 border-t border-zinc-800">
                  <h4 className="text-base font-bold text-white mb-3">More Like This</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {similarItems.slice(0, 4).map((sim) => (
                      <div
                        key={sim.id}
                        onClick={() => onSelectSimilar(sim)}
                        className="bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-all cursor-pointer group"
                      >
                        <div className="relative aspect-[16/9]">
                          <img
                            src={sim.backdropPath || sim.posterPath}
                            alt={sim.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute top-1.5 right-1.5 bg-black/70 px-1.5 py-0.5 rounded text-[10px] text-emerald-400 font-bold">
                            {sim.matchScore}%
                          </div>
                        </div>
                        <div className="p-2.5">
                          <h5 className="text-xs font-bold text-white truncate">{sim.title}</h5>
                          <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1">
                            {sim.overview}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'episodes' && displayItem.episodes && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400 pb-2 border-b border-zinc-800">
                <span className="font-semibold text-white">Season 1</span>
                <span>{displayItem.episodes.length} Episodes Available</span>
              </div>
              <div className="space-y-2">
                {displayItem.episodes.map((ep) => (
                  <div
                    key={ep.id}
                    onClick={() => onPlay(displayItem, ep)}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-800/80 transition-colors border border-transparent hover:border-zinc-700/60 cursor-pointer group"
                  >
                    <span className="text-lg font-bold text-zinc-500 w-6 text-center">
                      {ep.episodeNumber}
                    </span>
                    <div className="relative w-28 sm:w-36 aspect-[16/9] shrink-0 rounded overflow-hidden bg-zinc-800">
                      <img
                        src={ep.thumbnail || displayItem.backdropPath}
                        alt={ep.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-6 h-6 fill-white text-white drop-shadow" />
                      </div>
                    </div>
                    <div className="grow min-w-0">
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-semibold text-white truncate group-hover:text-red-400 transition-colors">
                          {ep.title}
                        </h5>
                        <span className="text-xs text-zinc-400 shrink-0 ml-2 font-mono">
                          {ep.duration}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-2 mt-1">{ep.overview}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'trailer' && displayItem.trailerYoutubeKey && (
            <div className="aspect-[16/9] w-full rounded-lg overflow-hidden bg-black border border-zinc-800">
              <iframe
                src={`https://www.youtube.com/embed/${displayItem.trailerYoutubeKey}?autoplay=1&rel=0`}
                title={`${displayItem.title} Trailer`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
