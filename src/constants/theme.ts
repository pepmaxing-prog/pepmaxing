/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    textTertiary: '#8B8F98',
    border: '#E0E1E6',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#141416',
    backgroundSelected: '#1F1F23',
    textSecondary: '#A1A4AB',
    textTertiary: '#6B6E76',
    border: '#26262B',
  },
} as const;

/** Single accent used sparingly for "done / on track" states. */
export const Accent = {
  primary: '#34D399',
  primarySoft: 'rgba(52, 211, 153, 0.18)',
  liquid: '#7DD3FC',
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/**
 * Brand typefaces (Inter / Inter Display, loaded in the root layout via expo-font).
 * Inter Display is tuned for large sizes — headlines and the wordmark; Inter for body copy.
 */
export const Typeface = {
  display: 'InterDisplay-SemiBold',
  displayMedium: 'InterDisplay-Medium',
  body: 'Inter-Regular',
  bodyMedium: 'Inter-Medium',
  bodySemiBold: 'Inter-SemiBold',
  bodyBold: 'Inter-Bold',
} as const;

export const BrandFonts = {
  [Typeface.display]: require('@/assets/fonts/InterDisplay-SemiBold.ttf'),
  [Typeface.displayMedium]: require('@/assets/fonts/InterDisplay-Medium.ttf'),
  [Typeface.body]: require('@/assets/fonts/Inter-Regular.ttf'),
  [Typeface.bodyMedium]: require('@/assets/fonts/Inter-Medium.ttf'),
  [Typeface.bodySemiBold]: require('@/assets/fonts/Inter-SemiBold.ttf'),
  [Typeface.bodyBold]: require('@/assets/fonts/Inter-Bold.ttf'),
};

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
