import { useSyncExternalStore } from 'react';

/** Tiny open/close store so the FAB (in the tab bar) and the sheet (in the tabs layout) stay in sync. */
let open = false;
const listeners = new Set<() => void>();

export const quickActions = {
  isOpen: () => open,
  open() {
    open = true;
    listeners.forEach((l) => l());
  },
  close() {
    open = false;
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useQuickActionsOpen(): boolean {
  return useSyncExternalStore(quickActions.subscribe, quickActions.isOpen, quickActions.isOpen);
}
