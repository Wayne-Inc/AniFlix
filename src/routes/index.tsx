import { useMemo } from "react";
import { fetchTmdbAnimeTVMultiple, fetchTmdbAnimeMoviesMultiple } from "../services/tmdb";
import { HeroBanner } from "@/components/HeroBanner";
import { AnimeRow } from "@/components/AnimeRow";
import { AnimeCard } from "@/components/AnimeCard";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect, useCallback } from "react";
import { AnimeItem } from "@/types/anime";

export function HomePage() {
  const { user, signInWithGoogle, loading } = useAuth();
  const [catalog, setCatalog] = useState<AnimeItem[]>([]);
  const [tvPage, setTvPage] = useState(1);
  const [moviePage, setMoviePage] = useState(1);

  const loadCatalog = useCallback(async () => {
    try {
      const [tvList, movieList] = await Promise.all([
        fetchTmdbAnimeTVMultiple(1, 5),
        fetchTmdbAnimeMoviesMultiple(1, 5),
      ]);
      setTvPage(6);
      setMoviePage(6);
      setCatalog((prev) => {
        const map = new Map<number, AnimeItem>();
        prev.forEach((i) => map.set(i.id, i));
        tvList.forEach((i) => map.set(i.id, i));
        movieList.forEach((i) => map.set(i.id, i));
        return Array.from(map.values());
      });
    } catch (err) {
      console.warn("Error loading TMDB anime data:", err);
    }
  }, []);

  const loadMoreCatalog = useCallback(async () => {
    try {
      const [tvList, movieList] = await Promise.all([
        fetchTmdbAnimeTVMultiple(tvPage, tvPage + 4),
        fetchTmdbAnimeMoviesMultiple(moviePage, moviePage + 4),
      ]);
      setTvPage((p) => p + 5);
      setMoviePage((p) => p + 5);
      setCatalog((prev) => {
        const map = new Map<number, AnimeItem>();
        prev.forEach((i) => map.set(i.id, i));
        tvList.forEach((i) => map.set(i.id, i));
        movieList.forEach((i) => map.set(i.id, i));
        return Array.from(map.values());
      });
    } catch (err) {
      console.warn("Error loading more TMDB anime data:", err);
    }
  }, [tvPage, moviePage]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const featuredHighlights = useMemo(() => catalog.filter((i) => i.featured), [catalog]);
  const animeSeries = useMemo(() => catalog.filter((i) => i.type === "anime"), [catalog]);
  const animeMovies = useMemo(() => catalog.filter((i) => i.type === "movie"), [catalog]);

  return (
    <div className="min-h-screen bg-[#111115] text-[#e5e5e5] font-sans antialiased selection:bg-red-600 selection:text-white">
      <main className="pt-18 pb-20">
        <HeroBanner
          featuredItems={featuredHighlights}
          onPlay={() => {}}
          onMoreInfo={() => {}}
          onToggleMyList={() => {}}
          isInMyList={() => false}
        />
        <div className="relative -mt-16 sm:-mt-24 z-20 space-y-4">
          <AnimeRow
            title="Trending Japanese Anime"
            subtitle="Most-watched TV series this week"
            items={animeSeries}
            onSelect={(item) => { window.location.href = '/detail/' + item.id + '?type=' + item.type; }}
            onPlay={(item) => { window.location.href = '/watch/' + item.id + '?type=' + item.type + (item.episodesCount ? '&s=1&e=1' : ''); }}
            onToggleMyList={() => {}}
            isInMyList={() => false}
            aspectRatio="backdrop"
          />
          <AnimeRow
            title="Acclaimed Anime Films"
            subtitle="Masterpieces from Makoto Shinkai & Studio Ghibli"
            items={animeMovies}
            onSelect={(item) => { window.location.href = '/detail/' + item.id + '?type=' + item.type; }}
            onPlay={(item) => { window.location.href = '/watch/' + item.id + '?type=' + item.type; }}
            onToggleMyList={() => {}}
            isInMyList={() => false}
            aspectRatio="poster"
          />
        </div>
      </main>
    </div>
  );
}
