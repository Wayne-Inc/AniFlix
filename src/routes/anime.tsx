import { useMemo } from "react";
import { fetchTmdbAnimeTVMultiple } from "../services/tmdb";
import { AnimeRow } from "@/components/AnimeRow";
import { AnimeCard } from "@/components/AnimeCard";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect, useCallback } from "react";
import { AnimeItem } from "@/types/anime";
import { navigate } from "@/lib/navigation";

export function AnimePage() {
  const { user, signInWithGoogle, loading } = useAuth();
  const [catalog, setCatalog] = useState<AnimeItem[]>([]);
  const [page, setPage] = useState(1);

  const loadCatalog = useCallback(async () => {
    try {
      const list = await fetchTmdbAnimeTVMultiple(1, 10);
      setCatalog(list);
    } catch (err) {
      console.warn("Error loading TMDB anime data:", err);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const loadMore = useCallback(async () => {
    try {
      const list = await fetchTmdbAnimeTVMultiple(page + 1, page + 5);
      setPage((p) => p + 5);
      setCatalog((prev) => {
        const map = new Map<number, AnimeItem>();
        prev.forEach((i) => map.set(i.id, i));
        list.forEach((i) => map.set(i.id, i));
        return Array.from(map.values());
      });
    } catch (err) {
      console.warn("Error loading more anime:", err);
    }
  }, [page]);

  return (
    <div className="min-h-screen bg-[#111115] text-[#e5e5e5] font-sans antialiased">
      <main className="pt-18 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-zinc-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white capitalize tracking-tight">
              Anime TV Series
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">
              Querying TMDB for Japanese anime TV broadcasts.
            </p>
          </div>
          <button
            onClick={loadMore}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Load More TMDB Titles
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {catalog.map((item) => (
            <AnimeCard
              key={item.id}
              item={item}
              onSelect={(item) => { navigate('/detail/' + item.id + '?type=' + item.type); }}
              onPlay={() => { navigate('/watch/' + item.id + '?type=' + item.type + (item.episodesCount ? '&s=1&e=1' : '')); }}
              onToggleMyList={() => {}}
              isInMyList={() => false}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
