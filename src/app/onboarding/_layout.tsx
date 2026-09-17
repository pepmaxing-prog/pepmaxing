import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.dark.background },
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="questions" />
      <Stack.Screen name="personalizing" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="paywall" options={{ animation: 'fade', gestureEnabled: false }} />
    </Stack>
  );
}
