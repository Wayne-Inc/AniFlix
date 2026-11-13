// MAL OAuth start — Vercel Node function.
//
// GET /api/auth/mal/start
//
// MAL requires PKCE (plain method). The verifier has to reach the callback, but
// putting it in `state` would expose it in the address bar and history, so it is
// stored in a short-lived HttpOnly cookie instead. The callback reads it, checks
// the echoed state, exchanges the code, and clears the cookie.
import { randomBytes } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import process from "node:process";
import { buildMalAuthorizeUrl, malRedirectUri } from "../../../src/lib/mal-config";

const COOKIE_NAME = "mal_oauth";
const COOKIE_MAX_AGE = 600;

function requestOrigin(req: IncomingMessage): string {
  const host = (Array.isArray(req.headers.host) ? req.headers.host[0] : req.headers.host) ?? "localhost";
  const protoHeader = req.headers["x-forwarded-proto"];
  const proto =
    (Array.isArray(protoHeader) ? protoHeader[0] : protoHeader)?.split(",")[0]?.trim() ||
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    res.end("Method Not Allowed");
    return;
  }

  const clientId = process.env.MAL_CLIENT_ID?.trim();
  if (!clientId) {
    console.error("[mal] MAL_CLIENT_ID is not set in the environment.");
    res.statusCode = 500;
    res.end("MyAnimeList OAuth is not configured on this deployment.");
    return;
  }

  const appOrigin = (process.env.APP_URL?.trim() || requestOrigin(req)).replace(/\/+$/, "");
  const redirectUri = process.env.MAL_REDIRECT_URI?.trim() || malRedirectUri(appOrigin);

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
