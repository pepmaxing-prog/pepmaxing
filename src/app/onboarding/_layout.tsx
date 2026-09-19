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
      }}>
      {/* The loader pushes in from the right, like a chapter turn, and can't be swiped back to. */}
      <Stack.Screen name="matching" options={{ animation: 'slide_from_right', animationDuration: 420, gestureEnabled: false }} />
    </Stack>
  );
}
