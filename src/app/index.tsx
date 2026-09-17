import { Redirect } from 'expo-router';

import { WelcomeScreen } from '@/components/welcome/welcome-screen';
import { useStore } from '@/data/store';

/** First-run entry point: returning users skip straight to the dashboard. */
export default function IndexScreen() {
  const { ready, data } = useStore();

  // Hold on the splash-coloured screen rather than flashing the carousel at returning users.
  if (!ready) return null;
  if (data.onboarding.completed) return <Redirect href="/(tabs)" />;
  return <WelcomeScreen />;
}
