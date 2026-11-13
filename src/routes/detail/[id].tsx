import React, { useState, useEffect } from "react";
import { X, Play, Plus, Check, Star, Volume2, VolumeX, Clock, Film, Tv, Sparkles, CheckCircle2, Circle, ChevronRight, ChevronDown, Monitor, PlayCircle } from "lucide-react";
import { AnimeItem, Episode, Season } from "@/types/anime";
import { fetchAnimeDetails } from "@/services/tmdb";
import { setWatched, isWatched } from "@/lib/continue-watching-firestore";
import { setMyListInFirestore, removeMyListFromFirestore, getMyListFromFirestore } from "@/lib/my-list-firestore";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { VideoPlayerModal } from "@/components/VideoPlayerModal";
import { navigate } from "@/lib/navigation";

export function DetailPage() {
  const { user, signInWithGoogle, loading } = useAuth();
  const id = window.location.pathname.split("/").pop();
  const urlParams = new URLSearchParams(window.location.search);
  const contentType = urlParams.get("type"); // "anime" | "movie"
  const [item, setItem] = useState<AnimeItem | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isWatchedState, setIsWatchedState] = useState(false);
  const [isInMyList, setIsInMyList] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!id) return;
    setItem({
      id: parseInt(id, 10),
      tmdbId: parseInt(id, 10),
      title: "Loading...",
      type: (contentType === 'movie' ? 'movie' : 'anime'),
      overview: "",
      backdropPath: "",
      posterPath: "",
      voteAverage: 0,
      voteCount: 0,
      genres: [],
      matchScore: 0,
    });
  }, [id]);

  useEffect(() => {
    if (!item?.tmdbId) return;
    const load = async () => {
      try {
        const details = await fetchAnimeDetails(item);
        setItem(details);
        setError(null);
      } catch (e) {
        console.warn("Failed to fetch anime details:", e);
        setError(e as Error);
      }
      isWatched(item).then(setIsWatchedState);
      getMyListFromFirestore().then((list) => setIsInMyList(list.some((m) => m.id === item.id)));
    };
    load();
  }, [item]);

  const toggleWatched = async () => {
    const next = !isWatchedState;
    setIsWatchedState(next);
    if (!item?.tmdbId) return;
    await setWatched(item, next);
  };

  const toggleMyList = async () => {
    setIsInMyList((prev) => !prev);
    if (!item) return;
    if (isInMyList) {
      await removeMyListFromFirestore(item.id);
    } else {
      await setMyListInFirestore(item, true);
    }
  };

  const playEpisode = (seasonNumber: number, episode: Episode) => {
    if (!item) return;
    navigate('/watch/' + item.id + '?type=' + item.type + '&s=' + seasonNumber + '&e=' + episode.episodeNumber);
  };

  return (
    <div className="min-h-screen bg-[#111115] text-[#e5e5e5] font-sans antialiased">
      {!item ? (
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="max-w-md text-center">
            <h1 className="text-xl font-semibold tracking-tight text-[#e5e5e5]">Loading…</h1>
          </div>
        </div>
      ) : error ? (
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="max-w-md text-center">
            <h1 className="text-xl font-semibold tracking-tight text-red-400">Failed to load details</h1>
            <p className="text-zinc-400 mt-2">{error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative w-full h-[60vh] sm:h-[70vh] overflow-hidden">
            {item.backdropPath && (
              <img
                src={item.backdropPath}
                alt={item.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-top"
              />
            )}
            {!item.backdropPath && (
              <div className="w-full h-full bg-gradient-to-b from-zinc-900 to-zinc-950 flex items-center justify-center">
                <div className="text-center">
                  <Film className="w-24 h-24 text-zinc-800 mx-auto mb-4" />
                  <p className="text-zinc-500 text-sm">No backdrop image available</p>
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#111115] via-[#111115]/60 to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 pb-10">
              <button
                onClick={() => window.history.back()}
                className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Back"
              >
                <X className="w-5 h-5" />
              </button>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight drop-shadow-lg mb-2">
                {item.title}
              </h1>
              {item.japaneseTitle && item.japaneseTitle !== item.title && (
                <p className="text-sm text-zinc-400 italic mb-3">{item.japaneseTitle}</p>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => { navigate('/watch/' + item.id + '?type=' + item.type + (item.episodesCount ? '&s=1&e=1' : '')); }}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-sm transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current text-zinc-950" />
                  Play
                </button>
                <button
                  onClick={toggleMyList}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isInMyList
                      ? "bg-red-600 border-red-500 text-white"
                      : "bg-zinc-900/80 border-zinc-600 text-zinc-200 hover:border-zinc-400"
                  }`}
                  title={isInMyList ? "Remove from My List" : "Add to My List"}
                >
                  {isInMyList ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
                <button
                  onClick={toggleWatched}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isWatchedState
                      ? "bg-emerald-600 border-emerald-500 text-white"
                      : "bg-zinc-900/80 border-zinc-600 text-zinc-200 hover:border-zinc-400"
                  }`}
                  title={isWatchedState ? "Mark as Unwatched" : "Mark as Watched"}
                >
                  {isWatchedState ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-6">
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-300">
                  <span className="text-emerald-400 font-bold">{item.matchScore}% Match</span>
                  <span>·</span>
                  <span>{item.releaseYear}</span>
                  <span>·</span>
                  <span className="border border-zinc-700 px-1.5 py-0.2 rounded font-mono text-zinc-300">
                    {item.ageRating}
                  </span>
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed">{item.overview}</p>
                {item.cast && item.cast.length > 0 && (
                  <div className="mt-4 space-y-2 pb-8">
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">Cast</h3>
                    <div className="flex flex-wrap gap-3">
                      {item.cast.map((c) => (
                        <div
                          key={c.id ?? c.actor}
                          onClick={() => {
                            if (c.id) window.location.href = `https://streamflix.dpdns.org/person/${c.id}`;
                          }}
                          className="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          {c.image ? (
                            <img src={c.image} alt={c.actor} className="w-16 h-16 rounded-full object-cover border border-zinc-700" />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-amber-500 flex items-center justify-center text-white font-bold text-xs shadow" />
                          )}
                          <span className="text-sm text-zinc-300 truncate w-full text-center">{c.actor}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-[#18181f] p-6 rounded-xl border border-zinc-800 space-y-6">
                <div>
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Genres</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {item.genres.map((g) => (
                      <span key={g} className="text-xs text-zinc-300 border border-zinc-700 px-2 py-1 rounded">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Runtime</span>
                  <p className="text-zinc-300 mt-1">{item.duration}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</span>
                  <p className="text-zinc-300 mt-1">{item.status || "Unknown"}</p>
                </div>
                {item.trailerYoutubeKey && (
                  <button
                    onClick={() => setTrailerOpen(true)}
                    className="w-full py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors"
                  >
                    Watch Trailer
                  </button>
                )}
              </div>
            </div>

            {/* Seasons & Episodes (for series) */}
            {item.type !== 'movie' && item.seasons && item.seasons.length > 0 && (
              <div className="mt-12">
                <h2 className="text-xl font-bold text-white mb-6">Seasons &amp; Episodes</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {item.seasons.map((season) => (
                    <div
                      key={season.seasonNumber}
                      onClick={() => {
                        setExpandedSeasons((prev) => {
                          const next = new Set(prev);
                          if (next.has(season.seasonNumber)) next.delete(season.seasonNumber);
                          else next.add(season.seasonNumber);
                          return next;
                        });
                      }}
                      className="bg-[#18181f] rounded-xl border border-zinc-800 overflow-hidden transition-colors hover:border-zinc-700 cursor-pointer"
                    >
                      <div className="relative h-48 overflow-hidden">
                        {season.posterPath ? (
                          <img
                            src={season.posterPath}
                            alt={`Season ${season.seasonNumber}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-zinc-900/50 flex items-center justify-center">
                            <Monitor className="w-12 h-12 text-zinc-700" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                        <div className="absolute bottom-2 left-2 right-2 p-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white">{season.name}</span>
                            <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                              S{season.seasonNumber}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 line-clamp-2 mt-1">{season.overview}</p>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                            {season.episodeCount} episode{season.episodeCount !== 1 ? 's' : ''}
                          </span>
                          <button
                            onClick={() => {
                              setExpandedSeasons((prev) => {
                                const next = new Set(prev);
                                if (next.has(season.seasonNumber)) next.delete(season.seasonNumber);
                                else next.add(season.seasonNumber);
                                return next;
                              });
                            }}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            {expandedSeasons.has(season.seasonNumber) ? 'Collapse' : 'Episodes'}
                          </button>
                        </div>
                        {expandedSeasons.has(season.seasonNumber) && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-3">
                            {season.episodes.map((ep) => (
                              <div
                                key={ep.id}
                                className="flex flex-col items-center gap-1 cursor-pointer group"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playEpisode(season.seasonNumber, ep);
                                }}
                              >
                                <div className="relative h-24 overflow-hidden rounded-md bg-zinc-900/50">
                                  {ep.thumbnail ? (
                                    <img
                                      src={ep.thumbnail}
                                      alt={ep.title}
                                      className="w-full h-full object-cover group-hover:brightness-110 transition-colors"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                                      <PlayCircle className="w-8 h-8 text-zinc-700" />
                                    </div>
                                  )}
                                  <button
                                    className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/60 transition-opacity opacity-0 group-hover:opacity-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      playEpisode(season.seasonNumber, ep);
                                    }}
                                  >
                                    <Play className="w-8 h-8 fill-current text-white drop-shadow" />
                                  </button>
                                  <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 rounded">
                                    E{ep.episodeNumber}
                                  </span>
                                </div>
                                <span className="text-[10px] text-zinc-400 truncate w-full text-center">{ep.title}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
      {trailerOpen && (
        <VideoPlayerModal
          item={item}
          minimal
          onClose={() => setTrailerOpen(false)}
        />
      )}
    </div>
  );
}
