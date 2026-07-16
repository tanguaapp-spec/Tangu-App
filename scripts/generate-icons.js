
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  // Define the sizes we need
  const sizes = [192, 512];
  const publicDir = path.join(__dirname, '..', 'public');

  // Create a simple SVG icon with an orange circle and white "T"
  const svgContent = `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <circle cx="256" cy="256" r="256" fill="#EF7A1A"/>
      <text x="50%" y="50%" font-family="sans-serif" font-size="280" fill="white" text-anchor="middle" dominant-baseline="central" font-weight="bold">T</text>
    </svg>
  `;

  // Generate standard icons
  for (const size of sizes) {
    await sharp(Buffer.from(svgContent))
      .resize(size, size)
      .png()
      .toFile(path.join(publicDir, `icon-${size}.png`));
    console.log(`Generated icon-${size}.png`);
  }

  // Generate maskable icon (add padding for maskable)
  const maskableSvg = `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <circle cx="256" cy="256" r="256" fill="#EF7A1A"/>
      <text x="50%" y="50%" font-family="sans-serif" font-size="220" fill="white" text-anchor="middle" dominant-baseline="central" font-weight="bold">T</text>
    </svg>
  `;

  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512-maskable.png'));
  console.log('Generated icon-512-maskable.png');
  console.log('✅ All icons generated!');
}

generateIcons().catch(console.error);
