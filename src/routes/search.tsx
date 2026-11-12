import { Search, X } from "lucide-react";
import { AnimeCard } from "@/components/AnimeCard";
import { useAuth } from "@/context/AuthContext";
import { searchAnime } from "@/services/tmdb";
import { useState, useEffect } from "react";
import { AnimeItem } from "@/types/anime";

export function SearchPage() {
  const { user, signInWithGoogle, loading } = useAuth();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<AnimeItem[]>([]);
  const [matchedQuery, setMatchedQuery] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!q?.trim()) {
      setResults([]);
      setMatchedQuery(null);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { results: res, matchedQuery } = await searchAnime(q);
        setResults(res);
        setMatchedQuery(matchedQuery);
      } catch (e) {
        console.warn("Search error:", e);
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <div className="min-h-screen bg-[#111115] text-[#e5e5e5] font-sans antialiased">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search anime, movies, series…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setQ("");
              }}
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm"
            />
            {q && (
              <button
                onClick={() => {
                  setQ("");
                  setResults([]);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {q && !isSearching && results.length === 0 && (
            <p className="mt-3 text-center text-sm text-zinc-500">
              No results for "{q}"
            </p>
          )}
          {isSearching && (
            <p className="mt-3 text-center text-sm text-zinc-500 animate-pulse">Searching…</p>
          )}
        </div>

        {q?.trim() && (
          <>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-red-500" />
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    Search Results for "{q}"
                  </h2>
                  {matchedQuery && matchedQuery !== q && (
                    <p className="text-xs text-amber-400 font-medium mt-1">
                      Showing fuzzy matches for "{matchedQuery}"
                    </p>
                  )}
                </div>
              </div>
              <span className="text-xs text-zinc-400">{results.length} titles found</span>
            </div>
            {results.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                {results.map((item) => (
                  <AnimeCard
                    key={item.id}
                    item={item}
                    onSelect={(item) => { window.location.href = '/detail/' + item.id + '?type=' + item.type; }}
                    onPlay={() => { window.location.href = '/watch/' + item.id + '?type=' + item.type + (item.episodesCount ? '&s=1&e=1' : ''); }}
                    onToggleMyList={() => {}}
                    isInMyList={() => false}
                  />
                ))}
              </div>
            ) : (
              <div className="py-24 text-center">
                <p className="text-zinc-400 text-sm mb-2">No titles found matching your query.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
