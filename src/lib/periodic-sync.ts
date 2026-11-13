// Periodic background sync service.
// Runs syncAniList() and syncMal() on a user-configured interval.
// Respects: user preferences, auth state, tab visibility, and concurrent sync guards.

import { syncAniList, AniListSyncError } from "./anilist-sync";
import { syncMal, MalSyncError } from "./mal-sync";
import { getAniListAccessToken } from "./anilist-auth";
import { getValidMalToken } from "./mal-auth";
import {
  getSyncPreferences,
  saveSyncPreferences,
  getSyncIntervalMs,
  setLastPeriodicSyncAt,
  SyncPreferences,
} from "./sync-preferences";

let intervalId: ReturnType<typeof setInterval> | null = null;
let currentPrefs: SyncPreferences | null = null;
let visibilityListenerAttached = false;

/**
 * Check if we should run a periodic sync based on current conditions.
 * Returns false if sync should be skipped (with reason logged).
 */
function shouldRunPeriodicSync(prefs: SyncPreferences): { run: boolean; reason?: string } {
  if (!prefs.enabled) {
    return { run: false, reason: "Periodic sync disabled" };
  }
  if (prefs.onlyWhenVisible && document.visibilityState === "hidden") {
    return { run: false, reason: "Tab hidden (onlyWhenVisible=true)" };
  }
  if (!prefs.syncAniList && !prefs.syncMal) {
    return { run: false, reason: "No trackers selected for sync" };
  }
  return { run: true };
}

/**
 * Check if user is connected to a tracker.
 */
function isConnectedToAniList(): boolean {
  return !!getAniListAccessToken();
}

async function isConnectedToMal(): Promise<boolean> {
  try {
    await getValidMalToken();
    return true;
  } catch {
    return false;
  }
}

/**
 * Run a single periodic sync cycle for enabled trackers.
 * Errors are logged but not thrown (silent background operation).
 */
async function runPeriodicSyncCycle(prefs: SyncPreferences): Promise<void> {
  const { run, reason } = shouldRunPeriodicSync(prefs);
  if (!run) {
    if (reason) console.debug("[periodic-sync] Skipping:", reason);
    return;
  }

  const results: { tracker: string; success: boolean; error?: string }[] = [];

  // Sync AniList if enabled and connected
  if (prefs.syncAniList && isConnectedToAniList()) {
    try {
      console.debug("[periodic-sync] Starting AniList sync...");
      const summary = await syncAniList();
      console.debug("[periodic-sync] AniList sync complete:", summary);
      results.push({ tracker: "AniList", success: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      // Don't log "not connected" as error - it's expected if user hasn't connected
      if (e instanceof AniListSyncError && e.code === "not_connected") {
        console.debug("[periodic-sync] AniList not connected, skipping");
      } else if (e instanceof AniListSyncError && e.code === "unauthorized") {
        console.warn("[periodic-sync] AniList token expired, skipping");
      } else {
        console.warn("[periodic-sync] AniList sync failed:", msg);
      }
      results.push({ tracker: "AniList", success: false, error: msg });
    }
  } else if (prefs.syncAniList) {
    console.debug("[periodic-sync] AniList sync enabled but not connected");
    results.push({ tracker: "AniList", success: false, error: "Not connected" });
  }

  // Sync MyAnimeList if enabled and connected
  if (prefs.syncMal && (await isConnectedToMal())) {
    try {
      console.debug("[periodic-sync] Starting MyAnimeList sync...");
      const summary = await syncMal();
      console.debug("[periodic-sync] MyAnimeList sync complete:", summary);
      results.push({ tracker: "MyAnimeList", success: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      if (e instanceof MalSyncError && (e.code === "not_connected" || e.code === "expired")) {
        console.debug("[periodic-sync] MyAnimeList not connected/expired, skipping");
      } else {
        console.warn("[periodic-sync] MyAnimeList sync failed:", msg);
      }
      results.push({ tracker: "MyAnimeList", success: false, error: msg });
    }
  } else if (prefs.syncMal) {
    console.debug("[periodic-sync] MyAnimeList sync enabled but not connected");
    results.push({ tracker: "MyAnimeList", success: false, error: "Not connected" });
  }

  // Update last sync timestamp if at least one sync succeeded
  const anySuccess = results.some((r) => r.success);
  if (anySuccess) {
    setLastPeriodicSyncAt(Date.now());
  }

  // Log summary
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  if (results.length > 0) {
    console.info(
      `[periodic-sync] Cycle complete: ${successCount} succeeded, ${failCount} failed/skipped`
    );
  }
}

/**
 * Start or restart the periodic sync timer with current preferences.
 */
export function startPeriodicSync(): void {
  stopPeriodicSync(); // Clear any existing timer

  const prefs = getSyncPreferences();
  currentPrefs = prefs;

  const intervalMs = getSyncIntervalMs(prefs.interval);
  if (!intervalMs) {
    console.debug("[periodic-sync] Not starting: disabled or invalid interval");
    return;
  }

  // Attach visibility listener once
  if (!visibilityListenerAttached) {
    document.addEventListener("visibilitychange", onVisibilityChange);
    visibilityListenerAttached = true;
  }

  console.info(`[periodic-sync] Starting with interval: ${prefs.interval} (${intervalMs}ms)`);

  // Run once immediately on start (if conditions allow)
  runPeriodicSyncCycle(prefs).catch((e) => console.error("[periodic-sync] Initial run failed:", e));

  // Set up recurring interval
  intervalId = setInterval(() => {
    // Re-read preferences each cycle in case they changed
    const latestPrefs = getSyncPreferences();
    currentPrefs = latestPrefs;
    runPeriodicSyncCycle(latestPrefs).catch((e) =>
      console.error("[periodic-sync] Cycle failed:", e)
    );
  }, intervalMs);
}

/**
 * Stop the periodic sync timer.
 */
export function stopPeriodicSync(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.debug("[periodic-sync] Stopped");
  }
  if (visibilityListenerAttached) {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    visibilityListenerAttached = false;
  }
}

/**
 * Handle tab visibility changes - run sync immediately when tab becomes visible
 * if enough time has passed since last sync.
 */
function onVisibilityChange(): void {
  if (document.visibilityState !== "visible") return;

  const prefs = getSyncPreferences();
  if (!prefs.enabled || !prefs.onlyWhenVisible) return;

  const lastSync = prefs.lastPeriodicSyncAt;
  const intervalMs = getSyncIntervalMs(prefs.interval);
  if (!lastSync || !intervalMs) return;

  const timeSinceLastSync = Date.now() - lastSync;
  // Run if more than half the interval has passed since last sync
  if (timeSinceLastSync >= intervalMs / 2) {
    console.debug("[periodic-sync] Tab visible, running catch-up sync");
    runPeriodicSyncCycle(prefs).catch((e) => console.error("[periodic-sync] Visibility sync failed:", e));
  }
}

/**
 * Force a sync cycle now (e.g., user clicked "Sync now" in settings).
 * This runs outside the normal interval and respects the same guards.
 */
export async function triggerPeriodicSyncNow(): Promise<{ aniList: boolean; mal: boolean }> {
  const prefs = getSyncPreferences();
  const results = { aniList: false, mal: false };

  if (prefs.syncAniList && isConnectedToAniList()) {
    try {
      await syncAniList();
      results.aniList = true;
    } catch (e) {
      console.warn("[periodic-sync] Manual AniList sync failed:", e);
    }
  }

  if (prefs.syncMal && (await isConnectedToMal())) {
    try {
      await syncMal();
      results.mal = true;
    } catch (e) {
      console.warn("[periodic-sync] Manual MAL sync failed:", e);
    }
  }

  if (results.aniList || results.mal) {
    setLastPeriodicSyncAt(Date.now());
  }

  return results;
}

/**
 * Get current periodic sync status for UI display.
 */
export function getPeriodicSyncStatus(): {
  running: boolean;
  interval: string;
  nextRunInMs: number | null;
  lastRunAt: number | null;
} {
  const prefs = getSyncPreferences();
  const intervalMs = getSyncIntervalMs(prefs.interval);
  const lastRun = prefs.lastPeriodicSyncAt;

  let nextRunInMs: number | null = null;
  if (intervalMs && lastRun) {
    const elapsed = Date.now() - lastRun;
    nextRunInMs = Math.max(0, intervalMs - elapsed);
  }

  return {
    running: intervalId !== null && prefs.enabled,
    interval: prefs.interval,
    nextRunInMs,
    lastRunAt: lastRun,
  };
}

/**
 * Update preferences and restart the timer if needed.
 */
export function updatePeriodicSyncPrefs(newPrefs: Partial<SyncPreferences>): SyncPreferences {
  const updated = saveSyncPreferences(newPrefs);
  if (updated.enabled && getSyncIntervalMs(updated.interval)) {
    startPeriodicSync();
  } else {
    stopPeriodicSync();
  }
  return updated;
}