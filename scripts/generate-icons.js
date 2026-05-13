/**
 * Generates PWA icons (192x192 and 512x512) using Sharp.
 * Creates a rounded square with "DS" text and indigo gradient background.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');

const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');

async function generateIcon(size) {
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#4f46e5;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" ry="${Math.round(size * 0.2)}" fill="url(#bg)" />
      <text
        x="50%"
        y="54%"
        text-anchor="middle"
        dominant-baseline="central"
        font-family="system-ui, -apple-system, sans-serif"
        font-weight="700"
        font-size="${Math.round(size * 0.38)}"
        fill="white"
      >DS</text>
    </svg>
  `;

  const outputPath = path.join(ICONS_DIR, `icon-${size}.png`);

  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(outputPath);

  console.log(`✅ Generated ${outputPath} (${size}x${size})`);
}

async function main() {
  console.log('🎨 Generating PWA icons...\n');
  await generateIcon(192);
  await generateIcon(512);
  console.log('\n✨ Done!');
}

main().catch(console.error);
