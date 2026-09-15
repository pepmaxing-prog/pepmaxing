import { PathOp, Skia, StrokeJoin, type SkPath } from '@shopify/react-native-skia';

import {
  GAP_STROKE,
  HEAD,
  RIBBON_BACK_D,
  RIBBON_FRONT_D,
  SPINE_BACK_D,
  SPINE_FRONT_D,
} from '@/constants/helix-geometry';

function pathFromSvg(d: string, name: string): SkPath {
  const path = Skia.Path.MakeFromSVGString(d);
  if (!path) throw new Error(`Invalid SVG path for ${name}`);
  return path;
}

export const ribbonFront = pathFromSvg(RIBBON_FRONT_D, 'front ribbon');
export const spineBack = pathFromSvg(SPINE_BACK_D, 'back spine');
export const spineFront = pathFromSvg(SPINE_FRONT_D, 'front spine');

/** The back ribbon with the front ribbon's halo cut out, so the front reads as passing over it. */
export const ribbonBack = (() => {
  const back = pathFromSvg(RIBBON_BACK_D, 'back ribbon');
  const halo = ribbonFront.copy().stroke({ width: GAP_STROKE, join: StrokeJoin.Round });
  return (halo && Skia.Path.MakeFromOp(back, halo, PathOp.Difference)) ?? back;
})();

/** Whole mark as one path — used to clip the specular sweep. */
export const markPath = (() => {
  const path = ribbonBack.copy();
  path.addPath(ribbonFront);
  path.addCircle(HEAD.cx, HEAD.cy, HEAD.r);
  return path;
})();

export type SpineLut = { xs: number[]; ys: number[] };

/**
 * Samples a spine at uniform arc-length fractions so the UI thread can find the
 * ribbon's growing tip with a cheap table lookup instead of Skia calls per frame.
 */
export function sampleSpine(spine: SkPath, samples = 96): SpineLut {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    if (t === 0) {
      const p = spine.getPoint(0);
      xs.push(p.x);
      ys.push(p.y);
      continue;
    }
    const segment = spine.copy();
    segment.trim(0, t, false);
    const p = segment.getLastPt();
    xs.push(p.x);
    ys.push(p.y);
  }
  return { xs, ys };
}

export function lookupSpine(lut: SpineLut, t: number): { x: number; y: number } {
  'worklet';
  const last = lut.xs.length - 1;
  const clamped = Math.min(Math.max(t, 0), 1) * last;
  const i = Math.floor(clamped);
  const f = clamped - i;
  const j = Math.min(i + 1, last);
  return {
    x: lut.xs[i] + (lut.xs[j] - lut.xs[i]) * f,
    y: lut.ys[i] + (lut.ys[j] - lut.ys[i]) * f,
  };
}
