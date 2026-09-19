import sharp from 'sharp';
const [out, ...ins] = process.argv.slice(2);
const W = 200;
const metas = await Promise.all(ins.map((f) => sharp(f).metadata()));
const H = Math.round((metas[0].height / metas[0].width) * W);
const tiles = await Promise.all(ins.map((f) => sharp(f).resize(W, H).toBuffer()));
await sharp({ create: { width: W * ins.length + 4 * (ins.length - 1), height: H, channels: 3, background: '#ff00ff' } })
  .composite(tiles.map((input, i) => ({ input, left: i * (W + 4), top: 0 }))).png().toFile(out);
