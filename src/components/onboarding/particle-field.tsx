import { Canvas, Points, useClock, vec, type SkPoint } from '@shopify/react-native-skia';
import { StyleSheet } from 'react-native';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { Accent } from '@/constants/theme';

const TEAL = Accent.primary;
const CYAN = Accent.liquid;
const WHITE = '#FFFFFF';
const AMBER = '#FBBF24';

type Particle = { theta: number; omega: number; r: number; phase: number; group: 0 | 1 | 2 };
type Spark = { angle: number; speed: number; group: 0 | 1 | 2 };

/** Deterministic so the field looks the same on every launch. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const rand = rng(20260917);
const PARTICLES: Particle[] = Array.from({ length: 44 }, (_, i) => ({
  theta: rand() * Math.PI * 2,
  omega: 0.22 + rand() * 0.3,
  // Mostly a ring with some inner scatter, like the reference's loose cloud.
  r: i % 4 === 0 ? 0.45 + rand() * 0.35 : 0.8 + rand() * 0.25,
  phase: rand() * Math.PI * 2,
  group: i % 9 < 4 ? 0 : i % 9 < 7 ? 1 : 2,
}));
const SPARKS: Spark[] = Array.from({ length: 30 }, (_, i) => ({
  angle: (i / 30) * Math.PI * 2 + (rand() - 0.5) * 0.4,
  speed: 0.55 + rand() * 0.45,
  group: (i % 3) as 0 | 1 | 2,
}));

type Props = {
  width: number;
  height: number;
  /** 1 = full spread, 0 = collapsed to the centre. */
  spread: SharedValue<number>;
  /** 0 = no burst yet, 1 = confetti fully dispersed. */
  burst: SharedValue<number>;
};

/**
 * The "matching" visual: dots orbit in a loose ring that tightens and spins faster as `spread`
 * falls, then a confetti burst radiates from the centre as `burst` rises. All on the UI thread.
 */
export function ParticleField({ width, height, spread, burst }: Props) {
  const clock = useClock();
  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = Math.min(width * 0.36, 150);

  const useGroupPoints = (group: number) =>
    useDerivedValue(() => {
      const t = clock.get() / 1000;
      const s = spread.get();
      const radius = maxRadius * s;
      const spin = 1 + (1 - s) * 2.6;
      const out: SkPoint[] = [];
      for (const p of PARTICLES) {
        if (p.group !== group) continue;
        const angle = p.theta + p.omega * spin * t;
        const wobble = 1 + 0.06 * Math.sin(t * 1.7 + p.phase);
        out.push(vec(cx + Math.cos(angle) * radius * p.r * wobble, cy + Math.sin(angle) * radius * p.r * wobble));
      }
      return out;
    });
  const teal = useGroupPoints(0);
  const cyan = useGroupPoints(1);
  const white = useGroupPoints(2);

  const useTwinkle = (offset: number) =>
    useDerivedValue(() => {
      const t = clock.get() / 1000;
      const visible = spread.get() > 0.001 ? 1 : 0;
      return visible * (0.82 + 0.18 * Math.sin(t * 2.6 + offset));
    });
  const tealOpacity = useTwinkle(0);
  const cyanOpacity = useTwinkle(2.1);
  const whiteOpacity = useTwinkle(4.2);
  // Soft halo under the coloured dots: the same points drawn wider and faint.
  const tealGlow = useDerivedValue(() => tealOpacity.get() * 0.28);
  const cyanGlow = useDerivedValue(() => cyanOpacity.get() * 0.24);

  const useSparkPoints = (group: number) =>
    useDerivedValue(() => {
      const b = burst.get();
      const out: SkPoint[] = [];
      for (const s of SPARKS) {
        if (s.group !== group) continue;
        const distance = 18 + s.speed * b * 120;
        const sag = b * b * 26 * s.speed;
        out.push(vec(cx + Math.cos(s.angle) * distance, cy + Math.sin(s.angle) * distance + sag));
      }
      return out;
    });
  const sparkTeal = useSparkPoints(0);
  const sparkWhite = useSparkPoints(1);
  const sparkAmber = useSparkPoints(2);
  const sparkOpacity = useDerivedValue(() => {
    const b = burst.get();
    return b <= 0 || b >= 1 ? 0 : 1 - b * b;
  });

  return (
    <Canvas style={[styles.canvas, { width, height }]}>
      <Points points={teal} mode="points" color={TEAL} style="stroke" strokeWidth={13} strokeCap="round" opacity={tealGlow} />
      <Points points={cyan} mode="points" color={CYAN} style="stroke" strokeWidth={11} strokeCap="round" opacity={cyanGlow} />
      <Points points={teal} mode="points" color={TEAL} style="stroke" strokeWidth={5.5} strokeCap="round" opacity={tealOpacity} />
      <Points points={cyan} mode="points" color={CYAN} style="stroke" strokeWidth={4.5} strokeCap="round" opacity={cyanOpacity} />
      <Points points={white} mode="points" color={WHITE} style="stroke" strokeWidth={4} strokeCap="round" opacity={whiteOpacity} />
      <Points points={sparkTeal} mode="points" color={TEAL} style="stroke" strokeWidth={4} strokeCap="round" opacity={sparkOpacity} />
      <Points points={sparkWhite} mode="points" color={WHITE} style="stroke" strokeWidth={3} strokeCap="round" opacity={sparkOpacity} />
      <Points points={sparkAmber} mode="points" color={AMBER} style="stroke" strokeWidth={3.5} strokeCap="round" opacity={sparkOpacity} />
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: { pointerEvents: 'none' },
});
