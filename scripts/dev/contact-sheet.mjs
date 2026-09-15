// usage: node /tmp/sheet.mjs <dir> <out.jpg> [cols]
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const [dir, out, colsArg] = process.argv.slice(2);
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
const cols = Number(colsArg ?? 4);
const W = 270;
const meta = await sharp(path.join(dir, files[0])).metadata();
const H = Math.round((W * meta.height) / meta.width);
const rows = Math.ceil(files.length / cols);
const tiles = [];
for (let i = 0; i < files.length; i++) {
  const img = await sharp(path.join(dir, files[i])).resize(W, H).toBuffer();
  const label = Buffer.from(
    `<svg width="${W}" height="24"><rect width="100%" height="100%" fill="#000" opacity="0.55"/><text x="8" y="17" font-size="13" fill="#fff" font-family="Helvetica">${files[i].replace(/^f_\d+_/, '').replace('.png', '')}</text></svg>`,
  );
  tiles.push({ input: await sharp(img).composite([{ input: label, top: 0, left: 0 }]).toBuffer(), left: (i % cols) * (W + 8), top: Math.floor(i / cols) * (H + 8) });
}
await sharp({ create: { width: cols * (W + 8), height: rows * (H + 8), channels: 3, background: '#222' } })
  .composite(tiles)
  .jpeg({ quality: 86 })
  .toFile(out);
console.log(out, files.length, 'frames');
