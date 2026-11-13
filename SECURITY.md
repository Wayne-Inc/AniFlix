# Security Policy

## Supported versions

The following versions of AniFlix currently receive security updates:

| Version | Supported |
|---------|-----------|
| Latest (main) | ✅ |
| Older releases | ❌ |

Please keep your deployment on the latest release and apply dependency updates promptly.

## Reporting a vulnerability

We take the security of AniFlix and its users seriously. If you discover a security vulnerability, please report it to us responsibly.

### How to report

Send a report to the repository maintainer (or project security contact) with the following details:

- A clear description of the vulnerability and its impact
- Steps to reproduce (including any required environment variables or accounts)
- The affected file(s) and line number(s), if known
- A suggested fix or mitigation (optional but helpful)
- Whether the issue is publicly known or under embargo

### What to expect

- You will receive an acknowledgment within 5 business days.
- We will investigate and keep you informed of progress.
- If the report is valid, we will fix it, cut a release, and credit you (unless you prefer to remain anonymous).

### Preferred disclosure

Please do **not** open a public GitHub issue for security vulnerabilities. Use the private reporting channel above and give us reasonable time to fix the issue before public disclosure.

## Security notes for contributors and deployers

### Environment variables

- Never commit `.env.local` or any file containing real API keys, Firebase config, OAuth client secrets, or the TMDB key.
- `.env.example` is checked in with placeholder values only.
- `ANILIST_CLIENT_SECRET` and `MAL_CLIENT_SECRET` are **server-only** and must never be prefixed with `VITE_`. Vite inlines every `VITE_*` value into the public JavaScript bundle.

### Firebase

- The same Firebase project is shared with StreamFlix so both apps share accounts, profiles, and watch data. Keep the Firebase API key and App Check site key confidential.
- App Check is enforced via reCAPTCHA Enterprise where a site key is configured.

### MyAnimeList proxy

- `/api/mal` is a locked-down proxy that forwards only a fixed set of operations (`me`, `list`, `update`, `delete`) to `api.myanimelist.net` using the caller's own bearer token. It is not an open relay: no other host or operation is reachable, and tokens are never stored or logged.

### API keys exposed to the client

- `VITE_TMDB_API_KEY`, `VITE_ANILIST_CLIENT_ID`, and `VITE_MAL_CLIENT_ID` are intentionally public identifiers used to build client-side authorize/search URLs. Treat them as public, not secret.
- The TMDB key allows read-only discovery/search; restrict it in the TMDB console where possible.

### Dependencies

- Run `npm audit` regularly and upgrade vulnerable dependencies.
- The app pins versions in `package.json`; review major upgrades before adopting.

## Scope

This policy covers the AniFlix application source code, API routes, and deployment configuration. Third-party services (TMDB, Firebase, MyAnimeList, AniList, embed video providers) operate under their own terms and security practices.