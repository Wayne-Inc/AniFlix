import { db } from "./firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  deleteField,
} from "firebase/firestore";
import type { SelectedProfile } from "./selected-profile";

export type Profile = {
  id: string;
  userId: string;
  name: string;
  color: string;
  kids: boolean;
  avatarUrl?: string;
  pinHash?: string;
  contentRatingLimit?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

const profileColors = [
  "from-rose-500 to-red-700",
  "from-sky-500 to-indigo-700",
  "from-amber-400 to-orange-600",
  "from-emerald-400 to-teal-600",
  "from-violet-500 to-purple-700",
  "from-pink-500 to-rose-700",
  "from-cyan-500 to-blue-700",
  "from-lime-400 to-green-600",
];

async function hashPin(pin: string, salt?: string): Promise<string> {
  const encoder = new TextEncoder();
  const saltBytes = salt ? encoder.encode(salt) : crypto.getRandomValues(new Uint8Array(16));
  const pinBytes = encoder.encode(pin);
  const key = await crypto.subtle.importKey("raw", pinBytes, { name: "PBKDF2" }, false, ["deriveBits"]);
  const hashBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations: 100000, hash: "SHA-256" },
    key,
    256,
  );
  const hashArray = new Uint8Array(hashBits);
  const hashHex = Array.from(hashArray).map((b) => b.toString(16).padStart(2, "0")).join("");
  const saltHex = Array.from(saltBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `pbkdf2_sha256$100000$${saltHex}$${hashHex}`;
}

async function verifyPinHash(pin: string, storedHash: string): Promise<boolean> {
  try {
    const parts = storedHash.split("$");
    if (parts.length !== 4 || parts[0] !== "pbkdf2_sha256" || parts[1] !== "100000") return false;
    const saltHex = parts[2];
    const expectedHash = parts[3];
    const computedHash = await hashPin(pin, saltHex);
    return computedHash === storedHash;
  } catch {
    return false;
  }
}

export function getRatingOrder(rating: string): number {
  const order: Record<string, number> = {
    G: 1, TV_Y: 1, PG: 2, TV_G: 2, TV_Y7: 2, PG_13: 3, TV_PG: 3, R: 4, TV_14: 4, NC_17: 5, TV_MA: 5,
  };
  return order[rating] ?? 99;
}

export function isRatingAllowed(profileRating: string | undefined, contentRating: string): boolean {
  if (!profileRating) return true;
  const profileOrder = getRatingOrder(profileRating);
  const contentOrder = getRatingOrder(contentRating);
  return contentOrder <= profileOrder;
}

export async function getUserProfiles(userId: string): Promise<Profile[]> {
  const q = query(collection(db, "users", userId, "profiles"), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as Profile;
  });
}

export async function createProfile(
  userId: string,
  data: Omit<Profile, "id" | "userId" | "color" | "createdAt" | "updatedAt">,
): Promise<Profile> {
  const profiles = await getUserProfiles(userId);
  const color = profileColors[profiles.length % profileColors.length];
  const payload = {
    ...data,
    userId,
    color,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, "users", userId, "profiles"), payload);
  return {
    id: docRef.id,
    userId,
    ...data,
    color,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function updateProfile(
  userId: string,
  profileId: string,
  data: Partial<Omit<Profile, "id" | "userId" | "createdAt">>,
): Promise<void> {
  const payload = { ...data, updatedAt: serverTimestamp() };
  await updateDoc(doc(db, "users", userId, "profiles", profileId), payload);
}

export async function deleteProfile(userId: string, profileId: string): Promise<void> {
  await deleteDoc(doc(db, "users", userId, "profiles", profileId));
}

export async function ensureUserHasProfile(
  userId: string,
  displayName: string,
): Promise<Profile[]> {
  const profiles = await getUserProfiles(userId);
  if (profiles.length === 0) {
    await createProfile(userId, {
      name: displayName || "Profile 1",
      kids: false,
      avatarUrl: undefined,
    });
    return getUserProfiles(userId);
  }
  return profiles;
}

export async function setProfilePin(userId: string, profileId: string, pin: string): Promise<void> {
  const pinHash = await hashPin(pin);
  await updateDoc(doc(db, "users", userId, "profiles", profileId), {
    pinHash,
    updatedAt: serverTimestamp(),
  });
}

export async function removeProfilePin(userId: string, profileId: string): Promise<void> {
  await updateDoc(doc(db, "users", userId, "profiles", profileId), {
    pinHash: deleteField(),
    updatedAt: serverTimestamp(),
  });
}

export async function verifyProfilePin(
  userId: string,
  profileId: string,
  pin: string,
): Promise<boolean> {
  const snap = await getDoc(doc(db, "users", userId, "profiles", profileId));
  if (!snap.exists()) return false;
  const data = snap.data();
  if (!data.pinHash) return true;
  return verifyPinHash(pin, data.pinHash);
}

export async function profileHasPin(userId: string, profileId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "users", userId, "profiles", profileId));
  if (!snap.exists()) return false;
  return !!snap.data().pinHash;
}

export async function isKidsProfile(userId: string, profileId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "users", userId, "profiles", profileId));
  if (!snap.exists()) return false;
  return !!snap.data().kids;
}

export function profileToSelected(profile: Profile): SelectedProfile {
  return {
    id: profile.id,
    name: profile.name,
    color: profile.color,
    avatarUrl: profile.avatarUrl,
    kids: profile.kids,
    contentRatingLimit: profile.contentRatingLimit,
  };
}
