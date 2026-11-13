# AniFlix

<div align="center">
  <img src="Icons/logo.png" alt="AniFlix logo" width="120" />
</div>

StreamFlix-style anime and manga streaming platform. AniFlix queries [TMDB](https://www.themoviedb.org/) for Japanese anime titles and pairs them with curated manga, plus watchlist sync with MyAnimeList and AniList.

## Features

- **Anime & movie catalog** — TMDB-powered discovery of Japanese anime series and films, with posters, backdrops, genres, ratings, cast, seasons, and episodes.
- **Video playback** — Built-in player backed by multiple embed servers (Vidrift, Vidy, VSEmbed, 2Embed, MultiEmbed, VidEasy), with picture-in-picture and server switching.
- **Multi-profile accounts** — Firebase Authentication (Google, GitHub, email/password) with per-user profiles and shared sign-in state with StreamFlix.
- **My list & continue watching** — Track what you're watching, mark items watched, and resume where you left off (Firestore-backed, works offline).
- **Tracker sync** — Connect MyAnimeList and/or AniList to import your list and push progress updates. TMDB ↔ MAL ↔ AniList ID crosswalk generated from the community anime-lists dataset.
- **Search** — TMDB search with fuzzy typo-tolerant fallback.
- **PWA** — Installable standalone app with cached TMDB data and images for offline use.
- **Deployed on Vercel** — Serverless API routes proxy MAL (which lacks CORS) securely.

## Tech stack

| Layer | Stack |
|-------|-------|
| Framework | React 19 + Vite |
| Router | TanStack Router |
| Data fetching | TanStack Query |
| Styling | Tailwind CSS v4 |
| Auth / database | Firebase (Auth + Firestore) |
| Anime data | TMDB (The Movie Database) |
| Tracker sync | MyAnimeList API + AniList GraphQL |
| Deployment | Vercel |

## Project structure

```
AniFlix/
├── api/                 # Vercel serverless functions (MAL proxy, auth callbacks, etc.)
├── docs/                # Operational docs (media-ids, MAL OAuth, AniList OAuth)
├── Icons/               # App icons and favicon
├── public/              # Static assets (anime-map.json crosswalk, etc.)
├── scripts/             # Build scripts (anime-map generator)
├── src/
│   ├── components/      # UI components (HeroBanner, AnimeRow, AnimeCard, Navbar, …)
│   ├── context/         # AuthContext (Firebase auth + profiles + StreamFlix handoff)
│   ├── lib/             # Firebase, TMDB, sync, preferences, consent, device tracking…
│   ├── routes/          # TanStack Router routes (home, anime, movie, watch, mylist, …)
│   ├── services/        # TMDB service (search, details, fuzzy matching)
│   └── types/           # TypeScript types (anime, profiles, watch progress)
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vercel.json
└── .env.example         # Copy to .env.local and fill in your keys
```

## Getting started

### Prerequisites

- Node.js (recommended: latest LTS)
- A [TMDB API key](https://www.themoviedb.org/settings/api) (required for live anime data)
- A Firebase project (Auth + Firestore)
- Optional: MyAnimeList app and/or AniList developer application for tracker sync

### 1. Clone and install

```bash
git clone <repository-url>
cd AniFlix
npm install
```

### 2. Configure environment

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

Edit `.env.local` (never commit this file — it contains secrets):

```env
# Firebase (shared with StreamFlix for unified accounts)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# Firebase App Check (reCAPTCHA Enterprise site key)
VITE_APP_CHECK_SITE_KEY=...

# TMDB (client-side, required for live data)
VITE_TMDB_API_KEY=your-tmdb-api-key

# App URL where this is hosted
APP_URL=https://ani.example.com

# Tracker sync (server-only — do NOT prefix with VITE_)
ANILIST_CLIENT_ID=
ANILIST_CLIENT_SECRET=
VITE_ANILIST_CLIENT_ID=

MAL_CLIENT_ID=
MAL_CLIENT_SECRET=
VITE_MAL_CLIENT_ID=
```

> **Note:** Only variables prefixed with `VITE_` are inlined into the client bundle. `ANILIST_CLIENT_ID`, `ANILIST_CLIENT_SECRET`, `MAL_CLIENT_ID`, and `MAL_CLIENT_SECRET` must stay server-side.

### 3. Run locally

```bash
npm run dev
```

Open http://localhost:3000.

### 4. Build

```bash
npm run build
```

The output goes to `dist/`, ready for static hosting (Vercel, Netlify, etc.).

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server on port 3000 |
| `npm run build` | Production build with Vite |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Type-check with TypeScript (`tsc --noEmit`) |
| `npm run anime-map` | Regenerate the TMDB ↔ MAL ↔ AniList ID crosswalk (`public/anime-map.json`) |

## Deployment

AniFlix is configured for [Vercel](https://vercel.com/). Connect your repository and add all environment variables (including the server-only ones without `VITE_`) in the Vercel project settings. The `vercel.json` rewrite sends all non-API routes to `index.html` for the SPA.

## Security

Please see [SECURITY.md](SECURITY.md) for how to report vulnerabilities.

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute.

## Code of conduct

Please see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for our community standards.

## License

This project is private / internal. See the repository for license details.