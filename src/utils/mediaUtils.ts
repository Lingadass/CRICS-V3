import { Player, PlayerRole, BattingStyle, BowlingStyle } from '../engine/types';

/**
 * Compresses any uploaded image file to a maximum dimension of 300px using an offscreen canvas.
 * Returns a binary Blob for storage in the dedicated IndexedDB playerPhotos table.
 */
export async function compressImageTo300pxBlob(file: File): Promise<Blob> {
  const dataUrl = await compressImageTo300px(file);
  return dataUrlToBlob(dataUrl);
}

/**
 * Compresses any uploaded image file to a maximum dimension of 300px using an offscreen canvas.
 */
export async function compressImageTo300px(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image content'));
      img.onload = () => {
        const MAX_SIZE = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a base64 DataURL into a binary Blob.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  if (parts.length < 2) {
    return new Blob([], { type: 'image/jpeg' });
  }
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binaryStr = atob(parts[1]);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Converts a binary Blob into a base64 DataURL (used only when exporting JSON backups).
 */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  const mime = blob.type || 'image/jpeg';
  return `data:${mime};base64,${base64}`;
}

/**
 * Generates an automatic sequential or unique Player ID (e.g., CRICS-PLR-1025)
 */
export function generateAutoPlayerId(existingPlayers: Player[]): string {
  let maxNum = 1000;
  for (const p of existingPlayers) {
    const m = p.id.match(/CRICS-PLR-(\d+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }
  return `CRICS-PLR-${maxNum + 1}`;
}

/**
 * Checks for potential duplicate players based on similar name + matching or close DOB.
 */
export function findDuplicatePlayers(
  name: string,
  dob: string,
  existingPlayers: Player[],
  excludeId?: string
): Player[] {
  const cleanTarget = name.trim().toLowerCase().replace(/\s+/g, ' ');
  if (cleanTarget.length < 2) return [];

  return existingPlayers.filter((p) => {
    if (excludeId && p.id === excludeId) return false;
    const cleanExisting = p.name.trim().toLowerCase().replace(/\s+/g, ' ');
    const exactOrSubstring =
      cleanExisting === cleanTarget ||
      (cleanTarget.length >= 4 &&
        (cleanExisting.includes(cleanTarget) || cleanTarget.includes(cleanExisting)));
    const distance = levenshteinDistance(cleanTarget, cleanExisting);
    const nameSimilar = exactOrSubstring || distance <= 2;

    if (!dob) return cleanExisting === cleanTarget;
    return nameSimilar && (p.dob === dob || cleanExisting === cleanTarget);
  });
}

function levenshteinDistance(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[a.length][b.length];
}

/**
 * Neutralizes spreadsheet formulas (=, +, -, @, tab, CR) by prefixing with a single quote,
 * and quotes every text field in RFC-4180 format.
 */
function quoteAndNeutralizeCsvField(rawVal: string | undefined | null): string {
  const val = rawVal ?? '';
  const needsNeutralization = /^[=+\-@\t\r]/.test(val);
  const safeVal = needsNeutralization ? `'${val}` : val;
  return `"${safeVal.replace(/"/g, '""')}"`;
}

function unneutralizeFormulaPrefix(val: string): string {
  if (val.length >= 2 && val[0] === "'" && /^[=+\-@\t\r]/.test(val.slice(1))) {
    return val.slice(1);
  }
  return val;
}

export function exportPlayersToCsv(players: Player[]): string {
  const headers = [
    'id',
    'name',
    'dob',
    'role',
    'battingStyle',
    'bowlingStyle',
    'jerseyNumber',
    'phone',
    'notes',
  ].map((h) => `"${h}"`);

  const rows = players.map((p) =>
    [
      quoteAndNeutralizeCsvField(p.id),
      quoteAndNeutralizeCsvField(p.name),
      quoteAndNeutralizeCsvField(p.dob || ''),
      quoteAndNeutralizeCsvField(p.role),
      quoteAndNeutralizeCsvField(p.battingStyle),
      quoteAndNeutralizeCsvField(p.bowlingStyle),
      p.jerseyNumber !== null && p.jerseyNumber !== undefined
        ? String(p.jerseyNumber)
        : '',
      quoteAndNeutralizeCsvField(p.phone || ''),
      quoteAndNeutralizeCsvField(p.notes || ''),
    ].join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

/**
 * Full RFC-4180 compliant CSV state-machine parser supporting quoted commas,
 * escaped double quotes (""), and multi-line line breaks inside quoted fields.
 */
export function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    const nextCh = csvText[i + 1];

    if (inQuotes) {
      if (ch === '"') {
        if (nextCh === '"') {
          currentField += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (ch === '\r' && nextCh === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i++; // skip \n
      } else if (ch === '\n' || ch === '\r') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += ch;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

export type CsvDuplicateIdPolicy = 'update-existing' | 'create-new' | 'skip';

export function parsePlayersFromCsv(
  csvText: string,
  existingPlayers: Player[],
  duplicateIdPolicy: CsvDuplicateIdPolicy = 'create-new'
): Player[] {
  const rows = parseCsvRows(csvText);
  if (rows.length <= 1) return [];

  const result: Player[] = [];
  const tempPool = [...existingPlayers];
  const existingIds = new Set(existingPlayers.map((p) => p.id));

  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i].map((c) => unneutralizeFormulaPrefix(c.trim()));
    const rawId = cols[0] || '';
    const rawName = cols[1] || '';
    if (!rawName) continue;

    const idExists = Boolean(rawId && existingIds.has(rawId));
    if (idExists && duplicateIdPolicy === 'skip') {
      continue;
    }

    let resolvedId: string;
    if (rawId && rawId.startsWith('CRICS-PLR-')) {
      if (idExists && duplicateIdPolicy === 'create-new') {
        resolvedId = generateAutoPlayerId(tempPool);
      } else {
        resolvedId = rawId;
      }
    } else {
      resolvedId = generateAutoPlayerId(tempPool);
    }

    const rawDob = cols[2] || ''; // Never invent missing DOB!
    const rawJerseyStr = cols[6] ?? '';
    const parsedJersey =
      rawJerseyStr === '' || isNaN(Number(rawJerseyStr))
        ? null
        : Number(rawJerseyStr); // Never invent missing jersey number!

    const player: Player = {
      id: resolvedId,
      name: rawName,
      dob: rawDob,
      role: (['Batter', 'Bowler', 'All-Rounder', 'Wicket-Keeper'].includes(cols[3])
        ? cols[3]
        : 'All-Rounder') as PlayerRole,
      battingStyle: (cols[4] === 'Left-hand bat'
        ? 'Left-hand bat'
        : 'Right-hand bat') as BattingStyle,
      bowlingStyle: (cols[5] || 'None') as BowlingStyle,
      jerseyNumber: parsedJersey,
      phone: cols[7] || '',
      notes: cols[8] || '',
      createdAt: Date.now() + i,
    };
    tempPool.push(player);
    existingIds.add(resolvedId);
    result.push(player);
  }
  return result;
}
