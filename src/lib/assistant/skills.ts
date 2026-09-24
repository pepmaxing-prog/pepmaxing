import type { SFSymbol } from 'expo-symbols';

/** The things the assistant can do, shown as chips above the composer and in the "+" sheet. */
export type Skill = { id: string; symbol: SFSymbol; title: string; subtitle: string; prompt: string };

export const SKILLS: Skill[] = [
  { id: 'recon', symbol: 'drop.fill', title: 'Reconstitution', subtitle: 'Mix a vial and do the math', prompt: 'Help me reconstitute a vial' },
  { id: 'research', symbol: 'magnifyingglass', title: 'Research', subtitle: 'Explore the science, with sources', prompt: 'What does the research say about my compounds?' },
  { id: 'insights', symbol: 'waveform.path.ecg', title: 'Insights', subtitle: 'Analyse your recent data', prompt: 'How am I doing?' },
  { id: 'site', symbol: 'scope', title: 'Next site', subtitle: 'Rotate your injection sites', prompt: 'Where should I inject next?' },
  { id: 'stack', symbol: 'square.stack.3d.up.fill', title: 'My stack', subtitle: 'What you are running right now', prompt: 'Show my current stack' },
  { id: 'dose', symbol: 'checkmark.circle.fill', title: 'Log a dose', subtitle: 'Record a dose you took', prompt: 'Log a dose' },
  { id: 'protocol', symbol: 'calendar.badge.plus', title: 'Add protocol', subtitle: 'Set up a dosing schedule', prompt: 'Set up a new protocol' },
  { id: 'compound', symbol: 'plus.circle.fill', title: 'Add compound', subtitle: 'Add one to your tracker', prompt: 'Add a compound to my tracker' },
  { id: 'health', symbol: 'scalemass.fill', title: 'Log health', subtitle: 'Weight, body fat, mood…', prompt: 'Log my weight' },
];

/** Rotating hints for the empty composer. */
export const PLACEHOLDERS = [
  'Ask about your protocol…',
  'Where do I log a dose?',
  'How do I reconstitute?',
  'How has my weight changed?',
  'Show my current stack',
  'Where should I inject next?',
  'Tell me about BPC-157',
];
