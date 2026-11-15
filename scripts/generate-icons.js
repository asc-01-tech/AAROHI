// scripts/generate-icons.js
// Generates valid, crisp PWA PNG icons without external dependencies using Node.js built-in zlib.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crcData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  chunk.writeUInt32BE(crc32(crcData), 8 + len);
  return chunk;
}

function generateIcon(size) {
  const rows = [];
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.44;

  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0; // Filter byte: None

    for (let x = 0; x < size; x++) {
      const idx = 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background rounded pill / circle: Amber #f59e0b
      if (dist <= r) {
        // Subtle gradient from top #fbbf24 to bottom #d97706
        const grad = y / size;
        const red = Math.round(251 - grad * 34);
        const green = Math.round(191 - grad * 72);
        const blue = Math.round(36 - grad * 30);

        // Center pill symbol
        const px = dx / (size * 0.28);
        const py = dy / (size * 0.28);
        // Tilted ellipse equation for pill
        const cos = Math.cos(Math.PI / 4);
        const sin = Math.sin(Math.PI / 4);
        const rx = px * cos - py * sin;
        const ry = px * sin + py * cos;

        // Pill body: rounded rectangle (rx between -0.4 and 0.4, ry between -0.8 and 0.8)
        const inPillLength = Math.max(0, Math.abs(ry) - 0.4);
        const pillDist = Math.sqrt(rx * rx + inPillLength * inPillLength);

        if (pillDist <= 0.42) {
          // Pill top half is red/white
          if (ry < 0) {
            // White half
            row[idx] = 255;
            row[idx + 1] = 255;
            row[idx + 2] = 255;
            row[idx + 3] = 255;
          } else {
            // Ruby red half #ef4444
            row[idx] = 239;
            row[idx + 1] = 68;
            row[idx + 2] = 68;
            row[idx + 3] = 255;
          }
        } else {
          row[idx] = red;
          row[idx + 1] = green;
          row[idx + 2] = blue;
          row[idx + 3] = 255;
        }
      } else {
        // Transparent outside
        row[idx] = 0;
        row[idx + 1] = 0;
        row[idx + 2] = 0;
        row[idx + 3] = 0;
      }
    }
    rows.push(row);
  }

  const rawData = Buffer.concat(rows);
  const compressed = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // IDAT
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), generateIcon(192));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), generateIcon(512));
console.log('✅ Generated crisp 192x192 and 512x512 PWA icons in public/icons/');
