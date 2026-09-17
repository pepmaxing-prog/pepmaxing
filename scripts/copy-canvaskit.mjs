// Skia on web runs on CanvasKit, which is a WASM binary fetched at runtime. Copy it out of
// node_modules into public/ so the dev server and web export both serve it from the origin
// instead of a CDN. Native builds ignore this.
import { copyFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

const source = path.join(path.dirname(require.resolve('canvaskit-wasm/package.json')), 'bin/full/canvaskit.wasm');
const target = path.join(process.cwd(), 'public', 'canvaskit.wasm');

await mkdir(path.dirname(target), { recursive: true });
await copyFile(source, target);
