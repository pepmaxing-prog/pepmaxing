import { useSyncExternalStore } from 'react';

export type Toast = {
  id: number;
  text: string;
  action?: { label: string; onPress: () => void };
};

/** One transient message at a time, shown above the tab bar. Any screen can push one. */
let current: Toast | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const toast = {
  get: () => current,
  show(text: string, action?: Toast['action'], ms = 4500) {
    if (timer) clearTimeout(timer);
    current = { id: ++seq, text, action };
    emit();
    timer = setTimeout(toast.hide, ms);
  },
  hide() {
    if (timer) clearTimeout(timer);
    timer = null;
    current = null;
    emit();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useToast(): Toast | null {
  return useSyncExternalStore(toast.subscribe, toast.get, toast.get);
}
