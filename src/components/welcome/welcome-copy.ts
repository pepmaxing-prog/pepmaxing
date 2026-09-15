export type WelcomePage = {
  key: 'protocol' | 'reconstitute' | 'assistant';
  /** Line breaks are deliberate: balanced two-line headlines, no orphaned words. */
  headline: string;
  subtitle: string;
};

export const WELCOME_PAGES: WelcomePage[] = [
  {
    key: 'protocol',
    headline: 'Your protocol,\nrun with precision.',
    subtitle: 'Every compound, dose and cycle in one place, with reminders you can trust.',
  },
  {
    key: 'reconstitute',
    headline: 'Reconstitute\nwith confidence.',
    subtitle: 'Vial, water, dose — see exactly how many units to draw, on a real syringe.',
  },
  {
    key: 'assistant',
    headline: 'Ask anything,\nanytime.',
    subtitle: 'Grounded in your protocol and the research. Never a guessed dose.',
  },
];

/** How long each page holds before the carousel advances on its own. */
export const AUTO_ADVANCE_MS = 6200;
