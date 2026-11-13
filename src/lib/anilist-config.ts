// AniList OAuth — values shared by the browser and the serverless callback.
//
// This module must stay dependency-free: it is imported by api/auth/anilist/
// callback.ts (Node, Vercel) as well as by src/lib/anilist-auth.ts (browser), so
// it must not import React, Firebase, or anything that reads import.meta.env.
//
// The redirect URI is the one string that MUST be byte-identical in three
// places, or AniList rejects the request:
//   1. the app registered at https://anilist.co/settings/developer
//   2. the `redirect_uri` in the authorize request
//   3. the `redirect_uri` in the code -> token exchange
export const ANILIST_CALLBACK_PATH = "/api/auth/anilist/callback";

export const ANILIST_AUTHORIZE_URL = "https://anilist.co/api/v2/oauth/authorize";

/** Build the redirect URI from the origin the user is actually browsing. */
export function anilistRedirectUri(origin: string): string {
  return `${origin.replace(/\/+$/, "")}${ANILIST_CALLBACK_PATH}`;
}

export function buildAniListAuthorizeUrl(options: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(ANILIST_AUTHORIZE_URL);
  url.searchParams.set("client_id", options.clientId);
  url.searchParams.set("redirect_uri", options.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", options.state);
  return url.toString();
}
