# TMDB ↔ AniList ↔ MyAnimeList ID crosswalk

TMDB has no anime tracking ids (`external_ids` covers IMDb, TVDB, socials, not MAL
or AniList), and neither tracker knows about TMDB. The bridge is a generated data
file.

## What ships

`public/anime-map.json` — 161 KB, ~4.2k TV + ~1.4k movie entries:

```json
{
  "tv":    { "44298": { "m": 3390, "a": 3390 } },
  "movie": { "128":   { "m": 164,  "a": 164  } }
}
```

`m` = MyAnimeList id, `a` = AniList id, keyed by TMDB id inside the correct TMDB
namespace (`tv` vs `movie` — TMDB reuses numbers across the two).

## Where it comes from

Generated from the community [anime-lists](https://github.com/Fribb/anime-lists)
dataset (MAL / AniList / AniDB / TVDB / TMDB), which is ~6 MB and not meant for the
browser. The script keeps only entries that have a TMDB id plus at least one
tracking id.

```bash
npm run anime-map                 # downloads the dataset and rewrites the asset
npm run anime-map -- ./local.json # or use a local copy
```

Re-run it when you want fresher mappings; commit the regenerated
`public/anime-map.json` so deployments do not need network access at build time.

## How it is used

`src/lib/media-ids.ts` lazy-loads the asset once per session, only when a sync
needs it (it never blocks a page render), and exposes:

- `lookupMediaIds(tmdbId, "tv" | "movie")` → `{ malId?, anilistId? } | null`
- `resolveMediaIds(item)` → stored ids first, crosswalk second

Resolution order for any title:

1. `anilistId` / `malId` already stored on the item (came from a real API response)
2. the crosswalk
3. AniList `idMal` lookup (`Media(idMal: …)`) — the official AniList↔MAL bridge
4. exact normalized title match against the user's own AniList list
5. AniList search, accepting only an exact normalized title match

If the asset is missing or fails to load, sync still works through steps 1 and 3–5
for anything AniList knows about; the crosswalk is an accelerator, not a hard
dependency.

## Known limits

- Titles absent from anime-lists stay unmatched (reported in the sync summary).
- One TMDB show can correspond to several AniList/MAL entries (split cours,
  recaps). The crosswalk keeps one id per TMDB id; the first with both ids wins.
- Season offsets (`season` / `episode_offset` in the source dataset) are not
  modelled yet, so progress is treated as cumulative episodes on a single entry.
