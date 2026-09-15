/**
 * Every beat of the splash sequence, in milliseconds from the moment the
 * overlay is ready (native splash hidden, fonts loaded). Tune here, not in the renderer.
 *
 *   0        ignite: a point of light gathers at the base of the mark
 *   240      rise: both ribbons draw upward along their spines, cross, and open
 *   1660     crown: the head lands with a spring and a soft bloom
 *   1900     wordmark letters arrive, staggered
 *   2100     a specular sweep travels up the finished mark
 *   3650     dissolve into the app (~4.3s total)
 */
export const Beat = {
  ignite: { at: 0, duration: 950 },
  stage: { at: 0, duration: 1400 },
  rise: { at: 240, duration: 1650 },
  crown: { at: 1660 },
  bloom: { at: 1680, duration: 820 },
  wordmark: { at: 1900, letterDuration: 740, stagger: 58 },
  sweep: { at: 2100, duration: 950 },
  exit: { at: 3650, duration: 700 },
  reducedMotion: { hold: 1200, exit: 360 },
} as const;

export const CrownSpring = { mass: 1, damping: 14, stiffness: 160 } as const;

/** Total time the overlay is on screen after `ready`, excluding the exit fade. */
export const SPLASH_HOLD = Beat.exit.at;
