import { Canvas, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Accent, Colors, Typeface } from '@/constants/theme';
import type { LevelPoint } from '@/lib/levels';

const HEIGHT = 120;

/**
 * Estimated active level over the window, drawn as a filled curve. Purely indicative —
 * the y-axis is normalised to the window's own peak, so it reads as a trend, not a dose.
 */
export function LevelChart({ series, width }: { series: LevelPoint[]; width: number }) {
  const paths = useMemo(() => {
    if (series.length < 2 || width <= 0) return null;
    const peak = Math.max(...series.map((point) => point.mcg));
    if (peak <= 0) return null;

    const x = (i: number) => (i / (series.length - 1)) * width;
    const y = (mcg: number) => HEIGHT - (mcg / peak) * (HEIGHT - 12) - 6;

    const line = Skia.Path.Make();
    line.moveTo(x(0), y(series[0].mcg));
    for (let i = 1; i < series.length; i += 1) line.lineTo(x(i), y(series[i].mcg));

    const area = line.copy();
    area.lineTo(width, HEIGHT);
    area.lineTo(0, HEIGHT);
    area.close();

    return { line, area };
  }, [series, width]);

  if (!paths) {
    return (
      <View style={[styles.placeholder, { width }]}>
        <Text style={styles.placeholderText}>Log a shot to see your estimated level.</Text>
      </View>
    );
  }

  return (
    <Canvas style={{ width, height: HEIGHT }}>
      <Path path={paths.area}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, HEIGHT)}
          colors={[Accent.primarySoft, 'rgba(52,211,153,0)']}
        />
      </Path>
      <Path path={paths.line} style="stroke" strokeWidth={2} strokeCap="round" color={Accent.primary} />
    </Canvas>
  );
}

const styles = StyleSheet.create({
  placeholder: { height: HEIGHT, alignItems: 'center', justifyContent: 'center' },
  placeholderText: {
    color: Colors.dark.textTertiary,
    fontFamily: Typeface.body,
    fontSize: 13,
  },
});
