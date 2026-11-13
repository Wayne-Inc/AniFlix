// MAL OAuth start — Vercel Node function.
//
// GET /api/auth/mal/start
//
// Self-contained on purpose: Vercel emits ESM and Node cannot resolve imports of
// TypeScript files outside api/, so the constants below mirror
// src/lib/mal-config.ts instead of importing them. Keep both in sync.
//
// MAL requires PKCE (plain method). The verifier has to reach the callback, but
// putting it in `state` would expose it in the address bar and history, so it is
// stored in a short-lived HttpOnly cookie instead. The callback reads it, checks
// the echoed state, exchanges the code, and clears the cookie.
import { randomBytes } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import process from "node:process";

const COOKIE_NAME = "mal_oauth";
const COOKIE_MAX_AGE = 600;
const MAL_AUTHORIZE_URL = "https://myanimelist.net/v1/oauth2/authorize";
const MAL_CALLBACK_PATH = "/api/auth/mal/callback";

function malRedirectUri(origin: string): string {
  return `${origin.replace(/\/+$/, "")}${MAL_CALLBACK_PATH}`;
}

function buildMalAuthorizeUrl(options: {
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

function requestOrigin(req: IncomingMessage): string {
  const host = (Array.isArray(req.headers.host) ? req.headers.host[0] : req.headers.host) ?? "localhost";
  const protoHeader = req.headers["x-forwarded-proto"];
  const proto =
    (Array.isArray(protoHeader) ? protoHeader[0] : protoHeader)?.split(",")[0]?.trim() ||
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Strip quotes that come from pasting .env-style values into the dashboard. */
function envValue(name: string): string | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;
  const unquoted = raw.replace(/^["']|["']$/g, "").trim();
  return unquoted || undefined;
}

/** Canonical origin for the callback; a bad APP_URL must never crash the flow. */
function resolveAppOrigin(req: IncomingMessage): string {
  const configured = envValue("APP_URL");
  if (configured) {
    try {
      const parsed = new URL(configured);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        return parsed.origin;
      }
    } catch {
      // fall through
    }
    console.error(
      "[mal] APP_URL is not an absolute http(s) URL; using the request origin instead:",
      configured,
    );
  }
  return requestOrigin(req);
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    res.end("Method Not Allowed");
    return;
  }

  const clientId = envValue("MAL_CLIENT_ID");
  if (!clientId) {
    console.error("[mal] MAL_CLIENT_ID is not set in the environment.");
    res.statusCode = 500;
    res.end("MyAnimeList OAuth is not configured on this deployment.");
    return;
  }

  const appOrigin = resolveAppOrigin(req);
  const redirectUri = envValue("MAL_REDIRECT_URI") || malRedirectUri(appOrigin);

  // 64 random bytes -> 86 base64url characters, inside MAL's 43..128 range.
  const verifier = randomBytes(64).toString("base64url");
  const state = randomBytes(16).toString("base64url");

  const payload = Buffer.from(JSON.stringify({ state, verifier }), "utf8").toString("base64url");
  const secure = appOrigin.startsWith("https://") ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${payload}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}${secure}`,
  );
  res.setHeader("Cache-Control", "no-store");
  res.statusCode = 302;
  res.setHeader(
    "Location",
    buildMalAuthorizeUrl({ clientId, redirectUri, state, codeChallenge: verifier }),
  );
  res.end();
}
