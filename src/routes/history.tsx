import { useEffect, useState, useMemo } from "react";
import { Clock, RotateCw, Loader2, Eye, AlertTriangle, CheckCircle2, Download, Upload } from "lucide-react";
import { AnimeCard } from "@/components/AnimeCard";
import { useAuth } from "@/context/AuthContext";
import { getHistoryFromFirestore, getWatchedHistoryFromFirestore, type HistoryItem } from "@/lib/continue-watching-firestore";
import { syncAniList, getLastSyncSummary, type SyncSummary } from "@/lib/anilist-sync";
import { syncMal, getLastMalSyncSummary, type MalSyncSummary } from "@/lib/mal-sync";
import { navigate } from "@/lib/navigation";
import { toast } from "sonner";

type FilterType = "all" | "watched" | "in-progress";

const FILTERS: { id: FilterType; label: string; icon: React.ReactNode }[] = [
  { id: "all", label: "All History", icon: <Clock className="w-4 h-4" /> },
  { id: "watched", label: "Completed", icon: <CheckCircle2 className="w-4 h-4" /> },
  { id: "in-progress", label: "In Progress", icon: <Eye className="w-4 h-4" /> },
];

export function HistoryPage() {
  const { user, loading } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [syncingAniList, setSyncingAniList] = useState(false);
  const [syncingMal, setSyncingMal] = useState(false);
  const [lastAniListSync, setLastAniListSync] = useState<SyncSummary | null>(null);
  const [lastMalSync, setLastMalSync] = useState<MalSyncSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = await getHistoryFromFirestore();
        if (!cancelled) {
          setHistory(items);
          setLoaded(true);
        }
      } catch (e) {
        console.warn("Failed to load history:", e);
        setLoaded(true);
      }
      // Load last sync summaries
      const anilistSummary = getLastSyncSummary();
      const malSummary = getLastMalSyncSummary();
      if (!cancelled) {
        setLastAniListSync(anilistSummary);
        setLastMalSync(malSummary);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      switch (filter) {
        case "watched":
          return item.watched === true;
        case "in-progress":
          return item.watched !== true && item.progress > 0;
        default:
          return true;
      }
    });
  }, [history, filter]);

  const handleAniListSync = async () => {
    setSyncingAniList(true);
    try {
      const summary = await syncAniList();
      setLastAniListSync(summary);
      toast.success(`AniList sync complete: ${summary.pushed} pushed, ${summary.pulled} pulled`);
    } catch (e) {
      const err = e as Error;
      if (err.message.includes("Connect an AniList account")) {
        toast.error("Connect AniList in Settings first");
      } else {
        toast.error(err.message || "AniList sync failed");
      }
    } finally {
      setSyncingAniList(false);
    }
  };

  const handleMalSync = async () => {
    setSyncingMal(true);
    try {
      const summary = await syncMal();
      setLastMalSync(summary);
      toast.success(`MyAnimeList sync complete: ${summary.pushed} pushed, ${summary.pulled} pulled`);
    } catch (e) {
      const err = e as Error;
      if (err.message.includes("Connect") || err.message.includes("account")) {
        toast.error("Connect MyAnimeList in Settings first");
      } else {
        toast.error(err.message || "MyAnimeList sync failed");
      }
    } finally {
      setSyncingMal(false);
    }
  };

  const handleSyncAll = async () => {
    await handleAniListSync();
    await handleMalSync();
    // Reload history after sync
    const items = await getHistoryFromFirestore();
    setHistory(items);
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getProgressPercent = (item: HistoryItem): number => {
    if (!item.duration || item.duration <= 0) return 0;
    return Math.min(100, Math.round((item.progress / item.duration) * 100));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111115] text-[#e5e5e5] font-sans antialiased pt-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center gap-2 mb-8">
            <Clock className="w-8 h-8 text-red-500" />
            <h1 className="text-2xl font-bold">History</h1>
          </div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 animate-pulse">
                <div className="w-20 h-28 rounded-lg bg-zinc-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-48 bg-zinc-800 rounded" />
                  <div className="h-3 w-32 bg-zinc-800 rounded" />
                  <div className="h-2 w-24 bg-zinc-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#111115] text-[#e5e5e5] font-sans antialiased pt-20">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <Clock className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Sign in to view history</h1>
          <p className="text-zinc-400">Your watch history will appear here once you sign in.</p>
        </div>
      </div>
    );
  }

  const watchedCount = history.filter((h) => h.watched).length;
  const inProgressCount = history.filter((h) => !h.watched && h.progress > 0).length;

  return (
    <div className="min-h-screen bg-[#111115] text-[#e5e5e5] font-sans antialiased">
      <main className="max-w-7xl mx-auto px-4 pb-16 pt-24 sm:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-8">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
              <Clock className="size-6 fill-current text-red-500" /> History
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              {history.length === 0
                ? "Titles you watch will appear here automatically."
                : `${history.length} total · ${watchedCount} completed · ${inProgressCount} in progress`}
            </p>
          </div>

          {/* Sync Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* AniList Sync */}
            <button
              onClick={handleAniListSync}
              disabled={syncingAniList || syncingMal}
              className="inline-flex items-center gap-2 rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-400 hover:bg-sky-500/20 transition-colors disabled:opacity-50"
              title="Sync with AniList"
            >
              {syncingAniList ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              <span>{syncingAniList ? "Syncing…" : "Sync AniList"}</span>
            </button>

            {/* MyAnimeList Sync */}
            <button
              onClick={handleMalSync}
              disabled={syncingAniList || syncingMal}
              className="inline-flex items-center gap-2 rounded-md border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-400 hover:bg-indigo-500/20 transition-colors disabled:opacity-50"
              title="Sync with MyAnimeList"
            >
              {syncingMal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>{syncingMal ? "Syncing…" : "Sync MAL"}</span>
            </button>

            {/* Sync All */}
            <button
              onClick={handleSyncAll}
              disabled={syncingAniList || syncingMal}
              className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors disabled:opacity-50"
              title="Sync both trackers"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Sync All</span>
            </button>
          </div>
        </div>

        {/* Last Sync Status */}
        {(lastAniListSync || lastMalSync) && (
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            {lastAniListSync && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <span>Last AniList sync: {formatTime(lastAniListSync.at)}</span>
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="text-green-400">↑ {lastAniListSync.pushed} pushed</span>
                  <span className="text-blue-400">↓ {lastAniListSync.pulled} pulled</span>
                  {lastAniListSync.failed > 0 && (
                    <span className="text-red-400">✗ {lastAniListSync.failed} failed</span>
                  )}
                </div>
              </div>
            )}
            {lastMalSync && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span>Last MAL sync: {formatTime(lastMalSync.at)}</span>
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="text-green-400">↑ {lastMalSync.pushed} pushed</span>
                  <span className="text-blue-400">↓ {lastMalSync.pulled} pulled</span>
                  {lastMalSync.failed > 0 && (
                    <span className="text-red-400">✗ {lastMalSync.failed} failed</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f.id
                  ? "bg-red-600 text-white"
                  : "bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800 border border-zinc-700"
              }`}
            >
              {f.icon} {f.label}
            </button>
          ))}
        </div>

        {/* History List */}
        {loaded && filteredHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
            <Clock className="w-16 h-16 text-zinc-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {filter === "watched" ? "No completed titles yet" : filter === "in-progress" ? "Nothing in progress" : "History is empty"}
            </h2>
            <p className="text-zinc-400 max-w-md">
              {filter === "watched"
                ? "Titles you finish watching will appear here."
                : filter === "in-progress"
                ? "Start watching something to see it here."
                : "Watch something to build your history."}
            </p>
          </div>
        )}

        {loaded && filteredHistory.length > 0 && (
          <div className="space-y-3">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors group"
              >
                {/* Poster */}
                <div className="relative w-20 h-28 shrink-0 rounded-lg overflow-hidden bg-zinc-800">
                  {item.poster ? (
                    <img
                      src={item.poster}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600" />
                  )}
                  {item.watched && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-400" />
                    </div>
                  )}
                  {!item.watched && item.progress > 0 && item.duration > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-800">
                      <div
                        className="h-full bg-red-500"
                        style={{ width: `${getProgressPercent(item)}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-medium text-sm truncate group-hover:text-white transition-colors">
                        {item.title}
                      </h3>
                      <p className="mt-0.5 text-xs text-zinc-500 flex items-center gap-1">
                        {item.season && item.episode ? (
                          <>
                            S{item.season} E{item.episode}
                            {item.season && item.episode && item.duration > 0 && (
                              <> · {Math.round(item.progress / 60)}min</>
                            )}
                          </>
                        ) : item.duration > 0 ? (
                          <>
                            {item.type === "movie" ? "Movie" : "Series"} · {Math.round(item.duration / 60)}min
                          </>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        item.watched
                          ? "bg-green-500/20 text-green-400"
                          : item.progress > 0
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-zinc-700 text-zinc-500"
                      }`}>
                        {item.watched ? "Completed" : item.progress > 0 ? `${getProgressPercent(item)}%` : "Started"}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">Last watched: {formatTime(item.updatedAt)}</p>
                </div>

                {/* Play Button */}
                <button
                  onClick={() => {
                    if (item.season && item.episode) {
                      navigate(`/watch/${item.movieId}?type=${item.type}&s=${item.season}&e=${item.episode}`);
                    } else {
                      navigate(`/watch/${item.movieId}?type=${item.type}`);
                    }
                  }}
                  className="shrink-0 p-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-red-600 hover:text-white transition-colors"
                  title="Continue watching"
                >
                  <Eye className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}