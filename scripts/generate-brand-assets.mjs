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
]);

await writeFile(
  path.join(root, 'assets/brand/helix-mark.generated.svg'),
  svg(glyph(WHITE, safeZoneScale)),
);
console.log('Done.');
