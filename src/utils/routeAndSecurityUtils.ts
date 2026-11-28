import { NavTab } from '../store/useCricsStore';

export interface ParsedHashRoute {
  tab: NavTab;
  matchId?: string;
  scorecardMatchId?: string;
  playerId?: string;
  tournamentId?: string;
}

const VALID_TABS: Set<NavTab> = new Set([
  'home',
  'live',
  'wizard',
  'scorecards',
  'players',
  'teams',
  'careers',
  'tournaments',
  'leaderboards',
  'settings',
  'scan',
  'privacy',
]);

export function parseHashRoute(rawHash: string): ParsedHashRoute {
  const cleaned = (rawHash || '').replace(/^#\/?/, '').trim();
  if (!cleaned) {
    return { tab: 'home' };
  }

  const parts = cleaned.split('/').map((part) => decodeURIComponent(part));
  const [segment, param] = parts;

  if (segment === 'live') {
    return param ? { tab: 'live', matchId: param } : { tab: 'live' };
  }
  if (segment === 'scorecard' || segment === 'scorecards') {
    return param
      ? { tab: 'scorecards', scorecardMatchId: param }
      : { tab: 'scorecards' };
  }
  if (segment === 'career' || segment === 'careers') {
    return param ? { tab: 'careers', playerId: param } : { tab: 'careers' };
  }
  if (segment === 'tournament' || segment === 'tournaments') {
    return param
      ? { tab: 'tournaments', tournamentId: param }
      : { tab: 'tournaments' };
  }
  if (VALID_TABS.has(segment as NavTab)) {
    return { tab: segment as NavTab };
  }

  return { tab: 'home' };
}

export function buildHashRoute(route: ParsedHashRoute): string {
  switch (route.tab) {
    case 'live':
      return route.matchId
        ? `#/live/${encodeURIComponent(route.matchId)}`
        : '#/live';
    case 'scorecards':
      return route.scorecardMatchId
        ? `#/scorecard/${encodeURIComponent(route.scorecardMatchId)}`
        : '#/scorecards';
    case 'careers':
      return route.playerId
        ? `#/career/${encodeURIComponent(route.playerId)}`
        : '#/careers';
    case 'tournaments':
      return route.tournamentId
        ? `#/tournaments/${encodeURIComponent(route.tournamentId)}`
        : '#/tournaments';
    default:
      return `#/${route.tab}`;
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function computeSha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
    return bytesToHex(new Uint8Array(digest));
  }
  // Fallback deterministic 256-bit mixing if subtle crypto is unavailable
  const out = new Uint8Array(32);
  for (let i = 0; i < data.length; i++) {
    out[i % 32] = (out[i % 32] * 31 + data[i] + i * 17) & 0xff;
  }
  return bytesToHex(out);
}

export async function hashScorerPin(
  pin: string,
  providedSalt?: string
): Promise<{ salt: string; hash: string }> {
  let salt = providedSalt;
  if (!salt) {
    const randomBytes = new Uint8Array(16);
    if (
      typeof globalThis.crypto !== 'undefined' &&
      globalThis.crypto.getRandomValues
    ) {
      globalThis.crypto.getRandomValues(randomBytes);
    } else {
      for (let i = 0; i < 16; i++) {
        randomBytes[i] = Math.floor(Math.random() * 256);
      }
    }
    salt = bytesToHex(randomBytes);
  }

  const hash = await computeSha256Hex(`crics-pin-v1:${salt}:${pin.trim()}`);
  return { salt, hash };
}

export async function verifyScorerPin(
  pin: string,
  salt: string,
  expectedHash: string
): Promise<boolean> {
  if (!salt || !expectedHash) return false;
  const { hash } = await hashScorerPin(pin, salt);
  return hash === expectedHash;
}

export interface MinimalWakeLockSentinel {
  release: () => Promise<void>;
}

export interface MinimalNavigatorWithWakeLock {
  wakeLock?: {
    request: (type: 'screen') => Promise<MinimalWakeLockSentinel>;
  };
}

export interface MinimalDocumentWithVisibility {
  visibilityState: string;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
}

/**
 * Acquires Screen Wake Lock and automatically re-acquires it on visibilitychange
 * when the user returns to the app after switching apps or unlocking the phone.
 */
export function setupLiveWakeLock(
  enabled: boolean,
  navObj: MinimalNavigatorWithWakeLock | undefined = typeof navigator !==
  'undefined'
    ? (navigator as unknown as MinimalNavigatorWithWakeLock)
    : undefined,
  docObj: MinimalDocumentWithVisibility | undefined = typeof document !==
  'undefined'
    ? (document as unknown as MinimalDocumentWithVisibility)
    : undefined
): () => void {
  if (!enabled || !navObj?.wakeLock || !docObj) {
    return () => undefined;
  }

  let sentinel: MinimalWakeLockSentinel | null = null;
  let disposed = false;

  const acquire = async () => {
    if (disposed || docObj.visibilityState !== 'visible') return;
    try {
      const prev = sentinel;
      sentinel = await navObj.wakeLock!.request('screen');
      if (prev && prev !== sentinel) {
        await prev.release().catch(() => undefined);
      }
    } catch {
      // Ignore WakeLock errors when blocked by battery saver or iframe policy
    }
  };

  const handleVisibilityChange = () => {
    if (docObj.visibilityState === 'visible') {
      void acquire();
    } else {
      sentinel = null;
    }
  };

  void acquire();
  docObj.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    disposed = true;
    docObj.removeEventListener('visibilitychange', handleVisibilityChange);
    if (sentinel) {
      void sentinel.release().catch(() => undefined);
      sentinel = null;
    }
  };
}
