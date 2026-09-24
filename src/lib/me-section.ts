import { useSyncExternalStore } from 'react';

import type { SFSymbol } from 'expo-symbols';

/** The Me tab's sections — chosen from the bottom bar, which morphs into a Me bar while Me is focused. */
export type MeSection = 'nutrition' | 'progress' | 'stack' | 'community';

export const ME_SECTIONS: { id: MeSection; label: string; symbol: SFSymbol; active: SFSymbol }[] = [
  { id: 'nutrition', label: 'Nutrition', symbol: 'fork.knife', active: 'fork.knife' },
  { id: 'progress', label: 'Progress', symbol: 'chart.line.uptrend.xyaxis', active: 'chart.line.uptrend.xyaxis' },
  { id: 'stack', label: 'Stack', symbol: 'square.stack.3d.up', active: 'square.stack.3d.up.fill' },
  { id: 'community', label: 'Community', symbol: 'person.2', active: 'person.2.fill' },
];

let section: MeSection = 'nutrition';
const listeners = new Set<() => void>();

export const meSection = {
  get: () => section,
  set(next: MeSection) {
    if (next === section) return;
    section = next;
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useMeSection(): MeSection {
  return useSyncExternalStore(meSection.subscribe, meSection.get, meSection.get);
}
