import type { Conversation } from './assistant/types';
import type { Compound } from './compounds';
import type { HealthEntry } from './health';
import type { NutritionDoc } from './nutrition';
import type { ProgressPhoto } from './photos';
import type { Preferences } from './preferences';
import type { DoseLog, Protocol } from './schedule';
import type { VialStock } from './vials';

/** Pure merge rules for cloud sync — no React Native imports, so they can be unit-tested in Node. */

export type ScheduleDoc = { protocols: Protocol[]; logs: Record<string, DoseLog> };

const byId = <T extends { id: string }>(items: T[]) => new Map(items.map((i) => [i.id, i]));

/** Union by id; on the same id, the newer document's copy wins. */
export function unionById<T extends { id: string }>(local: T[], remote: T[], remoteNewer: boolean): T[] {
  const [first, second] = remoteNewer ? [remote, local] : [local, remote];
  const out = byId(first);
  for (const item of second) if (!out.has(item.id)) out.set(item.id, item);
  return [...out.values()];
}

/**
 * Protocols by id (newer document wins a conflict). Logs by dose id: a dose logged on either
 * device stays logged; a conflict goes to the more recently changed document. Logs whose protocol
 * no longer exists anywhere are dropped.
 */
export function mergeSchedule(local: ScheduleDoc, remote: ScheduleDoc, remoteNewer: boolean): ScheduleDoc {
  const protocols = unionById(local.protocols, remote.protocols, remoteNewer);
  const logs = remoteNewer ? { ...local.logs, ...remote.logs } : { ...remote.logs, ...local.logs };
  const ids = new Set(protocols.map((p) => p.id));
  for (const doseId of Object.keys(logs)) if (!ids.has(doseId.split(':')[0])) delete logs[doseId];
  return { protocols, logs };
}

export const mergeHealth = (local: HealthEntry[], remote: HealthEntry[], remoteNewer: boolean): HealthEntry[] => unionById(local, remote, remoteNewer);

/** Same conversation on both sides: keep whichever copy has more of it. */
export function mergeChats(local: Conversation[], remote: Conversation[]): Conversation[] {
  const out = byId(local);
  for (const c of remote) {
    const mine = out.get(c.id);
    if (!mine || c.messages.length > mine.messages.length || (c.messages.length === mine.messages.length && c.updatedAt > mine.updatedAt)) out.set(c.id, c);
  }
  return [...out.values()];
}

export const mergePreferences = (local: Preferences, remote: Preferences, remoteNewer: boolean): Preferences => (remoteNewer ? { ...local, ...remote } : { ...remote, ...local });

export const mergeSaved = (local: string[], remote: string[]): string[] => [...new Set([...local, ...remote])];

export const mergeCustomCompounds = (local: Compound[], remote: Compound[], remoteNewer: boolean): Compound[] => unionById(local, remote, remoteNewer);

/** Meals by id; water per day takes the larger figure (a sip logged on either phone counts). */
export function mergeNutrition(local: NutritionDoc, remote: NutritionDoc, remoteNewer: boolean): NutritionDoc {
  const water: Record<string, number> = { ...local.water };
  for (const [day, ml] of Object.entries(remote.water)) water[day] = Math.max(water[day] ?? 0, ml);
  const first = remoteNewer ? remote : local;
  const second = remoteNewer ? local : remote;
  return {
    meals: unionById(local.meals, remote.meals, remoteNewer),
    water,
    recents: [...new Set([...(first.recents ?? []), ...(second.recents ?? [])])].slice(0, 24),
    favourites: [...new Set([...(local.favourites ?? []), ...(remote.favourites ?? [])])],
    known: { ...(remote.known ?? {}), ...(local.known ?? {}) },
  };
}

/** Union by id; a copy marked uploaded wins over one that is not, since the bytes are then in the bucket. */
export function mergePhotos(local: ProgressPhoto[], remote: ProgressPhoto[], remoteNewer: boolean): ProgressPhoto[] {
  const merged = unionById(local, remote, remoteNewer);
  const uploaded = new Set([...local, ...remote].filter((p) => p.uploaded).map((p) => p.id));
  return merged.map((p) => (uploaded.has(p.id) ? { ...p, uploaded: true } : p)).sort((a, b) => b.at.localeCompare(a.at));
}

export const mergeVials = (local: VialStock[], remote: VialStock[], remoteNewer: boolean): VialStock[] => unionById(local, remote, remoteNewer);

/** JSON with object keys sorted, so a document that went through JSONB compares equal to the original. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .filter((k) => obj[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(',')}}`;
}
