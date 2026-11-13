// Two-way AniList sync.
//
// Direction rules:
//   - Local list membership + local episode flags -> AniList status/progress.
//   - AniList edits that are newer than the local change -> adopted locally.
//   - Fields AniFlix does not manage (score, notes, favourites, rewatches,
//     start/finish dates) are never sent, so AniList keeps them intact.
//
// What this deliberately does NOT do: delete entries on AniList when a title is
// removed in AniFlix. A local removal would otherwise be a silent remote delete,
// and AniList has no undo. Removal stays local for now.
import { fetchAniListViewer, getAniListAccessToken, isAniListUnauthorized } from "./anilist-auth";
import {
  deriveListStatus,
  deriveProgress,
  normalizeTitle,
  reconcile,
  titlesMatch,
  type RemoteListEntry,
} from "./anilist-mapping";
import { getMyListEntriesFromFirestore, updateMyListItemMeta } from "./my-list-firestore";
import { getWatchStateByItem } from "./continue-watching-firestore";
import { resolveMediaIds } from "./media-ids";
import type { AnimeItem } from "../types/anime";

const ANILIST_GRAPHQL_URL = "https://graphql.anilist.co";
const MEDIA_CACHE_KEY = "anilist:mediaIds";
const LAST_SYNC_KEY = "anilist:lastSync";
const MAX_SEARCHES_PER_RUN = 20;

export type SyncSummary = {
  at: number;
  pushed: number;
  pulled: number;
  unchanged: number;
  unmatched: number;
  failed: number;
  errors: string[];
};

export class AniListSyncError extends Error {
  code: "not_connected" | "unauthorized" | "rate_limited" | "failed";
  constructor(message: string, code: AniListSyncError["code"]) {
    super(message);
    this.name = "AniListSyncError";
    this.code = code;
  }
}

type GraphQlResponse<T> = {
  data?: T;
  errors?: { message?: string; status?: number }[];
};

async function gql<T>(
  token: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(ANILIST_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (res.status === 401) {
    throw new AniListSyncError("AniList rejected the stored token. Connect the account again.", "unauthorized");
  }
  if (res.status === 429) {
    throw new AniListSyncError("AniList is rate limiting requests. Try again in a minute.", "rate_limited");
  }

  const payload = (await res.json().catch(() => ({}))) as GraphQlResponse<T>;
  if (!res.ok) {
    console.warn("[anilist] request failed:", res.status, payload.errors?.[0]?.message ?? "");
    throw new AniListSyncError("AniList couldn't process that request. Please try again.", "failed");
  }
  if (payload.errors?.length) {
    const status = payload.errors[0]?.status;
    if (status === 401) {
      throw new AniListSyncError(
        "AniList rejected the stored token. Connect the account again.",
        "unauthorized",
      );
    }
    console.warn("[anilist] GraphQL error:", payload.errors[0]?.message ?? "");
    throw new AniListSyncError("AniList couldn't process that request. Please try again.", "failed");
  }
  if (!payload.data) {
    throw new AniListSyncError("AniList didn't return your list. Please try again.", "failed");
  }
  return payload.data;
}

const COLLECTION_QUERY = `
  query ($userId: Int) {
    MediaListCollection(userId: $userId, type: ANIME) {
      lists {
        entries {
          id
          status
          progress
          updatedAt
          media {
            id
            idMal
            episodes
            title { romaji english }
          }
        }
      }
    }
  }
`;

const SAVE_MUTATION = `
  mutation ($mediaId: Int, $status: MediaListStatus, $progress: Int) {
    saveMediaListEntry(mediaId: $mediaId, status: $status, progress: $progress) {
      id
      status
      progress
      updatedAt
    }
  }
`;

const SEARCH_QUERY = `
  query ($search: String) {
    Page(perPage: 5) {
      media(search: $search, type: ANIME) {
        id
        idMal
        episodes
        title { romaji english }
      }
    }
  }
`;

const MEDIA_BY_MAL_QUERY = `
  query ($idMal: Int) {
    Media(idMal: $idMal, type: ANIME) { id }
  }
`;

type RawEntry = {
  id: number;
  status: string;
  progress: number;
  /** AniList reports seconds since epoch. */
  updatedAt: number;
  media: RemoteListEntry["media"];
};

type CollectionData = {
  MediaListCollection?: {
    lists?: { entries?: RawEntry[] }[];
  };
};

type SaveData = {
  saveMediaListEntry?: { id: number; status: string; progress: number; updatedAt: number };
};

type SearchData = {
  Page?: {
    media?: {
      id: number;
      idMal: number | null;
      episodes: number | null;
      title: { romaji: string | null; english: string | null };
    }[];
  };
};

type MediaByMalData = { Media?: { id: number } };

function readMediaCache(): Record<string, number> {
  try {
    const raw = localStorage.getItem(MEDIA_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeMediaCache(cache: Record<string, number>) {
  try {
    localStorage.setItem(MEDIA_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

export function getLastSyncSummary(): SyncSummary | null {
  try {
    const raw = localStorage.getItem(LAST_SYNC_KEY);
    return raw ? (JSON.parse(raw) as SyncSummary) : null;
  } catch {
    return null;
  }
}

function saveLastSyncSummary(summary: SyncSummary) {
  try {
    localStorage.setItem(LAST_SYNC_KEY, JSON.stringify(summary));
  } catch {}
}

type RemoteIndex = {
  byId: Map<number, RemoteListEntry>;
  byMalId: Map<number, RemoteListEntry>;
  byTitle: Map<string, RemoteListEntry>;
};

async function fetchRemoteEntries(token: string, userId: number): Promise<RemoteIndex> {
  const data = await gql<CollectionData>(token, COLLECTION_QUERY, { userId });
  const entries = (data.MediaListCollection?.lists ?? []).flatMap((list) => list.entries ?? []);

  const byId = new Map<number, RemoteListEntry>();
  const byMalId = new Map<number, RemoteListEntry>();
  const byTitle = new Map<string, RemoteListEntry>();

  for (const raw of entries) {
    const entry: RemoteListEntry = {
      id: raw.id,
      status: raw.status,
      progress: raw.progress,
      updatedAtMs: (raw.updatedAt ?? 0) * 1000,
      media: raw.media,
    };
    byId.set(entry.media.id, entry);
    if (entry.media.idMal != null) byMalId.set(entry.media.idMal, entry);
    for (const title of [entry.media.title.romaji, entry.media.title.english]) {
      const key = normalizeTitle(title);
      if (key && !byTitle.has(key)) byTitle.set(key, entry);
    }
  }

  return { byId, byMalId, byTitle };
}

function localTitles(item: AnimeItem): string[] {
  return [item.title, item.romajiTitle, item.japaneseTitle].filter(
    (t): t is string => typeof t === "string" && t.trim().length > 0,
  );
}

/**
 * AniList media id for a local item: stored id -> MAL id -> title match against
 * the user's own list -> cached id -> AniList search. Returns null rather than
 * guessing when nothing matches exactly.
 */
type ResolvedMedia = { id: number; idMal: number | null };

async function resolveMediaId(
  token: string,
  item: AnimeItem,
  remote: RemoteIndex,
  cache: Record<string, number>,
  searchBudget: { left: number },
): Promise<ResolvedMedia | null> {
  const knownIds = await resolveMediaIds(item);
  const anilistId = item.anilistId ?? knownIds.anilistId;
  const malId = item.malId ?? knownIds.malId;

  if (anilistId) {
    return {
      id: anilistId,
      idMal: remote.byId.get(anilistId)?.media.idMal ?? malId ?? null,
    };
  }

  if (malId != null) {
    const known = remote.byMalId.get(malId);
    if (known) return { id: known.media.id, idMal: malId };
    try {
      const data = await gql<MediaByMalData>(token, MEDIA_BY_MAL_QUERY, { idMal: malId });
      if (data.Media?.id) {
        cache[`mal:${malId}`] = data.Media.id;
        writeMediaCache(cache);
        return { id: data.Media.id, idMal: malId };
      }
    } catch {
      // Fall through to the title-based paths.
    }
    const cachedByMal = cache[`mal:${malId}`];
    if (cachedByMal) return { id: cachedByMal, idMal: malId };
  }

  const titles = localTitles(item);
  for (const title of titles) {
    const cached = cache[normalizeTitle(title)];
    if (cached) return { id: cached, idMal: remote.byId.get(cached)?.media.idMal ?? null };
  }

  for (const title of titles) {
    const match = remote.byTitle.get(normalizeTitle(title));
    if (match) return { id: match.media.id, idMal: match.media.idMal };
  }

  if (searchBudget.left <= 0) return null;

  for (const title of titles) {
    searchBudget.left -= 1;
    let data: SearchData;
    try {
      data = await gql<SearchData>(token, SEARCH_QUERY, { search: title });
    } catch {
      return null;
    }
    const candidates = data.Page?.media ?? [];
    const match = candidates.find((candidate) =>
      titles.some(
        (t) =>
          titlesMatch(t, candidate.title.english) || titlesMatch(t, candidate.title.romaji),
      ),
    );
    if (match) {
      cache[normalizeTitle(title)] = match.id;
      writeMediaCache(cache);
      return { id: match.id, idMal: match.idMal };
    }
    if (searchBudget.left <= 0) break;
  }

  return null;
}

async function pushEntry(
  token: string,
  mediaId: number,
  status: string,
  progress: number,
): Promise<{ status: string; progress: number; updatedAtMs: number }> {
  const data = await gql<SaveData>(token, SAVE_MUTATION, { mediaId, status, progress });
  const saved = data.saveMediaListEntry;
  if (!saved) throw new AniListSyncError("AniList didn't confirm that change. Please try again.", "failed");
  return {
    status: saved.status,
    progress: saved.progress,
    updatedAtMs: (saved.updatedAt ?? 0) * 1000,
  };
}

let running = false;

/**
 * Pulls the AniList list, then per title either pushes newer local state or adopts
 * newer AniList state. Safe to re-run: every decision is based on timestamps, and
 * an unchanged title produces no writes.
 */
export async function syncAniList(): Promise<SyncSummary> {
  if (running) {
    throw new AniListSyncError("A sync is already running.", "failed");
  }
  const token = getAniListAccessToken();
  if (!token) {
    throw new AniListSyncError("Connect an AniList account first.", "not_connected");
  }

  running = true;
  const summary: SyncSummary = {
    at: Date.now(),
    pushed: 0,
    pulled: 0,
    unchanged: 0,
    unmatched: 0,
    failed: 0,
    errors: [],
  };
  const recordError = (message: string) => {
    summary.failed += 1;
    if (summary.errors.length < 3 && !summary.errors.includes(message)) {
      summary.errors.push(message);
    }
  };

  try {
    let viewer;
    try {
      viewer = await fetchAniListViewer(token);
    } catch (e) {
      if (isAniListUnauthorized(e)) {
        throw new AniListSyncError("AniList rejected the stored token. Connect the account again.", "unauthorized");
      }
      throw e;
    }
    const remote = await fetchRemoteEntries(token, viewer.id);
    const localEntries = await getMyListEntriesFromFirestore();
    const watchStates = await getWatchStateByItem();
    const cache = readMediaCache();
    const searchBudget = { left: MAX_SEARCHES_PER_RUN };

    for (const entry of localEntries) {
      const item = entry.item;
      try {
        const resolved = await resolveMediaId(token, item, remote, cache, searchBudget);
        if (!resolved) {
          summary.unmatched += 1;
          continue;
        }
        const mediaId = resolved.id;
        // Persist the MAL id while we have it: that is the bridge the MAL adapter
        // needs, and it costs nothing here. Only added when known, so an existing
        // malId is never overwritten with undefined.
        const malPatch = resolved.idMal != null ? { malId: resolved.idMal } : {};

        const watch = watchStates.get(item.id) ?? { episodeCount: 0, wholeTitle: false, updatedAt: 0 };
        const remoteEntry = remote.byId.get(mediaId);
        const totalEpisodes = remoteEntry?.media.episodes ?? item.episodesCount ?? null;
        const status = deriveListStatus(watch, totalEpisodes);
        const progress = deriveProgress(watch, totalEpisodes);

        if (!remoteEntry) {
          const saved = await pushEntry(token, mediaId, status, progress);
          summary.pushed += 1;
          await updateMyListItemMeta(item.id, {
            anilistId: mediaId,
            ...malPatch,
            anilistStatus: saved.status,
            anilistProgress: saved.progress,
            anilistUpdatedAt: saved.updatedAtMs,
          });
          continue;
        }

        // Only watch activity may override an existing AniList entry. Adding a
        // title to My List is a bookmark, not a statement that nothing has been
        // watched, so it must never overwrite a progress value set on AniList.
        const differs = remoteEntry.status !== status || remoteEntry.progress !== progress;
        const action = reconcile(watch.updatedAt, remoteEntry.updatedAtMs);

        if (differs && action === "push") {
          const saved = await pushEntry(token, mediaId, status, progress);
          summary.pushed += 1;
          await updateMyListItemMeta(item.id, {
            anilistId: mediaId,
            ...malPatch,
            anilistStatus: saved.status,
            anilistProgress: saved.progress,
            anilistUpdatedAt: saved.updatedAtMs,
          });
        } else if (differs && action === "pull") {
          // Adopt the newer AniList values. Local episode flags are not rewritten:
          // AniFlix only knows what was actually watched here.
          summary.pulled += 1;
          await updateMyListItemMeta(item.id, {
            anilistId: mediaId,
            ...malPatch,
            anilistStatus: remoteEntry.status,
            anilistProgress: remoteEntry.progress,
            anilistUpdatedAt: remoteEntry.updatedAtMs,
          });
        } else {
          summary.unchanged += 1;
          await updateMyListItemMeta(item.id, { anilistId: mediaId, ...malPatch });
        }
      } catch (e) {
        if (e instanceof AniListSyncError && e.code === "unauthorized") throw e;
        recordError(e instanceof Error ? e.message : "Sync failed for one title.");
      }
    }

    writeMediaCache(cache);
    saveLastSyncSummary(summary);
    return summary;
  } finally {
    running = false;
  }
}
