# Contributing to AniFlix

Thanks for your interest in contributing to AniFlix! We welcome bug fixes, features, documentation improvements, and test coverage.

## Table of contents

1. [Getting started](#getting-started)
2. [Making changes](#making-changes)
3. [Pull request process](#pull-request-process)
4. [Code style](#code-style)
5. [Testing](#testing)
6. [Environment secrets](#environment-secrets)
7. [Community](#community)

## Getting started

1. Fork the repository and clone your fork:
   ```bash
   git clone <your-fork-url>
   cd AniFlix
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env.local` and fill in the values you need:
   ```bash
   cp .env.example .env.local
   ```
   - `VITE_TMDB_API_KEY` is required for live anime data.
   - Firebase config is required for auth/profiles.
   - Tracker sync keys (AniList / MyAnimeList) are optional unless you work on that area.
4. Run the dev server:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

## Making changes

1. Create a descriptive branch from `main`:
   ```bash
   git checkout -b your-topic-name
   ```
2. Make your changes. Keep commits small and focused.
3. Type-check before committing:
   ```bash
   npm run lint
   ```
4. Commit with a clear message:
   ```bash
   git commit -m "feat: add X support to Y"
   ```
   We recommend conventional commit prefixes (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`).

## Pull request process

1. Push your branch to your fork and open a pull request against `main`.
2. Describe what changed, why, and how to test it. Include screenshots for UI changes.
3. A maintainer will review. Be prepared to address review feedback.
4. Once approved, the maintainer merges. Do not self-merge unless you are a maintainer.

### Pull request checklist

- [ ] `npm run lint` passes
- [ ] App builds (`npm run build`)
- [ ] Relevant docs updated (README, `docs/`, inline comments)
- [ ] Secrets never committed

## Code style

- **Language:** TypeScript (strict). New files should be `.ts` / `.tsx`.
- **Formatting:** Follow the existing style — 2-space indentation, double quotes, trailing semicolons.
- **Imports:** Use the `@/` alias for `src/` imports (see `tsconfig.json` / `vite.config.ts`).
- **Components:** Function components with React hooks; lucide-react for icons; Tailwind CSS v4 classes.
- **Routes:** TanStack Router file-based routes under `src/routes/`.
- **API:** Vercel serverless functions under `api/`. Keep shared logic out of `api/` (Vite/ESM constraints) — see `api/mal.ts`.

## Testing

There is no dedicated test suite yet. Before opening a PR:

- Run the app locally and exercise the feature.
- Verify the type-check passes (`npm run lint`).
- Verify the production build passes (`npm run build`).

If you add tests, place them alongside the code they cover and run them with the project's test runner once one is adopted.

## Environment secrets

Do not commit real secrets:

- `.env.local` is gitignored — keep it local.
- `.env.example` may contain placeholder/dummy values only.
- Server-only secrets (`ANILIST_CLIENT_SECRET`, `MAL_CLIENT_SECRET`) must never be prefixed with `VITE_`.

If you accidentally commit a secret, rotate it immediately and notify a maintainer.

## Community

- Read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).
- See [SECURITY.md](SECURITY.md) for how to report vulnerabilities responsibly.
- Ask questions by opening a discussion or issue.

Thank you for contributing!