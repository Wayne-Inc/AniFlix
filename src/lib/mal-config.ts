// MyAnimeList OAuth — values shared by the browser and the serverless functions.
// Dependency-free, like anilist-config.ts.
//
// MAL matches the redirect URI exactly, and it only accepts one registered URL
// per app, so dev and production need separate MAL apps.
export const MAL_CALLBACK_PATH = "/api/auth/mal/callback";
export const MAL_START_PATH = "/api/auth/mal/start";

export const MAL_AUTHORIZE_URL = "https://myanimelist.net/v1/oauth2/authorize";
export const MAL_TOKEN_URL = "https://myanimelist.net/v1/oauth2/token";

export function malRedirectUri(origin: string): string {
  return `${origin.replace(/\/+$/, "")}${MAL_CALLBACK_PATH}`;
}

export function buildMalAuthorizeUrl(options: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL(MAL_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", options.clientId);
  url.searchParams.set("redirect_uri", options.redirectUri);
  url.searchParams.set("state", options.state);
  // MAL only supports the `plain` challenge method: challenge === verifier.
  url.searchParams.set("code_challenge", options.codeChallenge);
  url.searchParams.set("code_challenge_method", "plain");
  return url.toString();
}

/**
 * MAL statuses differ from AniList's. Keeping the translation in one place
 * avoids leaking provider vocabulary into the UI.
 */
export type MalStatus = "watching" | "completed" | "on_hold" | "dropped" | "plan_to_watch";

export function isValidMalStatus(value: string): value is MalStatus {
  return ["watching", "completed", "on_hold", "dropped", "plan_to_watch"].includes(value);
}
