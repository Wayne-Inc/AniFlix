export type SelectedProfile = {
  id: string;
  name: string;
  color: string;
  avatarUrl?: string;
  kids: boolean;
  contentRatingLimit?: string;
};

const KEY = "aniflix:selectedProfile";
const PERSIST_KEY = "aniflix:selectedProfile:persist";

export function getSelectedProfile(): SelectedProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.id === "string") return parsed as SelectedProfile;
    }
    const persisted = window.localStorage.getItem(PERSIST_KEY);
    if (persisted) {
      const parsed = JSON.parse(persisted);
      if (parsed && typeof parsed.id === "string") {
        window.sessionStorage.setItem(KEY, persisted);
        return parsed as SelectedProfile;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function getSelectedProfileId(): string | null {
  return getSelectedProfile()?.id ?? null;
}

export function setSelectedProfile(profile: SelectedProfile): void {
  try {
    const serialized = JSON.stringify(profile);
    window.sessionStorage.setItem(KEY, serialized);
    window.localStorage.setItem(PERSIST_KEY, serialized);
    window.dispatchEvent(new Event("profileChanged"));
  } catch {
    // Storage unavailable (private mode) — ignore.
  }
}

export function clearSelectedProfile(): void {
  try {
    window.sessionStorage.removeItem(KEY);
    window.localStorage.removeItem(PERSIST_KEY);
    window.dispatchEvent(new Event("profileChanged"));
  } catch {
    // Storage unavailable — ignore.
  }
}
