export type WelcomePage = {
  key: 'protocol' | 'reconstitute' | 'food' | 'assistant';
  /** Kept short enough to sit on a single line. */
  headline: string;
  subtitle: string;
};

export const WELCOME_PAGES: WelcomePage[] = [
  {
    key: 'protocol',
    headline: 'Your protocol, perfected.',
    subtitle: 'Every compound, dose and cycle in one place. Never miss a dose.',
  },
  {
    key: 'reconstitute',
    headline: 'Exact doses, every time.',
    subtitle: 'Enter your vial, water and dose. See exactly how many units to draw.',
  },
  {
    key: 'food',
    headline: 'Log meals in seconds.',
    subtitle: 'Point your camera at any plate. Calories and macros, logged instantly.',
  },
  {
    key: 'assistant',
    headline: 'Ask anything, anytime.',
    subtitle: 'Clear answers grounded in your protocol and real research.',
  },
];

/** How long each page holds before the carousel advances on its own. */
export const AUTO_ADVANCE_MS = 6200;
