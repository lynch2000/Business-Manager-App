import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

mkdirSync('public/icons', { recursive: true });

// Simple flame/snowflake-inspired mark on a brand-blue rounded square, for a heating & air business.
const svg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f4c81"/>
      <stop offset="100%" stop-color="#1b6ca8"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <g transform="translate(256,256)" fill="none" stroke="#ffffff" stroke-width="22" stroke-linecap="round">
    <line x1="0" y1="-150" x2="0" y2="150"/>
    <line x1="-130" y1="-75" x2="130" y2="75"/>
    <line x1="-130" y1="75" x2="130" y2="-75"/>
    <g stroke-width="16">
      <path d="M0,-150 l-28,28 M0,-150 l28,28"/>
      <path d="M0,150 l-28,-28 M0,150 l28,-28"/>
      <path d="M-130,-75 l38,-4 M-130,-75 l14,36"/>
      <path d="M130,75 l-38,4 M130,75 l-14,-36"/>
      <path d="M-130,75 l14,-36 M-130,75 l38,4"/>
      <path d="M130,-75 l-14,36 M130,-75 l-38,-4"/>
    </g>
    <circle r="34" fill="#ffffff" stroke="none"/>
  </g>
</svg>
`;

const sizes = [
  { file: 'public/icons/icon-192.png', size: 192 },
  { file: 'public/icons/icon-512.png', size: 512 },
  { file: 'public/icons/icon-maskable-512.png', size: 512 },
  { file: 'public/apple-touch-icon.png', size: 180 },
];

for (const { file, size } of sizes) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(file);
  console.log('wrote', file);
}
