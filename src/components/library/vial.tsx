import { StyleSheet, View } from 'react-native';

/**
 * A little vial, coloured by category. Pure views so it scales crisply: cap, neck, glass body
 * with a liquid fill and a highlight.
 */
export function Vial({ color, size = 34 }: { color: string; size?: number }) {
  const w = size * 0.62;
  const capH = size * 0.16;
  const neckH = size * 0.08;
  const bodyH = size - capH - neckH;
  const radius = size * 0.14;
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }} accessible={false}>
      <View style={{ width: w * 0.7, height: capH, borderRadius: size * 0.06, backgroundColor: 'rgba(242,242,244,0.85)' }} />
      <View style={{ width: w * 0.5, height: neckH, backgroundColor: 'rgba(242,242,244,0.55)' }} />
      <View style={[styles.body, { width: w, height: bodyH, borderRadius: radius }]}>
        <View style={[styles.fill, { height: '62%', backgroundColor: color, borderBottomLeftRadius: radius - 1, borderBottomRightRadius: radius - 1 }]} />
        <View style={[styles.highlight, { left: w * 0.16, top: bodyH * 0.14, height: bodyH * 0.5 }]} />
      </View>
    </View>
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
  fill: { width: '100%', opacity: 0.9 },
  highlight: { position: 'absolute', width: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.45)' },
});
