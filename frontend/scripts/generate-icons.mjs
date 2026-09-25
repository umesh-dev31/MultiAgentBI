// Generates the AgentInsight AI favicon/app-icon set from the SVG sources.
// Run: node scripts/generate-icons.mjs  (from the frontend/ directory)
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
mkdirSync(pub, { recursive: true });

const logo = join(pub, 'logo.svg');
const maskable = join(pub, 'logo-maskable.svg');

async function render(src, size, dest) {
  await sharp(src, { density: 512 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(pub, dest));
  console.log(`wrote ${dest} (${size}x${size})`);
}

// Standard icons from logo.svg
await render(logo, 16, 'favicon-16x16.png');
await render(logo, 32, 'favicon-32x32.png');
await render(logo, 48, 'favicon-48x48.png');
await render(logo, 180, 'apple-touch-icon.png');
await render(logo, 192, 'android-chrome-192x192.png');
await render(logo, 512, 'android-chrome-512x512.png');

// Maskable icons from logo-maskable.svg
await render(maskable, 192, 'maskable-icon-192x192.png');
await render(maskable, 512, 'maskable-icon-512x512.png');

// Multi-size ICO (16, 32, 48)
const ico = await pngToIco([
  join(pub, 'favicon-16x16.png'),
  join(pub, 'favicon-32x32.png'),
  join(pub, 'favicon-48x48.png'),
]);
const { writeFileSync } = await import('node:fs');
writeFileSync(join(pub, 'favicon.ico'), ico);
console.log('wrote favicon.ico (16, 32, 48)');
