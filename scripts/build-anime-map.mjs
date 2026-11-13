// Build the ID crosswalk used to move between TMDB, AniList and MyAnimeList.
//
// Source: https://github.com/Fribb/anime-lists (community-maintained mapping of
// MAL / AniList / AniDB / TVDB / TMDB ids). The published file is ~6 MB and is
// NOT meant for the browser, so this script keeps only what the app needs:
//
//   { "tv": { "<tmdbId>": { "m": <malId>, "a": <anilistId> } },
//     "movie": { ... } }
//
// Usage: node scripts/build-anime-map.mjs [local-file]
//   with no argument it downloads the dataset; otherwise it reads a local copy.
// Output: public/anime-map.json (lazy-loaded by src/lib/media-ids.ts).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const SOURCE_URL = "https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-mini.json";
const OUTPUT = resolve("public/anime-map.json");

async function loadDataset() {
  const local = process.argv[2];
  if (local) {
    console.log(`[anime-map] reading ${local}`);
    return JSON.parse(readFileSync(resolve(local), "utf8"));
  }
  console.log(`[anime-map] downloading ${SOURCE_URL}`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  return res.json();
}

function mergeIds(existing, incoming) {
  if (!existing) return incoming;
  return {
    m: existing.m ?? incoming.m,
    a: existing.a ?? incoming.a,
  };
}

const dataset = await loadDataset();
if (!Array.isArray(dataset)) throw new Error("unexpected dataset shape: expected an array");

const out = { tv: {}, movie: {} };
let skipped = 0;

for (const entry of dataset) {
  const tmdb = entry?.themoviedb_id;
  if (!tmdb) {
    skipped += 1;
    continue;
  }

  const ids = {};
  if (typeof entry.mal_id === "number") ids.m = entry.mal_id;
  if (typeof entry.anilist_id === "number") ids.a = entry.anilist_id;
  if (ids.m === undefined && ids.a === undefined) {
    skipped += 1;
    continue;
  }

  if (typeof tmdb.tv === "number") {
    out.tv[tmdb.tv] = mergeIds(out.tv[tmdb.tv], ids);
  }

  const movies = Array.isArray(tmdb.movie)
    ? tmdb.movie
    : typeof tmdb.movie === "number"
      ? [tmdb.movie]
      : [];
  for (const movieId of movies) {
    if (typeof movieId === "number") out.movie[movieId] = mergeIds(out.movie[movieId], ids);
  }
}

const tvCount = Object.keys(out.tv).length;
const movieCount = Object.keys(out.movie).length;

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(out));

console.log(
  `[anime-map] wrote ${OUTPUT}\n` +
    `[anime-map] tv=${tvCount} movie=${movieCount} skipped=${skipped}`,
);
