import zlib from 'node:zlib';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import { describe, expect, it } from 'vitest';
import { Player } from '../engine/types';
import {
  buildClubRosterExport,
  computePlayerCheckCode,
  encodePlayerQrPayload,
  generatePlayerQrDataUrl,
  getQrCodeVersion,
  parseClubRosterImport,
  parsePlayerQrPayload,
  PLAYER_QR_SIZE_EXPORT,
  PLAYER_QR_SIZE_ONSCREEN,
  stripPlayerIdPrefix,
  verifyScannedPlayerQr,
} from './playerQrUtils';

const SAMPLE_PLAYER: Player = {
  id: 'CRICS-PLR-1001',
  name: 'Aarav Sharma',
  dob: '1998-05-14',
  role: 'Batter',
  battingStyle: 'Right-hand bat',
  bowlingStyle: 'Right-arm offbreak',
  jerseyNumber: 18,
  createdAt: 1700000000000,
};

const PLAYER_NO_JERSEY: Player = {
  id: 'CRICS-PLR-1042',
  name: 'Devansh Joshi',
  dob: '',
  role: 'Bowler',
  battingStyle: 'Right-hand bat',
  bowlingStyle: 'Right-arm fast',
  jerseyNumber: null,
  createdAt: 1700000000000,
};

/**
 * Decodes a PNG Data URL into raw RGBA pixels in pure Node using built-in node:zlib.
 */
function decodePngDataUrlToRgba(dataUrl: string): {
  width: number;
  height: number;
  data: Uint8ClampedArray;
} {
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  const buf = Buffer.from(base64, 'base64');

  let offset = 8; // skip PNG signature
  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colorType = 6;
  const idatChunks: Buffer[] = [];

  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const chunkData = buf.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = chunkData.readUInt32BE(0);
      height = chunkData.readUInt32BE(4);
      bitDepth = chunkData[8];
      colorType = chunkData[9];
    } else if (type === 'IDAT') {
      idatChunks.push(chunkData);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }

  expect(bitDepth).toBe(8);
  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : 4;
  const stride = width * bpp;
  const raw = Buffer.alloc(height * stride);

  const paeth = (a: number, b: number, c: number) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  };

  for (let y = 0; y < height; y++) {
    const filter = inflated[y * (stride + 1)];
    const rowIn = y * (stride + 1) + 1;
    const rowOut = y * stride;
    for (let x = 0; x < stride; x++) {
      const val = inflated[rowIn + x];
      const left = x >= bpp ? raw[rowOut + x - bpp] : 0;
      const up = y > 0 ? raw[rowOut - stride + x] : 0;
      const upLeft = y > 0 && x >= bpp ? raw[rowOut - stride + x - bpp] : 0;
      let recon = val;
      if (filter === 1) recon = (val + left) & 0xff;
      else if (filter === 2) recon = (val + up) & 0xff;
      else if (filter === 3) recon = (val + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) recon = (val + paeth(left, up, upLeft)) & 0xff;
      raw[rowOut + x] = recon;
    }
  }

  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    if (colorType === 6) {
      rgba[i * 4] = raw[i * 4];
      rgba[i * 4 + 1] = raw[i * 4 + 1];
      rgba[i * 4 + 2] = raw[i * 4 + 2];
      rgba[i * 4 + 3] = raw[i * 4 + 3];
    } else if (colorType === 2) {
      rgba[i * 4] = raw[i * 3];
      rgba[i * 4 + 1] = raw[i * 3 + 1];
      rgba[i * 4 + 2] = raw[i * 3 + 2];
      rgba[i * 4 + 3] = 255;
    } else {
      const v = raw[i];
      rgba[i * 4] = v;
      rgba[i * 4 + 1] = v;
      rgba[i * 4 + 2] = v;
      rgba[i * 4 + 3] = 255;
    }
  }

  return { width, height, data: rgba };
}

function resizeRgbaNearest(
  src: { width: number; height: number; data: Uint8ClampedArray },
  targetSize: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(targetSize * targetSize * 4);
  for (let y = 0; y < targetSize; y++) {
    const sy = Math.min(src.height - 1, Math.floor((y * src.height) / targetSize));
    for (let x = 0; x < targetSize; x++) {
      const sx = Math.min(src.width - 1, Math.floor((x * src.width) / targetSize));
      const si = (sy * src.width + sx) * 4;
      const di = (y * targetSize + x) * 4;
      out[di] = src.data[si];
      out[di + 1] = src.data[si + 1];
      out[di + 2] = src.data[si + 2];
      out[di + 3] = src.data[si + 3];
    }
  }
  return out;
}

describe('Stage 11 Group D — Compact Signed Player QR, Scannability & Offline Verification', () => {
  it('1. encodes and decodes compact CRICS1 payload with prefix stripped and jersey 0 fallback', async () => {
    expect(stripPlayerIdPrefix('CRICS-PLR-1001')).toBe('1001');
    expect(stripPlayerIdPrefix('CUSTOM-99')).toBe('CUSTOM-99');

    const withClubCode = await encodePlayerQrPayload(SAMPLE_PLAYER, 'CLUB-SECRET-2026');
    expect(withClubCode.startsWith('CRICS1.1001.18.')).toBe(true);
    expect(withClubCode.length).toBeLessThanOrEqual(28);
    expect(withClubCode.length).toBeGreaterThanOrEqual(20);

    const parsed = parsePlayerQrPayload(withClubCode);
    expect(parsed).toEqual({
      version: 'CRICS1',
      compactId: '1001',
      jersey: 18,
      check: withClubCode.split('.')[3],
      raw: withClubCode,
    });
    expect(parsed!.check).toMatch(/^[A-Z2-7]{8}$/);

    const withoutJersey = await encodePlayerQrPayload(PLAYER_NO_JERSEY, '');
    expect(withoutJersey.startsWith('CRICS1.1042.0.')).toBe(true);
    const parsedNoJersey = parsePlayerQrPayload(withoutJersey);
    expect(parsedNoJersey?.jersey).toBe(0);
    expect(parsedNoJersey?.check).toMatch(/^[A-Z2-7]{8}$/);
  });

  it('2. computes distinct HMAC-SHA256 base32 check (with club code) and CRC check (without club code), rejecting tampered codes', async () => {
    const hmacCheck = await computePlayerCheckCode(SAMPLE_PLAYER, 'ROYALS-CODE');
    const crcCheck = await computePlayerCheckCode(SAMPLE_PLAYER, '');
    expect(hmacCheck.check).toHaveLength(8);
    expect(hmacCheck.mode).toBe('hmac');
    expect(crcCheck.check).toHaveLength(8);
    expect(crcCheck.mode).toBe('crc');
    expect(hmacCheck.check).not.toBe(crcCheck.check);

    // Changing any covered field (name, dob, jersey, club code) changes check code
    const renamed = await computePlayerCheckCode({ ...SAMPLE_PLAYER, name: 'Aarav S.' }, 'ROYALS-CODE');
    const redob = await computePlayerCheckCode({ ...SAMPLE_PLAYER, dob: '1999-01-01' }, 'ROYALS-CODE');
    const rejersey = await computePlayerCheckCode({ ...SAMPLE_PLAYER, jerseyNumber: 99 }, 'ROYALS-CODE');
    const otherClub = await computePlayerCheckCode(SAMPLE_PLAYER, 'TITANS-CODE');

    expect(renamed.check).not.toBe(hmacCheck.check);
    expect(redob.check).not.toBe(hmacCheck.check);
    expect(rejersey.check).not.toBe(hmacCheck.check);
    expect(otherClub.check).not.toBe(hmacCheck.check);

    const payload = await encodePlayerQrPayload(SAMPLE_PLAYER, 'ROYALS-CODE');

    // Genuine verification
    const okRes = await verifyScannedPlayerQr(payload, {
      players: [SAMPLE_PLAYER],
      clubSecurityCode: 'ROYALS-CODE',
    });
    expect(okRes.status).toBe('genuine');
    expect(okRes.player?.id).toBe('CRICS-PLR-1001');

    // Tampered check character -> Found but details differ
    const tamperedCheck = payload.slice(0, -1) + (payload.endsWith('A') ? 'B' : 'A');
    const badCheckRes = await verifyScannedPlayerQr(tamperedCheck, {
      players: [SAMPLE_PLAYER],
      clubSecurityCode: 'ROYALS-CODE',
    });
    expect(badCheckRes.status).toBe('details-differ');

    // Tampered jersey -> Found but details differ
    const tamperedJersey = payload.replace('.18.', '.99.');
    const badJerseyRes = await verifyScannedPlayerQr(tamperedJersey, {
      players: [SAMPLE_PLAYER],
      clubSecurityCode: 'ROYALS-CODE',
    });
    expect(badJerseyRes.status).toBe('details-differ');

    // Player modified locally after card print -> Found but details differ
    const modifiedPlayerRes = await verifyScannedPlayerQr(payload, {
      players: [{ ...SAMPLE_PLAYER, name: 'Imposter Name' }],
      clubSecurityCode: 'ROYALS-CODE',
    });
    expect(modifiedPlayerRes.status).toBe('details-differ');

    // Malformed / foreign QR -> Not a CRICS code
    const nonCrics = await verifyScannedPlayerQr('https://example.com/player/1001', {
      players: [SAMPLE_PLAYER],
      clubSecurityCode: 'ROYALS-CODE',
    });
    expect(nonCrics.status).toBe('not-crics');

    // Valid CRICS1 code for player not on device -> Not found on this device
    const unknownRes = await verifyScannedPlayerQr('CRICS1.9999.7.ABCDEFGH', {
      players: [SAMPLE_PLAYER],
      clubSecurityCode: 'ROYALS-CODE',
    });
    expect(unknownRes.status).toBe('not-found');
  });

  it('3. exports and imports club roster JSON so a second device can verify passes offline without local players or club code', async () => {
    const roster = await buildClubRosterExport([SAMPLE_PLAYER, PLAYER_NO_JERSEY], 'CLUB-SECRET-99');
    expect(roster.app).toBe('CRICS');
    expect(roster.type).toBe('club-roster');
    expect(roster.players).toHaveLength(2);
    expect(roster.players[0].id).toBe('CRICS-PLR-1001');
    expect(roster.players[0].name).toBe('Aarav Sharma');
    expect(roster.players[0].jerseyNumber).toBe(18);
    expect(roster.players[0].checkCode).toMatch(/^[A-Z2-7]{8}$/);
    expect(roster.players[0].mode).toBe('hmac');

    const imported = parseClubRosterImport(JSON.stringify(roster));
    expect(imported.valid).toBe(true);
    expect(imported.entries).toHaveLength(2);

    const payloadFromPhoneA = await encodePlayerQrPayload(SAMPLE_PLAYER, 'CLUB-SECRET-99');

    // Second phone has ZERO local players and NO clubSecurityCode initially
    const beforeImport = await verifyScannedPlayerQr(payloadFromPhoneA, {
      players: [],
      clubSecurityCode: '',
      importedRoster: [],
    });
    expect(beforeImport.status).toBe('not-found');

    // After importing club roster JSON, Phone B verifies the pass as Genuine!
    const afterImport = await verifyScannedPlayerQr(payloadFromPhoneA, {
      players: [],
      clubSecurityCode: '',
      importedRoster: imported.entries!,
    });
    expect(afterImport.status).toBe('genuine');
    expect(afterImport.rosterEntry?.name).toBe('Aarav Sharma');

    // Tampered code still rejected on Phone B
    const tampered = payloadFromPhoneA.slice(0, -1) + (payloadFromPhoneA.endsWith('A') ? 'B' : 'A');
    const tamperedOnPhoneB = await verifyScannedPlayerQr(tampered, {
      players: [],
      clubSecurityCode: '',
      importedRoster: imported.entries!,
    });
    expect(tamperedOnPhoneB.status).toBe('details-differ');
  });

  it('4. keeps QR version at 3 or lower with ECC level M and guarantees scannability with jsqr at >=300px export size and 140px on-screen size', async () => {
    expect(PLAYER_QR_SIZE_EXPORT).toBeGreaterThanOrEqual(300);
    expect(PLAYER_QR_SIZE_ONSCREEN).toBeGreaterThanOrEqual(140);

    const payload = await encodePlayerQrPayload(SAMPLE_PLAYER, 'ROYALS-SECRET');
    const version = getQrCodeVersion(payload);
    expect(version).toBeLessThanOrEqual(3);

    const qrSpec = QRCode.create(payload, { errorCorrectionLevel: 'M' });
    expect(qrSpec.version).toBeLessThanOrEqual(3);

    const dataUrl = await generatePlayerQrDataUrl(payload);
    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);

    // 1. Decode directly from full pass export QR size (>= 300px)
    const fullPng = decodePngDataUrlToRgba(dataUrl);
    expect(fullPng.width).toBeGreaterThanOrEqual(300);
    expect(fullPng.height).toBeGreaterThanOrEqual(300);

    const decodedFull = jsQR(fullPng.data, fullPng.width, fullPng.height);
    expect(decodedFull).not.toBeNull();
    expect(decodedFull!.data).toBe(payload);

    // 2. Downsample to real on-screen size (140px) and verify jsqr still decodes cleanly
    const rgba140 = resizeRgbaNearest(fullPng, 140);
    const decoded140 = jsQR(rgba140, 140, 140);
    expect(decoded140).not.toBeNull();
    expect(decoded140!.data).toBe(payload);
  });
});
