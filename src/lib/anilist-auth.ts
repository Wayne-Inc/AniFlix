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
    throw new Error(
      "AniList isn't configured on this build (VITE_ANILIST_CLIENT_ID is missing).",
    );
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
    throw new Error(`AniList returned ${res.status}`);
  }

  const payload = (await res.json()) as {
    data?: { Viewer?: { id: number; name: string; avatar?: { large?: string | null } | null } };
    errors?: { message?: string }[];
  };

  const viewer = payload.data?.Viewer;
  if (!viewer?.id) {
    throw new Error(payload.errors?.[0]?.message ?? "AniList did not return an account");
  }

  return {
    id: viewer.id,
    name: viewer.name,
    avatarUrl: viewer.avatar?.large ?? null,
  };
}

export function describeAniListError(code: string): string {
  switch (code) {
    case "access_denied":
      return "You cancelled the AniList connection.";
    case "state_mismatch":
      return "That AniList response didn't match this session. Please try connecting again.";
    case "token_exchange_failed":
      return "AniList rejected the login. Check the client ID/secret and the registered redirect URL.";
    case "missing_code":
    case "missing_token":
      return "AniList did not return an authorization code.";
    default:
      return `AniList connection failed (${code}).`;
  }
}
