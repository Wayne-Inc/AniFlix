// MyAnimeList API proxy — Vercel Node function.
//
// The MAL API sends no CORS headers, so the browser cannot call it directly.
// This endpoint forwards a small, fixed set of operations with the caller's own
// bearer token. It is a proxy, not an open relay: only these ops exist, only
// api.myanimelist.net is targeted, and the token is never stored or logged.
//
//   GET  /api/mal?op=me      -> /v2/users/@me
//   GET  /api/mal?op=list    -> /v2/users/@me/animelist (all pages)
//   POST /api/mal?op=update  { malId, status, num_watched_episodes }
import type { IncomingMessage, ServerResponse } from "node:http";
import process from "node:process";
import { bearerToken, json, readJsonBody } from "./_lib/http";
import { isValidMalStatus } from "../src/lib/mal-config";

const MAL_API = "https://api.myanimelist.net/v2";
const MAX_PAGES = 10;

function malHeaders(token: string): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    // MAL's WAF rejects requests without a recognisable user agent.
    "User-Agent": "AniFlix/1.0 (+https://ani.streamflix.dpdns.org)",
  };
  const clientId = process.env.MAL_CLIENT_ID?.trim();
  if (clientId) headers["X-MAL-CLIENT-ID"] = clientId;
  return headers;
}

async function fetchAllPages(startUrl: string, token: string) {
  const entries: unknown[] = [];
  let next: string | null = startUrl;
  for (let page = 0; next && page < MAX_PAGES; page += 1) {
    const res = await fetch(next, { headers: malHeaders(token) });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw Object.assign(new Error(`MAL returned ${res.status}`), {
        status: res.status,
        body: text.slice(0, 300),
      });
    }
    const data = (await res.json()) as {
      data?: unknown[];
      paging?: { next?: string | null };
    };
    entries.push(...(data.data ?? []));
    next = data.paging?.next ?? null;
  }
  return entries;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", "https://placeholder.invalid");
  const op = url.searchParams.get("op");

  const token = bearerToken(req);
  if (!token) {
    json(res, 401, { error: "missing_token" });
    return;
  }

  try {
    if (op === "me") {
      if (req.method !== "GET") {
        json(res, 405, { error: "method_not_allowed" });
        return;
      }
      const upstream = await fetch(`${MAL_API}/users/@me?fields=name,picture`, {
        headers: malHeaders(token),
      });
      const payload = await upstream.json().catch(() => ({}));
      json(res, upstream.status, payload);
      return;
    }

    if (op === "list") {
      if (req.method !== "GET") {
        json(res, 405, { error: "method_not_allowed" });
        return;
      }
      const fields = "list_status{status,score,num_episodes_watched,updated_at,is_rewatching}";
      const entries = await fetchAllPages(
        `${MAL_API}/users/@me/animelist?fields=${encodeURIComponent(fields)}&limit=1000&nsfw=true`,
        token,
      );
      json(res, 200, { data: entries });
      return;
    }

    if (op === "update") {
      if (req.method !== "POST") {
        json(res, 405, { error: "method_not_allowed" });
        return;
      }
      const body = await readJsonBody(req);
      const malId = Number(body.malId);
      const status = typeof body.status === "string" ? body.status : "";
      const episodes = Number(body.num_watched_episodes);

      if (!Number.isInteger(malId) || malId <= 0) {
        json(res, 400, { error: "invalid_mal_id" });
        return;
      }
      if (!isValidMalStatus(status)) {
        json(res, 400, { error: "invalid_status" });
        return;
      }
      if (!Number.isInteger(episodes) || episodes < 0 || episodes > 100000) {
        json(res, 400, { error: "invalid_episodes" });
        return;
      }

      const form = new URLSearchParams({
        status,
        num_watched_episodes: String(episodes),
      });
      const upstream = await fetch(`${MAL_API}/anime/${malId}/my_list_status`, {
        method: "PUT",
        headers: {
          ...malHeaders(token),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      });
      const payload = await upstream.json().catch(() => ({}));
      json(res, upstream.status, payload);
      return;
    }

    json(res, 400, { error: "unknown_op" });
  } catch (e) {
    const status = typeof (e as { status?: number }).status === "number" ? (e as { status: number }).status : 502;
    // MAL status text only; never the token.
    console.error("[mal proxy]", op, (e as Error).message);
    json(res, status === 401 ? 401 : 502, { error: "mal_request_failed" });
  }
}
