import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

// Skia modules build paths at import time, so CanvasKit has to be on the global object before
// the router entry (and the component graph under it) is evaluated.
LoadSkiaWeb({ locateFile: (file) => `/${file}` }).then(() => require('expo-router/entry'));
