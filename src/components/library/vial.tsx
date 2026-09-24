import { Canvas, Circle, LinearGradient, Mask, RadialGradient, Rect, vec } from '@shopify/react-native-skia';
import { StyleSheet, View } from 'react-native';

type Props = {
  color: string;
  size?: number;
  /** Several colours draw a banded liquid — a blend of compounds. */
  colors?: string[];
  /** Fill level, 0–1. */
  level?: number;
};

/**
 * A little vial, coloured by category. Pure views so it scales crisply: cap, neck, glass body
 * with a liquid fill and a highlight.
 */
export function Vial({ color, size = 34, colors, level = 0.62 }: Props) {
  const w = size * 0.62;
  const capH = size * 0.16;
  const neckH = size * 0.08;
  const bodyH = size - capH - neckH;
  const radius = size * 0.14;
  const bands = colors && colors.length > 1 ? colors : [color];
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }} accessible={false}>
      <View style={{ width: w * 0.7, height: capH, borderRadius: size * 0.06, backgroundColor: 'rgba(242,242,244,0.85)' }} />
      <View style={{ width: w * 0.5, height: neckH, backgroundColor: 'rgba(242,242,244,0.55)' }} />
      <View style={[styles.body, { width: w, height: bodyH, borderRadius: radius }]}>
        <View style={[styles.fill, { height: `${Math.round(level * 100)}%`, borderBottomLeftRadius: radius - 1, borderBottomRightRadius: radius - 1 }]}>
          {bands.map((c, i) => (
            <View key={`${c}-${i}`} style={{ flex: 1, backgroundColor: c }} />
          ))}
        </View>
        <View style={[styles.highlight, { left: w * 0.16, top: bodyH * 0.14, height: bodyH * 0.5, width: Math.max(2, size * 0.05) }]} />
      </View>
    </View>
  );
}

/**
 * A feathered disc of colour to sit behind a vial on dark stages. For a blend the hue shifts
 * left → right through the compounds' colours under one radial falloff, so it stays a single
 * soft cloud with no seams.
 */
export function VialGlow({ color, size, colors }: { color: string; size: number; colors?: string[] }) {
  const stops = colors && colors.length > 1 ? colors : [color, color];
  const positions = stops.map((_, i) => 0.22 + (0.56 * i) / (stops.length - 1));
  const c = size / 2;
  return (
    <Canvas style={{ width: size, height: size, position: 'absolute' }}>
      <Mask
        mode="alpha"
        mask={
          <Circle cx={c} cy={c} r={c}>
            <RadialGradient c={vec(c, c)} r={c} colors={['rgba(255,255,255,0.42)', 'rgba(255,255,255,0.14)', 'rgba(255,255,255,0)']} positions={[0, 0.45, 1]} />
          </Circle>
        }>
        <Rect x={0} y={0} width={size} height={size}>
          <LinearGradient start={vec(0, c)} end={vec(size, c)} colors={stops} positions={positions} />
        </Rect>
      </Mask>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  body: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'flex-end',
  },
  fill: { width: '100%', opacity: 0.9, overflow: 'hidden' },
  highlight: { position: 'absolute', borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.45)' },
});
