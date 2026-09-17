import type { OnboardingAnswers } from './types';

type ChoiceKey = 'goal' | 'experience' | 'cadence';

type ChoiceStep<K extends ChoiceKey> = {
  kind: 'choice';
  id: K;
  question: string;
  detail?: string;
  options: { value: NonNullable<OnboardingAnswers[K]>; label: string; detail?: string }[];
};

/** One step of the questionnaire: a question, a teaching beat, or proof that this works. */
export type OnboardingStep =
  | ChoiceStep<'goal'>
  | ChoiceStep<'experience'>
  | ChoiceStep<'cadence'>
  /** Options come from the medication catalogue at render time. */
  | { kind: 'medication'; id: 'primaryMedicationId'; question: string; detail?: string }
  | {
      kind: 'number';
      id: 'startingWeight' | 'goalWeight';
      question: string;
      detail?: string;
    }
  | { kind: 'education'; id: string; headline: string; body: string; source: string }
  | { kind: 'proof'; id: string; headline: string; quotes: { name: string; text: string }[] };

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    kind: 'choice',
    id: 'goal',
    question: 'What are you chasing?',
    detail: 'This sets what the app puts in front of you first.',
    options: [
      { value: 'loseFat', label: 'Lose fat', detail: 'Keep the muscle while the scale moves' },
      { value: 'buildMuscle', label: 'Build muscle', detail: 'Recomp, tracked by lean mass' },
      { value: 'recover', label: 'Recover', detail: 'Healing and joint protocols' },
      { value: 'longevity', label: 'Longevity', detail: 'Long-run markers, no crash cuts' },
    ],
  },
  {
    kind: 'education',
    id: 'edu-bodyfat',
    headline: 'The scale lies about progress.',
    body: 'On a GLP-1 a real share of lost weight can be lean mass, and weight alone cannot tell you which kind you lost. Waist, neck and hip can — we turn them into a body-fat estimate and show how much of what you lost was actually fat.',
    source: 'US Navy circumference method',
  },
  {
    kind: 'choice',
    id: 'experience',
    question: 'Where are you starting from?',
    options: [
      { value: 'new', label: 'First protocol', detail: 'Never injected before' },
      { value: 'restarting', label: 'Restarting', detail: 'Coming back after a break' },
      { value: 'experienced', label: 'Experienced', detail: 'I know my doses' },
    ],
  },
  {
    kind: 'medication',
    id: 'primaryMedicationId',
    question: 'What are you running?',
    detail: 'Sets your half-life curve and pre-fills the log. You can add others later.',
  },
  {
    kind: 'choice',
    id: 'cadence',
    question: 'How often do you dose?',
    detail: 'Used for your schedule and streaks. Change it any time.',
    options: [
      { value: 'weekly', label: 'Weekly', detail: 'Most GLP-1 protocols' },
      { value: 'daily', label: 'Daily', detail: 'Most research peptides' },
    ],
  },
  {
    kind: 'education',
    id: 'edu-dosing',
    headline: 'Most mistakes are timing mistakes.',
    body: 'Doubling up after a forgotten week is the common one. Every shot you log updates an estimated active level from the compound half-life, so you can see what is still on board before you draw the next dose.',
    source: 'First-order half-life decay — a trend, not a prescription',
  },
  {
    kind: 'proof',
    id: 'proof',
    headline: 'People stop guessing within a week.',
    quotes: [
      {
        name: 'Marcus, 14 weeks in',
        text: 'I double-dosed once before this. Now the last shot and the estimated level are the first thing I see.',
      },
      {
        name: 'Priya, down 11 kg',
        text: 'The body-fat trend is why I kept my lifts. The scale would have talked me into eating less.',
      },
      { name: 'Dan, titrating up', text: 'Logging takes ten seconds and the calendar warns me the day before I am due.' },
    ],
  },
  {
    kind: 'number',
    id: 'startingWeight',
    question: 'What do you weigh today?',
    detail: 'Your baseline. Everything else is measured against it.',
  },
  { kind: 'number', id: 'goalWeight', question: 'Where do you want to be?' },
];

/** Lines shown while the "personalizing" timer runs. */
export const PERSONALIZING_LINES = [
  'Reading your answers',
  'Matching a dosing schedule',
  'Calibrating your level curve',
  'Setting your measurement baseline',
  'Building your plan',
];

export const PERSONALIZING_MS = 5200;

export type PaywallPlan = {
  id: 'monthly' | 'yearly';
  title: string;
  price: string;
  detail: string;
  badge?: string;
};

/** Display only — nothing is charged until a billing provider is connected. */
export const PAYWALL_PLANS: PaywallPlan[] = [
  {
    id: 'yearly',
    title: 'Yearly',
    price: '$59.99',
    detail: '$5.00/mo · 7-day free trial',
    badge: 'Best value',
  },
  { id: 'monthly', title: 'Monthly', price: '$9.99', detail: 'Cancel any time' },
];

export const PAYWALL_FEATURES = [
  'Estimated active level, updated with every shot',
  'Body fat tracked apart from lean mass',
  '30-day cycle calendar, streaks and dose warnings',
  'Unlimited history and measurements',
];
