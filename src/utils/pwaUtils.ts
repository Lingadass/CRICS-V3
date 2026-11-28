export const SCORING_IDLE_UPDATE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

export interface SwUpdateGatingInput {
  swUpdateAvailable: boolean;
  activeTab: string;
  hasLiveMatch?: boolean;
  lastScoringActionTimestamp?: number;
  now?: number;
}

/**
 * Shows the update prompt when the user is not on the live scoring screen
 * and no scoring action happened in the last 10 minutes, even if an old match is still marked live.
 */
export function shouldShowSwUpdateBanner(input: SwUpdateGatingInput): boolean {
  if (!input.swUpdateAvailable) return false;
  if (input.activeTab === 'live') return false;
  const now = input.now ?? Date.now();
  if (
    typeof input.lastScoringActionTimestamp === 'number' &&
    input.lastScoringActionTimestamp > 0 &&
    now - input.lastScoringActionTimestamp < SCORING_IDLE_UPDATE_THRESHOLD_MS
  ) {
    return false;
  }
  return true;
}

/**
 * Validates the 8-byte PNG header signature and extracts IHDR width and height.
 */
export function parsePngDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24) return null;
  const pngSig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < pngSig.length; i++) {
    if (bytes[i] !== pngSig[i]) return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  return { width, height };
}

/**
 * Validates a Windows .ico container and extracts the embedded icon sizes.
 */
export function parseIcoDimensions(
  bytes: Uint8Array
): { sizes: { width: number; height: number }[]; byteLength: number } | null {
  if (bytes.length < 22) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const reserved = view.getUint16(0, true);
  const type = view.getUint16(2, true);
  const count = view.getUint16(4, true);
  if (reserved !== 0 || type !== 1 || count === 0) return null;
  if (bytes.length < 6 + count * 16) return null;

  const sizes: { width: number; height: number }[] = [];
  for (let i = 0; i < count; i++) {
    const entryOffset = 6 + i * 16;
    const wByte = bytes[entryOffset + 0];
    const hByte = bytes[entryOffset + 1];
    const imgSize = view.getUint32(entryOffset + 8, true);
    const imgOffset = view.getUint32(entryOffset + 12, true);
    if (imgOffset + imgSize > bytes.length) return null;
    sizes.push({
      width: wByte === 0 ? 256 : wByte,
      height: hByte === 0 ? 256 : hByte,
    });
  }

  return { sizes, byteLength: bytes.byteLength };
}

/**
 * Inspects assetlinks.json content and returns a build warning if a placeholder SHA-256 fingerprint remains.
 */
export function checkAssetLinksPlaceholder(rawJson: string): {
  hasPlaceholder: boolean;
  warningMessage?: string;
} {
  const hasPlaceholder =
    rawJson.includes('TODO_REPLACE') ||
    rawJson.includes('00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF');
  if (hasPlaceholder) {
    return {
      hasPlaceholder: true,
      warningMessage:
        '[CRICS TWA Build Warning] public/.well-known/assetlinks.json still contains a placeholder SHA-256 certificate fingerprint. Replace it with your Google Play App Signing SHA-256 fingerprint before publishing to Play Console.',
    };
  }
  return { hasPlaceholder: false };
}
