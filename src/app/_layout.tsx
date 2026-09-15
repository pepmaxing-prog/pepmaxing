import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { AnimatedSplash } from '@/components/splash/animated-splash';
import { Brand } from '@/constants/brand';
import { Colors } from '@/constants/theme';

// Keep the native splash up until AnimatedSplash has painted its identical first frame.
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
  return (
    <ThemeProvider value={theme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Brand.black },
        }}
      />
      <AnimatedSplash />
    </ThemeProvider>
  );
}
