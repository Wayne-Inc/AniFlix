import { useEffect, useMemo, useState } from "react";
import { Bookmark, Link2, Settings2 } from "lucide-react";
import { AnimeCard } from "@/components/AnimeCard";
import { useAuth } from "@/context/AuthContext";
import { getMyListFromFirestore, removeMyListFromFirestore } from "@/lib/my-list-firestore";
import { AnimeItem } from "@/types/anime";
import { navigate } from "@/lib/navigation";
import { RemoveFromListDialog } from "@/components/RemoveFromListDialog";
import { toast } from "sonner";

type Source = "all" | "aniflix" | "anilist" | "mal";

const SOURCES: { id: Source; label: string; dot: string }[] = [
  { id: "all", label: "All", dot: "bg-zinc-400" },
  { id: "aniflix", label: "AniFlix only", dot: "bg-red-500" },
  { id: "anilist", label: "AniList", dot: "bg-sky-400" },
  { id: "mal", label: "MyAnimeList", dot: "bg-indigo-400" },
];

/** Where a title exists, based on the ids stored by the sync adapters. */
function matchesSource(item: AnimeItem, source: Source): boolean {
  switch (source) {
    case "aniflix":
      return !item.anilistId && !item.malId;
    case "anilist":
      return !!item.anilistId;
    case "mal":
      return !!item.malId;
    default:
      return true;
  }
}

export function MyListPage() {
  const { user, signInWithGoogle, loading } = useAuth();
  const [list, setList] = useState<AnimeItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [source, setSource] = useState<Source>("all");
  const [removeDialogItem, setRemoveDialogItem] = useState<AnimeItem | null>(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = await getMyListFromFirestore();
        if (!cancelled) {
          setList(items);
          setLoaded(true);
        }
      } catch (e) {
        console.warn("Failed to load my list:", e);
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(
    () =>
      SOURCES.reduce<Record<Source, number>>(
        (acc, entry) => {
          acc[entry.id] = list.filter((item) => matchesSource(item, entry.id)).length;
          return acc;
        },
        { all: 0, aniflix: 0, anilist: 0, mal: 0 },
      ),
    [list],
  );

  const visible = useMemo(
    () => (source === "all" ? list : list.filter((item) => matchesSource(item, source))),
    [list, source],
  );

  const handleToggleMyList = (item: AnimeItem) => {
    const isInList = list.some((m) => m.id === item.id);
    if (isInList) {
      const isSynced = !!item.anilistId || !!item.malId;
      if (isSynced) {
        setRemoveDialogItem(item);
        setRemoveDialogOpen(true);
        return;
      }
      // Not synced - remove directly
      removeMyListFromFirestore(item.id);
      setList((prev) => prev.filter((m) => m.id !== item.id));
    } else {
      // Add to list - would need setMyListInFirestore import
      // For now, just navigate to detail page to add
      navigate("/detail/" + item.id + "?type=" + item.type);
    }
  };

  const handleRemoveConfirm = async (mode: 'local' | 'anilist' | 'mal' | 'all') => {
    if (!removeDialogItem) return;
    
    try {
      await removeMyListFromFirestore(removeDialogItem.id);
      setList((prev) => prev.filter((m) => m.id !== removeDialogItem.id));
      
      if (mode !== 'local') {
        const trackers: string[] = [];
        if (mode === 'anilist' || mode === 'all') trackers.push('AniList');
        if (mode === 'mal' || mode === 'all') trackers.push('MyAnimeList');
        
        toast.info(
          `Removed from AniFlix. ${trackers.join(' + ')} removal will be synced on next sync.`,
          { duration: 5000 }
        );
      } else {
        toast.success('Removed from your AniFlix list');
      }
    } catch (e) {
      console.error('Failed to remove from list:', e);
      toast.error('Failed to remove from list');
    } finally {
      setRemoveDialogItem(null);
      setRemoveDialogOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111115] text-[#e5e5e5] font-sans antialiased">
      <main className="mx-auto max-w-[1800px] px-4 pb-16 pt-24 sm:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
              <Bookmark className="size-6 fill-current text-primary" /> My List
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              {list.length === 0
                ? "Titles you save in AniFlix appear here."
                : `${list.length} saved ${list.length === 1 ? "title" : "titles"}, mirrored to the trackers you connect.`}
            </p>
          </div>
          <button
            onClick={() => navigate("/settings")}
            className="inline-flex w-fit items-center gap-2 rounded-md border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            <Settings2 className="size-3.5" /> Manage trackers
          </button>
        </div>

        {/* Source filter */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {SOURCES.map((entry) => {
            const active = source === entry.id;
            return (
              <button
                key={entry.id}
                onClick={() => setSource(entry.id)}
                aria-pressed={active}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-zinc-500 bg-zinc-100/10 text-white"
                    : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }`}
              >
                <span className={`size-2 rounded-full ${entry.dot}`} aria-hidden="true" />
                {entry.label}
                <span className={`text-[10px] ${active ? "text-zinc-300" : "text-zinc-500"}`}>
                  {counts[entry.id]}
                </span>
              </button>
            );
          })}
        </div>

        {!loaded ? (
          <div className="py-20 text-center">
            <p className="text-sm text-zinc-400">Loading your watchlist...</p>
          </div>
        ) : list.length === 0 ? (
          <div className="mt-20 text-center">
            <Bookmark className="mx-auto mb-3 size-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">Your list is empty.</p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Tap the bookmark button on any title to save it here.
            </p>
          </div>
        ) : visible.length === 0 ? (
          <div className="mt-20 text-center">
            <Link2 className="mx-auto mb-3 size-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              No titles in this view yet.
            </p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              {source === "aniflix"
                ? "Everything in your list is linked to a tracker."
                : `Titles are marked here once they are linked to ${
                    source === "anilist" ? "AniList" : "MyAnimeList"
                  }. Run a sync from Settings to link them.`}
            </p>
            {source !== "aniflix" && (
              <button
                onClick={() => navigate("/settings")}
                className="mt-4 inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-700"
              >
                Go to Settings
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
              {visible.map((m) => (
                <AnimeCard
                  key={m.id}
                  item={m}
                  onSelect={(item) => {
                    navigate("/detail/" + item.id + "?type=" + item.type);
                  }}
                  onPlay={() => {}}
                  onToggleMyList={handleToggleMyList}
                  isInMyList={() => true}
                />
              ))}
            </div>
            <RemoveFromListDialog
              item={removeDialogItem}
              isOpen={removeDialogOpen}
              onClose={() => {
                setRemoveDialogOpen(false);
                setRemoveDialogItem(null);
              }}
              onConfirm={handleRemoveConfirm}
            />
          </>
        )}
      </main>
    </div>
  );
}
