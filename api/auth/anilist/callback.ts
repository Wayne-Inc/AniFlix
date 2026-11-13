// AniList OAuth callback — Vercel Node function.
//
// Route: GET /api/auth/anilist/callback?code=...&state=...
//
// IMPORTANT: this file is deliberately self-contained. Vercel transpiles it to
// ESM and Node's loader does not resolve extensionless imports, so any import of
// a TypeScript file outside api/ fails at runtime with ERR_MODULE_NOT_FOUND.
// The constants below mirror src/lib/anilist-config.ts — change both together.
//
// AniList's authorization-code exchange requires the client secret, so it cannot
// happen in the browser. This function performs the exchange and hands the access
// token back to the SPA in the URL fragment, which the browser never sends to a
// server, never includes in a Referer, and never writes to an access log.
//
// Required environment (Vercel Project Settings -> Environment Variables):
//   ANILIST_CLIENT_ID, ANILIST_CLIENT_SECRET   (never prefixed with VITE_)
//   APP_URL (optional) — canonical origin, e.g. https://ani.streamflix.dpdns.org
import type { IncomingMessage, ServerResponse } from "node:http";
import process from "node:process";

const ANILIST_TOKEN_URL = "https://anilist.co/api/v2/oauth/token";
const ANILIST_CALLBACK_PATH = "/api/auth/anilist/callback";

function anilistRedirectUri(origin: string): string {
  return `${origin.replace(/\/+$/, "")}${ANILIST_CALLBACK_PATH}`;
}

type TokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function requestOrigin(req: IncomingMessage): string {
  const host = firstHeader(req.headers.host) ?? "localhost";
  const proto =
    firstHeader(req.headers["x-forwarded-proto"])?.split(",")[0]?.trim() ||
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Redirect back to the settings page with the result in the fragment. */
function sendResult(res: ServerResponse, appOrigin: string, params: Record<string, string>) {
  const target = new URL(`${appOrigin}/settings`);
  target.hash = new URLSearchParams(params).toString();
  res.statusCode = 302;
  res.setHeader("Location", target.toString());
  // A cached 302 would replay an old code/token to the next visitor.
  res.setHeader("Cache-Control", "no-store");
  res.end();
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    res.end("Method Not Allowed");
    return;
  }

  const clientId = process.env.ANILIST_CLIENT_ID?.trim();
  const clientSecret = process.env.ANILIST_CLIENT_SECRET?.trim();
  const appOrigin = (process.env.APP_URL?.trim() || requestOrigin(req)).replace(/\/+$/, "");

  if (!clientId || !clientSecret) {
    console.error(
      "[anilist] ANILIST_CLIENT_ID / ANILIST_CLIENT_SECRET are not set in the environment.",
    );
    res.statusCode = 500;
    res.setHeader("Cache-Control", "no-store");
    res.end("AniList OAuth is not configured on this deployment.");
    return;
  }

  const url = new URL(req.url ?? "/", `${requestOrigin(req)}`);
  const state = url.searchParams.get("state") ?? "";
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");

  if (error) {
    // The user declined, or AniList rejected the app/redirect URI.
    sendResult(res, appOrigin, { anilist_error: error, anilist_state: state });
    return;
  }

  if (!code) {
    sendResult(res, appOrigin, { anilist_error: "missing_code", anilist_state: state });
    return;
  }

  // Must match the value used in the authorize request and the app settings.
  const redirectUri = process.env.ANILIST_REDIRECT_URI?.trim() || anilistRedirectUri(appOrigin);

  try {
    const tokenRes = await fetch(ANILIST_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    });

    const payload = (await tokenRes.json().catch(() => ({}))) as TokenResponse;

    if (!tokenRes.ok || !payload.access_token) {
      // Never log the authorization code or the client secret.
      console.error(
        "[anilist] token exchange failed:",
        tokenRes.status,
        payload.error ?? "",
        payload.error_description ?? "",
      );
      sendResult(res, appOrigin, { anilist_error: "token_exchange_failed", anilist_state: state });
      return;
    }

    // The token goes back in the fragment; `state` is echoed so the SPA can
    // confirm this response belongs to the flow it started.
    sendResult(res, appOrigin, {
      anilist_token: payload.access_token,
      anilist_state: state,
    });
  } catch (e) {
    console.error("[anilist] token exchange threw:", e instanceof Error ? e.message : e);
    sendResult(res, appOrigin, { anilist_error: "token_exchange_failed", anilist_state: state });
  }
}
