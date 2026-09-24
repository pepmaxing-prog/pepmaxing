import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { respond, type Context } from './engine';
import type { ChatMessage, Conversation, Reply } from './types';

const KEY = 'pepmaxing.chat.v1';
const MAX_CONVERSATIONS = 40;

type State = {
  conversations: Conversation[];
  activeId: string | null;
  /** While the assistant is "thinking": the status line to show. */
  pending: string | null;
};

let state: State = { conversations: [], activeId: null, pending: null };
let hydrated: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const persist = () => AsyncStorage.setItem(KEY, JSON.stringify({ conversations: state.conversations })).catch(() => {});
const set = (next: Partial<State>) => {
  state = { ...state, ...next };
  emit();
};
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const chatStore = {
  get: () => state,
  active: () => state.conversations.find((c) => c.id === state.activeId) ?? null,
  hydrate(): Promise<void> {
    if (!hydrated) {
      hydrated = AsyncStorage.getItem(KEY)
        .then((raw) => {
          if (!raw) return;
          const saved = JSON.parse(raw) as { conversations?: Conversation[] };
          set({ conversations: saved.conversations ?? [], activeId: null });
        })
        .catch(() => {});
    }
    return hydrated;
  },
  /** Adopts a merged conversation list (cloud sync). */
  replace(conversations: Conversation[]) {
    const sorted = [...conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, MAX_CONVERSATIONS);
    set({ conversations: sorted, activeId: sorted.some((c) => c.id === state.activeId) ? state.activeId : null });
    persist();
  },
  reset() {
    set({ conversations: [], activeId: null, pending: null });
    persist();
  },

  /** Starts a fresh conversation (the empty greeting screen). */
  newChat() {
    set({ activeId: null, pending: null });
    persist();
  },
  open(id: string) {
    set({ activeId: id, pending: null });
    persist();
  },
  remove(id: string) {
    set({ conversations: state.conversations.filter((c) => c.id !== id), activeId: state.activeId === id ? null : state.activeId });
    persist();
  },
  feedback(messageId: string, value: 'up' | 'down') {
    set({
      conversations: state.conversations.map((c) => ({
        ...c,
        messages: c.messages.map((m) => (m.id === messageId ? { ...m, feedback: m.feedback === value ? undefined : value } : m)),
      })),
    });
    persist();
  },

  /** Adds the user's turn, shows the engine's statuses one by one, then the reply. */
  async send(text: string, ctx: Context) {
    const trimmed = text.trim();
    if (!trimmed || state.pending) return;
    const now = new Date().toISOString();
    const user: ChatMessage = { id: uid(), role: 'user', text: trimmed, at: now };
    let conversation = chatStore.active();
    if (!conversation) {
      conversation = { id: uid(), title: trimmed.length > 48 ? `${trimmed.slice(0, 47)}…` : trimmed, createdAt: now, updatedAt: now, messages: [] };
      set({ conversations: [conversation, ...state.conversations].slice(0, MAX_CONVERSATIONS), activeId: conversation.id });
    }
    const id = conversation.id;
    const append = (m: ChatMessage) =>
      set({ conversations: state.conversations.map((c) => (c.id === id ? { ...c, messages: [...c.messages, m], updatedAt: m.at } : c)) });
    append(user);
    persist();

    let reply: Reply;
    try {
      reply = respond(trimmed, ctx);
    } catch {
      reply = { statuses: ['Thinking'], text: `Something went wrong on my side while working that out. Try rephrasing — for example "tell me about BPC-157", or "5 mg vial, 2 mL water, 250 mcg dose".` };
    }
    for (const status of reply.statuses) {
      set({ pending: status });
      await wait(status === 'Thinking' ? 550 : 900);
    }
    append({ id: uid(), role: 'assistant', text: reply.text, at: new Date().toISOString(), cards: reply.cards, actions: reply.actions, disclaimer: reply.disclaimer });
    set({ pending: null });
    persist();
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    chatStore.hydrate();
    return () => listeners.delete(listener);
  },
};

export function useChat(): State {
  return useSyncExternalStore(chatStore.subscribe, chatStore.get, chatStore.get);
}
