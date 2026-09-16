import { Stack } from 'expo-router';

import { Brand } from '@/constants/brand';

/** Onboarding steps cross-fade so the shared stage background never appears to move. */
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        animationDuration: 360,
        gestureEnabled: true,
        contentStyle: { backgroundColor: Brand.black },
      }}
    />
  );
}
