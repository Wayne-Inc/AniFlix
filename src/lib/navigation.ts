// Client-side navigation shared by every component.
//
// This app renders from window.location and re-renders <AppInner> when the URL
// changes. Internal links must therefore update the URL with pushState and
// notify the app — never by assigning `window.location.href`, which triggers a
// full document load. On a host without an SPA fallback that load 404s, which
// is why internal links appear "dead".
const NAVIGATE_EVENT = "aniflix:navigate";

export function navigate(to: string) {
  const current = window.location.pathname + window.location.search;
  if (current === to) return;
  window.history.pushState({}, "", to);
  // A real page load would start at the top; match that for route changes.
  window.scrollTo({ top: 0 });
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
}

// Subscribes to both programmatic navigation and the browser back/forward
// buttons. Returns an unsubscribe function.
export function subscribeToNavigation(handler: () => void) {
  window.addEventListener(NAVIGATE_EVENT, handler);
  window.addEventListener("popstate", handler);
  return () => {
    window.removeEventListener(NAVIGATE_EVENT, handler);
    window.removeEventListener("popstate", handler);
  };
}
