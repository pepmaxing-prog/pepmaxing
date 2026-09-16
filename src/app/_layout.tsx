import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { AnimatedSplash } from '@/components/splash/animated-splash';
import { Brand } from '@/constants/brand';
import { BrandFonts, Colors } from '@/constants/theme';
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
  // Mount the app only once fonts are ready: text laid out with a fallback font and then
  // re-rendered in Inter keeps its old measurements and clips. The splash covers the wait.
  const ready = fontsLoaded || fontError != null;

  return (
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
            }}
          />
        )}
        <SplashController ready={ready} />
      </SplashPhaseProvider>
    </ThemeProvider>
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
