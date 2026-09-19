import { Redirect, type Href } from 'expo-router';

import { WelcomeScreen } from '@/components/welcome/welcome-screen';
import { onboardingStore } from '@/lib/onboarding-store';

/**
 * Dev only: `EXPO_PUBLIC_DEV_START_ROUTE=/onboarding/name npx expo start` opens the app
 * on a specific screen so it can be reviewed without tapping through the flow.
 */
const DEV_START_ROUTE = __DEV__ ? process.env.EXPO_PUBLIC_DEV_START_ROUTE : undefined;

/**
 * Entry point (the store is hydrated in the root layout):
 * - finished onboarding → home;
 * - created an account but left before finishing → "Welcome back", which signs in and resumes;
 * - left before creating an account → straight back to the step they were on.
 */
export default function IndexScreen() {
  if (DEV_START_ROUTE) return <Redirect href={DEV_START_ROUTE as Href} />;
  const { step, completedAt, account } = onboardingStore.get();
  if (completedAt) return <Redirect href="/home" />;
  if (account && step) return <Redirect href="/onboarding/welcome-back" />;
  if (step) return <Redirect href={step as Href} />;
  return <WelcomeScreen />;
}
