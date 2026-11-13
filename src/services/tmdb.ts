import { AnimeItem, MediaType, Season, TmdbConfig } from '../types/anime';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w780';
const TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/original';

const TMDB_REQUEST_TIMEOUT_MS = 10000;

const CONFIG_STORAGE_KEY = 'aniflix_tmdb_config';

export function getTmdbApiKey(): string {
  // Read TMDB API key from Vite env variable (same approach as StreamFlix).
  // Vite inlines VITE_* variables at build time.
  return import.meta.env.VITE_TMDB_API_KEY ?? '';
}

export function getTmdbConfig(): TmdbConfig {
  const apiKey = getTmdbApiKey();
  // Live API is enabled when a key is configured via env variable.
  const useLiveApi = !!apiKey;
  return { apiKey, useLiveApi };
}

export function saveTmdbConfig(config: TmdbConfig): void {
  // The API key comes from the environment variable and cannot be changed at runtime.
  // Persist only the useLiveApi preference for this session.
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    const existing: Partial<TmdbConfig> = raw ? JSON.parse(raw) : {};
    localStorage.setItem(
      CONFIG_STORAGE_KEY,
      JSON.stringify({ ...existing, useLiveApi: config.useLiveApi }),
    );
  } catch (e) {
    console.warn('Error saving TMDB config to localStorage:', e);
  }
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TMDB_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

// Map TMDB genre IDs to anime genre names
export const TMDB_GENRE_MAP: Record<number, string> = {
  16: 'Animation',
  10759: 'Action & Adventure',
  35: 'Comedy',
  18: 'Drama',
  14: 'Fantasy',
  27: 'Horror',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10765: 'Sci-Fi & Fantasy',
  53: 'Thriller',
  10768: 'War & Politics',
  37: 'Western',
  80: 'Crime',
  10402: 'Music',
};

// Reverse map: genre name -> TMDB genre ID
export const GENRE_NAME_TO_ID: Record<string, number> = Object.fromEntries(
  Object.entries(TMDB_GENRE_MAP).map(([id, name]) => [name.toLowerCase(), Number(id)])
);

const TMDB_STATUS_MAP: Record<string, AnimeItem['status']> = {
  'Returning Series': 'Airing',
  'In Production': 'Airing',
  Ended: 'Finished',
  Canceled: 'Finished',
  Planned: 'Upcoming',
};

// Map raw TMDB TV/Movie item to AnimeItem — only fields TMDB actually provides.
function mapTmdbToAnime(raw: any, type: MediaType): AnimeItem {
  const isMovie = type === 'movie';
  const title = isMovie ? raw.title : raw.name;
  const originalTitle = isMovie ? raw.original_title : raw.original_name;
  const releaseDate = isMovie ? raw.release_date : raw.first_air_date;
  const releaseYear = releaseDate ? parseInt(releaseDate.slice(0, 4), 10) : undefined;

  const genres = (raw.genre_ids || [])
    .map((gid: number) => TMDB_GENRE_MAP[gid])
    .filter(Boolean);

  const voteAvg = raw.vote_average ?? 0;
  const matchScore = Math.round(voteAvg * 10);

  return {
    id: raw.id,
    tmdbId: raw.id,
    title: title || '',
    japaneseTitle: originalTitle,
    romajiTitle: originalTitle,
    type,
    overview: raw.overview || '',
    backdropPath: raw.backdrop_path ? `${TMDB_BACKDROP_BASE}${raw.backdrop_path}` : '',
    posterPath: raw.poster_path ? `${TMDB_IMAGE_BASE}${raw.poster_path}` : '',
    voteAverage: voteAvg,
    voteCount: raw.vote_count ?? 0,
    releaseYear,
    genres,
    matchScore,
  };
}

/**
 * Query TMDB specifically for Anime Series.
 * Requires a configured TMDB API key — no local fallback.
 */
export async function fetchTmdbAnimeTV(page: number = 1): Promise<AnimeItem[]> {
  const config = getTmdbConfig();
  if (!config.apiKey || !config.useLiveApi) {
    return [];
  }

  try {
    const url = `${TMDB_BASE_URL}/discover/tv?api_key=${encodeURIComponent(config.apiKey)}&with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=${page}`;
    const res = await fetchWithTimeout(url);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return data.results.map((item: any) => mapTmdbToAnime(item, 'anime'));
      }
    }
  } catch (err) {
    console.warn('Failed to fetch from TMDB TV discover:', err);
  }

  return [];
}

/**
 * Query TMDB specifically for Anime Movies.
 * Requires a configured TMDB API key — no local fallback.
 */
export async function fetchTmdbAnimeMovies(page: number = 1): Promise<AnimeItem[]> {
  const config = getTmdbConfig();
  if (!config.apiKey || !config.useLiveApi) {
    return [];
  }

  try {
    const url = `${TMDB_BASE_URL}/discover/movie?api_key=${encodeURIComponent(config.apiKey)}&with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=${page}`;
    const res = await fetchWithTimeout(url);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return data.results.map((item: any) => mapTmdbToAnime(item, 'movie'));
      }
    }
  } catch (err) {
    console.warn('Failed to fetch from TMDB Movies discover:', err);
  }

  return [];
}

/**
 * Fetch multiple pages of TMDB Anime Series in parallel.
 * Returns results from pages startPage through endPage (inclusive).
 */
export async function fetchTmdbAnimeTVMultiple(startPage: number = 1, endPage: number = 5): Promise<AnimeItem[]> {
  const config = getTmdbConfig();
  if (!config.apiKey || !config.useLiveApi) {
    return [];
  }

  const pages: number[] = [];
  for (let p = startPage; p <= endPage; p++) pages.push(p);

  try {
    const results = await Promise.all(
      pages.map(async (page) => {
        try {
          const url = `${TMDB_BASE_URL}/discover/tv?api_key=${encodeURIComponent(config.apiKey)}&with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=${page}`;
          const res = await fetchWithTimeout(url);
          if (res.ok) {
            const data = await res.json();
            if (data.results && data.results.length > 0) {
              return data.results.map((item: any) => mapTmdbToAnime(item, 'anime'));
            }
          }
        } catch (err) {
          console.warn(`Failed to fetch TMDB TV page ${page}:`, err);
        }
        return [];
      })
    );

    return results.flat();
  } catch (err) {
    console.warn('Failed to fetch multiple TMDB TV pages:', err);
    return [];
  }
}

/**
 * Fetch multiple pages of TMDB Anime Movies in parallel.
 * Returns results from pages startPage through endPage (inclusive).
 */
export async function fetchTmdbAnimeMoviesMultiple(startPage: number = 1, endPage: number = 5): Promise<AnimeItem[]> {
  const config = getTmdbConfig();
  if (!config.apiKey || !config.useLiveApi) {
    return [];
  }

  const pages: number[] = [];
  for (let p = startPage; p <= endPage; p++) pages.push(p);

  try {
    const results = await Promise.all(
      pages.map(async (page) => {
        try {
          const url = `${TMDB_BASE_URL}/discover/movie?api_key=${encodeURIComponent(config.apiKey)}&with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=${page}`;
          const res = await fetchWithTimeout(url);
          if (res.ok) {
            const data = await res.json();
            if (data.results && data.results.length > 0) {
              return data.results.map((item: any) => mapTmdbToAnime(item, 'movie'));
            }
          }
        } catch (err) {
          console.warn(`Failed to fetch TMDB Movie page ${page}:`, err);
        }
        return [];
      })
    );

    return results.flat();
  } catch (err) {
    console.warn('Failed to fetch multiple TMDB Movie pages:', err);
    return [];
  }
}

const COMMON_LETTER_SUBSTITUTIONS: Record<string, string[]> = {
  a: ["e", "o"],
  e: ["a", "i"],
  i: ["y", "e"],
  o: ["u", "a"],
  u: ["o", "a"],
  y: ["i"],
  c: ["k", "s"],
  k: ["c"],
  s: ["z", "c"],
  z: ["s"],
  v: ["w", "f"],
  w: ["v"],
  m: ["n"],
  n: ["m"],
};

const COMMON_VOWELS = ["a", "e", "i", "o", "u"];

export function fuzzySearchQueries(query: string): string[] {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  const words = normalizedQuery.split(/\s+/);
  const variants = new Set<string>();

  const addCandidate = (candidateWords: string[]) => {
    const candidate = candidateWords.join(" ").trim();
    if (!candidate || candidate === normalizedQuery) return;
    variants.add(candidate);
  };

  const generateWordVariants = (word: string): string[] => {
    const candidates = new Set<string>();
    if (word.length < 3) return [];

    for (let index = 0; index < word.length; index++) {
      const without = word.slice(0, index) + word.slice(index + 1);
      if (without.length >= 2) candidates.add(without);

      for (const replacement of COMMON_LETTER_SUBSTITUTIONS[word[index]] ?? []) {
        candidates.add(word.slice(0, index) + replacement + word.slice(index + 1));
      }

      for (const vowel of COMMON_VOWELS) {
        candidates.add(word.slice(0, index) + vowel + word.slice(index));
      }
    }

    for (let index = 0; index < word.length - 1; index++) {
      const swapped = word.slice(0, index) + word[index + 1] + word[index] + word.slice(index + 2);
      if (swapped !== word) candidates.add(swapped);
    }

    const commonInsertions = [...COMMON_VOWELS, "h", "l", "r", "n", "s", "t"];
    for (let index = 0; index <= word.length; index++) {
      for (const insertion of commonInsertions) {
        candidates.add(word.slice(0, index) + insertion + word.slice(index));
      }
    }

    return [...candidates].filter((candidate) => candidate.length >= 2 && candidate !== word);
  };

  for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
    const baseWord = words[wordIndex];
    const generatedWords = generateWordVariants(baseWord);
    for (const candidateWord of generatedWords) {
      const replaced = [...words];
      replaced[wordIndex] = candidateWord;
      addCandidate(replaced);
    }
  }

  const originalWords = normalizedQuery.split(/\s+/);
  const scoreVariant = (variant: string) => {
    const variantWords = variant.split(/\s+/);
    let score = 0;

    for (let index = 0; index < originalWords.length; index++) {
      const originalWord = originalWords[index];
      const variantWord = variantWords[index] ?? "";
      if (!originalWord || !variantWord) {
        score -= 1000;
        continue;
      }

      if (originalWord === variantWord) {
        score += 200;
        continue;
      }

      let prefix = 0;
      while (
        prefix < originalWord.length &&
        prefix < variantWord.length &&
        originalWord[prefix] === variantWord[prefix]
      ) {
        prefix++;
      }

      let suffix = 0;
      while (
        suffix < originalWord.length - prefix &&
        suffix < variantWord.length - prefix &&
        originalWord[originalWord.length - 1 - suffix] ===
          variantWord[variantWord.length - 1 - suffix]
      ) {
        suffix++;
      }

      score += prefix + suffix;
      if (originalWord.length === variantWord.length) {
        score += originalWord.split("").filter((char, charIndex) => char === variantWord[charIndex]).length;
      }
    }

    return score;
  };

  const ordered = [...variants].sort((a, b) => scoreVariant(b) - scoreVariant(a));

  return ordered.slice(0, 18).filter((variant) => {
    const variantWords = variant.split(/\s+/);
    if (variantWords.length !== originalWords.length) return false;
    return variantWords.some((word, index) => word !== originalWords[index]);
  });
}

/**
 * Search TMDB for anime titles with fuzzy fallback.
 * If the exact query returns no results, tries fuzzy variants (typos, letter swaps, etc.).
 */
export async function searchAnime(query: string): Promise<{ results: AnimeItem[]; matchedQuery: string | null }> {
  if (!query.trim()) return { results: [], matchedQuery: null };

  const config = getTmdbConfig();
  if (!config.apiKey || !config.useLiveApi) {
    return { results: [], matchedQuery: null };
  }

  try {
    const results = await searchAnimeExact(query);
    if (results.length > 0) return { results, matchedQuery: query };

    // Fallback: try fuzzy variants
    const variants = fuzzySearchQueries(query);
    for (const variant of variants) {
      const fuzzyResults = await searchAnimeExact(variant);
      if (fuzzyResults.length > 0) {
        console.log(`Fuzzy search matched "${variant}" for query "${query}"`);
        return { results: fuzzyResults, matchedQuery: variant };
      }
    }
    return { results: [], matchedQuery: null };
  } catch (err) {
    console.warn('Live TMDB search error:', err);
    return { results: [], matchedQuery: null };
  }
}

/**
 * Exact TMDB multi-search for anime titles.
 */
async function searchAnimeExact(query: string): Promise<AnimeItem[]> {
  const config = getTmdbConfig();
  if (!config.apiKey || !config.useLiveApi) return [];

  try {
    const url = `${TMDB_BASE_URL}/search/multi?api_key=${encodeURIComponent(config.apiKey)}&query=${encodeURIComponent(query)}`;
    const res = await fetchWithTimeout(url);
    if (res.ok) {
      const data = await res.json();
      if (data.results) {
        const animeResults = data.results.filter(
          (r: any) =>
            (r.media_type === 'tv' || r.media_type === 'movie') &&
            (r.original_language === 'ja' || (r.genre_ids && r.genre_ids.includes(16)))
        );

        if (animeResults.length > 0) {
          return animeResults.map((r: any) =>
            mapTmdbToAnime(r, r.media_type === 'movie' ? 'movie' : 'anime')
          );
        }
      }
    }
  } catch (err) {
    console.warn('Live TMDB search error:', err);
  }

  return [];
}

/**
 * Fetch detailed information for an anime (videos/trailers, seasons, episodes, cast)
 * from the live TMDB API.
 */
export async function fetchAnimeDetails(item: AnimeItem): Promise<AnimeItem> {
  const config = getTmdbConfig();
  if (!item.tmdbId || !config.apiKey || !config.useLiveApi) {
    return item;
  }

  try {
    const isMovie = item.type === 'movie';
    const typeEndpoint = isMovie ? 'movie' : 'tv';
    const detailUrl = `${TMDB_BASE_URL}/${typeEndpoint}/${item.tmdbId}?api_key=${encodeURIComponent(config.apiKey)}&append_to_response=videos,credits,content_ratings`;
    const res = await fetchWithTimeout(detailUrl);
    if (!res.ok) {
      throw new Error(`TMDB API returned ${res.status}`);
    }
    if (res.ok) {
      const data = await res.json();

      // Extract official trailer YouTube key
      let trailerKey = item.trailerYoutubeKey;
      if (data.videos && data.videos.results) {
        const officialTrailer = data.videos.results.find(
          (v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
        );
        if (officialTrailer) trailerKey = officialTrailer.key;
      }

      // Extract full cast & voice actors (no cap)
      let cast = item.cast;
      if (data.credits && data.credits.cast) {
        cast = data.credits.cast.map((c: any) => ({
          id: c.id,
          character: c.character || 'Character',
          actor: c.name || 'Voice Actor',
          role: 'Main',
          image: c.profile_path ? `${TMDB_IMAGE_BASE}${c.profile_path}` : '',
        }));
      }

      // Real TMDB detail fields
      const status = TMDB_STATUS_MAP[data.status] || undefined;
      const spokenLanguages = (data.spoken_languages || [])
        .map((l: any) => l.english_name || l.name)
        .filter(Boolean);

      // Genres from TMDB detail response
      const genres = data.genres?.map((g: any) => g.name).filter(Boolean) || item.genres;

      // Match score from TMDB vote average
      const voteAvg = data.vote_average ?? 0;
      const matchScore = Math.round(voteAvg * 10);

      // Release year from release/first air date
      const releaseDate = isMovie ? data.release_date : data.first_air_date;
      const releaseYear = releaseDate ? parseInt(releaseDate.slice(0, 4), 10) : undefined;

      // Age rating from content ratings (prefer US rating, fallback to first available)
      let ageRating: string | undefined;
      if (data.content_ratings?.results) {
        const usRating = data.content_ratings.results.find((r: any) => r.iso_3166_1 === 'US');
        ageRating = usRating?.rating || undefined;
        if (!ageRating && data.content_ratings.results.length > 0) {
          ageRating = data.content_ratings.results[0].rating || undefined;
        }
      }

      // Runtime: movies use data.runtime; TV shows use first episode_run_time entry
      let runtime: string | undefined;
      if (isMovie) {
        runtime = data.runtime ? `${data.runtime} min` : undefined;
      } else {
        runtime = data.episode_run_time?.[0] ? `${data.episode_run_time[0]} min` : undefined;
      }

      // Build seasons for TV shows
      let seasons: Season[] | undefined;
      if (!isMovie && data.seasons) {
        seasons = await Promise.all(
          data.seasons
            .filter((s: any) => s.season_number > 0) // skip specials
            .sort((a: any, b: any) => a.season_number - b.season_number)
            .map(async (s: any) => {
              const seasonRes = await fetchWithTimeout(
                `${TMDB_BASE_URL}/tv/${item.tmdbId}/season/${s.season_number}?api_key=${encodeURIComponent(config.apiKey)}`
              );
              const seasonData = seasonRes.ok ? await seasonRes.json() : {};
              return {
                id: s.id,
                seasonNumber: s.season_number,
                name: s.name || `Season ${s.season_number}`,
                overview: s.overview || '',
                airDate: s.air_date,
                episodeCount: s.episode_count,
                posterPath: s.poster_path ? `${TMDB_IMAGE_BASE}${s.poster_path}` : undefined,
                episodes: (seasonData.episodes || []).map((ep: any) => ({
                  id: ep.id,
                  episodeNumber: ep.episode_number,
                  title: ep.name || '',
                  duration: '',
                  overview: ep.overview || '',
                  thumbnail: ep.still_path ? `${TMDB_IMAGE_BASE}${ep.still_path}` : '',
                })),
              };
            })
        );
      }

      return {
        ...item,
        title: (isMovie ? data.title : data.name) || item.title,
        matchScore,
        releaseYear,
        ageRating,
        genres,
        status,
        backdropPath: data.backdrop_path ? `${TMDB_BACKDROP_BASE}${data.backdrop_path}` : item.backdropPath,
        posterPath: data.poster_path ? `${TMDB_IMAGE_BASE}${data.poster_path}` : item.posterPath,
        trailerYoutubeKey: trailerKey,
        cast: cast || item.cast,
        overview: data.overview || item.overview,
        seasons,
        ...(isMovie
          ? {
              duration: runtime,
              audioLanguages: spokenLanguages,
            }
          : {
              episodesCount: data.episode_count ?? undefined,
              duration: runtime,
              audioLanguages: spokenLanguages,
            }),
      };
    }
  } catch (e) {
    console.warn('Failed to fetch rich details from TMDB:', e);
    throw e as Error;
  }

  return item;
}
