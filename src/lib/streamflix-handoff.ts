/**
 * StreamFlix → AniFlix login handoff.
 *
 * StreamFlix opens AniFlix with a Firebase custom token in the URL fragment:
 *
 *   https://ani.streamflix.dpdns.org/#sf_token=<jwt>
 *
 * The fragment never leaves the browser (it is not sent to the AniFlix server,
 * Cloudflare, or any referrer), and it is stripped from the address bar as soon
 * as it is read so it cannot be bookmarked or copied accidentally.
 */

export const STREAMFLIX_HANDOFF_PARAM = "sf_token";

/** Read the token from an arbitrary href without touching the DOM. */
export function readStreamFlixHandoff(href: string): {
  token: string | null;
  cleanHref: string;
} {
  const url = new URL(href);
  const originalHash = url.hash;
  const hashParams = new URLSearchParams(originalHash.replace(/^#/, ""));
  const hashToken = hashParams.get(STREAMFLIX_HANDOFF_PARAM);
  const token = hashToken ?? url.searchParams.get(STREAMFLIX_HANDOFF_PARAM);

  if (!token) {
    return { token: null, cleanHref: href };
  }

  if (hashToken !== null) {
    hashParams.delete(STREAMFLIX_HANDOFF_PARAM);
    const nextHash = hashParams.toString();
    url.hash = nextHash ? `#${nextHash}` : "";
  } else {
    url.hash = originalHash;
  }
  url.searchParams.delete(STREAMFLIX_HANDOFF_PARAM);

  return { token, cleanHref: url.toString() };
}

// The handoff is one-shot: a second React effect pass (or a re-render) must not
// try to sign in with the same token again.
let consumed = false;

/**
 * Read the handoff token from the current URL, remove it from the address bar,
 * and remember that the handoff has been attempted. Returns null when the page
 * was not opened from StreamFlix or the token was already consumed.
 */
export function takeStreamFlixHandoffToken(): string | null {
  if (consumed) return null;
  consumed = true;

  if (typeof window === "undefined") return null;

  try {
    const { token, cleanHref } = readStreamFlixHandoff(window.location.href);
    if (!token) return null;

    window.history.replaceState(window.history.state, "", cleanHref);
    return token;
  } catch {
    return null;
  }
}

/** Test-only helper: allow a different URL to be handled in the same process. */
export function resetStreamFlixHandoffForTests(): void {
  consumed = false;
}
