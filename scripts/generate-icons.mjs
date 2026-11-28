import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');
const sourceLogoPath = path.resolve(__dirname, '../assets/Crics_Cricket_app_logo_2mb.png');
const fallbackLogoPath = path.resolve(__dirname, '../assets/logo.png');
const sourceEszPath = path.resolve(__dirname, '../assets/intro-esz-interim.png');

// Stage 5 brand-950 (#121A45) background colour for maskable safe-zone edges
const MASKABLE_BG = { r: 18, g: 26, b: 69, a: 255 }; // #121A45

// Precomputed CRC32 table for PNG chunks
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePngChunk(type, data) {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/**
 * Decodes an 8-bit PNG (colorType 2 RGB, 3 Indexed PLTE, or 6 RGBA) into a flat RGBA Uint8Array.
 */
export function decodePngToRgba(pngBuffer) {
  let offset = 8; // skip 8-byte PNG signature
  let width = 0;
  let height = 0;
  let colorType = 2;
  let palette = null;
  let trns = null;
  const idatChunks = [];

  while (offset < pngBuffer.length) {
    const length = pngBuffer.readUInt32BE(offset);
    const type = pngBuffer.toString('ascii', offset + 4, offset + 8);
    const data = pngBuffer.subarray(offset + 8, offset + 8 + length);

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const bitDepth = data[8];
      colorType = data[9];
      if (bitDepth !== 8) {
        throw new Error(`Unsupported PNG bitDepth: ${bitDepth}`);
      }
    } else if (type === 'PLTE') {
      palette = data;
    } else if (type === 'tRNS') {
      trns = data;
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }

  const compressed = Buffer.concat(idatChunks);
  const raw = zlib.inflateSync(compressed);
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const stride = width * bpp;
  const recon = new Uint8Array(height * stride);

  for (let y = 0; y < height; y++) {
    const filterType = raw[y * (stride + 1)];
    const rowStart = y * (stride + 1) + 1;
    const outRow = y * stride;
    const prevRow = (y - 1) * stride;

    for (let x = 0; x < stride; x++) {
      const byte = raw[rowStart + x];
      const a = x >= bpp ? recon[outRow + x - bpp] : 0;
      const b = y > 0 ? recon[prevRow + x] : 0;
      const c = y > 0 && x >= bpp ? recon[prevRow + x - bpp] : 0;
      let val = byte;
      if (filterType === 1) val = (byte + a) & 0xff;
      else if (filterType === 2) val = (byte + b) & 0xff;
      else if (filterType === 3) val = (byte + ((a + b) >>> 1)) & 0xff;
      else if (filterType === 4) val = (byte + paethPredictor(a, b, c)) & 0xff;
      recon[outRow + x] = val;
    }
  }

  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    if (colorType === 6) {
      rgba[i * 4 + 0] = recon[i * 4 + 0];
      rgba[i * 4 + 1] = recon[i * 4 + 1];
      rgba[i * 4 + 2] = recon[i * 4 + 2];
      rgba[i * 4 + 3] = recon[i * 4 + 3];
    } else if (colorType === 2) {
      rgba[i * 4 + 0] = recon[i * 3 + 0];
      rgba[i * 4 + 1] = recon[i * 3 + 1];
      rgba[i * 4 + 2] = recon[i * 3 + 2];
      rgba[i * 4 + 3] = 255;
    } else if (colorType === 3 && palette) {
      const idx = recon[i];
      rgba[i * 4 + 0] = palette[idx * 3 + 0] ?? 0;
      rgba[i * 4 + 1] = palette[idx * 3 + 1] ?? 0;
      rgba[i * 4 + 2] = palette[idx * 3 + 2] ?? 0;
      rgba[i * 4 + 3] = trns && idx < trns.length ? trns[idx] : 255;
    }
  }

  return { width, height, rgba };
}

function buildMedianCutPalette(rgba, maxColors = 256) {
  const hist = new Uint32Array(32768);
  const pixelCount = rgba.length >>> 2;
  for (let i = 0; i < pixelCount; i++) {
    const r5 = rgba[i * 4 + 0] >>> 3;
    const g5 = rgba[i * 4 + 1] >>> 3;
    const b5 = rgba[i * 4 + 2] >>> 3;
    hist[(r5 << 10) | (g5 << 5) | b5]++;
  }

  const colors = [];
  for (let c = 0; c < 32768; c++) {
    const count = hist[c];
    if (count > 0) {
      const r5 = (c >>> 10) & 31;
      const g5 = (c >>> 5) & 31;
      const b5 = c & 31;
      colors.push({
        r: (r5 << 3) | (r5 >>> 2),
        g: (g5 << 3) | (g5 >>> 2),
        b: (b5 << 3) | (b5 >>> 2),
        count,
      });
    }
  }

  function createBox(items) {
    let rMin = 255, rMax = 0;
    let gMin = 255, gMax = 0;
    let bMin = 255, bMax = 0;
    let total = 0;
    for (const item of items) {
      if (item.r < rMin) rMin = item.r;
      if (item.r > rMax) rMax = item.r;
      if (item.g < gMin) gMin = item.g;
      if (item.g > gMax) gMax = item.g;
      if (item.b < bMin) bMin = item.b;
      if (item.b > bMax) bMax = item.b;
      total += item.count;
    }
    return { items, total, rRange: rMax - rMin, gRange: gMax - gMin, bRange: bMax - bMin };
  }

  const boxes = [createBox(colors)];
  while (boxes.length < maxColors) {
    let bestIdx = -1;
    let bestScore = 0;
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      if (box.items.length < 2) continue;
      const maxRange = Math.max(box.rRange, box.gRange, box.bRange);
      if (maxRange === 0) continue;
      const score = maxRange * Math.sqrt(box.total);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) break;

    const target = boxes[bestIdx];
    const channel =
      target.gRange >= target.rRange && target.gRange >= target.bRange
        ? 'g'
        : target.rRange >= target.bRange
          ? 'r'
          : 'b';
    target.items.sort((a, b) => a[channel] - b[channel]);

    let acc = 0;
    const half = target.total / 2;
    let splitAt = 1;
    for (let i = 0; i < target.items.length - 1; i++) {
      acc += target.items[i].count;
      if (acc >= half) {
        splitAt = i + 1;
        break;
      }
    }

    const left = createBox(target.items.slice(0, splitAt));
    const right = createBox(target.items.slice(splitAt));
    boxes.splice(bestIdx, 1, left, right);
  }

  const palette = boxes.map((box) => {
    let rSum = 0, gSum = 0, bSum = 0, total = 0;
    for (const item of box.items) {
      rSum += item.r * item.count;
      gSum += item.g * item.count;
      bSum += item.b * item.count;
      total += item.count;
    }
    const r = total > 0 ? Math.round(rSum / total) : 0;
    const g = total > 0 ? Math.round(gSum / total) : 0;
    const b = total > 0 ? Math.round(bSum / total) : 0;
    return { r, g, b, lum: 0.299 * r + 0.587 * g + 0.114 * b };
  });

  palette.sort((a, b) => a.lum - b.lum);
  return palette;
}

export function encodeIndexedPng(width, height, rgba, maxColors = 256) {
  const palette = buildMedianCutPalette(rgba, maxColors);
  const plte = Buffer.alloc(palette.length * 3);
  for (let i = 0; i < palette.length; i++) {
    plte[i * 3 + 0] = palette[i].r;
    plte[i * 3 + 1] = palette[i].g;
    plte[i * 3 + 2] = palette[i].b;
  }

  const lut = new Int16Array(32768).fill(-1);
  const indices = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const r = rgba[i * 4 + 0];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    const key = ((r >>> 3) << 10) | ((g >>> 3) << 5) | (b >>> 3);
    let bestIdx = lut[key];
    if (bestIdx === -1) {
      let bestDist = Infinity;
      bestIdx = 0;
      for (let p = 0; p < palette.length; p++) {
        const dr = r - palette[p].r;
        const dg = g - palette[p].g;
        const db = b - palette[p].b;
        const dist = dr * dr * 2 + dg * dg * 4 + db * db;
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = p;
        }
      }
      lut[key] = bestIdx;
    }
    indices[i] = bestIdx;
  }

  const rawNone = Buffer.alloc(height * (width + 1));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width + 1);
    rawNone[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      rawNone[rowOffset + 1 + x] = indices[y * width + x];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 3;

  const compressed = zlib.deflateSync(rawNone, { level: 9 });
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    makePngChunk('IHDR', ihdr),
    makePngChunk('PLTE', plte),
    makePngChunk('IDAT', compressed),
    makePngChunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Encodes an RGBA image buffer with smooth alpha transparency (e.g. intro-esz.png)
 * into an 8-bit Indexed PNG with PLTE + tRNS chunks under 40 KB.
 */
export function encodeIndexedRgbaPng(width, height, rgba) {
  const buckets = new Map();
  for (let i = 0; i < width * height; i++) {
    const a = rgba[i * 4 + 3];
    if (a < 6) continue;
    const key =
      ((rgba[i * 4 + 0] >>> 4) << 12) |
      ((rgba[i * 4 + 1] >>> 4) << 8) |
      ((rgba[i * 4 + 2] >>> 4) << 4) |
      (a >>> 4);
    const cur = buckets.get(key) || { r: 0, g: 0, b: 0, a: 0, count: 0 };
    cur.r += rgba[i * 4 + 0];
    cur.g += rgba[i * 4 + 1];
    cur.b += rgba[i * 4 + 2];
    cur.a += a;
    cur.count += 1;
    buckets.set(key, cur);
  }
  const sorted = [...buckets.values()].sort((x, y) => y.count - x.count).slice(0, 255);
  const palette = [
    { r: 0, g: 0, b: 0, a: 0 },
    ...sorted.map((x) => ({
      r: Math.round(x.r / x.count),
      g: Math.round(x.g / x.count),
      b: Math.round(x.b / x.count),
      a: Math.round(x.a / x.count),
    })),
  ];

  const plte = Buffer.alloc(palette.length * 3);
  const trns = Buffer.alloc(palette.length);
  for (let i = 0; i < palette.length; i++) {
    plte[i * 3 + 0] = palette[i].r;
    plte[i * 3 + 1] = palette[i].g;
    plte[i * 3 + 2] = palette[i].b;
    trns[i] = palette[i].a;
  }

  const indices = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const a = rgba[i * 4 + 3];
    if (a < 6) {
      indices[i] = 0;
      continue;
    }
    const r = rgba[i * 4 + 0];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    let best = 1;
    let bestD = Infinity;
    for (let p = 1; p < palette.length; p++) {
      const dr = r - palette[p].r;
      const dg = g - palette[p].g;
      const db = b - palette[p].b;
      const da = a - palette[p].a;
      const d = dr * dr + dg * dg + db * db + da * da * 2;
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    indices[i] = best;
  }

  const rawNone = Buffer.alloc(height * (width + 1));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width + 1);
    rawNone[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      rawNone[rowOffset + 1 + x] = indices[y * width + x];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 3;

  const compressed = zlib.deflateSync(rawNone, { level: 9 });
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    makePngChunk('IHDR', ihdr),
    makePngChunk('PLTE', plte),
    makePngChunk('tRNS', trns),
    makePngChunk('IDAT', compressed),
    makePngChunk('IEND', Buffer.alloc(0)),
  ]);
}

export function resizeRgba(src, dstW, dstH) {
  const dst = new Uint8Array(dstW * dstH * 4);
  const scaleX = src.width / dstW;
  const scaleY = src.height / dstH;

  for (let y = 0; y < dstH; y++) {
    const sy0 = Math.floor(y * scaleY);
    const sy1 = Math.min(src.height, Math.ceil((y + 1) * scaleY));
    for (let x = 0; x < dstW; x++) {
      const sx0 = Math.floor(x * scaleX);
      const sx1 = Math.min(src.width, Math.ceil((x + 1) * scaleX));
      let rSum = 0, gSum = 0, bSum = 0, count = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const sIdx = (sy * src.width + sx) * 4;
          rSum += src.rgba[sIdx + 0];
          gSum += src.rgba[sIdx + 1];
          bSum += src.rgba[sIdx + 2];
          count += 1;
        }
      }
      const dIdx = (y * dstW + x) * 4;
      dst[dIdx + 0] = Math.round(rSum / count);
      dst[dIdx + 1] = Math.round(gSum / count);
      dst[dIdx + 2] = Math.round(bSum / count);
      dst[dIdx + 3] = 255;
    }
  }
  return { width: dstW, height: dstH, rgba: dst };
}

function fillRect(img, x0, y0, w, h, color) {
  const xEnd = Math.min(img.width, x0 + w);
  const yEnd = Math.min(img.height, y0 + h);
  for (let y = Math.max(0, y0); y < yEnd; y++) {
    for (let x = Math.max(0, x0); x < xEnd; x++) {
      const idx = (y * img.width + x) * 4;
      img.rgba[idx + 0] = color.r;
      img.rgba[idx + 1] = color.g;
      img.rgba[idx + 2] = color.b;
      img.rgba[idx + 3] = 255;
    }
  }
}

function blitRgba(dst, src, offsetX, offsetY) {
  for (let y = 0; y < src.height; y++) {
    const dy = offsetY + y;
    if (dy < 0 || dy >= dst.height) continue;
    for (let x = 0; x < src.width; x++) {
      const dx = offsetX + x;
      if (dx < 0 || dx >= dst.width) continue;
      const sIdx = (y * src.width + x) * 4;
      const dIdx = (dy * dst.width + dx) * 4;
      dst.rgba[dIdx + 0] = src.rgba[sIdx + 0];
      dst.rgba[dIdx + 1] = src.rgba[sIdx + 1];
      dst.rgba[dIdx + 2] = src.rgba[sIdx + 2];
      dst.rgba[dIdx + 3] = 255;
    }
  }
}

function buildMultiSizeIcoBuffer(entries) {
  const count = entries.length;
  const headerSize = 6 + count * 16;
  const totalBytes = headerSize + entries.reduce((sum, item) => sum + item.buffer.byteLength, 0);
  const out = Buffer.alloc(totalBytes);
  out.writeUInt16LE(0, 0);
  out.writeUInt16LE(1, 2);
  out.writeUInt16LE(count, 4);

  let currentOffset = headerSize;
  entries.forEach((entry, idx) => {
    const dirOffset = 6 + idx * 16;
    out.writeUInt8(entry.size >= 256 ? 0 : entry.size, dirOffset + 0);
    out.writeUInt8(entry.size >= 256 ? 0 : entry.size, dirOffset + 1);
    out.writeUInt8(0, dirOffset + 2);
    out.writeUInt8(0, dirOffset + 3);
    out.writeUInt16LE(1, dirOffset + 4);
    out.writeUInt16LE(8, dirOffset + 6);
    out.writeUInt32LE(entry.buffer.byteLength, dirOffset + 8);
    out.writeUInt32LE(currentOffset, dirOffset + 12);
    entry.buffer.copy(out, currentOffset);
    currentOffset += entry.buffer.byteLength;
  });

  return out;
}

export async function generateIcons() {
  let activeLogoPath = sourceLogoPath;
  try {
    await fs.access(sourceLogoPath);
  } catch {
    activeLogoPath = fallbackLogoPath;
  }
  const logoBytes = await fs.readFile(activeLogoPath);
  const decodedLogo = decodePngToRgba(logoBytes);

  const logo128 = resizeRgba(decodedLogo, 128, 128);
  await fs.writeFile(path.join(publicDir, 'logo-128.png'), encodeIndexedPng(128, 128, logo128.rgba, 128));

  const logo256 = resizeRgba(decodedLogo, 256, 256);
  await fs.writeFile(path.join(publicDir, 'logo-256.png'), encodeIndexedPng(256, 256, logo256.rgba, 128));

  const icon192 = resizeRgba(decodedLogo, 192, 192);
  await fs.writeFile(path.join(publicDir, 'pwa-192x192.png'), encodeIndexedPng(192, 192, icon192.rgba, 128));

  const icon512 = resizeRgba(decodedLogo, 512, 512);
  await fs.writeFile(path.join(publicDir, 'pwa-512x512.png'), encodeIndexedPng(512, 512, icon512.rgba, 128));

  const safeZoneSize = Math.round(512 * 0.8);
  const pad = Math.floor((512 - safeZoneSize) / 2);
  const inner410 = resizeRgba(decodedLogo, safeZoneSize, safeZoneSize);
  const maskable512 = { width: 512, height: 512, rgba: new Uint8Array(512 * 512 * 4) };
  fillRect(maskable512, 0, 0, 512, 512, MASKABLE_BG);
  blitRgba(maskable512, inner410, pad, pad);
  await fs.writeFile(path.join(publicDir, 'pwa-maskable-512x512.png'), encodeIndexedPng(512, 512, maskable512.rgba, 128));

  const apple180 = resizeRgba(decodedLogo, 180, 180);
  await fs.writeFile(path.join(publicDir, 'apple-touch-icon.png'), encodeIndexedPng(180, 180, apple180.rgba, 128));

  const icoSizes = [16, 32, 48];
  const icoEntries = icoSizes.map((size) => {
    const scaled = resizeRgba(decodedLogo, size, size);
    return { size, buffer: encodeIndexedPng(size, size, scaled.rgba, 128) };
  });
  const icoBuffer = buildMultiSizeIcoBuffer(icoEntries);
  await fs.writeFile(path.join(publicDir, 'favicon.ico'), icoBuffer);

  // Stage 9C: Generate public/intro-crics.webp (512px, < 70 KB) and public/intro-esz.png (< 40 KB, alpha preserved)
  const introCricsWebpPath = path.join(publicDir, 'intro-crics.webp');
  execFileSync('convert', [activeLogoPath, '-resize', '512x512', '-quality', '80', introCricsWebpPath]);

  const eszRawBytes = await fs.readFile(sourceEszPath);
  const decodedEsz = decodePngToRgba(eszRawBytes);
  const eszPngBuffer = encodeIndexedRgbaPng(decodedEsz.width, decodedEsz.height, decodedEsz.rgba);
  const introEszPngPath = path.join(publicDir, 'intro-esz.png');
  await fs.writeFile(introEszPngPath, eszPngBuffer);

  process.stdout.write(
    `Generated compressed icons, intro-crics.webp, intro-esz.png (${eszPngBuffer.byteLength} bytes), and favicon.ico (${icoBuffer.byteLength} bytes)\n`
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  generateIcons().catch((err) => {
    process.stderr.write(`Icon generation failed: ${String(err)}\n`);
    process.exit(1);
  });
}
