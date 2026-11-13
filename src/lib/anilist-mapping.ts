// Pure helpers for AniList sync: title matching, status derivation, conflict
// resolution. No browser or Firebase imports, so this is unit-testable on its own.

export type ListStatus = "PLANNING" | "CURRENT" | "COMPLETED";

export type RemoteListEntry = {
  id: number;
  status: string;
  /** Episodes watched according to AniList. */
  progress: number;
  /** AniList reports seconds; this module only ever handles milliseconds. */
  updatedAtMs: number;
  media: {
    id: number;
    idMal: number | null;
    episodes: number | null;
    title: { romaji: string | null; english: string | null };
  };
};

/** Lowercase, strip accents and punctuation, collapse whitespace. */
export function normalizeTitle(title: string | null | undefined): string {
  if (!title) return "";
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Exact normalized equality only. Prefix matching would equate "Naruto" with
 * "Naruto Shippuden", and a wrong match writes progress to the wrong AniList
 * entry, which is worse than leaving the title unsynced.
 */
export function titlesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = normalizeTitle(a);
  const right = normalizeTitle(b);
  return left.length > 0 && left === right;
}

export type LocalWatchState = {
  /** Distinct episodes marked watched locally. */
  episodeCount: number;
  /** The title itself was marked watched. */
  wholeTitle: boolean;
};

/**
 * Local state -> AniList status. AniFlix has no PAUSED/DROPPED concept, so those
 * are only ever adopted from AniList, never produced here.
 */
export function deriveListStatus(
  local: LocalWatchState,
  totalEpisodes: number | null | undefined,
): ListStatus {
  if (local.wholeTitle) return "COMPLETED";
  if (local.episodeCount <= 0) return "PLANNING";
  if (totalEpisodes && local.episodeCount >= totalEpisodes) return "COMPLETED";
  return "CURRENT";
}

/**
 * Episodes watched. A whole-title mark means "finished", so it becomes the total
 * episode count when AniList knows it; otherwise 1 (enough to mean "started").
 */
export function deriveProgress(
  local: LocalWatchState,
  totalEpisodes: number | null | undefined,
): number {
  if (local.wholeTitle) return Math.max(totalEpisodes ?? 0, 1);
  return Math.max(local.episodeCount, 0);
}

export type SyncAction = "push" | "pull" | "none";

/**
 * Newest edit wins. Local and remote are compared in milliseconds. A tie goes to
 * AniList: the remote entry is the shared record, and adopting it cannot lose data
 * that AniFlix alone knows about (unlike overwriting it).
 */
export function reconcile(localUpdatedAtMs: number, remoteUpdatedAtMs: number): SyncAction {
  if (localUpdatedAtMs > remoteUpdatedAtMs) return "push";
  if (remoteUpdatedAtMs > localUpdatedAtMs) return "pull";
  return "none";
}
