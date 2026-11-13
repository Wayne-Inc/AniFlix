# MyAnimeList OAuth

MAL linking lives on **Settings → Connected accounts → MyAnimeList**. It is the
second adapter behind the same local list as AniList.

## 1. Register the application

1. Open <https://myanimelist.net/apiconfig> → **Create ID** (App Type: `web`).
2. **App Redirect URL** must be exact, with no trailing slash and no query string:

   | Where | Redirect URL |
   | --- | --- |
   | Production | `https://ani.streamflix.dpdns.org/api/auth/mal/callback` |
   | Local (`vercel dev`) | `http://localhost:3000/api/auth/mal/callback` |

   MAL stores one redirect URL per app, so create a second app ("AniFlix Dev")
   for localhost.

## 2. Environment variables

| Variable | Where | Notes |
| --- | --- | --- |
| `MAL_CLIENT_ID` | Vercel env | Server only. Also sent as `X-MAL-CLIENT-ID` to the API. |
| `MAL_CLIENT_SECRET` | Vercel env | Server only. Never prefix with `VITE_`. |
| `VITE_MAL_CLIENT_ID` | build-time | Public. Only used to decide whether Connect is enabled. |
| `MAL_REDIRECT_URI` | optional | Override for preview deployments; must match the registered URL. |
| `APP_URL` | optional | Canonical origin for the redirect back to `/settings`. |

## 3. Why there are four endpoints

MAL's token endpoint and API send **no CORS headers**, so nothing can talk to MAL
from the browser. Each piece is a small Vercel function:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/auth/mal/start` | Generates the PKCE verifier + state, stores them in a 10-minute `HttpOnly` cookie, redirects to MAL. |
| `GET /api/auth/mal/callback` | Reads the cookie, checks the echoed state, exchanges code + verifier for tokens, redirects to `/settings#mal_token=…`. |
| `POST /api/auth/mal/refresh` | Rotates the token pair before it expires (MAL invalidates the old refresh token on every use). |
| `/api/mal?op=me\|list\|update` | Fixed-operation proxy to `api.myanimelist.net`; only these three ops exist, and the caller's bearer token is forwarded, never stored or logged. |

The PKCE verifier never touches the address bar: it lives in the `HttpOnly`
cookie between `start` and `callback`. State is validated server-side, so a
callback whose state does not match the cookie is rejected before any token call.

**Serverless constraint:** nothing under `api/` may import from `src/` (or from
another `api/` file with an extensionless specifier) — Vercel emits ESM and Node's
loader cannot resolve those, producing `ERR_MODULE_NOT_FOUND` at runtime. Every
function here is self-contained and mirrors the constants in
`src/lib/mal-config.ts`; change both together. The same applies to
`api/mal.ts`.

## 4. Tokens

- Access token: **1 hour**. Refresh token: **1 month**.
- Refresh happens automatically ~2 minutes before expiry, single-flight so two
  components cannot rotate the same refresh token twice.
- On a `401` from MAL (revoked/expired refresh token) the local connection is
  cleared and the card asks the user to reconnect.
- Tokens live in `localStorage` (`mal:token`, `mal:refresh`, `mal:expires`) and are
  removed by **Disconnect**. They are not synced across devices.

## 5. Sync rules

Same rules as AniList (`docs/anilist-oauth.md` §7), with the status mapping:

| AniFlix state | MAL status |
| --- | --- |
| In My List, nothing watched | `plan_to_watch` |
| Some episodes watched | `watching` |
| All episodes watched / title marked watched | `completed` |

Only `status` and `num_watched_episodes` are written; scores, rewatches, tags and
the user's own dates are left untouched. A title without a known MAL id is counted
as unmatched — `src/lib/media-ids.ts` fills those in from the crosswalk.

## 6. Troubleshooting

| Symptom | Cause |
| --- | --- |
| MAL shows "redirect_uri mismatch" | Registered URL differs from the one sent (scheme, port, trailing slash, or production vs localhost). |
| Card shows "Setup needed" | `VITE_MAL_CLIENT_ID` was missing at build time — redeploy after setting it. |
| `missing_cookie` after login | The 10-minute cookie expired, or the browser blocked it. Start again. |
| `state_mismatch` | The callback was opened from a different browser/session than the one that started it. |
| 500 "not configured on this deployment" | `MAL_CLIENT_ID` / `MAL_CLIENT_SECRET` missing from the Vercel environment. |
| 403 from MAL | MAL's WAF rejecting the request — every call already sends a `User-Agent`; check the client id matches the token. |
