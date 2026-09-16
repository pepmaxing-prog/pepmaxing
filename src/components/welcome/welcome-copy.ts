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
    subtitle: 'Every compound, dose and cycle in one place. Never miss a dose.',
  },
  {
    key: 'reconstitute',
    headline: 'Reconstitute\nwith confidence.',
    subtitle: 'Enter your vial, water and dose. See exactly how many units to draw.',
  },
  {
    key: 'assistant',
    headline: 'Ask anything,\nanytime.',
    subtitle: 'Clear answers grounded in your protocol and real research.',
  },
];

/** How long each page holds before the carousel advances on its own. */
export const AUTO_ADVANCE_MS = 6200;
