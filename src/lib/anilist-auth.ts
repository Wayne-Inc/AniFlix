// AniList account linking — browser side.
//
// Flow:
//   1. startAniListLink()  -> AniList authorize page (state saved in sessionStorage)
//   2. AniList redirects to /api/auth/anilist/callback (Vercel function)
//   3. The function exchanges the code and redirects to /settings#anilist_token=...
//   4. consumeAniListRedirect() validates state, stores the token, strips the hash
//
// The token is a user access token (AniList tokens are long-lived and have no
// refresh token), kept per browser in localStorage. It is never rendered or
// logged. List data still lives in Firestore, so the synced lists follow the
// user across devices even though the token itself is per-device.
import {
  anilistRedirectUri,
  buildAniListAuthorizeUrl,
} from "./anilist-config";

const TOKEN_KEY = "anilist:token";
const VIEWER_KEY = "anilist:viewer";
const LINKED_AT_KEY = "anilist:linkedAt";
const STATE_KEY = "anilist:state";

const ANILIST_GRAPHQL_URL = "https://graphql.anilist.co";

export type AniListViewer = {
  id: number;
  name: string;
  avatarUrl: string | null;
};

export type AniListConnection = {
  token: string;
  viewer: AniListViewer | null;
  linkedAt: number;
};

/**
 * Carries the HTTP status so callers can react to a dead token without parsing
 * the message. User-facing text stays plain; the status goes to the console.
 */
export class AniListRequestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AniListRequestError";
    this.status = status;
  }
}

export function isAniListUnauthorized(error: unknown): boolean {
  return error instanceof AniListRequestError && error.status === 401;
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode / storage full: the connection lasts for this tab only.
  }
}

function removeStorage(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

function anilistClientId(): string | null {
  const id = import.meta.env.VITE_ANILIST_CLIENT_ID;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

export function isAniListConfigured(): boolean {
  return anilistClientId() !== null;
}

export function getAniListAccessToken(): string | null {
  return readStorage(TOKEN_KEY);
}

export function getAniListConnection(): AniListConnection | null {
  const token = getAniListAccessToken();
  if (!token) return null;

  let viewer: AniListViewer | null = null;
  const rawViewer = readStorage(VIEWER_KEY);
  if (rawViewer) {
    try {
      viewer = JSON.parse(rawViewer) as AniListViewer;
    } catch {
      viewer = null;
    }
  }
  const linkedAt = Number(readStorage(LINKED_AT_KEY) ?? 0) || 0;
  return { token, viewer, linkedAt };
}

export function saveAniListViewer(viewer: AniListViewer | null) {
  if (!viewer) {
    removeStorage(VIEWER_KEY);
    return;
  }
  writeStorage(VIEWER_KEY, JSON.stringify(viewer));
}

export function disconnectAniList() {
  removeStorage(TOKEN_KEY);
  removeStorage(VIEWER_KEY);
  removeStorage(LINKED_AT_KEY);
  removeStorage(STATE_KEY);
}

/**
 * Sends the browser to AniList. Throws with a user-readable message when the
 * deployment has no client id configured.
 */
export function startAniListLink(): void {
  const clientId = anilistClientId();
  if (!clientId) {
    console.warn("[anilist] VITE_ANILIST_CLIENT_ID is missing from this build.");
    throw new Error("AniList sign-in isn't available right now. Please try again later.");
  }

  const state = crypto.randomUUID();
  try {
    sessionStorage.setItem(STATE_KEY, state);
  } catch {}

  window.location.assign(
    buildAniListAuthorizeUrl({
      clientId,
      redirectUri: anilistRedirectUri(window.location.origin),
      state,
    }),
  );
}

export type AniListRedirectResult =
  | { kind: "connected"; token: string; viewer: AniListViewer | null }
  | { kind: "error"; code: string };

/**
 * Reads the `#anilist_token=...` / `#anilist_error=...` fragment the callback
 * function appended, then removes it from the address bar. Returns null when the
 * page was not reached through the callback.
 */
export function consumeAniListRedirect(): AniListRedirectResult | null {
  if (typeof window === "undefined" || !window.location.hash) return null;

  const params = new URLSearchParams(window.location.hash.slice(1));
  const token = params.get("anilist_token");
  const error = params.get("anilist_error");
  if (!token && !error) return null;

  const state = params.get("anilist_state") ?? "";

  // Strip the fragment first so the token cannot be re-read, bookmarked, or
  // picked up again by a React re-mount.
  window.history.replaceState({}, "", window.location.pathname + window.location.search);

  if (error) {
    removeStorage(STATE_KEY);
    return { kind: "error", code: error };
  }

  // When this tab started the flow we require the echoed state to match. If the
  // user opened the callback in a different tab (sessionStorage is per-tab) the
  // check cannot run; the code was still single-use and bound to this app.
  let expectedState: string | null = null;
  try {
    expectedState = sessionStorage.getItem(STATE_KEY);
  } catch {}
  removeStorage(STATE_KEY);

  if (expectedState && state !== expectedState) {
    return { kind: "error", code: "state_mismatch" };
  }

  if (!token) return { kind: "error", code: "missing_token" };

  writeStorage(TOKEN_KEY, token);
  writeStorage(LINKED_AT_KEY, String(Date.now()));
  removeStorage(VIEWER_KEY);

  return { kind: "connected", token, viewer: null };
}

/** Loads the authenticated AniList user (id/name/avatar) for the settings card. */
export async function fetchAniListViewer(token: string): Promise<AniListViewer> {
  const res = await fetch(ANILIST_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: "query { Viewer { id name avatar { large } } }",
    }),
  });

  if (!res.ok) {
    // The status is for the console; the user only sees a plain sentence.
    console.warn("[anilist] viewer request failed with status", res.status);
    throw new AniListRequestError("We couldn't read your AniList account.", res.status);
  }

  const payload = (await res.json()) as {
    data?: { Viewer?: { id: number; name: string; avatar?: { large?: string | null } | null } };
    errors?: { message?: string }[];
  };

  const viewer = payload.data?.Viewer;
  if (!viewer?.id) {
    console.warn("[anilist] viewer query returned no account:", payload.errors?.[0]?.message ?? "");
    throw new Error("We couldn't read your AniList account.");
  }

  return {
    id: viewer.id,
    name: viewer.name,
    avatarUrl: viewer.avatar?.large ?? null,
  };
}

/**
 * Plain-language copy for the settings card and toast. No env var names, no HTTP
 * codes: those belong in the server logs, not in front of a user.
 */
export function describeAniListError(code: string): string {
  switch (code) {
    case "access_denied":
      return "You cancelled the AniList connection.";
    case "state_mismatch":
      return "That AniList sign-in expired. Please try again.";
    case "token_exchange_failed":
      return "We couldn't finish connecting to AniList. Please try again in a moment.";
    case "invalid_client":
      return "AniList sign-in isn't available right now. Please try again later.";
    case "missing_code":
    case "missing_token":
      return "AniList didn't send us what we needed. Please try again.";
    default:
      return "Something went wrong connecting to AniList. Please try again.";
  }
}
