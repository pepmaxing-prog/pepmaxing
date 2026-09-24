import { useSyncExternalStore } from 'react';

import { compoundById, compoundColor, defaultAdministration, defaultUnit } from './compounds';
import { dayKey, newId, type Cycle, type Frequency, type Protocol, type ProtocolItem } from './schedule';

/**
 * The protocol being built, shared by the steps of the flow (pick → track → schedule → edit
 * compound). Lives in memory only: leaving the flow throws it away.
 */
export type Draft = {
  compoundIds: string[];
  mode: 'separate' | 'blend';
  items: ProtocolItem[];
  name: string;
  /** Set once the person types a name, so we stop suggesting one. */
  nameEdited: boolean;
  frequency: Frequency;
  time: string;
  startDate: string;
  cycle: Cycle;
  notes: string;
};

const DEFAULT_TIME = '09:00';

const blank = (): Draft => ({
  compoundIds: [],
  mode: 'separate',
  items: [],
  name: '',
  nameEdited: false,
  frequency: { kind: 'daily' },
  time: DEFAULT_TIME,
  startDate: dayKey(new Date()),
  cycle: null,
  notes: '',
});

let state: Draft = blank();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function itemFor(compoundIds: string[], previous?: ProtocolItem): ProtocolItem {
  const first = compoundById(compoundIds[0]);
  return {
    id: previous?.id ?? newId(),
    compoundIds,
    dose: previous?.dose ?? null,
    unit: previous?.unit ?? (first ? defaultUnit(first) : 'mg'),
    administration: previous?.administration ?? (compoundIds.length > 1 ? 'injection' : first ? defaultAdministration(first) : 'injection'),
    vialMg: previous?.vialMg ?? null,
    bacMl: previous?.bacMl ?? null,
    frequency: previous?.frequency,
    time: previous?.time,
  };
}

/** Rebuilds items for the current compounds and mode, keeping whatever was already configured. */
function rebuildItems(draft: Draft): ProtocolItem[] {
  if (draft.mode === 'blend') {
    const previous = draft.items.find((i) => i.compoundIds.length > 1) ?? draft.items[0];
    return draft.compoundIds.length ? [itemFor(draft.compoundIds, previous)] : [];
  }
  return draft.compoundIds.map((id) => itemFor([id], draft.items.find((i) => i.compoundIds.length === 1 && i.compoundIds[0] === id)));
}

function suggestedName(draft: Draft): string {
  if (draft.compoundIds.length === 1) return compoundById(draft.compoundIds[0])?.name ?? 'My protocol';
  const hour = Number(draft.time.split(':')[0]);
  const when = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
  return `${when} ${draft.mode === 'blend' ? 'blend' : 'stack'}`;
}

function normalise(next: Draft): Draft {
  const items = rebuildItems(next);
  const withItems = { ...next, items };
  return { ...withItems, name: withItems.nameEdited ? withItems.name : suggestedName(withItems) };
}

function set(next: Draft) {
  state = normalise(next);
  emit();
}

export const draftStore = {
  get: () => state,
  /** Starts over with these compounds. */
  start(compoundIds: string[]) {
    set({ ...blank(), compoundIds, mode: compoundIds.length > 1 ? state.mode : 'separate' });
  },
  addCompounds(ids: string[]) {
    set({ ...state, compoundIds: [...state.compoundIds, ...ids.filter((id) => !state.compoundIds.includes(id))] });
  },
  removeCompound(id: string) {
    set({ ...state, compoundIds: state.compoundIds.filter((x) => x !== id) });
  },
  setMode(mode: Draft['mode']) {
    set({ ...state, mode });
  },
  update(patch: Partial<Omit<Draft, 'items' | 'compoundIds'>>) {
    set({ ...state, ...patch, ...(patch.name !== undefined ? { nameEdited: true } : {}) });
  },
  updateItem(id: string, patch: Partial<Omit<ProtocolItem, 'id' | 'compoundIds'>>) {
    state = { ...state, items: state.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) };
    emit();
  },
  reset() {
    state = blank();
    emit();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useDraft(): Draft {
  return useSyncExternalStore(draftStore.subscribe, draftStore.get, draftStore.get);
}

export const draftComplete = (draft: Draft) => draft.items.length > 0 && draft.items.every((i) => i.dose != null && i.dose > 0) && draft.name.trim().length > 0;

export function toProtocol(draft: Draft): Protocol {
  const first = compoundById(draft.compoundIds[0]);
  return {
    id: newId(),
    name: draft.name.trim() || suggestedName(draft),
    mode: draft.mode,
    items: draft.items,
    frequency: draft.frequency,
    time: draft.time,
    startDate: draft.startDate,
    cycle: draft.cycle,
    notes: draft.notes.trim(),
    color: first ? compoundColor(first) : '#34D399',
    createdAt: new Date().toISOString(),
  };
}
