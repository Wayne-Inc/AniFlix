// User preferences for periodic background sync.
// Stored in localStorage for simplicity (per-browser).
// Could be moved to Firestore later for cross-device sync.

export type SyncInterval = "15m" | "30m" | "1h" | "6h" | "24h" | "disabled";

export interface SyncPreferences {
  enabled: boolean;
  interval: SyncInterval;
  syncAniList: boolean;
  syncMal: boolean;
  /** Run sync only when tab is visible (saves battery). */
  onlyWhenVisible: boolean;
  /** Last time periodic sync ran successfully (ms since epoch). */
  lastPeriodicSyncAt: number | null;
}

const PREFS_KEY = "aniflix:syncPreferences";

const DEFAULT_PREFS: SyncPreferences = {
  enabled: false,
  interval: "1h",
  syncAniList: true,
  syncMal: true,
  onlyWhenVisible: true,
  lastPeriodicSyncAt: null,
};

const INTERVAL_MS: Record<Exclude<SyncInterval, "disabled">, number> = {
  "15m": 15 * 60 * 1000,
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
};

export function getSyncPreferences(): SyncPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<SyncPreferences>;
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveSyncPreferences(prefs: Partial<SyncPreferences>): SyncPreferences {
  const current = getSyncPreferences();
  const next = { ...current, ...prefs };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota errors
  }
  return next;
}

export function getSyncIntervalMs(interval: SyncInterval): number | null {
  if (interval === "disabled") return null;
  return INTERVAL_MS[interval];
}

export function formatInterval(interval: SyncInterval): string {
  switch (interval) {
    case "15m": return "Every 15 minutes";
    case "30m": return "Every 30 minutes";
    case "1h": return "Every hour";
    case "6h": return "Every 6 hours";
    case "24h": return "Once daily";
    case "disabled": return "Disabled";
  }
}

export function setLastPeriodicSyncAt(timestamp: number) {
  const prefs = getSyncPreferences();
  prefs.lastPeriodicSyncAt = timestamp;
  saveSyncPreferences(prefs);
}

export function getLastPeriodicSyncAt(): number | null {
  return getSyncPreferences().lastPeriodicSyncAt;
}