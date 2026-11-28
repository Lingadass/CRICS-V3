import { MatchFormat, Player, PlayerCareerStats } from '../engine/types';
import { formatBowlingStyle, TranslationDictionary } from '../i18n/translations';

export async function blobToDataUrl(blob: Blob): Promise<string> {
  if (typeof FileReader !== 'undefined') {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert Blob to data URL'));
        }
      };
      reader.onerror = () => reject(reader.error || new Error('FileReader error'));
      reader.readAsDataURL(blob);
    });
  }

  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(bytes).toString('base64');
  const mime = blob.type || 'image/png';
  return `data:${mime};base64,${base64}`;
}

export interface ExportElementAsImageOptions {
  backgroundColor?: string;
  pixelRatio?: number;
  width?: number;
  height?: number;
  renderer?: (
    node: HTMLElement,
    options: {
      cacheBust: boolean;
      pixelRatio: number;
      backgroundColor: string;
      width?: number;
      height?: number;
    }
  ) => Promise<Blob | null>;
}

/**
 * Shared image export helper:
 * - Converts any blob: image inside the node to a data: URL first
 * - Waits for all images inside the node to load and decode
 * - Calls html-to-image toBlob with cacheBust: false, pixelRatio: 2, solid backgroundColor
 * - Returns a Blob and throws on error (never fails silently)
 */
export async function exportElementAsImage(
  node: HTMLElement,
  options: ExportElementAsImageOptions = {}
): Promise<Blob> {
  if (!node) {
    throw new Error('Export target element is missing.');
  }

  const testErrorHook =
    typeof window !== 'undefined'
      ? (window as unknown as { __CRICS_FORCE_IMAGE_EXPORT_ERROR__?: boolean })
          .__CRICS_FORCE_IMAGE_EXPORT_ERROR__
      : false;
  if (testErrorHook) {
    throw new Error('Forced image export error');
  }

  const images = Array.from(node.querySelectorAll('img'));

  for (const img of images) {
    if (!img.complete) {
      await new Promise<void>((resolve, reject) => {
        const onLoad = () => {
          img.removeEventListener('load', onLoad);
          img.removeEventListener('error', onError);
          resolve();
        };
        const onError = () => {
          img.removeEventListener('load', onLoad);
          img.removeEventListener('error', onError);
          reject(new Error(`Failed to load image: ${img.src}`));
        };
        img.addEventListener('load', onLoad);
        img.addEventListener('error', onError);
      });
    }
    if (typeof img.decode === 'function') {
      try {
        await img.decode();
      } catch {
        // Ignore decode rejection if already complete
      }
    }
    const src = img.getAttribute('src') || img.src || '';
    if (src.startsWith('blob:') && typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width || 240;
      canvas.height = img.naturalHeight || img.height || 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        img.setAttribute('src', dataUrl);
        img.src = dataUrl;
      }
    }
  }

  const pixelRatio = options.pixelRatio ?? 2;
  const backgroundColor = options.backgroundColor ?? 'rgb(18, 26, 69)';

  const renderFn =
    options.renderer ??
    (async (targetNode, renderOpts) => {
      const { toBlob } = await import('html-to-image');
      return toBlob(targetNode, renderOpts);
    });

  const blob = await renderFn(node, {
    cacheBust: false,
    pixelRatio,
    backgroundColor,
    ...(options.width ? { width: options.width } : {}),
    ...(options.height ? { height: options.height } : {}),
  });

  if (!blob) {
    throw new Error('Image renderer returned an empty result.');
  }

  return blob;
}

export interface ProfileCardFiltersInput {
  format: MatchFormat | 'ALL';
  season: string;
  teamId: string;
  opponentTeamId: string;
}

export interface ProfileCardExportModel {
  playerId: string;
  playerName: string;
  role: string;
  battingStyle: string;
  bowlingStyle: string;
  jerseyText: string;
  teamText: string;
  filterSummaryText: string;
  matches: number;
  runs: number;
  averageText: string;
  strikeRateText: string;
  highestScoreText: string;
  wickets: number;
  bestBowlingText: string;
  economyText: string;
  catches: number;
  potmCount: number;
  badges: string[];
}

export function buildProfileCardExportModel({
  player,
  teamNames,
  stats,
  filters,
  teamsNameMap,
  t,
}: {
  player: Player;
  teamNames: string[];
  stats: PlayerCareerStats;
  filters: ProfileCardFiltersInput;
  teamsNameMap: Record<string, string>;
  t: TranslationDictionary;
}): ProfileCardExportModel {
  const formatLabel =
    filters.format === 'ALL'
      ? t.careers.allFormatsOption
      : filters.format === 'Custom'
      ? t.careers.customFormatOption
      : filters.format;

  const seasonLabel =
    filters.season === 'ALL'
      ? t.careers.allSeasonsOption
      : `${t.careers.seasonPrefix} ${filters.season}`;

  const teamFilterLabel =
    filters.teamId === 'ALL'
      ? t.careers.allTeamsOption
      : teamsNameMap[filters.teamId] || filters.teamId;

  const opponentFilterLabel =
    filters.opponentTeamId === 'ALL'
      ? t.careers.allOpponentsOption
      : `${t.scoring.vsShort} ${teamsNameMap[filters.opponentTeamId] || filters.opponentTeamId}`;

  const filterSummaryText = `${formatLabel} · ${seasonLabel} · ${teamFilterLabel} · ${opponentFilterLabel}`;

  const teamText =
    filters.teamId !== 'ALL' && teamsNameMap[filters.teamId]
      ? teamsNameMap[filters.teamId]
      : teamNames.length > 0
      ? teamNames.join(' · ')
      : t.careers.allTeamsOption;

  const jerseyText =
    player.jerseyNumber !== null ? `#${player.jerseyNumber}` : '—';

  const highestScoreText = `${stats.highestScore}${stats.highestScoreNotOut ? '*' : ''}`;
  const bestBowlingText = `${stats.bestBowlingWickets}/${stats.bestBowlingRuns}`;

  return {
    playerId: player.id,
    playerName: player.name,
    role: player.role,
    battingStyle: player.battingStyle,
    bowlingStyle: formatBowlingStyle(player.bowlingStyle, t),
    jerseyText,
    teamText,
    filterSummaryText,
    matches: stats.matches,
    runs: stats.runs,
    averageText: stats.average.toFixed(2),
    strikeRateText: stats.strikeRate.toFixed(1),
    highestScoreText,
    wickets: stats.wickets,
    bestBowlingText,
    economyText: stats.economy.toFixed(2),
    catches: stats.catches,
    potmCount: stats.potmCount,
    badges: stats.badges.length > 0 ? stats.badges : [t.careers.defaultContenderBadge],
  };
}

export function chunkPassesIntoPages<T>(items: T[], perPage = 8): T[][] {
  if (perPage <= 0) return [items];
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += perPage) {
    pages.push(items.slice(i, i + perPage));
  }
  return pages;
}

/**
 * Generates a deterministic avatar data URL for players without an uploaded photo,
 * so the photo region on exported cards and passes always renders a rich visual crest.
 */
export function buildDeterministicAvatarDataUrl(
  playerName: string,
  jerseyNumber: number | null
): string {
  const initials = playerName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'CR';
  const badgeText = jerseyNumber !== null ? `#${jerseyNumber}` : initials;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="rgb(44, 71, 214)"/>
        <stop offset="50%" stop-color="rgb(29, 42, 110)"/>
        <stop offset="100%" stop-color="rgb(245, 158, 11)"/>
      </linearGradient>
    </defs>
    <rect width="240" height="240" rx="36" fill="url(#g)"/>
    <circle cx="120" cy="92" r="46" fill="rgb(255, 255, 255)" fill-opacity="0.22"/>
    <path d="M48 212 C48 162 192 162 192 212" fill="rgb(255, 255, 255)" fill-opacity="0.22"/>
    <text x="120" y="106" text-anchor="middle" font-family="sans-serif" font-size="44" font-weight="800" fill="rgb(255, 255, 255)">${initials}</text>
    <rect x="50" y="152" width="140" height="40" rx="20" fill="rgb(18, 26, 69)" stroke="rgb(245, 158, 11)" stroke-width="3"/>
    <text x="120" y="179" text-anchor="middle" font-family="monospace" font-size="24" font-weight="800" fill="rgb(251, 191, 36)">${badgeText}</text>
  </svg>`;

  const encoded =
    typeof btoa === 'function'
      ? btoa(unescape(encodeURIComponent(svg)))
      : Buffer.from(svg, 'utf8').toString('base64');
  return `data:image/svg+xml;base64,${encoded}`;
}
