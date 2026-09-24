import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

import { chatStore } from './assistant/store';
import type { Conversation } from './assistant/types';
import { customCompoundsStore, type Compound } from './compounds';
import { healthStore, type HealthEntry } from './health';
import { nutritionStore, type NutritionDoc } from './nutrition';
import { photosStore, type ProgressPhoto } from './photos';
import { preferencesStore, type Preferences } from './preferences';
import { savedStore } from './peptides';
import { scheduleStore } from './schedule';
import { supabase, supabaseConfigured } from './supabase';
import { mergeChats, mergeCustomCompounds, mergeHealth, mergeNutrition, mergePhotos, mergePreferences, mergeSaved, mergeSchedule, mergeVials, stableStringify, type ScheduleDoc } from './sync-merge';
import { vialsStore, type VialStock } from './vials';

/**
 * Cloud sync for every on-device store, so a reinstall or a new phone loses nothing.
 *
 * Local first: every store keeps working from AsyncStorage and stays instant. When a user is
 * signed in, each store's whole state is mirrored as one JSON document in `public.user_state`
 * (one row per user per store, RLS = own rows). Changes push after a short debounce and retry on
 * the next change, on foreground, and on sign-in; a pull on sign-in / cold start merges the
 * cloud copy into local before anything is pushed, so two devices converge instead of clobbering.
 */

type StoreKey = 'schedule' | 'health' | 'chat' | 'preferences' | 'saved' | 'custom_compounds' | 'nutrition' | 'vials' | 'photos';

type Syncable<T> = {
  key: StoreKey;
  hydrate: () => Promise<void>;
  subscribe: (listener: () => void) => () => void;
  read: () => T;
  write: (data: T) => void;
  /** Combine the two copies. `remoteNewer` says which document was changed more recently. */
  merge: (local: T, remote: T, remoteNewer: boolean) => T;
  isEmpty: (data: T) => boolean;
  reset: () => void;
};

const define = <T,>(store: Syncable<T>) => store as unknown as Syncable<unknown>;

const STORES: Syncable<unknown>[] = [
  define<ScheduleDoc>({
    key: 'schedule',
    hydrate: scheduleStore.hydrate,
    subscribe: scheduleStore.subscribe,
    read: () => ({ protocols: scheduleStore.get().protocols, logs: scheduleStore.get().logs }),
    write: (d) => scheduleStore.replace(d.protocols, d.logs),
    merge: mergeSchedule,
    isEmpty: (d) => d.protocols.length === 0 && Object.keys(d.logs).length === 0,
    reset: scheduleStore.reset,
  }),
  define<HealthEntry[]>({
    key: 'health',
    hydrate: healthStore.hydrate,
    subscribe: healthStore.subscribe,
    read: () => healthStore.get(),
    write: (d) => healthStore.replace(d),
    merge: mergeHealth,
    isEmpty: (d) => d.length === 0,
    reset: healthStore.reset,
  }),
  define<Conversation[]>({
    key: 'chat',
    hydrate: chatStore.hydrate,
    subscribe: chatStore.subscribe,
    read: () => chatStore.get().conversations,
    write: (d) => chatStore.replace(d),
    merge: mergeChats,
    isEmpty: (d) => d.length === 0,
    reset: chatStore.reset,
  }),
  define<Preferences>({
    key: 'preferences',
    hydrate: preferencesStore.hydrate,
    subscribe: preferencesStore.subscribe,
    read: () => preferencesStore.get(),
    write: (d) => preferencesStore.replace(d),
    merge: mergePreferences,
    // Preferences always have defaults; only a freshly generated username counts as "nothing yet".
    isEmpty: () => false,
    reset: preferencesStore.reset,
  }),
  define<string[]>({
    key: 'saved',
    hydrate: savedStore.hydrate,
    subscribe: savedStore.subscribe,
    read: () => savedStore.get(),
    write: (d) => savedStore.replace(d),
    merge: mergeSaved,
    isEmpty: (d) => d.length === 0,
    reset: savedStore.reset,
  }),
  define<Compound[]>({
    key: 'custom_compounds',
    hydrate: customCompoundsStore.hydrate,
    subscribe: customCompoundsStore.subscribe,
    read: () => customCompoundsStore.get(),
    write: (d) => customCompoundsStore.replace(d),
    merge: mergeCustomCompounds,
    isEmpty: (d) => d.length === 0,
    reset: customCompoundsStore.reset,
  }),
  define<NutritionDoc>({
    key: 'nutrition',
    hydrate: nutritionStore.hydrate,
    subscribe: nutritionStore.subscribe,
    read: () => nutritionStore.get(),
    write: (d) => nutritionStore.replace(d),
    merge: mergeNutrition,
    isEmpty: (d) => d.meals.length === 0 && Object.keys(d.water).length === 0 && !d.favourites?.length,
    reset: nutritionStore.reset,
  }),
  define<VialStock[]>({
    key: 'vials',
    hydrate: vialsStore.hydrate,
    subscribe: vialsStore.subscribe,
    read: () => vialsStore.get(),
    write: (d) => vialsStore.replace(d),
    merge: mergeVials,
    isEmpty: (d) => d.length === 0,
    reset: vialsStore.reset,
  }),
  define<ProgressPhoto[]>({
    key: 'photos',
    hydrate: photosStore.hydrate,
    subscribe: photosStore.subscribe,
    read: () => photosStore.get(),
    write: (d) => photosStore.replace(d),
    merge: mergePhotos,
    isEmpty: (d) => d.length === 0,
    reset: () => void photosStore.reset(false),
  }),
];

type Row = { store: StoreKey; data: unknown; changed_at: string };

const PUSH_DEBOUNCE_MS = 1500;
const LAST_CHANGE_KEY = 'pepmaxing.sync.lastChange.v1';
/** When this device last changed anything (persisted), used to decide who wins a same-id conflict. */
let lastLocalChange = 0;
function noteLocalChange() {
  lastLocalChange = Date.now();
  AsyncStorage.setItem(LAST_CHANGE_KEY, String(lastLocalChange)).catch(() => {});
}
/** JSON of what the cloud last received per store, so echoes and no-op changes don't push. */
const pushed = new Map<StoreKey, string>();
const dirty = new Set<StoreKey>();
const timers = new Map<StoreKey, ReturnType<typeof setTimeout>>();
let userId: string | null = null;
let pulling = false;
let pullPromise: Promise<void> | null = null;

async function signedInUser(): Promise<string | null> {
  if (!supabaseConfigured) return null;
  const { data } = await supabase().auth.getSession();
  return data.session?.user.id ?? null;
}

async function pushStore(store: Syncable<unknown>): Promise<void> {
  if (!userId) return;
  const data = store.read();
  const json = stableStringify(data);
  if (pushed.get(store.key) === json) {
    dirty.delete(store.key);
    return;
  }
  const { error } = await supabase().from('user_state').upsert({ user_id: userId, store: store.key, data, changed_at: new Date().toISOString() }, { onConflict: 'user_id,store' });
  if (error) {
    dirty.add(store.key);
    return;
  }
  pushed.set(store.key, json);
  dirty.delete(store.key);
}

function schedulePush(store: Syncable<unknown>) {
  if (!userId || pulling) return;
  const existing = timers.get(store.key);
  if (existing) clearTimeout(existing);
  timers.set(
    store.key,
    setTimeout(() => {
      timers.delete(store.key);
      pushStore(store).catch(() => dirty.add(store.key));
    }, PUSH_DEBOUNCE_MS),
  );
}

/** Anything that failed earlier goes again — on foreground and after a pull. */
async function flush(): Promise<void> {
  if (!userId) return;
  for (const store of STORES) if (dirty.has(store.key) || !pushed.has(store.key)) await pushStore(store).catch(() => dirty.add(store.key));
}

/**
 * Merge the cloud copy into local for every store, then push the merged result. Safe to call
 * repeatedly; concurrent calls share one run.
 */
export function pullAll(): Promise<void> {
  if (pullPromise) return pullPromise;
  pullPromise = (async () => {
    userId = await signedInUser();
    if (!userId) return;
    await Promise.all([...STORES.map((s) => s.hydrate()), AsyncStorage.getItem(LAST_CHANGE_KEY).then((v) => { if (v && !lastLocalChange) lastLocalChange = Number(v) || 0; }).catch(() => {})]);
    const { data, error } = await supabase().from('user_state').select('store, data, changed_at').eq('user_id', userId);
    if (error) throw error;
    const rows = new Map((data as Row[]).map((r) => [r.store, r]));
    pulling = true;
    try {
      for (const store of STORES) {
        const remote = rows.get(store.key);
        const local = store.read();
        if (!remote) continue;
        const remoteNewer = new Date(remote.changed_at).getTime() >= lastLocalChange;
        const merged = store.isEmpty(local) ? remote.data : store.merge(local, remote.data, remoteNewer);
        if (stableStringify(merged) !== stableStringify(local)) store.write(merged);
        pushed.set(store.key, stableStringify(remote.data));
      }
    } finally {
      pulling = false;
    }
    await flush();
  })().finally(() => {
    pullPromise = null;
  });
  return pullPromise;
}

/**
 * Starts mirroring: pulls once, then pushes every store change while signed in. Re-pulls when a
 * user signs in and on return to the foreground. Returns a stop function.
 */
export function startSync(): () => void {
  if (!supabaseConfigured) return () => {};
  const unsubscribes = STORES.map((store) =>
    store.subscribe(() => {
      if (pulling || !userId) return;
      noteLocalChange();
      schedulePush(store);
    }),
  );
  pullAll().catch(() => {});

  const { data: auth } = supabase().auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') pullAll().catch(() => {});
    if (event === 'SIGNED_OUT') {
      userId = null;
      pushed.clear();
      dirty.clear();
    }
  });
  const appState = AppState.addEventListener('change', (s) => {
    if (s === 'active') (userId ? flush() : pullAll()).catch(() => {});
  });
  return () => {
    unsubscribes.forEach((u) => u());
    auth.subscription.unsubscribe();
    appState.remove();
    for (const t of timers.values()) clearTimeout(t);
    timers.clear();
  };
}

/** Push everything that is pending right now (before sign-out, for instance). */
export async function flushSync(): Promise<void> {
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
  if (!userId) userId = await signedInUser();
  if (!userId) return;
  for (const store of STORES) await pushStore(store).catch(() => {});
}

/**
 * "Reset all data": empties every store while staying signed in, so the empty documents replace
 * the cloud copies too — otherwise the next pull would just bring everything back.
 */
export async function wipeEverywhere(): Promise<void> {
  // Photo bytes live in Storage, outside user_state — remove them explicitly.
  await photosStore.reset(true);
  for (const store of STORES) store.reset();
  await flushSync();
}

/** Wipes every synced store on this device (sign-out / account deletion). The cloud copy stays unless the account is deleted. */
export function resetLocalStores(): void {
  // Detach from the account first so the resets are never pushed as empty documents.
  userId = null;
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
  for (const store of STORES) store.reset();
  pushed.clear();
  dirty.clear();
  lastLocalChange = 0;
  AsyncStorage.removeItem(LAST_CHANGE_KEY).catch(() => {});
}
