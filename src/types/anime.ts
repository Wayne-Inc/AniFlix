export type MediaType = 'anime' | 'movie';

export interface Episode {
  id: number;
  episodeNumber: number;
  title: string;
  duration: string;
  overview: string;
  thumbnail: string;
  videoUrl?: string;
}

export interface VoiceActor {
  id?: number;
  character: string;
  actor: string;
  image: string;
  role: 'Main' | 'Supporting';
}

export interface Season {
  id: number;
  seasonNumber: number;
  name: string;
  overview: string;
  airDate?: string;
  episodeCount: number;
  posterPath?: string;
  episodes: Episode[];
}

export interface AnimeItem {
  id: number;
  tmdbId?: number;
  malId?: number;
  /** AniList media id, learned the first time this item is synced. */
  anilistId?: number;
  /** Remote list status as last read/written ('CURRENT', 'COMPLETED', ...). */
  anilistStatus?: string;
  /** Remote episode count as last read/written. */
  anilistProgress?: number;
  /** Remote entry updatedAt, in ms since epoch. Used for conflict resolution. */
  anilistUpdatedAt?: number;
  /** MyAnimeList list status as last read/written ('watching', 'completed', ...). */
  malStatus?: string;
  /** MyAnimeList episodes watched as last read/written. */
  malProgress?: number;
  /** MyAnimeList entry updated_at, in ms since epoch. */
  malUpdatedAt?: number;
  title: string;
  japaneseTitle?: string;
  romajiTitle?: string;
  type: MediaType;
  overview: string;
  backdropPath: string;
  posterPath: string;
  voteAverage: number;
  voteCount: number;
  status?: 'Airing' | 'Finished' | 'Publishing' | 'Upcoming';
  releaseYear?: number;
  episodesCount?: number;
  duration?: string;
  genres: string[];
  studios?: string[];
  author?: string;
  ageRating?: string;
  matchScore: number; // e.g. 98%
  trailerYoutubeKey?: string;
  episodes?: Episode[];
  seasons?: Season[];
  cast?: VoiceActor[];
  audioLanguages?: string[];
  subtitles?: string[];
  isOriginal?: boolean;
  featured?: boolean;
  season?: number;
  episode?: number;
}

export type TabType = 'home' | 'anime' | 'movie' | 'trending' | 'mylist';

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  isKids: boolean;
}

export interface WatchProgress {
  itemId: number;
  type: MediaType;
  lastEpisodeOrChapter: number;
  progressPercent: number;
  updatedAt: number;
  status: 'watching' | 'completed' | 'plan_to_watch';
}

export interface TmdbConfig {
  apiKey: string;
  useLiveApi: boolean;
}
