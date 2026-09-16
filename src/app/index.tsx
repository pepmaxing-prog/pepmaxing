import { Redirect, type Href } from 'expo-router';

import { WelcomeScreen } from '@/components/welcome/welcome-screen';

/**
 * Dev only: `EXPO_PUBLIC_DEV_START_ROUTE=/onboarding/name npx expo start` opens the app
 * on a specific screen so it can be reviewed without tapping through the flow.
 */
const DEV_START_ROUTE = __DEV__ ? process.env.EXPO_PUBLIC_DEV_START_ROUTE : undefined;

// First-run entry point. Once accounts exist this will redirect returning users to the dashboard.
export default function IndexScreen() {
  if (DEV_START_ROUTE) return <Redirect href={DEV_START_ROUTE as Href} />;
  return <WelcomeScreen />;
}
