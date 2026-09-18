/**
 * Generates the PWA icon set.
 *
 * The mark is drawn here rather than exported from a design tool so the icons
 * can be regenerated from source with `npm run icons`, and so they stay in step
 * with the palette in globals.css. PNG encoding is done by hand because the
 * alternative is pulling a native image dependency in purely to draw four
 * circles.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

const CREAM = [251, 247, 240];
const BLUSH = [244, 217, 217];
const BLUSH_DEEP = [140, 79, 79];
const BUTTER = [246, 235, 200];

/** Supersampling factor; 3x is enough to keep the curves smooth at 192px. */
const SS = 3;

/**
 * Draws the mark into an RGB buffer at `size`, in the same 48-unit coordinate
 * space as the Logo component.
 */
function drawMark(size, { padding }) {
  const scale = (size * (1 - padding * 2)) / 48;
  const offset = size * padding;
  const pixels = new Uint8Array(size * size * 3);

  // Shapes are evaluated per sample, painter's-algorithm style.
  const circles = [
    { cx: 11, cy: 13, r: 6, color: BLUSH },
    { cx: 37, cy: 13, r: 6, color: BLUSH },
    { cx: 24, cy: 26, r: 15, color: BLUSH },
  ];

  const petals = Array.from({ length: 8 }, (_, index) => {
    const angle = (index / 8) * Math.PI * 2 - Math.PI / 2;
    return {
      x1: 24 + Math.cos(angle) * 4.5,
      y1: 26 + Math.sin(angle) * 4.5,
      x2: 24 + Math.cos(angle) * 8.5,
      y2: 26 + Math.sin(angle) * 8.5,
    };
  });

  const distanceToSegment = (px, py, { x1, y1, x2, y2 }) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let accumulated = [0, 0, 0];

      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          // Convert this sub-sample back into the 48-unit space.
          const ux = (x + (sx + 0.5) / SS - offset) / scale;
          const uy = (y + (sy + 0.5) / SS - offset) / scale;

          let colour = CREAM;

          for (const { cx, cy, r, color } of circles) {
            if (Math.hypot(ux - cx, uy - cy) <= r) colour = color;
          }

          for (const petal of petals) {
            if (distanceToSegment(ux, uy, petal) <= 0.7) colour = BLUSH_DEEP;
          }

          const centreDistance = Math.hypot(ux - 24, uy - 26);
          if (centreDistance <= 4.7) colour = BLUSH_DEEP;
          if (centreDistance <= 4) colour = BUTTER;

          accumulated = [
            accumulated[0] + colour[0],
            accumulated[1] + colour[1],
            accumulated[2] + colour[2],
          ];
        }
      }

      const samples = SS * SS;
      const index = (y * size + x) * 3;
      pixels[index] = Math.round(accumulated[0] / samples);
      pixels[index + 1] = Math.round(accumulated[1] / samples);
      pixels[index + 2] = Math.round(accumulated[2] / samples);
    }
  }

  return pixels;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(pixels, size) {
  // Each scanline is prefixed with filter type 0 (None).
  const stride = size * 3;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(pixels.subarray(y * stride, (y + 1) * stride)).copy(raw, y * (stride + 1) + 1);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: truecolour
  header[10] = 0; // deflate
  header[11] = 0; // adaptive filtering
  header[12] = 0; // no interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });

const ICONS = [
  { name: 'icon-192.png', size: 192, padding: 0.06 },
  { name: 'icon-512.png', size: 512, padding: 0.06 },
  // Maskable icons are cropped to a safe zone, so the mark sits well inside.
  { name: 'maskable-512.png', size: 512, padding: 0.18 },
  { name: 'apple-touch-icon.png', size: 180, padding: 0.08 },
];

for (const { name, size, padding } of ICONS) {
  writeFileSync(join(OUT_DIR, name), encodePng(drawMark(size, { padding }), size));
  console.log(`wrote ${name} (${size}x${size})`);
}
