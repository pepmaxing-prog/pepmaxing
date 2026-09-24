import { Canvas, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';

/** A tiny trend line with a soft fill under it — no axes, just the shape of the last entries. */
export function Sparkline({ values, width, height, color }: { values: number[]; width: number; height: number; color: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 3;
  const x = (i: number) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / span) * (height - pad * 2);
  const line = Skia.PathBuilder.Make();
  const fill = Skia.PathBuilder.Make();
  values.forEach((v, i) => {
    if (i === 0) {
      line.moveTo(x(i), y(v));
      fill.moveTo(x(i), height).lineTo(x(i), y(v));
    } else {
      line.lineTo(x(i), y(v));
      fill.lineTo(x(i), y(v));
    }
  });
  fill.lineTo(x(values.length - 1), height).close();
  return (
    <Canvas style={{ width, height }}>
      <Path path={fill.build()} opacity={0.25}>
        <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={[color, 'rgba(0,0,0,0)']} />
      </Path>
      <Path path={line.build()} color={color} style="stroke" strokeWidth={1.8} strokeJoin="round" strokeCap="round" />
    </Canvas>
  );
}
