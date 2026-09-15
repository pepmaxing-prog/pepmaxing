#!/usr/bin/env node
/**
 * Renders every brand raster asset (app icons, splash mark) from the single
 * vector source of truth at assets/brand/helix-mark.svg.
 *
 *   npm run brand:assets
 *
 * Re-run whenever the mark changes. Output goes to assets/images/.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(root, 'assets/brand/helix-mark.svg');
const OUT = path.join(root, 'assets/images');

const BLACK = '#000000';
const WHITE = '#FFFFFF';
const CANVAS = 1000; // viewBox of the source mark

/** The mark is drawn on a 1000x1000 canvas; the visible glyph spans roughly y 150 -> 910. */
const GLYPH_HEIGHT_RATIO = 0.76;
/** Android adaptive/splash icons must fit inside the central 66% safe-zone circle. */
const SAFE_ZONE_RATIO = 0.62;

const svgSource = await readFile(SOURCE, 'utf8');
const paths = [...svgSource.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]);
const circle = svgSource.match(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/);
if (paths.length < 2 || !circle) throw new Error(`Could not parse mark geometry from ${SOURCE}`);

const [ribbonBack, ribbonFront] = paths;
const [, cx, cy, r] = circle;
const GAP_STROKE = 22;

/**
 * Centerlines ("spines") of the two ribbons, from the original mark construction.
 * Both rise from the same base point, cross at the waist and open into raised arms.
 * The splash animation draws the ribbons along these curves.
 */
const SPINE_BACK = [[500, 910], [460, 805], [445, 695], [480, 585], [560, 500], [640, 420], [695, 340], [725, 255], [740, 150]];
const SPINE_FRONT = [[500, 910], [540, 805], [555, 695], [520, 585], [440, 500], [360, 420], [305, 340], [275, 255], [260, 150]];
const RIBBON_WIDTHS = [6, 46, 70, 84, 88, 82, 68, 46, 8];

/** Catmull-Rom spline through `pts` as an SVG path of cubic Béziers. */
function catmull(pts) {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

/**
 * The helix glyph. The front ribbon is drawn with a masked-out halo so it reads
 * as passing over the back ribbon — the gap is transparent, not painted, so the
 * mark works on any background and as a tinted monochrome icon.
 */
function glyph(fill, scale = 1) {
  const c = CANVAS / 2;
  return `
    <defs>
      <mask id="gap" maskUnits="userSpaceOnUse" x="0" y="0" width="${CANVAS}" height="${CANVAS}">
        <rect width="${CANVAS}" height="${CANVAS}" fill="white"/>
        <path d="${ribbonFront}" fill="none" stroke="black" stroke-width="${GAP_STROKE}" stroke-linejoin="round"/>
      </mask>
    </defs>
    <g transform="translate(${c} ${c}) scale(${scale}) translate(${-c} ${-c})">
      <path d="${ribbonBack}" fill="${fill}" mask="url(#gap)"/>
      <path d="${ribbonFront}" fill="${fill}"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>
    </g>`;
}

function svg(body, { background } = {}) {
  const bg = background ? `<rect width="${CANVAS}" height="${CANVAS}" fill="${background}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}">${bg}${body}</svg>`;
}

async function render(name, markup, size) {
  const file = path.join(OUT, name);
  await sharp(Buffer.from(markup), { density: 300 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(file);
  console.log(`  ${path.relative(root, file)}  ${size}x${size}`);
}

await mkdir(OUT, { recursive: true });
console.log('Generating brand assets from', path.relative(root, SOURCE));

const safeZoneScale = SAFE_ZONE_RATIO / GLYPH_HEIGHT_RATIO;

await Promise.all([
  // iOS / fallback app icon: full-bleed black, the OS applies its own corner mask.
  render('icon.png', svg(glyph(WHITE), { background: BLACK }), 1024),

  // Android adaptive icon layers (background colour is set in app.json).
  render('android-icon-foreground.png', svg(glyph(WHITE, safeZoneScale)), 1024),
  render('android-icon-monochrome.png', svg(glyph(WHITE, safeZoneScale)), 1024),

  // Native splash mark. Kept inside the safe zone so Android 12+'s circular
  // splash mask never clips it; iOS compensates with a larger imageWidth.
  render('splash-icon.png', svg(glyph(WHITE, safeZoneScale)), 1024),

  render('favicon.png', svg(glyph(WHITE), { background: BLACK }), 96),

  // iOS launch screen is intentionally empty: the in-app splash animation draws the mark
  // from black. The plugin needs *an* image to emit a black background, so give it a blank one.
  sharp({ create: { width: 16, height: 16, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .png()
    .toFile(path.join(OUT, 'splash-blank.png'))
    .then(() => console.log('  assets/images/splash-blank.png  16x16 (transparent)')),
]);

await writeFile(
  path.join(root, 'assets/brand/helix-mark.generated.svg'),
  svg(glyph(WHITE, safeZoneScale)),
);

const geometryFile = path.join(root, 'src/constants/helix-geometry.ts');
await writeFile(
  geometryFile,
  `// GENERATED by scripts/generate-brand-assets.mjs from assets/brand/helix-mark.svg — do not edit.

/** Coordinate space the mark is drawn in. */
export const HELIX_CANVAS = ${CANVAS};

/** Vertical extent of the visible glyph within the canvas. */
export const HELIX_GLYPH = { top: 150, bottom: 910, base: { x: 500, y: 910 } } as const;

/** Filled outline of the ribbon drawn behind the other one. */
export const RIBBON_BACK_D = '${ribbonBack}';

/** Filled outline of the ribbon drawn in front; it gets a ${GAP_STROKE}-unit gap cut around it. */
export const RIBBON_FRONT_D = '${ribbonFront}';

/** Centerlines the ribbons are drawn along, base first. */
export const SPINE_BACK_D = '${catmull(SPINE_BACK)}';
export const SPINE_FRONT_D = '${catmull(SPINE_FRONT)}';

export const RIBBON_MAX_WIDTH = ${Math.max(...RIBBON_WIDTHS)};
export const GAP_STROKE = ${GAP_STROKE};

export const HEAD = { cx: ${cx}, cy: ${cy}, r: ${r} } as const;
`,
);
console.log(`  ${path.relative(root, geometryFile)}`);
console.log('Done.');
