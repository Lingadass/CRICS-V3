import QRCode from 'qrcode';
import { Player } from '../engine/types';

export const PLAYER_QR_VERSION = 'CRICS1';
export const PLAYER_QR_SIZE_EXPORT = 320;
export const PLAYER_QR_SIZE_ONSCREEN = 144;

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const QR_DARK = ['#', '000000'].join('');
const QR_LIGHT = ['#', 'ffffff'].join('');
const IMPORTED_ROSTER_STORAGE_KEY = 'crics_imported_club_roster_v1';

export type CheckCodeMode = 'hmac' | 'crc';

export interface ParsedPlayerQrPayload {
  version: typeof PLAYER_QR_VERSION;
  compactId: string;
  jersey: number;
  check: string;
  raw: string;
}

export interface ClubRosterPlayerEntry {
  id: string;
  name: string;
  jerseyNumber: number | null;
  role?: string;
  checkCode: string;
  mode: CheckCodeMode;
}

export interface ClubRosterPayload {
  app: 'CRICS';
  type: 'club-roster';
  rosterVersion: 1;
  exportedAt: string;
  players: ClubRosterPlayerEntry[];
}

export interface QrVerificationResult {
  status: 'genuine' | 'details-differ' | 'not-crics' | 'not-found';
  mode?: CheckCodeMode;
  source?: 'local' | 'roster';
  player?: Player;
  rosterEntry?: ClubRosterPlayerEntry;
  parsed?: ParsedPlayerQrPayload;
  rawText: string;
}

export function stripPlayerIdPrefix(playerId: string): string {
  const trimmed = (playerId || '').trim();
  if (trimmed.startsWith('CRICS-PLR-')) {
    return trimmed.slice('CRICS-PLR-'.length);
  }
  return trimmed;
}

function encodeBytesToBase32(bytes: Uint8Array, charCount = 8): string {
  let bits = 0;
  let value = 0;
  let out = '';

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
      if (out.length >= charCount) return out;
    }
  }
  if (bits > 0 && out.length < charCount) {
    out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return out.slice(0, charCount).padEnd(charCount, BASE32_ALPHABET[0]);
}

function computeCrc32Bytes(input: Uint8Array, seed = 0xffffffff): number {
  let crc = seed >>> 0;
  for (let i = 0; i < input.length; i++) {
    crc ^= input[i];
    for (let j = 0; j < 8; j++) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function computeCrcCheckCode(canonicalMsg: string): string {
  const encoder = new TextEncoder();
  const dataA = encoder.encode(canonicalMsg);
  const dataB = encoder.encode(`CRICS1:${canonicalMsg}`);
  const crcA = computeCrc32Bytes(dataA);
  const crcB = computeCrc32Bytes(dataB);
  const combined = new Uint8Array(8);
  combined[0] = (crcA >>> 24) & 0xff;
  combined[1] = (crcA >>> 16) & 0xff;
  combined[2] = (crcA >>> 8) & 0xff;
  combined[3] = crcA & 0xff;
  combined[4] = (crcB >>> 24) & 0xff;
  combined[5] = (crcB >>> 16) & 0xff;
  combined[6] = (crcB >>> 8) & 0xff;
  combined[7] = crcB & 0xff;
  return encodeBytesToBase32(combined, 8);
}

function buildCanonicalCheckInput(player: Pick<Player, 'id' | 'name' | 'dob' | 'jerseyNumber'>): string {
  const jersey =
    player.jerseyNumber !== null && player.jerseyNumber !== undefined
      ? String(player.jerseyNumber)
      : '0';
  return [
    player.id.trim(),
    player.name.trim(),
    (player.dob || '').trim(),
    jersey,
  ].join('|');
}

export async function computePlayerCheckCode(
  player: Pick<Player, 'id' | 'name' | 'dob' | 'jerseyNumber'>,
  clubSecurityCode?: string
): Promise<{ check: string; mode: CheckCodeMode }> {
  const canonical = buildCanonicalCheckInput(player);
  const trimmedSecret = (clubSecurityCode || '').trim();

  if (!trimmedSecret) {
    return {
      check: computeCrcCheckCode(canonical),
      mode: 'crc',
    };
  }

  const encoder = new TextEncoder();
  const secretBytes = encoder.encode(trimmedSecret);
  const msgBytes = encoder.encode(canonical);

  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    const cryptoKey = await globalThis.crypto.subtle.importKey(
      'raw',
      secretBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuffer = await globalThis.crypto.subtle.sign('HMAC', cryptoKey, msgBytes);
    return {
      check: encodeBytesToBase32(new Uint8Array(sigBuffer), 8),
      mode: 'hmac',
    };
  }

  return {
    check: computeCrcCheckCode(`${trimmedSecret}|${canonical}`),
    mode: 'hmac',
  };
}

export async function encodePlayerQrPayload(
  player: Pick<Player, 'id' | 'name' | 'dob' | 'jerseyNumber'>,
  clubSecurityCode?: string
): Promise<string> {
  const compactId = stripPlayerIdPrefix(player.id);
  const jersey =
    player.jerseyNumber !== null && player.jerseyNumber !== undefined
      ? String(player.jerseyNumber)
      : '0';
  const { check } = await computePlayerCheckCode(player, clubSecurityCode);
  return `${PLAYER_QR_VERSION}.${compactId}.${jersey}.${check}`;
}

export function parsePlayerQrPayload(rawText: string): ParsedPlayerQrPayload | null {
  const trimmed = (rawText || '').trim();
  if (!trimmed) return null;
  const parts = trimmed.split('.');
  if (parts.length < 4 || parts[0] !== PLAYER_QR_VERSION) {
    return null;
  }

  const checkRaw = parts[parts.length - 1].toUpperCase();
  const jerseyRaw = parts[parts.length - 2];
  const compactId = parts.slice(1, parts.length - 2).join('.').trim();

  if (!compactId || !/^\d+$/.test(jerseyRaw) || !/^[A-Z2-7]{8}$/.test(checkRaw)) {
    return null;
  }

  return {
    version: PLAYER_QR_VERSION,
    compactId,
    jersey: Number(jerseyRaw),
    check: checkRaw,
    raw: trimmed,
  };
}

export function getQrCodeVersion(payload: string): number {
  const qr = QRCode.create(payload, { errorCorrectionLevel: 'M' });
  return qr.version;
}

export async function generatePlayerQrDataUrl(
  payload: string,
  width = PLAYER_QR_SIZE_EXPORT
): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 4,
    width: Math.max(300, width),
    color: {
      dark: QR_DARK,
      light: QR_LIGHT,
    },
  });
}

export async function verifyScannedPlayerQr(
  rawText: string,
  context: {
    players: Player[];
    clubSecurityCode?: string;
    importedRoster?: ClubRosterPlayerEntry[];
  }
): Promise<QrVerificationResult> {
  const parsed = parsePlayerQrPayload(rawText);
  if (!parsed) {
    return { status: 'not-crics', rawText: (rawText || '').trim() };
  }

  const localPlayer = context.players.find(
    (p) =>
      p.id === parsed.compactId ||
      stripPlayerIdPrefix(p.id).toUpperCase() === parsed.compactId.toUpperCase()
  );

  const rosterEntry = (context.importedRoster || []).find(
    (r) =>
      r.id === parsed.compactId ||
      stripPlayerIdPrefix(r.id).toUpperCase() === parsed.compactId.toUpperCase()
  );

  if (localPlayer) {
    const localJersey =
      localPlayer.jerseyNumber !== null && localPlayer.jerseyNumber !== undefined
        ? localPlayer.jerseyNumber
        : 0;
    const expected = await computePlayerCheckCode(localPlayer, context.clubSecurityCode);

    if (parsed.jersey === localJersey && parsed.check === expected.check) {
      return {
        status: 'genuine',
        mode: expected.mode,
        source: 'local',
        player: localPlayer,
        parsed,
        rawText: parsed.raw,
      };
    }

    // If no club security code is configured on this verifier device, allow an imported signed roster match when details match
    if (
      !(context.clubSecurityCode || '').trim() &&
      rosterEntry &&
      rosterEntry.name.trim() === localPlayer.name.trim() &&
      (rosterEntry.jerseyNumber ?? 0) === localJersey &&
      parsed.jersey === localJersey &&
      parsed.check === rosterEntry.checkCode
    ) {
      return {
        status: 'genuine',
        mode: rosterEntry.mode,
        source: 'roster',
        player: localPlayer,
        rosterEntry,
        parsed,
        rawText: parsed.raw,
      };
    }

    return {
      status: 'details-differ',
      mode: expected.mode,
      source: 'local',
      player: localPlayer,
      parsed,
      rawText: parsed.raw,
    };
  }

  if (rosterEntry) {
    const rosterJersey =
      rosterEntry.jerseyNumber !== null && rosterEntry.jerseyNumber !== undefined
        ? rosterEntry.jerseyNumber
        : 0;

    if (parsed.jersey === rosterJersey && parsed.check === rosterEntry.checkCode) {
      return {
        status: 'genuine',
        mode: rosterEntry.mode,
        source: 'roster',
        rosterEntry,
        parsed,
        rawText: parsed.raw,
      };
    }

    return {
      status: 'details-differ',
      mode: rosterEntry.mode,
      source: 'roster',
      rosterEntry,
      parsed,
      rawText: parsed.raw,
    };
  }

  return {
    status: 'not-found',
    parsed,
    rawText: parsed.raw,
  };
}

export async function buildClubRosterExport(
  players: Player[],
  clubSecurityCode?: string
): Promise<ClubRosterPayload> {
  const active = players.filter((p) => !p.archived);
  const entries: ClubRosterPlayerEntry[] = await Promise.all(
    active.map(async (p) => {
      const { check, mode } = await computePlayerCheckCode(p, clubSecurityCode);
      return {
        id: p.id,
        name: p.name,
        jerseyNumber: p.jerseyNumber ?? null,
        role: p.role,
        checkCode: check,
        mode,
      };
    })
  );

  return {
    app: 'CRICS',
    type: 'club-roster',
    rosterVersion: 1,
    exportedAt: new Date().toISOString(),
    players: entries,
  };
}

export function parseClubRosterImport(rawJson: string): {
  valid: boolean;
  entries?: ClubRosterPlayerEntry[];
  error?: string;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { valid: false, error: 'Invalid JSON syntax.' };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { valid: false, error: 'Invalid roster JSON format.' };
  }

  const obj = parsed as Record<string, unknown>;
  if (obj.app !== 'CRICS' || obj.type !== 'club-roster' || !Array.isArray(obj.players)) {
    return { valid: false, error: 'Not a valid CRICS club roster file.' };
  }

  const entries: ClubRosterPlayerEntry[] = [];
  for (const row of obj.players) {
    if (!row || typeof row !== 'object') continue;
    const item = row as Record<string, unknown>;
    if (
      typeof item.id !== 'string' ||
      !item.id.trim() ||
      typeof item.name !== 'string' ||
      !item.name.trim() ||
      typeof item.checkCode !== 'string' ||
      !/^[A-Z2-7]{8}$/i.test(item.checkCode.trim())
    ) {
      return { valid: false, error: 'Invalid player entry inside club roster file.' };
    }
    entries.push({
      id: item.id.trim(),
      name: item.name.trim(),
      jerseyNumber:
        typeof item.jerseyNumber === 'number' && Number.isFinite(item.jerseyNumber)
          ? item.jerseyNumber
          : null,
      role: typeof item.role === 'string' ? item.role : undefined,
      checkCode: item.checkCode.trim().toUpperCase(),
      mode: item.mode === 'hmac' ? 'hmac' : 'crc',
    });
  }

  return { valid: true, entries };
}

export function loadImportedClubRoster(): ClubRosterPlayerEntry[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(IMPORTED_ROSTER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ClubRosterPlayerEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveImportedClubRoster(entries: ClubRosterPlayerEntry[]): ClubRosterPlayerEntry[] {
  const existing = loadImportedClubRoster();
  const mergedMap = new Map<string, ClubRosterPlayerEntry>();
  for (const item of existing) {
    mergedMap.set(item.id, item);
  }
  for (const item of entries) {
    mergedMap.set(item.id, item);
  }
  const merged = Array.from(mergedMap.values());
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(IMPORTED_ROSTER_STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // Ignore storage quota errors
    }
  }
  return merged;
}
