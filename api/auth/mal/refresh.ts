// MAL token refresh — Vercel Node function.
//
// POST /api/auth/mal/refresh  { refresh_token }
// -> { access_token, refresh_token, expiresAt }
//
// MAL access tokens last an hour and refresh tokens a month, and MAL rotates the
// refresh token on every use, so the client must persist the new pair. Called
// from the browser: MAL's token endpoint has no CORS support, hence this proxy.
import type { IncomingMessage, ServerResponse } from "node:http";
import process from "node:process";
import { MAL_TOKEN_URL } from "../../../src/lib/mal-config";
import { json, readJsonBody } from "../../_lib/http";

type MalTokenResponse = {
  expires_in?: number;
  access_token?: string;
  refresh_token?: string;
  error?: string;
  message?: string;
};

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Allow", "POST");
    res.end("Method Not Allowed");
    return;
  }

  const clientId = process.env.MAL_CLIENT_ID?.trim();
  const clientSecret = process.env.MAL_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    json(res, 500, { error: "not_configured" });
    return;
  }

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(req);
  } catch {
    json(res, 400, { error: "invalid_body" });
    return;
  }

  const refreshToken = typeof body.refresh_token === "string" ? body.refresh_token : "";
  if (!refreshToken) {
    json(res, 400, { error: "missing_refresh_token" });
    return;
  }

  const form = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  try {
    const tokenRes = await fetch(MAL_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "User-Agent": "AniFlix/1.0 (+https://ani.streamflix.dpdns.org)",
      },
      body: form.toString(),
    });
    const payload = (await tokenRes.json().catch(() => ({}))) as MalTokenResponse;

    if (!tokenRes.ok || !payload.access_token) {
      console.error("[mal] refresh failed:", tokenRes.status, payload.error ?? payload.message ?? "");
      json(res, tokenRes.status === 401 ? 401 : 502, { error: "refresh_failed" });
      return;
    }

    json(res, 200, {
      access_token: payload.access_token,
      // MAL rotates refresh tokens; fall back to the old one only if absent.
      refresh_token: payload.refresh_token ?? refreshToken,
      expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
    });
  } catch (e) {
    console.error("[mal] refresh threw:", e instanceof Error ? e.message : e);
    json(res, 502, { error: "refresh_failed" });
  }
}
