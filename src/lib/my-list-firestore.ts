import { doc, setDoc, getDoc, getDocs, collection, query, where, deleteDoc } from "firebase/firestore";
import { db, auth } from "./firebase";
import { getSelectedProfileId } from "./selected-profile";
import type { AnimeItem } from "../types/anime";

const MYLIST_COLLECTION = "my_list";

type FirestoreMyListEntry = {
  id: number;
  addedAt: number;
  item: AnimeItem;
  userId: string;
  profileId: string;
  itemId: number;
};

function makeDocId(itemId: number) {
  return String(itemId).replace(/[^a-zA-Z0-9]/g, "_");
}

// Firestore rejects undefined values. Strip them recursively before writing.
function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      cleaned[key] = stripUndefined(value as unknown as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map((v) =>
        v !== null && typeof v === "object" ? stripUndefined(v as unknown as Record<string, unknown>) : v
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export async function setMyListInFirestore(item: AnimeItem, inList: boolean) {
  const user = auth.currentUser;
  if (!user) return;
  const profileId = getSelectedProfileId();
  if (!profileId) return;
  const docId = `${user.uid}_${profileId}_${makeDocId(item.id)}`;
  if (!inList) {
    await deleteDoc(doc(db, MYLIST_COLLECTION, docId)).catch(() => {});
    return;
  }
  const cleanItem = stripUndefined(item as unknown as Record<string, unknown>) as unknown as AnimeItem;
  const data: FirestoreMyListEntry = {
    id: item.id,
    itemId: item.id,
    userId: user.uid,
    profileId,
    addedAt: Date.now(),
    item: cleanItem,
  };
  await setDoc(doc(db, MYLIST_COLLECTION, docId), stripUndefined(data));
}

export async function removeMyListFromFirestore(id: number) {
  const user = auth.currentUser;
  if (!user) return;
  const profileId = getSelectedProfileId();
  if (!profileId) return;
  const docId = `${user.uid}_${profileId}_${makeDocId(id)}`;
  await deleteDoc(doc(db, MYLIST_COLLECTION, docId)).catch(() => {});
}

export type MyListEntry = {
  docId: string;
  item: AnimeItem;
  addedAt: number;
};

/** Raw entries (item + timestamps), for code that needs more than the item. */
export async function getMyListEntriesFromFirestore(): Promise<MyListEntry[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const profileId = getSelectedProfileId();
  if (!profileId) return [];
  const q = query(
    collection(db, MYLIST_COLLECTION),
    where("userId", "==", user.uid),
    where("profileId", "==", profileId),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => {
      const data = d.data() as FirestoreMyListEntry;
      return { docId: d.id, item: data.item, addedAt: data.addedAt };
    })
    .filter((e) => e.item)
    .sort((a, b) => b.addedAt - a.addedAt);
}

/**
 * Merge sync metadata (AniList id/status/progress) into an existing entry without
 * touching the rest of the item. No-op when the title is no longer in the list.
 */
export async function updateMyListItemMeta(id: number, patch: Partial<AnimeItem>) {
  const user = auth.currentUser;
  if (!user) return;
  const profileId = getSelectedProfileId();
  if (!profileId) return;
  const ref = doc(db, MYLIST_COLLECTION, `${user.uid}_${profileId}_${makeDocId(id)}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data() as FirestoreMyListEntry;
  const item = { ...data.item, ...patch };
  await setDoc(ref, stripUndefined({ ...data, item }), { merge: true });
}

export async function getMyListFromFirestore(): Promise<AnimeItem[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const profileId = getSelectedProfileId();
  if (!profileId) return [];
  const q = query(
    collection(db, MYLIST_COLLECTION),
    where("userId", "==", user.uid),
    where("profileId", "==", profileId),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => d.data() as FirestoreMyListEntry)
    .filter((e) => e.item)
    .sort((a, b) => b.addedAt - a.addedAt)
    .map((e) => e.item);
}
