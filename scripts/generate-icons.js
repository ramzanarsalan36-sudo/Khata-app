const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Create PNG buffer from raw RGBA buffer
function createPNG(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8 bit depth
  ihdrData.writeUInt8(6, 9); // RGBA color type
  ihdrData.writeUInt8(0, 10); // Compression method
  ihdrData.writeUInt8(0, 11); // Filter method
  ihdrData.writeUInt8(0, 12); // Interlace method
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT Chunk (Scanlines with 0 filter byte)
  const rowSize = width * 4;
  const rawScanlines = Buffer.alloc(height * (rowSize + 1));
  for (let y = 0; y < height; y++) {
    rawScanlines[y * (rowSize + 1)] = 0; // Filter: None
    rgbaBuffer.copy(rawScanlines, y * (rowSize + 1) + 1, y * rowSize, (y + 1) * rowSize);
  }
  const compressed = zlib.deflateSync(rawScanlines, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);

  // IEND Chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(12 + len);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crc = crc32(buf.subarray(4, 8 + len));
  buf.writeInt32BE(crc, 8 + len);
  return buf;
}

// CRC32 implementation
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xff];
  }
  return (c ^ 0xffffffff) | 0;
}

const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

// Distance to segment helper for smooth stroke rendering
function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt((px - (x1 + t * (x2 - x1))) ** 2 + (py - (y1 + t * (y2 - y1))) ** 2);
}

// Draw Storefront app icon matching user's image
function renderStorefrontIconRGBA(size) {
  const buffer = Buffer.alloc(size * size * 4);
  const center = size / 2;
  const cornerRadius = size * 0.25;

  const strokeW = Math.max(1.8, size * 0.058);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Rounded rectangle squircle background
      const dx = Math.max(Math.abs(x - center) - (center - cornerRadius), 0);
      const dy = Math.max(Math.abs(y - center) - (center - cornerRadius), 0);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > cornerRadius) {
        // Transparent
        buffer[idx] = 0;
        buffer[idx + 1] = 0;
        buffer[idx + 2] = 0;
        buffer[idx + 3] = 0;
        continue;
      }

      // Storefront Stroke Coordinates (scaled)
      const roofTopY = size * 0.33;
      const roofBotY = size * 0.44;
      const roofTopX1 = size * 0.38;
      const roofTopX2 = size * 0.62;
      const roofBotX1 = size * 0.28;
      const roofBotX2 = size * 0.72;

      const wallX1 = size * 0.33;
      const wallX2 = size * 0.67;
      const wallTopY = size * 0.48;
      const wallBotY = size * 0.73;

      const doorX1 = size * 0.44;
      const doorX2 = size * 0.56;
      const doorTopY = size * 0.62;
      const doorBotY = wallBotY;

      // 1. Roof top horizontal
      let minStrokeDist = distToSegment(x, y, roofTopX1, roofTopY, roofTopX2, roofTopY);

      // 2. Roof left slant
      minStrokeDist = Math.min(minStrokeDist, distToSegment(x, y, roofTopX1, roofTopY, roofBotX1, roofBotY));

      // 3. Roof right slant
      minStrokeDist = Math.min(minStrokeDist, distToSegment(x, y, roofTopX2, roofTopY, roofBotX2, roofBotY));

      // 4. Roof bottom horizontal / awning line
      minStrokeDist = Math.min(minStrokeDist, distToSegment(x, y, roofBotX1, roofBotY, roofBotX2, roofBotY));

      // 5. Awning scallop bottom wave
      const awningMidY = roofBotY + size * 0.04;
      const waveX = (x - roofBotX1) / (roofBotX2 - roofBotX1);
      if (waveX >= 0 && waveX <= 1) {
        const waveY = roofBotY + Math.sin(waveX * Math.PI * 4) * (size * 0.02) + (size * 0.02);
        const dWave = Math.abs(y - waveY);
        minStrokeDist = Math.min(minStrokeDist, dWave);
      }

      // 6. Left wall
      minStrokeDist = Math.min(minStrokeDist, distToSegment(x, y, wallX1, wallTopY, wallX1, wallBotY));

      // 7. Right wall
      minStrokeDist = Math.min(minStrokeDist, distToSegment(x, y, wallX2, wallTopY, wallX2, wallBotY));

      // 8. Bottom wall (floor)
      minStrokeDist = Math.min(minStrokeDist, distToSegment(x, y, wallX1, wallBotY, wallX2, wallBotY));

      // 9. Door left
      minStrokeDist = Math.min(minStrokeDist, distToSegment(x, y, doorX1, doorBotY, doorX1, doorTopY));

      // 10. Door right
      minStrokeDist = Math.min(minStrokeDist, distToSegment(x, y, doorX2, doorBotY, doorX2, doorTopY));

      // 11. Door top arch
      const doorRadius = (doorX2 - doorX1) / 2;
      const doorCenterX = (doorX1 + doorX2) / 2;
      if (y <= doorTopY) {
        const dArch = Math.abs(Math.sqrt((x - doorCenterX) ** 2 + (y - doorTopY) ** 2) - doorRadius);
        minStrokeDist = Math.min(minStrokeDist, dArch);
      }

      // Is white stroke?
      if (minStrokeDist <= strokeW / 2) {
        // Crisp White Icon Line
        buffer[idx] = 255;
        buffer[idx + 1] = 255;
        buffer[idx + 2] = 255;
        buffer[idx + 3] = 255;
      } else {
        // Emerald / Teal Green Background (#00a86b to #00875a)
        const t = (x + y) / (size * 2);
        buffer[idx] = Math.round(0 + (0 - 0) * t);
        buffer[idx + 1] = Math.round(168 + (135 - 168) * t);
        buffer[idx + 2] = Math.round(107 + (90 - 107) * t);
        buffer[idx + 3] = 255;
      }
    }
  }

  return buffer;
}

// Generate ICO format from 32x32 PNG
function createICO(pngBuffer) {
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // ICO type (1 = icon)
  icoHeader.writeUInt16LE(1, 4); // Number of images (1)

  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(32, 0); // Width 32
  dirEntry.writeUInt8(32, 1); // Height 32
  dirEntry.writeUInt8(0, 2);  // Palette colors (0 = no palette)
  dirEntry.writeUInt8(0, 3);  // Reserved
  dirEntry.writeUInt16LE(1, 4); // Color planes
  dirEntry.writeUInt16LE(32, 6); // Bits per pixel
  dirEntry.writeUInt32LE(pngBuffer.length, 8); // Size of PNG data
  dirEntry.writeUInt32LE(22, 12); // Offset of PNG data (6 + 16 = 22)

  return Buffer.concat([icoHeader, dirEntry, pngBuffer]);
}

// Ensure directories exist
const publicDir = path.join(__dirname, '..', 'public');
const iconsDir = path.join(publicDir, 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1. Generate 32x32 PNG & favicon.ico
console.log('Generating 32x32 icon & favicon.ico with storefront design...');
const raw32 = renderStorefrontIconRGBA(32);
const png32 = createPNG(32, 32, raw32);
const ico = createICO(png32);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico);
fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), png32);

// 2. Generate 180x180 Apple Touch Icon
console.log('Generating apple-touch-icon.png (180x180)...');
const raw180 = renderStorefrontIconRGBA(180);
const png180 = createPNG(180, 180, raw180);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png180);
fs.writeFileSync(path.join(publicDir, 'icons', 'apple-touch-icon.png'), png180);

// 3. Generate 192x192 PWA Icon
console.log('Generating icon-192.png (192x192)...');
const raw192 = renderStorefrontIconRGBA(192);
const png192 = createPNG(192, 192, raw192);
fs.writeFileSync(path.join(publicDir, 'icons', 'icon-192.png'), png192);

// 4. Generate 512x512 PWA Splash / App Icon
console.log('Generating icon-512.png (512x512)...');
const raw512 = renderStorefrontIconRGBA(512);
const png512 = createPNG(512, 512, raw512);
fs.writeFileSync(path.join(publicDir, 'icons', 'icon-512.png'), png512);

console.log('Storefront App Icons generated successfully!');
