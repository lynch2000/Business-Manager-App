import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

mkdirSync('public/icons', { recursive: true });

const markPath = 'src/assets/logo-mark.png';
const bg = { r: 0xff, g: 0xff, b: 0xff }; // matches the logo's own white backing, avoids a visible seam

async function makeIcon(size, markScale, outPath) {
  const markSize = Math.round(size * markScale);
  const mark = await sharp(markPath).resize(markSize, markSize, { fit: 'contain', background: bg }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 3, background: bg } })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toFile(outPath);
  console.log('wrote', outPath);
}

await makeIcon(192, 0.72, 'public/icons/icon-192.png');
await makeIcon(512, 0.72, 'public/icons/icon-512.png');
await makeIcon(512, 0.55, 'public/icons/icon-maskable-512.png'); // more padding for the OS mask safe-zone
await makeIcon(180, 0.72, 'public/apple-touch-icon.png');
