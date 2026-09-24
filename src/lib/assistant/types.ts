import type { SFSymbol } from 'expo-symbols';

export type ChatRole = 'user' | 'assistant';

/** A library entry, the way Pep AI shows one: status, blurb, what it is studied for, where to read. */
export type ResearchCard = {
  kind: 'research';
  compoundId: string;
  peptideId?: string;
  name: string;
  statusLabel: string;
  color: string;
  blurb: string;
  studiedFor: string[];
  sources: { label: string; url: string }[];
};

export type ReconCard = {
  kind: 'recon';
  doseLabel: string;
  vialMg: number;
  waterMl: number;
  mgPerMl: number;
  ml: number;
  units: number;
  warning?: string;
};

export type InsightCard = {
  kind: 'insight';
  title: string;
  rows: { label: string; value: string; tone?: 'good' | 'warn' | 'muted' }[];
};

export type StackCard = {
  kind: 'stack';
  protocols: { id: string; name: string; color: string; lines: string[] }[];
};

export type DoseListCard = {
  kind: 'doses';
  doses: { id: string; title: string; amount: string; time: string; logged: boolean }[];
};

export type Card = ResearchCard | ReconCard | InsightCard | StackCard | DoseListCard;

/** A button under an answer that takes the user somewhere in the app. */
export type Action = { label: string; href: string; symbol?: SFSymbol };

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  at: string;
  cards?: Card[];
  actions?: Action[];
  disclaimer?: string;
  feedback?: 'up' | 'down';
};

export type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
};

/** What the engine produces for one turn: the statuses to show while "thinking", then the reply. */
export type Reply = {
  statuses: string[];
  text: string;
  cards?: Card[];
  actions?: Action[];
  disclaimer?: string;
};
