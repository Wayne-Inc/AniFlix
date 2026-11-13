// MAL token refresh — Vercel Node function.
//
// POST /api/auth/mal/refresh  { refresh_token }
// -> { access_token, refresh_token, expiresAt }
//
// Self-contained on purpose: Vercel emits ESM and Node cannot resolve imports of
// TypeScript files outside api/, so the helpers below are local copies rather
// than shared modules.
//
// MAL access tokens last an hour and refresh tokens a month, and MAL rotates the
// refresh token on every use, so the client must persist the new pair. Called
// from the browser: MAL's token endpoint has no CORS support, hence this proxy.
import type { IncomingMessage, ServerResponse } from "node:http";
import process from "node:process";

const MAL_TOKEN_URL = "https://myanimelist.net/v1/oauth2/token";

type MalTokenResponse = {
  expires_in?: number;
  access_token?: string;
  refresh_token?: string;
  error?: string;
  message?: string;
};

function readJsonBody(req: IncomingMessage, limitBytes = 4096): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        reject(new Error("invalid json"));
      }
    });
    req.on("error", reject);
  });
}

function json(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

/** Strip quotes that come from pasting .env-style values into the dashboard. */
function envValue(name: string): string | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;
  const unquoted = raw.replace(/^["']|["']$/g, "").trim();
  return unquoted || undefined;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Allow", "POST");
    res.end("Method Not Allowed");
    return;
  }

  const clientId = envValue("MAL_CLIENT_ID");
  const clientSecret = envValue("MAL_CLIENT_SECRET");
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
