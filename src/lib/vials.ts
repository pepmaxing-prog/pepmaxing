import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { compoundById } from './compounds';
import { toMg, type Schedule } from './schedule';

/** Vials on hand for one compound. `openedAt` starts the "used since" clock for the remaining estimate. */
export type VialStock = {
  id: string;
  compoundId: string;
  /** Peptide per vial, mg (or IU for HCG/somatropin — kept as the label's unit). */
  vialMg: number;
  count: number;
  /** Water added when reconstituting, if any. */
  bacMl: number | null;
  openedAt: string | null;
  createdAt: string;
  note?: string;
};

const KEY = 'pepmaxing.vials.v1';
let stock: VialStock[] = [];
let hydrated: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const persist = () => AsyncStorage.setItem(KEY, JSON.stringify(stock)).catch(() => {});
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const set = (next: VialStock[]) => {
  stock = next;
  emit();
  persist();
};

export const vialsStore = {
  get: () => stock,
  hydrate(): Promise<void> {
    if (!hydrated) {
      hydrated = AsyncStorage.getItem(KEY)
        .then((raw) => {
          if (!raw) return;
          stock = JSON.parse(raw) as VialStock[];
          emit();
        })
        .catch(() => {});
    }
    return hydrated;
  },
  add(entry: Omit<VialStock, 'id' | 'createdAt'>): VialStock {
    const item: VialStock = { ...entry, id: uid(), createdAt: new Date().toISOString() };
    set([item, ...stock]);
    return item;
  },
  update(id: string, patch: Partial<VialStock>) {
    set(stock.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  },
  remove(id: string) {
    set(stock.filter((v) => v.id !== id));
  },
  replace(next: VialStock[]) {
    set(next);
  },
  reset() {
    set([]);
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    vialsStore.hydrate();
    return () => listeners.delete(listener);
  },
};

export function useVials(): VialStock[] {
  return useSyncExternalStore(vialsStore.subscribe, vialsStore.get, vialsStore.get);
}

export type StockStatus = {
  totalMg: number;
  /** Logged since the stock was opened, in the vial's unit. */
  usedMg: number;
  remainingMg: number;
  /** Planned doses this remaining amount covers, when the protocol has a dose. */
  dosesLeft: number | null;
  perDoseMg: number | null;
};

/** How much of a stock is left, counting every logged dose of its compound since it was opened. */
export function stockStatus(v: VialStock, schedule: Schedule): StockStatus {
  const since = v.openedAt ? new Date(v.openedAt).getTime() : new Date(v.createdAt).getTime();
  let usedMg = 0;
  let perDoseMg: number | null = null;
  for (const protocol of schedule.protocols) {
    for (const item of protocol.items) {
      if (item.compoundIds.length !== 1 || item.compoundIds[0] !== v.compoundId) continue;
      if (item.dose != null) perDoseMg = toMg(item.dose, item.unit) ?? (item.unit === 'IU' ? item.dose : perDoseMg);
      for (const d of schedule.doses) {
        if (d.itemId !== item.id || !d.log || d.log.skipped) continue;
        if (new Date(d.log.at).getTime() < since) continue;
        const mg = toMg(d.log.dose ?? item.dose ?? 0, d.log.unit ?? item.unit) ?? (item.unit === 'IU' ? d.log.dose ?? item.dose ?? 0 : 0);
        usedMg += mg;
      }
    }
  }
  const totalMg = v.vialMg * v.count;
  const remainingMg = Math.max(0, totalMg - usedMg);
  return { totalMg, usedMg, remainingMg, perDoseMg, dosesLeft: perDoseMg ? Math.floor(remainingMg / perDoseMg) : null };
}

/** Compounds in the user's protocols that have no stock yet — the "suggested from your protocol" cards. */
export function suggestedCompounds(schedule: Schedule, stock: VialStock[]): { compoundId: string; protocolName: string; vialMg: number | null; bacMl: number | null }[] {
  const have = new Set(stock.map((v) => v.compoundId));
  const out: { compoundId: string; protocolName: string; vialMg: number | null; bacMl: number | null }[] = [];
  for (const protocol of schedule.protocols) {
    for (const item of protocol.items) {
      if (item.compoundIds.length !== 1 || item.administration !== 'injection') continue;
      const id = item.compoundIds[0];
      if (have.has(id) || out.some((o) => o.compoundId === id) || !compoundById(id)) continue;
      out.push({ compoundId: id, protocolName: protocol.name, vialMg: item.vialMg, bacMl: item.bacMl });
    }
  }
  return out;
}
