/**
 * The shared "stage" every brand-forward screen sits on: a barely-there vignette
 * lifting the centre out of pure black, and slow-drifting motes for depth.
 * Splash and welcome use the exact same values so the hand-off is seamless.
 */
export const StageVignette = {
  colors: ['#111216', '#050506', '#000000'],
  /** Deep shades of the emerald accent, blended over the stage for the research chapter. */
  tinted: ['#0E3B2C', '#071C15', '#030A07'],
  positions: [0, 0.55, 1],
  /** Radius as a fraction of screen height. */
  radiusRatio: 0.62,
} as const;

export type Mote = { x: number; y: number; speed: number; radius: number; wobble: number; phase: number };

export const MOTE_OPACITY = 0.45;

/**
 * All stages share one clock so motes are in identical positions on every screen
 * and cross-fades between screens never make them jump.
 */
export const STAGE_EPOCH = Date.now();

export function stageTime(nowMs: number) {
  'worklet';
  return (nowMs - STAGE_EPOCH) / 1000;
}

export const MOTES: Mote[] = Array.from({ length: 18 }, (_, i) => {
  const seed = (i * 9301 + 49297) % 233280;
  const rnd = (n: number) => ((seed * (n + 1) * 7919) % 1000) / 1000;
  return {
    x: rnd(1),
    y: rnd(2),
    speed: 8 + rnd(3) * 14,
    radius: 0.6 + rnd(4) * 1.1,
    wobble: 4 + rnd(5) * 8,
    phase: rnd(6) * Math.PI * 2,
  };
});

/** Position of a mote at time `t` seconds, wrapping vertically. */
export function motePosition(m: Mote, t: number, width: number, height: number) {
  'worklet';
  const travel = (m.y * height - m.speed * t) % (height + 40);
  const y = travel < -20 ? travel + height + 40 : travel;
  const x = m.x * width + Math.sin(t * 0.35 + m.phase) * m.wobble;
  return { x, y };
}
