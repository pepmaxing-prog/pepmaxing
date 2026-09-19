import { Canvas, Path, RadialGradient, Rect, usePathValue, vec } from '@shopify/react-native-skia';
import { StyleSheet } from 'react-native';
import { useDerivedValue, useFrameCallback, useReducedMotion, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { MOTE_OPACITY, MOTES, motePosition, STAGE_EPOCH, stageTime, StageVignette } from './stage';

type Props = {
  width: number;
  height: number;
  /** Where the vignette is brightest — usually the hero element's centre. */
  center: { x: number; y: number };
  /** 0→1 fade for the whole stage (shared value or constant). */
  opacity?: SharedValue<number> | number;
  /** 0→1 blend from the neutral vignette to the emerald one (shared value or constant). */
  tint?: SharedValue<number> | number;
};

/** Full-screen Skia stage: the vignette and drifting motes shared with the splash. */
export function StageBackground({ width, height, center, opacity = 1, tint = 0 }: Props) {
  const reducedMotion = useReducedMotion();
  const now = useSharedValue(STAGE_EPOCH);
  useFrameCallback(() => {
    now.value = Date.now();
  }, !reducedMotion);

  const motes = usePathValue((builder) => {
    'worklet';
    const t = reducedMotion ? 0 : stageTime(now.value);
    for (let i = 0; i < MOTES.length; i++) {
      const { x, y } = motePosition(MOTES[i], t, width, height);
      builder.addCircle(x, y, MOTES[i].radius);
    }
  });
  const moteOpacity = useDerivedValue(
    () => (typeof opacity === 'number' ? opacity : opacity.value) * MOTE_OPACITY,
  );
  const tintOpacity = useDerivedValue(
    () => (typeof opacity === 'number' ? opacity : opacity.value) * (typeof tint === 'number' ? tint : tint.value),
  );

  const c = vec(center.x, center.y);
  const r = height * StageVignette.radiusRatio;

  return (
    <Canvas style={styles.canvas} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height} opacity={opacity}>
        <RadialGradient c={c} r={r} colors={[...StageVignette.colors]} positions={[...StageVignette.positions]} />
      </Rect>
      <Rect x={0} y={0} width={width} height={height} opacity={tintOpacity}>
        <RadialGradient c={c} r={r} colors={[...StageVignette.tinted]} positions={[...StageVignette.positions]} />
      </Rect>
      <Path path={motes} color="#F5F5F7" opacity={moteOpacity} />
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: { ...StyleSheet.absoluteFill },
});
