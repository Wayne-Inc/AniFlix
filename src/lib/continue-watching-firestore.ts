import {
  doc,
  setDoc,
  getDocs,
  getDoc,
  collection,
  query,
  where,
  deleteDoc,
  limit as fLimit,
  orderBy,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { getSelectedProfileId } from "./selected-profile";
import type { AnimeItem } from "../types/anime";

const CW_COLLECTION = "continue_watching";
const MAX = 12;

export type FirestoreContinueItem = {
  id: string;
  userId: string;
  profileId: string;
  movieId: number;
  title: string;
  poster: string;
  backdrop: string;
  rating: string;
  runtime: string;
  genres: string[];
  genreIds: number[];
  match: number;
  score?: number;
  description: string;
  year: number;
  cast: string[];
  castPfp: string[];
  director: string;
  directorId: string;
  progress: number;
  duration: number;
  updatedAt: number;
  season?: number;
  episode?: number;
  watched: boolean;
};

function makeDocId(itemId: number, season?: number, episode?: number) {
  return season != null && episode != null ? `${itemId}:S${season}E${episode}` : String(itemId);
}

export async function saveProgressToFirestore(
  item: AnimeItem,
  progress: number,
  duration: number,
  season?: number,
  episode?: number,
) {
  const user = auth.currentUser;
  if (!user) return;
  const profileId = getSelectedProfileId();
  if (!profileId) return;
  if (!duration || !isFinite(duration)) return;
  const ratio = progress / duration;
  const docId = `${user.uid}_${profileId}_${makeDocId(item.id, season, episode)}`;
  if (ratio >= 0.95) {
    await setDoc(doc(db, CW_COLLECTION, docId), {
      id: docId,
      userId: user.uid,
      profileId,
      movieId: item.id,
      title: item.title,
      poster: item.posterPath,
      backdrop: item.backdropPath,
      rating: item.ageRating ?? "",
      runtime: item.duration ?? "",
      genres: item.genres,
      genreIds: [],
      match: item.matchScore,
      score: item.voteAverage,
      description: item.overview,
      year: item.releaseYear ?? 0,
      cast: [],
      castPfp: [],
      director: "",
      directorId: "",
      progress,
      duration,
      updatedAt: Date.now(),
      season,
      episode,
      watched: true,
    }, { merge: true });
    return;
  }
  if (progress <= 5) return;
  const data: FirestoreContinueItem = {
    id: docId,
    userId: user.uid,
    profileId,
    movieId: item.id,
    title: item.title,
    poster: item.posterPath,
    backdrop: item.backdropPath,
    rating: item.ageRating ?? "",
    runtime: item.duration ?? "",
    genres: item.genres,
    genreIds: [],
    match: item.matchScore,
    score: item.voteAverage,
    description: item.overview,
    year: item.releaseYear ?? 0,
    cast: [],
    castPfp: [],
    director: "",
    directorId: "",
    progress,
    duration,
    updatedAt: Date.now(),
    season,
    episode,
    watched: false,
  };
  await setDoc(doc(db, CW_COLLECTION, docId), data);
}

export async function getContinueWatchingFromFirestore(): Promise<FirestoreContinueItem[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const profileId = getSelectedProfileId();
  if (!profileId) return [];
  const q = query(
    collection(db, CW_COLLECTION),
    where("userId", "==", user.uid),
    where("profileId", "==", profileId),
    fLimit(MAX),
    orderBy("updatedAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as FirestoreContinueItem)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function markWatched(item: AnimeItem, season?: number, episode?: number) {
  const user = auth.currentUser;
  if (!user) return;
  const profileId = getSelectedProfileId();
  if (!profileId) return;
  const docId = `${user.uid}_${profileId}_${makeDocId(item.id, season, episode)}`;
  await setDoc(doc(db, CW_COLLECTION, docId), {
    id: docId,
    userId: user.uid,
    profileId,
    movieId: item.id,
    title: item.title,
    poster: item.posterPath,
    backdrop: item.backdropPath,
    rating: item.ageRating ?? "",
    runtime: item.duration ?? "",
    genres: item.genres,
    genreIds: [],
    match: item.matchScore,
    score: item.voteAverage,
    description: item.overview,
    year: item.releaseYear ?? 0,
    cast: [],
    castPfp: [],
    director: "",
    directorId: "",
    progress: 0,
    duration: 0,
    updatedAt: Date.now(),
    season,
    episode,
    watched: true,
  }, { merge: true });
}

export async function isWatched(item: AnimeItem, season?: number, episode?: number): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  const profileId = getSelectedProfileId();
  if (!profileId) return false;
  const docId = `${user.uid}_${profileId}_${makeDocId(item.id, season, episode)}`;
  const snap = await getDoc(doc(db, CW_COLLECTION, docId));
  if (!snap.exists()) return false;
  return snap.data().watched === true;
}
