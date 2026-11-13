// Two-way MyAnimeList sync.
//
// Mirrors anilist-sync.ts with MAL's vocabulary:
//   AniList PLANNING/CURRENT/COMPLETED  <->  MAL plan_to_watch/watching/completed
//   AniList progress                    <->  MAL num_episodes_watched
//
// MAL has no equivalent of AniList's one-shot mutation response timestamp on the
// list endpoint, so `updated_at` (ISO 8601) is parsed to milliseconds and the
// same "newest watch activity wins" rule applies.
//
// Deletion handling:
//   - When user removes from My List and chooses "also remove from MyAnimeList",
//     we queue a pending deletion locally.
//   - On next sync, pending deletions are pushed to MAL via the delete endpoint.
//   - After successful remote deletion, pending deletion is cleared.
import { getValidMalToken, MalAuthError } from "./mal-auth";
import { isValidMalStatus, type MalStatus } from "./mal-config";
import { getMyListEntriesFromFirestore, updateMyListItemMeta } from "./my-list-firestore";
import { getWatchStateByItem } from "./continue-watching-firestore";
import { deriveProgress, reconcile, type LocalWatchState } from "./anilist-mapping";
import { resolveMediaIds } from "./media-ids";

const LAST_SYNC_KEY = "mal:lastSync";
const PENDING_DELETIONS_KEY = "mal:pendingDeletions";

export type MalSyncSummary = {
  at: number;
  pushed: number;
  pulled: number;
  unchanged: number;
  unmatched: number;
  failed: number;
  deleted: number;
  errors: string[];
};

export class MalSyncError extends Error {
  code: "not_connected" | "expired" | "rate_limited" | "failed";
  constructor(message: string, code: MalSyncError["code"]) {
    super(message);
    this.name = "MalSyncError";
    this.code = code;
  }
}

type MalListEntry = {
  node?: { id?: number; title?: string };
  list_status?: {
    status?: string;
    num_episodes_watched?: number;
    updated_at?: string;
  };
};

type RemoteMalEntry = {
  malId: number;
  status: MalStatus;
  progress: number;
  updatedAtMs: number;
  entryId: number; // MAL's list entry ID (different from media ID)
};

export function getLastMalSyncSummary(): MalSyncSummary | null {
  try {
    const raw = localStorage.getItem(LAST_SYNC_KEY);
    return raw ? (JSON.parse(raw) as MalSyncSummary) : null;
  } catch {
    return null;
  }
}

function saveLastMalSyncSummary(summary: MalSyncSummary) {
  try {
    localStorage.setItem(LAST_SYNC_KEY, JSON.stringify(summary));
  } catch {}
}

function readPendingDeletions(): number[] {
  try {
    const raw = localStorage.getItem(PENDING_DELETIONS_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

function writePendingDeletions(ids: number[]) {
  try {
    localStorage.setItem(PENDING_DELETIONS_KEY, JSON.stringify(ids));
  } catch {}
}

export function addMalPendingDeletion(entryId: number) {
  const pending = readPendingDeletions();
  if (!pending.includes(entryId)) {
    pending.push(entryId);
    writePendingDeletions(pending);
  }
}

export function getMalPendingDeletions(): number[] {
  return readPendingDeletions();
}

/** MAL's status vocabulary from the local watch state. */
export function deriveMalStatus(
  local: LocalWatchState,
  totalEpisodes: number | null | undefined,
): MalStatus {
  if (local.wholeTitle) return "completed";
  if (local.episodeCount <= 0) return "plan_to_watch";
  if (totalEpisodes && local.episodeCount >= totalEpisodes) return "completed";
  return "watching";
}

async function fetchRemoteEntries(token: string): Promise<Map<number, RemoteMalEntry>> {
  const res = await fetch("/api/mal?op=list", {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null);

  if (!res) throw new MalSyncError("Could not reach AniFlix to read MyAnimeList.", "failed");
  if (res.status === 401) {
    throw new MalSyncError("MyAnimeList rejected the stored token. Connect the account again.", "expired");
  }
  if (res.status === 429) {
    throw new MalSyncError("MyAnimeList is rate limiting requests. Try again shortly.", "rate_limited");
  }
  if (!res.ok) throw new MalSyncError("MyAnimeList list could not be read.", "failed");

  const data = (await res.json()) as { data?: MalListEntry[] };
  const entries = new Map<number, RemoteMalEntry>();

  for (const raw of data.data ?? []) {
    const malId = raw.node?.id;
    const status = raw.list_status?.status;
    if (typeof malId !== "number" || !status || !isValidMalStatus(status)) continue;

    const updatedAtMs = raw.list_status?.updated_at ? Date.parse(raw.list_status.updated_at) : NaN;
    // The list entry ID is the same as the media ID for MAL's API
    entries.set(malId, {
      malId,
      status,
      progress: raw.list_status?.num_episodes_watched ?? 0,
      updatedAtMs: Number.isFinite(updatedAtMs) ? updatedAtMs : 0,
      entryId: malId,
    });
  }

  return entries;
}

async function pushEntry(
  token: string,
  malId: number,
  status: MalStatus,
  progress: number,
): Promise<{ status: MalStatus; progress: number; updatedAtMs: number }> {
  const res = await fetch("/api/mal?op=update", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ malId, status, num_watched_episodes: progress }),
  }).catch(() => null);

  if (!res) throw new MalSyncError("Could not reach AniFlix to update MyAnimeList.", "failed");
  if (res.status === 401) {
    throw new MalSyncError("MyAnimeList rejected the stored token. Connect the account again.", "expired");
  }
  if (res.status === 429) {
    throw new MalSyncError("MyAnimeList is rate limiting requests. Try again shortly.", "rate_limited");
  }
  if (!res.ok) throw new MalSyncError("MyAnimeList refused the change.", "failed");

  const data = (await res.json()) as {
    status?: string;
    num_episodes_watched?: number;
    updated_at?: string;
  };
  const savedStatus = data.status && isValidMalStatus(data.status) ? data.status : status;
  const updatedAtMs = data.updated_at ? Date.parse(data.updated_at) : NaN;

  return {
    status: savedStatus,
    progress: data.num_episodes_watched ?? progress,
    updatedAtMs: Number.isFinite(updatedAtMs) ? updatedAtMs : Date.now(),
  };
}

async function deleteEntry(token: string, entryId: number): Promise<boolean> {
  const res = await fetch("/api/mal?op=delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ entryId }),
  }).catch(() => null);

  if (!res) throw new MalSyncError("Could not reach AniFlix to delete from MyAnimeList.", "failed");
  if (res.status === 401) {
    throw new MalSyncError("MyAnimeList rejected the stored token. Connect the account again.", "expired");
  }
  if (res.status === 429) {
    throw new MalSyncError("MyAnimeList is rate limiting requests. Try again shortly.", "rate_limited");
  }
  if (!res.ok) return false;

  const data = (await res.json()) as { deleted?: boolean };
  return data.deleted ?? false;
}

let running = false;

/**
 * Pulls the MAL list, then pushes local watch activity that is newer than the
 * remote entry, or adopts a newer remote entry. Titles without a known MAL id are
 * counted as unmatched (the ID crosswalk fills those in).
 */
export async function syncMal(): Promise<MalSyncSummary> {
  if (running) throw new MalSyncError("A MyAnimeList sync is already running.", "failed");

  running = true;
  const summary: MalSyncSummary = {
    at: Date.now(),
    pushed: 0,
    pulled: 0,
    unchanged: 0,
    unmatched: 0,
    failed: 0,
    deleted: 0,
    errors: [],
  };

  try {
    const token = await getValidMalToken();
    const remote = await fetchRemoteEntries(token);
    const localEntries = await getMyListEntriesFromFirestore();
    const watchStates = await getWatchStateByItem();

    // Process pending deletions first
    const pendingDeletions = readPendingDeletions();
    const remainingDeletions: number[] = [];

    for (const entryId of pendingDeletions) {
      try {
        const deleted = await deleteEntry(token, entryId);
        if (deleted) {
          summary.deleted += 1;
        } else {
          remainingDeletions.push(entryId);
          summary.failed += 1;
          summary.errors.push(`Failed to delete MAL entry ${entryId}`);
        }
      } catch (e) {
        remainingDeletions.push(entryId);
        summary.failed += 1;
        summary.errors.push(e instanceof Error ? e.message : `Failed to delete MAL entry ${entryId}`);
      }
    }
    writePendingDeletions(remainingDeletions);

    for (const entry of localEntries) {
      const item = entry.item;
      try {
        const malId = item.malId ?? (await resolveMediaIds(item)).malId;
        if (!malId) {
          summary.unmatched += 1;
          continue;
        }

        const watch = watchStates.get(item.id) ?? {
          episodeCount: 0,
          wholeTitle: false,
          updatedAt: 0,
        };
        const remoteEntry = remote.get(malId);
        const totalEpisodes = item.episodesCount ?? null;
        const status = deriveMalStatus(watch, totalEpisodes);
        const progress = deriveProgress(watch, totalEpisodes);

        if (!remoteEntry) {
          const saved = await pushEntry(token, malId, status, progress);
          summary.pushed += 1;
          await updateMyListItemMeta(item.id, {
            malId,
            malStatus: saved.status,
            malProgress: saved.progress,
            malUpdatedAt: saved.updatedAtMs,
          });
          continue;
        }

        const differs = remoteEntry.status !== status || remoteEntry.progress !== progress;
        const action = reconcile(watch.updatedAt, remoteEntry.updatedAtMs);

        if (differs && action === "push") {
          const saved = await pushEntry(token, malId, status, progress);
          summary.pushed += 1;
          await updateMyListItemMeta(item.id, {
            malId,
            malStatus: saved.status,
            malProgress: saved.progress,
            malUpdatedAt: saved.updatedAtMs,
          });
        } else if (differs && action === "pull") {
          summary.pulled += 1;
          await updateMyListItemMeta(item.id, {
            malId,
            malStatus: remoteEntry.status,
            malProgress: remoteEntry.progress,
            malUpdatedAt: remoteEntry.updatedAtMs,
          });
        } else {
          summary.unchanged += 1;
        }
      } catch (e) {
        if (e instanceof MalAuthError && e.code === "expired") throw e;
        if (e instanceof MalSyncError && e.code === "expired") throw e;
        summary.failed += 1;
        const message = e instanceof Error ? e.message : "Sync failed for one title.";
        if (summary.errors.length < 3 && !summary.errors.includes(message)) {
          summary.errors.push(message);
        }
      }
    }

    saveLastMalSyncSummary(summary);
    return summary;
  } finally {
    running = false;
  }
}