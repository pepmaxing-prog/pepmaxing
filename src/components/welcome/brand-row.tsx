import { Canvas, Group, Path } from '@shopify/react-native-skia';
import { StyleSheet, Text, View } from 'react-native';

import { markPath } from '@/components/splash/helix-paths';
import { Brand } from '@/constants/brand';
import { HELIX_GLYPH } from '@/constants/helix-geometry';
import { Typeface } from '@/constants/theme';

const MARK_HEIGHT = 20;
const GLYPH_HEIGHT = HELIX_GLYPH.bottom - HELIX_GLYPH.top;
const SCALE = MARK_HEIGHT / GLYPH_HEIGHT;
const MARK_WIDTH = 1000 * SCALE * 0.6;

/** Small lockup: helix mark + wordmark. */
export function BrandRow() {
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel={Brand.name}>
      <Canvas style={{ width: MARK_WIDTH, height: MARK_HEIGHT }}>
        <Group transform={[{ translateX: MARK_WIDTH / 2 - 500 * SCALE }, { translateY: -HELIX_GLYPH.top * SCALE }, { scale: SCALE }]}>
          <Path path={markPath} color="#F5F5F7" />
        </Group>
      </Canvas>
      <Text style={styles.wordmark}>{Brand.name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: 0.9 },
  wordmark: {
    color: '#F5F5F7',
    fontFamily: Typeface.display,
    fontSize: 16,
    letterSpacing: -0.4,
  },
});
