import { Canvas, Group, Path } from '@shopify/react-native-skia';
import { StyleSheet, Text, View } from 'react-native';

import { markPath } from '@/components/splash/helix-paths';
import { Brand } from '@/constants/brand';
import { HELIX_GLYPH } from '@/constants/helix-geometry';
import { Typeface } from '@/constants/theme';

const GLYPH_HEIGHT = HELIX_GLYPH.bottom - HELIX_GLYPH.top;
const SIZES = { regular: { mark: 20, word: 16 }, large: { mark: 27, word: 21 } };

/** Lockup: helix mark + wordmark. `large` is the app header size. */
export function BrandRow({ size = 'regular' }: { size?: keyof typeof SIZES }) {
  const { mark, word } = SIZES[size];
  const scale = mark / GLYPH_HEIGHT;
  const markWidth = 1000 * scale * 0.6;
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel={Brand.name}>
      <Canvas style={{ width: markWidth, height: mark }}>
        <Group transform={[{ translateX: markWidth / 2 - 500 * scale }, { translateY: -HELIX_GLYPH.top * scale }, { scale }]}>
          <Path path={markPath} color="#F5F5F7" />
        </Group>
      </Canvas>
      <Text style={[styles.wordmark, { fontSize: word, letterSpacing: -word * 0.025 }]}>{Brand.name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: 0.9 },
  wordmark: {
    color: '#F5F5F7',
    fontFamily: Typeface.display,
  },
});
