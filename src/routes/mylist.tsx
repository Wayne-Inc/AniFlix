import { Bookmark } from "lucide-react";
import { AnimeCard } from "@/components/AnimeCard";
import { useAuth } from "@/context/AuthContext";
import { getMyListFromFirestore } from "@/lib/my-list-firestore";
import { useState, useEffect } from "react";
import { AnimeItem } from "@/types/anime";
import { navigate } from "@/lib/navigation";

export function MyListPage() {
  const { user, signInWithGoogle, loading } = useAuth();
  const [list, setList] = useState<AnimeItem[]>([]);
  const [loaded, setLoaded] = useState(false);

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
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-[#111115] text-[#e5e5e5] font-sans antialiased">
      <main className="mx-auto max-w-[1800px] px-4 pt-24 pb-16 sm:px-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
          <Bookmark className="size-6 fill-current text-primary" /> My List
        </h1>
        {!loaded ? (
          <div className="text-center py-20">
            <p className="text-zinc-400 text-sm">Loading your watchlist...</p>
          </div>
        ) : list.length === 0 ? (
          <div className="mt-20 text-center">
            <Bookmark className="mx-auto size-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Your list is empty.</p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Tap the bookmark button on any title to save it here.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
            {list.map((m) => (
              <AnimeCard key={m.id} item={m} onSelect={(item) => { navigate('/detail/' + item.id + '?type=' + item.type); }} onPlay={() => {}} onToggleMyList={() => {}} isInMyList={() => true} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
