import { TrendingUp } from "lucide-react";
import { AnimeCard } from "@/components/AnimeCard";
import { useAuth } from "@/context/AuthContext";
import { fetchTmdbAnimeTVMultiple, fetchTmdbAnimeMoviesMultiple } from "@/services/tmdb";
import { useState, useEffect, useCallback, useMemo } from "react";
import { AnimeItem } from "@/types/anime";
import { navigate } from "@/lib/navigation";

export function TrendingPage() {
  const { user, signInWithGoogle, loading } = useAuth();
  const [catalog, setCatalog] = useState<AnimeItem[]>([]);

  const loadCatalog = useCallback(async () => {
    try {
      const [tvList, movieList] = await Promise.all([
        fetchTmdbAnimeTVMultiple(1, 5),
        fetchTmdbAnimeMoviesMultiple(1, 5),
      ]);
      const all = [...tvList, ...movieList].sort((a, b) => b.voteAverage - a.voteAverage);
      setCatalog(all.slice(0, 50));
    } catch (err) {
      console.warn("Error loading trending:", err);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  return (
    <div className="min-h-screen bg-[#111115] text-[#e5e5e5] font-sans antialiased">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-6 h-6 text-cyan-500" />
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white capitalize tracking-tight">
                Top Rated Anime Leaderboard
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400">
              Highest rated Japanese anime ranked by TMDB user votes.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {catalog.map((item, index) => (
            <div key={item.id} className="relative">
              <div className="absolute -top-3 -left-2 z-20 w-8 h-8 rounded-full bg-red-600 text-white font-extrabold text-sm flex items-center justify-center shadow-lg border-2 border-[#111115]">
                #{index + 1}
              </div>
              <AnimeCard
                item={item}
                onSelect={(item) => { navigate('/detail/' + item.id + '?type=' + item.type); }}
                onPlay={() => { navigate('/watch/' + item.id + '?type=' + item.type + (item.episodesCount ? '&s=1&e=1' : '')); }}
                onToggleMyList={() => {}}
                isInMyList={() => false}
              />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
