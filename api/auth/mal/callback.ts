// MAL OAuth callback — Vercel Node function.
//
// GET /api/auth/mal/callback?code=...&state=...
//
// Self-contained on purpose: Vercel emits ESM and Node cannot resolve imports of
// TypeScript files outside api/, so the constants below mirror
// src/lib/mal-config.ts instead of importing them. Keep both in sync.
//
// Reads the PKCE verifier from the HttpOnly cookie set by /api/auth/mal/start,
// checks the echoed state, exchanges the code, and hands the tokens back to the
// SPA in the URL fragment. MAL's token endpoint sends no CORS headers, so this
// exchange cannot happen in the browser.
import type { IncomingMessage, ServerResponse } from "node:http";
import process from "node:process";

const MAL_TOKEN_URL = "https://myanimelist.net/v1/oauth2/token";
const MAL_CALLBACK_PATH = "/api/auth/mal/callback";
const COOKIE_NAME = "mal_oauth";

function malRedirectUri(origin: string): string {
  return `${origin.replace(/\/+$/, "")}${MAL_CALLBACK_PATH}`;
}

type MalTokenResponse = {
  token_type?: string;
  expires_in?: number;
  access_token?: string;
  refresh_token?: string;
  error?: string;
  message?: string;
};

function header(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function requestOrigin(req: IncomingMessage): string {
  const host = header(req, "host") ?? "localhost";
  const proto =
    header(req, "x-forwarded-proto")?.split(",")[0]?.trim() ||
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

function readCookie(req: IncomingMessage, name: string): string | null {
  const raw = header(req, "cookie");
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function sendResult(res: ServerResponse, appOrigin: string, params: Record<string, string>) {
  const target = new URL(`${appOrigin}/settings`);
  target.hash = new URLSearchParams(params).toString();
  res.statusCode = 302;
  res.setHeader("Location", target.toString());
  res.setHeader("Cache-Control", "no-store");
  // Always clear the one-time verifier cookie, success or failure.
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
  res.end();
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    res.end("Method Not Allowed");
    return;
  }

  const clientId = process.env.MAL_CLIENT_ID?.trim();
  const clientSecret = process.env.MAL_CLIENT_SECRET?.trim();
  const appOrigin = (process.env.APP_URL?.trim() || requestOrigin(req)).replace(/\/+$/, "");

  if (!clientId || !clientSecret) {
    console.error("[mal] MAL_CLIENT_ID / MAL_CLIENT_SECRET are not set in the environment.");
    res.statusCode = 500;
    res.end("MyAnimeList OAuth is not configured on this deployment.");
    return;
  }

  const url = new URL(req.url ?? "/", requestOrigin(req));
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    sendResult(res, appOrigin, { mal_error: oauthError, mal_state: state });
    return;
  }

  // The cookie is the only place the verifier exists; without it the flow cannot
  // complete, and a missing cookie also means the state cannot be trusted.
  const rawCookie = readCookie(req, COOKIE_NAME);
  if (!rawCookie) {
    sendResult(res, appOrigin, { mal_error: "missing_cookie", mal_state: state });
    return;
  }

  let stored: { state?: string; verifier?: string };
  try {
    stored = JSON.parse(Buffer.from(rawCookie, "base64url").toString("utf8"));
  } catch {
    sendResult(res, appOrigin, { mal_error: "missing_cookie", mal_state: state });
    return;
  }

  if (!stored.state || stored.state !== state || !stored.verifier) {
    sendResult(res, appOrigin, { mal_error: "state_mismatch", mal_state: state });
    return;
  }

  if (!code) {
    sendResult(res, appOrigin, { mal_error: "missing_code", mal_state: state });
    return;
  }

  const redirectUri = process.env.MAL_REDIRECT_URI?.trim() || malRedirectUri(appOrigin);
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: stored.verifier,
  });

  try {
    const tokenRes = await fetch(MAL_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        // MAL sits behind a WAF that rejects clients without a plausible UA.
        "User-Agent": "AniFlix/1.0 (+https://ani.streamflix.dpdns.org)",
      },
      body: body.toString(),
    });

    const payload = (await tokenRes.json().catch(() => ({}))) as MalTokenResponse;

    if (!tokenRes.ok || !payload.access_token || !payload.refresh_token) {
      console.error("[mal] token exchange failed:", tokenRes.status, payload.error ?? payload.message ?? "");
      sendResult(res, appOrigin, { mal_error: "token_exchange_failed", mal_state: state });
      return;
    }

    const expiresAt = Date.now() + (payload.expires_in ?? 3600) * 1000;
    sendResult(res, appOrigin, {
      mal_token: payload.access_token,
      mal_refresh: payload.refresh_token,
      mal_expires: String(expiresAt),
      mal_state: state,
    });
  } catch (e) {
    console.error("[mal] token exchange threw:", e instanceof Error ? e.message : e);
    sendResult(res, appOrigin, { mal_error: "token_exchange_failed", mal_state: state });
  }
}
