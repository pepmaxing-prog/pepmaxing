/**
 * Brand primitives shared by the splash screen, app icon pipeline and marketing surfaces.
 * Raster assets are generated from assets/brand/helix-mark.svg via `npm run brand:assets`.
 */
export const Brand = {
  name: 'Pepmaxing',
  tagline: 'Precision peptide tracking',
  black: '#000000',
  white: '#FFFFFF',
} as const;

/**
 * Geometry of assets/images/splash-icon.png. The glyph is drawn inside a square
 * canvas at 62% height so Android 12+'s circular splash mask never clips it.
 * Keep in sync with scripts/generate-brand-assets.mjs.
 */
export const SplashMark = {
  /** Must match `imageWidth` for expo-splash-screen in app.json. */
  imageWidth: 240,
  glyphHeightRatio: 0.62,
  glyphWidthRatio: 0.47,
} as const;
