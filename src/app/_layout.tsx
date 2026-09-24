import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplash } from '@/components/splash/animated-splash';
import { Brand } from '@/constants/brand';
import { BrandFonts, Colors } from '@/constants/theme';
import { onboardingStore } from '@/lib/onboarding-store';
import { startProfileSync } from '@/lib/profile';
import { startSync } from '@/lib/sync';
import { scheduleStore } from '@/lib/schedule';
import { SplashPhaseProvider, useSetSplashPhase } from '@/lib/splash-state';
import { requestTrackingPermission } from '@/lib/tracking';

// Keep the (pure black) native splash up until AnimatedSplash has mounted over it.
SplashScreen.preventAutoHideAsync();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.text,
    background: Colors.dark.background,
    card: Colors.dark.backgroundElement,
    text: Colors.dark.text,
    border: Colors.dark.border,
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(BrandFonts);
  // Saved onboarding answers are read before the first route so it can resume in place.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    Promise.all([onboardingStore.hydrate(), scheduleStore.hydrate()]).then(() => setHydrated(true));
    const stopProfile = startProfileSync();
    const stopSync = startSync();
    return () => {
      stopProfile();
      stopSync();
    };
  }, []);
  // Mount the app only once fonts are ready: text laid out with a fallback font and then
  // re-rendered in Inter keeps its old measurements and clips. The splash covers the wait.
  const ready = (fontsLoaded || fontError != null) && hydrated;

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={theme}>
        <SplashPhaseProvider>
          <StatusBar style="light" />
          {ready && (
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'fade',
                animationDuration: 360,
                contentStyle: { backgroundColor: Brand.black },
              }}>
              <Stack.Screen name="settings" options={{ animation: 'slide_from_right', animationDuration: 380 }} />
              <Stack.Screen name="peptide/[id]" options={{ animation: 'slide_from_right', animationDuration: 380 }} />
              <Stack.Screen name="stack/[id]" options={{ animation: 'slide_from_right', animationDuration: 380 }} />
              <Stack.Screen name="protocol/new" options={{ animation: 'slide_from_bottom', animationDuration: 380 }} />
              <Stack.Screen name="protocol/track" options={{ animation: 'slide_from_right', animationDuration: 380 }} />
              <Stack.Screen name="protocol/schedule" options={{ animation: 'slide_from_right', animationDuration: 380 }} />
              <Stack.Screen name="protocol/compound/[id]" options={{ animation: 'slide_from_right', animationDuration: 380 }} />
              <Stack.Screen name="log/index" options={{ animation: 'slide_from_bottom', animationDuration: 380 }} />
              <Stack.Screen name="log/[id]" options={{ animation: 'slide_from_bottom', animationDuration: 380 }} />
              <Stack.Screen name="calculator" options={{ animation: 'slide_from_bottom', animationDuration: 380 }} />
              <Stack.Screen name="history" options={{ animation: 'slide_from_right', animationDuration: 380 }} />
              <Stack.Screen name="metric/[id]" options={{ animation: 'slide_from_right', animationDuration: 380 }} />
              <Stack.Screen name="food/search" options={{ animation: 'slide_from_bottom', animationDuration: 380 }} />
              <Stack.Screen name="food/scan" options={{ animation: 'slide_from_bottom', animationDuration: 380 }} />
              <Stack.Screen name="photos/[category]" options={{ animation: 'slide_from_right', animationDuration: 380 }} />
              <Stack.Screen name="protocol/[id]" options={{ animation: 'slide_from_right', animationDuration: 380 }} />
              <Stack.Screen name="health/[metric]" options={{ animation: 'slide_from_bottom', animationDuration: 380 }} />
            </Stack>
          )}
          <SplashController ready={ready} />
        </SplashPhaseProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function SplashController({ ready }: { ready: boolean }) {
  const setPhase = useSetSplashPhase();
  return (
    <AnimatedSplash
      ready={ready}
      onExitStart={() => setPhase('exiting')}
      onFinish={() => {
        setPhase('done');
        requestTrackingPermission();
      }}
    />
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: Brand.black } });
