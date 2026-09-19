import { Canvas, DashPathEffect, Group, Line, Path, RoundedRect, Skia, Text as SkiaText, useFont, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { Easing, useDerivedValue, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { Accent } from '@/constants/theme';

const RED = '#F87171';
const MAX_UNITS = 30;
export const SYRINGE_HEIGHT = 64;

/** Horizontal anatomy, left to right. */
const NEEDLE = 46;
const HUB = 12;
const FLANGE_W = 5;
const THUMB_W = 5;
const ROD_H = 6;
const BARREL_H = 26;
const STOPPER_W = 7;

type Props = {
  width: number;
  /** Units drawn back (0–30 on the barrel). */
  units: number;
  tone: 'good' | 'bad';
  /** Delay before the plunger draws back. */
  delay?: number;
  /** Dashed guide at this many units, to show an overshoot against the correct line. */
  guideUnits?: number;
};

/**
 * A 30-unit insulin syringe drawn in Skia. Fluid sits against the needle, so the fill grows from
 * the hub end as the stopper is pulled back; the rod and thumb rest follow it out the back.
 */
export function Syringe({ width, units, tone, delay = 0, guideUnits }: Props) {
  const reducedMotion = useReducedMotion();
  const font = useFont(require('@/assets/fonts/Inter-Medium.ttf'), 9);
  const progress = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) return;
    progress.set(withDelay(delay, withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) })));
  }, [reducedMotion, delay, progress]);

  const color = tone === 'good' ? Accent.primary : RED;
  const midY = SYRINGE_HEIGHT / 2 + 4;
  const barrelX = NEEDLE + HUB;
  const barrelW = width * 0.62;
  const barrelY = midY - BARREL_H / 2;
  const unitW = barrelW / (MAX_UNITS + 2);
  const thumbX = width - THUMB_W;

  const stopperX = useDerivedValue(() => barrelX + unitW * units * progress.get());
  const fillW = useDerivedValue(() => stopperX.get() - barrelX);
  const rodX = useDerivedValue(() => stopperX.get() + STOPPER_W);
  const rodW = useDerivedValue(() => Math.max(0, thumbX - rodX.get()));
  const ribX = useDerivedValue(() => stopperX.get() + STOPPER_W / 2 - 0.75);

  const ticks = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    for (let u = 0; u <= MAX_UNITS; u++) {
      const x = barrelX + unitW * u;
      const h = u % 10 === 0 ? 9 : u % 5 === 0 ? 7 : 4;
      b.moveTo(x, barrelY + 1).lineTo(x, barrelY + 1 + h);
    }
    return b.build();
  }, [barrelX, unitW, barrelY]);

  return (
    <Canvas style={{ width, height: SYRINGE_HEIGHT }}>
      {/* Needle: bevelled tip on the far left, then the hub that joins the barrel. */}
      <Line p1={vec(2, midY)} p2={vec(NEEDLE, midY)} color="rgba(255,255,255,0.8)" strokeWidth={1.5} strokeCap="round" />
      <RoundedRect x={NEEDLE - 2} y={midY - 5} width={HUB + 2} height={10} r={2} color="rgba(255,255,255,0.4)" />

      {/* Barrel: glass body, highlight along the top, rubber stopper, fluid between hub and stopper. */}
      <RoundedRect x={barrelX} y={barrelY} width={barrelW} height={BARREL_H} r={4} color="rgba(255,255,255,0.06)" />
      <Group clip={{ x: barrelX, y: barrelY, width: barrelW, height: BARREL_H }}>
        <RoundedRect x={barrelX} y={barrelY} width={fillW} height={BARREL_H} r={0} color={color} opacity={0.62} />
        <RoundedRect x={stopperX} y={barrelY + 1} width={STOPPER_W} height={BARREL_H - 2} r={1.5} color="#D6D6DB" />
        <RoundedRect x={ribX} y={barrelY + 3} width={1.5} height={BARREL_H - 6} r={0.75} color="rgba(0,0,0,0.28)" />
        <Path path={ticks} color="rgba(255,255,255,0.7)" style="stroke" strokeWidth={1} />
      </Group>
      <RoundedRect x={barrelX} y={barrelY} width={barrelW} height={BARREL_H} r={4} color="rgba(255,255,255,0.38)" style="stroke" strokeWidth={1} />
      <Line p1={vec(barrelX + 6, barrelY + BARREL_H - 4)} p2={vec(barrelX + barrelW - 6, barrelY + BARREL_H - 4)} color="rgba(255,255,255,0.14)" strokeWidth={1.5} strokeCap="round" />
      {font
        ? [5, 10, 15, 20, 25, 30].map((u) => (
            <SkiaText key={u} x={barrelX + unitW * u - (u >= 10 ? 5 : 2.5)} y={barrelY - 5} text={String(u)} font={font} color="rgba(242,242,244,0.62)" />
          ))
        : null}

      {/* Finger flange at the back of the barrel, then the rod and thumb rest. */}
      <RoundedRect x={barrelX + barrelW - 1} y={midY - BARREL_H / 2 - 7} width={FLANGE_W} height={BARREL_H + 14} r={2} color="rgba(255,255,255,0.55)" />
      <RoundedRect x={rodX} y={midY - ROD_H / 2} width={rodW} height={ROD_H} r={2} color="rgba(255,255,255,0.5)" />
      <RoundedRect x={thumbX - 1} y={midY - BARREL_H / 2 - 2} width={THUMB_W} height={BARREL_H + 4} r={2} color="rgba(255,255,255,0.6)" />

      {guideUnits !== undefined ? (
        <Line p1={vec(barrelX + unitW * guideUnits, barrelY - 3)} p2={vec(barrelX + unitW * guideUnits, barrelY + BARREL_H + 10)} color={Accent.primary} strokeWidth={1.5} opacity={0.75}>
          <DashPathEffect intervals={[3, 3]} />
        </Line>
      ) : null}
    </Canvas>
  );
}
