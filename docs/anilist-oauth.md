# AniList OAuth setup

AniList account linking lives on **Settings → Connected accounts**. This document
covers the one-time registration and the environment variables the flow needs.

## 1. Register the application

1. Open <https://anilist.co/settings/developer> → **Create New Application**.
2. Set the **Redirect URL** to the callback exactly, with no trailing slash and no
   query string:

   | Where | Redirect URL |
   | --- | --- |
   | Production | `https://ani.streamflix.dpdns.org/api/auth/anilist/callback` |
   | Local (`vercel dev`) | `http://localhost:3000/api/auth/anilist/callback` |

   AniList compares this string byte-for-byte against the `redirect_uri` sent in
   the authorize request **and** in the code→token exchange. One app holds one
   redirect URL, so create a second app ("AniFlix Dev") for localhost rather than
   editing the production app every time.

3. Copy the **Client ID** and **Client Secret**.

## 2. Environment variables

| Variable | Where | Notes |
| --- | --- | --- |
| `VITE_ANILIST_CLIENT_ID` | build-time (Vite) | Public. Builds the authorize URL in the browser. |
| `ANILIST_CLIENT_ID` | Vercel env | Server only. |
| `ANILIST_CLIENT_SECRET` | Vercel env | Server only. **Never** give this a `VITE_` prefix — Vite inlines those into the public bundle. |
| `APP_URL` | Vercel env (optional) | Canonical origin used for the redirect back to `/settings`. Falls back to the request host. |
| `ANILIST_REDIRECT_URI` | Vercel env (optional) | Override when the callback origin differs from the browsed origin (preview deployments). Must match the registered URL. |

Set them in **Vercel → Project Settings → Environment Variables**, then redeploy.
`VITE_*` values are baked in at build time, so changing `VITE_ANILIST_CLIENT_ID`
requires a new deployment; the server-only values only need a redeploy (or restart
of `vercel dev`).

## 3. Run it locally

`npm run dev` only starts Vite — the `api/` functions do not exist there. Use:

```bash
npx vercel dev --listen 3000
```

That serves the SPA and `/api/auth/anilist/callback` from one origin, which is what
the registered localhost URL expects.

## 4. How the flow works

```
Settings card "Connect"
  └─ GET https://anilist.co/api/v2/oauth/authorize
       client_id, redirect_uri, response_type=code, state
          └─ user approves on AniList
               └─ GET /api/auth/anilist/callback?code=…&state=…
                    └─ api/auth/anilist/callback.ts: POST anilist.co/api/v2/oauth/token
                         └─ 302 /settings#anilist_token=…&anilist_state=…
                              └─ ConnectedAccounts: state check → localStorage → strip hash
```

Files:

- `src/lib/anilist-config.ts` — callback path, redirect-URI builder, authorize URL (browser side).
- `src/lib/anilist-auth.ts` — start/consume/disconnect, token + viewer storage, `Viewer` query.
- `api/auth/anilist/callback.ts` — the Vercel Node function (code→token exchange).
- `src/components/ConnectedAccounts.tsx` — the cards.

**Serverless constraint:** nothing under `api/` may import from `src/` (or from
another `api/` file with an extensionless specifier). Vercel emits ESM and Node's
loader does not resolve those, so the deploy fails with
`ERR_MODULE_NOT_FOUND`. Each function is self-contained and keeps a local copy of
the few constants it needs — `api/auth/anilist/callback.ts` mirrors
`src/lib/anilist-config.ts`. Change both together.

## 5. Security notes

- The access token travels in the **fragment**, which browsers never send to a
  server, never pass in a `Referer`, and never write to an access log.
- The callback always responds with `Cache-Control: no-store`, so a 302 carrying a
  token can never be replayed from a cache.
- `state` is generated per attempt, kept in `sessionStorage`, echoed by the
  function, and compared before the token is stored.
- Neither the function nor the client logs the token, the code, or the secret.
- The token is stored per browser in `localStorage` (key `anilist:token`) and is
  removed by **Disconnect**. List data itself lives in Firestore, so synced lists
  still follow the user across devices; the token does not.
- If you later want the token synced across devices, store it in Firestore via
  the Admin SDK (service account) instead of returning it to the browser.

## 6. Troubleshooting

| Symptom | Cause |
| --- | --- |
| `redirect_uri` error page on AniList | Registered URL ≠ sent URL. Check scheme, `localhost` vs `127.0.0.1`, port, trailing slash. |
| Card shows "Setup needed" | `VITE_ANILIST_CLIENT_ID` missing at build time. |
| Callback returns `AniList OAuth is not configured on this deployment.` | `ANILIST_CLIENT_ID` / `ANILIST_CLIENT_SECRET` missing in the deployment's environment. |
| Callback returns the app's HTML instead of redirecting | A catch-all rewrite is shadowing `/api/*`. `vercel.json` excludes `api/` from the SPA fallback — keep it that way. |
| "AniList rejected the login" | Client secret wrong, or the code was already used (codes are single-use), or the redirect URL differs between the two requests. |
| "didn't match this session" (`state_mismatch`) | The flow was started in another tab, or stale `sessionStorage`. Start the connection again. |

## 7. Two-way sync rules

**Sync now** on the settings card runs `src/lib/anilist-sync.ts`. It is manual: the
first sync after connecting can write several entries, so it never happens
implicitly.

| Local state | AniList write |
| --- | --- |
| In My List, nothing watched | `status: PLANNING`, `progress: 0` |
| Some episodes marked watched | `status: CURRENT`, `progress: <episode count>` |
| All episodes marked watched, or title marked watched | `status: COMPLETED`, `progress: <total>` |

- **Conflict rule:** newest *watch activity* wins. Local time is the newest
  watched-document timestamp; AniList time is the entry's `updatedAt`. A tie
  writes nothing and adopts the AniList values. Adding a title to My List is a
  bookmark, not watch activity, so it never overwrites progress already set on
  AniList (it only creates a `PLANNING` entry when AniList has none).
- **Local un-watches do not propagate.** Deleting the last watched document
  removes the local timestamp, so sync treats AniList as authoritative rather
  than pushing a lower progress value.
- **Never sent:** score, notes, rewatches, favourites, private flag, start/finish
  dates. AniList keeps them untouched because the mutation only passes
  `mediaId`, `status`, and `progress`.
- **Mapping:** `anilistId` (stored on the item) → `malId` → title match against
  your own AniList list → cached id → AniList search, accepting only an exact
  normalized title match. No guessing: a wrong match would write progress to the
  wrong show.
- **Unmatched titles** are counted in the summary and left alone.
- **Removals stay local.** Deleting from My List does not delete the AniList
  entry; sync only updates titles that are still in your list. AniList has no
  undo, so this is deliberate.
- Pulling adopts AniList status/progress into `anilistStatus`/`anilistProgress`
  on the item; it does not fabricate local watched-episode records.

Episode progress comes from the watched documents written by the player
(`setWatched(item, watched, season, episode)`), which is why un-marking now
deletes the document instead of leaving a stale "watched" flag.

## 8. Not built yet

- Deleting AniList entries when a title is removed locally.
- Score/rating push, rewatch counters, manga lists.
- Background/automatic sync — sync is the explicit button on the settings card.
- Season/episode offsets for shows split across several AniList entries.

MyAnimeList is implemented as a second adapter on the same local list — see
`docs/mal-oauth.md`. Id resolution between TMDB, AniList and MAL is documented in
`docs/media-ids.md`.
