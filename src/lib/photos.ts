import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useSyncExternalStore } from 'react';

import { supabase, supabaseConfigured } from './supabase';

/**
 * Progress photos. The metadata (`ProgressPhoto`) is a synced store like the others, so every
 * device knows which photos exist. The bytes are local-first — saved into the app's documents
 * folder the moment a photo is taken — and uploaded to the private `progress-photos` bucket under
 * `<user_id>/<id>.jpg`. A new phone lists the photos from the metadata and pulls the files down on
 * demand (`ensureLocal`). Deleting removes both copies.
 */

export type PhotoCategory = 'face' | 'body' | 'hair';
export const PHOTO_CATEGORIES: { id: PhotoCategory; label: string; hint: string }[] = [
  { id: 'face', label: 'Face', hint: 'Same light, same angle — morning works best.' },
  { id: 'body', label: 'Body', hint: 'Front, relaxed, same distance from the camera each time.' },
  { id: 'hair', label: 'Hair', hint: 'Hairline and crown, phone held above eye level.' },
];

export type ProgressPhoto = {
  id: string;
  category: PhotoCategory;
  /** When it was taken (ISO). */
  at: string;
  note?: string;
  /** Set once the bytes are in the bucket, so other devices know they can download. */
  uploaded: boolean;
  width?: number;
  height?: number;
};

const KEY = 'pepmaxing.photos.v1';
const BUCKET = 'progress-photos';
const MAX_EDGE = 1600;
let photos: ProgressPhoto[] = [];
let hydrated: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const persist = () => AsyncStorage.setItem(KEY, JSON.stringify(photos)).catch(() => {});
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const set = (next: ProgressPhoto[]) => {
  photos = next;
  emit();
  persist();
};

const dir = () => new Directory(Paths.document, 'progress-photos');
export const photoFile = (id: string) => new File(dir(), `${id}.jpg`);
/** Local URI for the image, or null if this device has not got the bytes yet. */
export const localUri = (id: string): string | null => {
  const f = photoFile(id);
  return f.exists ? f.uri : null;
};

async function currentUserId(): Promise<string | null> {
  if (!supabaseConfigured) return null;
  const { data } = await supabase().auth.getSession();
  return data.session?.user.id ?? null;
}

export const photosStore = {
  get: () => photos,
  hydrate(): Promise<void> {
    if (!hydrated) {
      hydrated = AsyncStorage.getItem(KEY)
        .then((raw) => {
          if (!raw) return;
          photos = JSON.parse(raw) as ProgressPhoto[];
          emit();
        })
        .catch(() => {});
    }
    return hydrated;
  },
  /** Downscales, stores locally, records the metadata, then uploads in the background. */
  async add(sourceUri: string, category: PhotoCategory, note?: string): Promise<ProgressPhoto> {
    const id = uid();
    const rendered = await ImageManipulator.manipulate(sourceUri).resize({ width: MAX_EDGE, height: null }).renderAsync();
    const saved = await rendered.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });
    const folder = dir();
    if (!folder.exists) folder.create({ intermediates: true, idempotent: true });
    const target = photoFile(id);
    new File(saved.uri).move(target);
    const photo: ProgressPhoto = { id, category, at: new Date().toISOString(), note, uploaded: false, width: rendered.width, height: rendered.height };
    set([photo, ...photos]);
    void photosStore.upload(id);
    return photo;
  },
  /** Pushes one photo's bytes to the bucket; safe to call again (idempotent, upsert). */
  async upload(id: string): Promise<boolean> {
    const userId = await currentUserId();
    const file = photoFile(id);
    if (!userId || !file.exists) return false;
    const bytes = await file.bytes();
    const { error } = await supabase().storage.from(BUCKET).upload(`${userId}/${id}.jpg`, bytes, { contentType: 'image/jpeg', upsert: true });
    if (error) return false;
    set(photos.map((p) => (p.id === id ? { ...p, uploaded: true } : p)));
    return true;
  },
  /** Retries any photo this device has bytes for that never reached the bucket. */
  async uploadPending(): Promise<void> {
    for (const p of photos) if (!p.uploaded && photoFile(p.id).exists) await photosStore.upload(p.id);
  },
  /** Makes sure the bytes are on this device, downloading from the bucket if needed. */
  async ensureLocal(id: string): Promise<string | null> {
    const existing = localUri(id);
    if (existing) return existing;
    const userId = await currentUserId();
    if (!userId) return null;
    const { data, error } = await supabase().storage.from(BUCKET).download(`${userId}/${id}.jpg`);
    if (error || !data) return null;
    const folder = dir();
    if (!folder.exists) folder.create({ intermediates: true, idempotent: true });
    const file = photoFile(id);
    file.write(new Uint8Array(await data.arrayBuffer()));
    emit();
    return file.uri;
  },
  async remove(id: string): Promise<void> {
    set(photos.filter((p) => p.id !== id));
    const file = photoFile(id);
    if (file.exists) file.delete();
    const userId = await currentUserId();
    if (userId) await supabase().storage.from(BUCKET).remove([`${userId}/${id}.jpg`]);
  },
  setNote(id: string, note: string) {
    set(photos.map((p) => (p.id === id ? { ...p, note: note.trim() || undefined } : p)));
  },
  replace(next: ProgressPhoto[]) {
    set([...next].sort((a, b) => b.at.localeCompare(a.at)));
  },
  /** Forgets the metadata and the local files (sign-out / reset); the bucket is untouched unless `remote`. */
  async reset(remote = false): Promise<void> {
    const ids = photos.map((p) => p.id);
    set([]);
    const folder = dir();
    if (folder.exists) folder.delete();
    if (remote) {
      const userId = await currentUserId();
      if (userId && ids.length) await supabase().storage.from(BUCKET).remove(ids.map((id) => `${userId}/${id}.jpg`));
    }
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    photosStore.hydrate();
    return () => listeners.delete(listener);
  },
};

export function usePhotos(): ProgressPhoto[] {
  return useSyncExternalStore(photosStore.subscribe, photosStore.get, photosStore.get);
}

/** Downscaled JPEG as base64, for sending a label photo to the reader. Nothing is kept. */
export async function imageToBase64(uri: string, maxWidth = 1280): Promise<string> {
  const rendered = await ImageManipulator.manipulate(uri).resize({ width: maxWidth, height: null }).renderAsync();
  const saved = await rendered.saveAsync({ compress: 0.8, format: SaveFormat.JPEG, base64: true });
  try {
    new File(saved.uri).delete();
  } catch {
    /* cache file; the system clears it anyway */
  }
  return saved.base64 ?? '';
}
