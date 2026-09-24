import { Canvas, Circle, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Easing, useDerivedValue, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

type Props = {
  size: number;
  /** 0–1. */
  progress: number;
  color: string;
  stroke?: number;
  children?: ReactNode;
};

/** The arc is open at the bottom, like a speedometer: 270° sweep starting bottom-left. */
const START = 135;
const SWEEP = 270;

/**
 * A rounded arc gauge with a knob at the head of the progress, drawn in Skia and animated on
 * the UI thread. Children render in the centre.
 */
export function RingGauge({ size, progress, color, stroke = 10, children }: Props) {
  const reducedMotion = useReducedMotion();
  const value = useSharedValue(reducedMotion ? progress : 0);
  useEffect(() => {
    value.set(reducedMotion ? progress : withTiming(progress, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [progress, reducedMotion, value]);

  const inset = stroke / 2 + 4;
  const box = { x: inset, y: inset, width: size - inset * 2, height: size - inset * 2 };
  const track = Skia.PathBuilder.Make().addArc(box, START, SWEEP).build();
  const head = useDerivedValue(() => Skia.PathBuilder.Make().addArc(box, START, Math.max(0.01, SWEEP * value.get())).build());
  const r = size / 2 - inset;
  const knobX = useDerivedValue(() => size / 2 + r * Math.cos(((START + SWEEP * value.get()) * Math.PI) / 180));
  const knobY = useDerivedValue(() => size / 2 + r * Math.sin(((START + SWEEP * value.get()) * Math.PI) / 180));

  return (
    <View style={{ width: size, height: size }} accessible={false}>
      <Canvas style={{ width: size, height: size }}>
        <Path path={track} color="rgba(255,255,255,0.1)" style="stroke" strokeWidth={stroke} strokeCap="round" />
        <Path path={head} color={color} style="stroke" strokeWidth={stroke} strokeCap="round" />
        <Circle cx={knobX} cy={knobY} r={stroke / 2 + 3} color="#0B0F0D" />
        <Circle cx={knobX} cy={knobY} r={stroke / 2 + 3} color={color} style="stroke" strokeWidth={2} />
      </Canvas>
      <View style={styles.centre} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
