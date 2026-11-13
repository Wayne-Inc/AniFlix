// Client-side navigation shared by every component.
//
// This app renders from window.location. Internal links must update the URL with
// pushState and then notify <AppInner>, which owns the render. Never assign
// `window.location.href` for an internal route: that triggers a full document
// load, which 404s on a host without an SPA fallback.
//
// IMPORTANT: pushState does not emit "popstate", so the app must subscribe here.
// If App.tsx stops calling subscribeToNavigation, navigation silently does
// nothing — hence the loud error below instead of a silent no-op.
const NAVIGATE_EVENT = "aniflix:navigate";

let listenerCount = 0;

export function navigate(to: string) {
  const current = window.location.pathname + window.location.search;
  if (current === to) return;

  window.history.pushState({}, "", to);
  // A real page load would start at the top; match that for route changes.
  window.scrollTo({ top: 0 });
  window.dispatchEvent(new Event(NAVIGATE_EVENT));

  if (listenerCount === 0) {
    console.error(
      "[navigation] navigate() ran but nothing is subscribed — the URL changed " +
        `to ${to} and the UI did not re-render. Ensure App.tsx calls subscribeToNavigation().`,
    );
  }
}

// Subscribes to both programmatic navigation and the browser back/forward
// buttons. Returns an unsubscribe function.
export function subscribeToNavigation(handler: () => void) {
  listenerCount += 1;
  window.addEventListener(NAVIGATE_EVENT, handler);
  window.addEventListener("popstate", handler);

  return () => {
    listenerCount = Math.max(0, listenerCount - 1);
    window.removeEventListener(NAVIGATE_EVENT, handler);
    window.removeEventListener("popstate", handler);
  };
}
