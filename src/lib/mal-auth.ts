// MyAnimeList account linking — browser side.
//
// Flow:
//   1. startMalLink()      -> /api/auth/mal/start (sets a PKCE verifier cookie, redirects to MAL)
//   2. MAL redirects to /api/auth/mal/callback
//   3. The function exchanges the code and redirects to /settings#mal_token=...&mal_refresh=...
//   4. consumeMalRedirect() stores the pair, strips the hash
//
// MAL access tokens expire after an hour; refresh tokens after a month. Both are
// kept per browser and the refresh token is rotated on every refresh, so the new
// pair is always written back. All MAL API traffic goes through /api/mal because
// api.myanimelist.net sends no CORS headers.
import { MAL_START_PATH } from "./mal-config";

const ACCESS_KEY = "mal:token";
const REFRESH_KEY = "mal:refresh";
const EXPIRES_KEY = "mal:expires";
const USER_KEY = "mal:user";
const LINKED_KEY = "mal:linkedAt";

const REFRESH_SKEW_MS = 120_000;

export type MalUser = {
  id: number;
  name: string;
  picture: string | null;
};

export type MalConnection = {
  token: string;
  user: MalUser | null;
  linkedAt: number;
  expiresAt: number;
};

export class MalAuthError extends Error {
  code: "not_connected" | "expired" | "failed";
  constructor(message: string, code: MalAuthError["code"]) {
    super(message);
    this.name = "MalAuthError";
    this.code = code;
  }
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function remove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

export function isMalConfigured(): boolean {
  const id = import.meta.env.VITE_MAL_CLIENT_ID;
  return typeof id === "string" && id.trim().length > 0;
}

export function getMalConnection(): MalConnection | null {
  const token = read(ACCESS_KEY);
  if (!token) return null;

  let user: MalUser | null = null;
  const rawUser = read(USER_KEY);
  if (rawUser) {
    try {
      user = JSON.parse(rawUser) as MalUser;
    } catch {
      user = null;
    }
  }

  return {
    token,
    user,
    linkedAt: Number(read(LINKED_KEY) ?? 0) || 0,
    expiresAt: Number(read(EXPIRES_KEY) ?? 0) || 0,
  };
}

export function saveMalUser(user: MalUser | null) {
  if (!user) {
    remove(USER_KEY);
    return;
  }
  write(USER_KEY, JSON.stringify(user));
}

export function disconnectMal() {
  remove(ACCESS_KEY);
  remove(REFRESH_KEY);
  remove(EXPIRES_KEY);
  remove(USER_KEY);
  remove(LINKED_KEY);
}

export function startMalLink(): void {
  if (!isMalConfigured()) {
    throw new Error("MyAnimeList isn't configured on this build (VITE_MAL_CLIENT_ID is missing).");
  }
  // Full navigation: the start endpoint must set the PKCE cookie on this origin.
  window.location.assign(MAL_START_PATH);
}

export type MalRedirectResult =
  | { kind: "connected"; user: MalUser | null }
  | { kind: "error"; code: string };

export function consumeMalRedirect(): MalRedirectResult | null {
  if (typeof window === "undefined" || !window.location.hash) return null;

  const params = new URLSearchParams(window.location.hash.slice(1));
  const token = params.get("mal_token");
  const error = params.get("mal_error");
  if (!token && !error) return null;

  // Strip first so the tokens cannot be re-read or bookmarked.
  window.history.replaceState({}, "", window.location.pathname + window.location.search);

  if (error) return { kind: "error", code: error };

  if (token) {
    write(ACCESS_KEY, token);
    const refresh = params.get("mal_refresh");
    if (refresh) write(REFRESH_KEY, refresh);
    const expires = params.get("mal_expires");
    if (expires) write(EXPIRES_KEY, expires);
    write(LINKED_KEY, String(Date.now()));
    remove(USER_KEY);
  }

  return { kind: "connected", user: null };
}

let refreshInFlight: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = read(REFRESH_KEY);
  if (!refreshToken) {
    throw new MalAuthError("Your MyAnimeList connection expired. Please connect again.", "expired");
  }

  const res = await fetch("/api/auth/mal/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  }).catch(() => null);

  if (!res) throw new MalAuthError("Could not reach AniFlix to refresh MyAnimeList.", "failed");

  if (res.status === 401) {
    disconnectMal();
    throw new MalAuthError("Your MyAnimeList connection expired. Please connect again.", "expired");
  }
  if (!res.ok) {
    throw new MalAuthError("MyAnimeList would not refresh the session.", "failed");
  }

  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expiresAt?: number;
  };
  if (!data.access_token) {
    throw new MalAuthError("MyAnimeList would not refresh the session.", "failed");
  }

  write(ACCESS_KEY, data.access_token);
  if (data.refresh_token) write(REFRESH_KEY, data.refresh_token);
  write(EXPIRES_KEY, String(data.expiresAt ?? Date.now() + 3600_000));
  return data.access_token;
}

/** Access token that is guaranteed to be valid for at least two more minutes. */
export async function getValidMalToken(): Promise<string> {
  const token = read(ACCESS_KEY);
  if (!token) {
    throw new MalAuthError("Connect a MyAnimeList account first.", "not_connected");
  }

  const expiresAt = Number(read(EXPIRES_KEY) ?? 0) || 0;
  if (expiresAt && expiresAt - Date.now() > REFRESH_SKEW_MS) return token;

  // Single-flight: a sync and a user fetch on the same page must not both rotate
  // the refresh token, because MAL invalidates the previous one.
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function fetchMalUser(token: string): Promise<MalUser> {
  const res = await fetch("/api/mal?op=me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    throw new MalAuthError("MyAnimeList rejected the stored token.", "expired");
  }
  if (!res.ok) throw new MalAuthError("Could not read your MyAnimeList profile.", "failed");

  const data = (await res.json()) as { id?: number; name?: string; picture?: string | null };
  if (!data.id || !data.name) {
    throw new MalAuthError("MyAnimeList did not return a profile.", "failed");
  }
  return { id: data.id, name: data.name, picture: data.picture ?? null };
}

export function describeMalError(code: string): string {
  switch (code) {
    case "access_denied":
      return "You cancelled the MyAnimeList connection.";
    case "state_mismatch":
      return "That MyAnimeList response didn't match this session. Please try connecting again.";
    case "missing_cookie":
      return "The MyAnimeList login expired before it finished. Please try again.";
    case "token_exchange_failed":
      return "MyAnimeList rejected the login. Check the client ID/secret and the registered redirect URL.";
    case "invalid_client":
      return "MyAnimeList rejected the client credentials. Check MAL_CLIENT_ID and MAL_CLIENT_SECRET in Vercel — no quotes, no stray spaces — then redeploy.";
    case "missing_code":
      return "MyAnimeList did not return an authorization code.";
    default:
      return `MyAnimeList connection failed (${code}).`;
  }
}
