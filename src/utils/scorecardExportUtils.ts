import { DerivedInningsState, DerivedMatchState, MatchRecord, Player } from '../engine/types';
import { TranslationDictionary } from '../i18n/translations';

export interface ExportBattingRow {
  playerId: string;
  batterName: string;
  statusText: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: string;
}

export interface ExportBowlingRow {
  playerId: string;
  bowlerName: string;
  overs: string;
  maidens: number;
  runs: number;
  wickets: number;
  economy: string;
}

export interface ExportFowItem {
  wicketNumber: number;
  scoreAtDismissal: number;
  batterName: string;
  oversFormatted: string;
  formattedText: string;
}

export interface ExportPartnershipItem {
  batter1Name: string;
  batter2Name: string;
  runs: number;
  balls: number;
  isUnbroken: boolean;
  formattedText: string;
}

export interface ExportInningsData {
  inningsNumber: number;
  isSuperOver: boolean;
  headingText: string;
  battingTeamId: string;
  battingTeamName: string;
  bowlingTeamId: string;
  bowlingTeamName: string;
  totalRuns: number;
  wickets: number;
  oversFormatted: string;
  runRateFormatted: string;
  extrasText: string;
  totalText: string;
  didNotBatNames: string[];
  didNotBatText: string;
  battingRows: ExportBattingRow[];
  bowlingRows: ExportBowlingRow[];
  fallOfWickets: ExportFowItem[];
  partnerships: ExportPartnershipItem[];
}

export interface ExportScorecardData {
  matchId: string;
  matchTitle: string;
  date: string;
  venue: string;
  format: string;
  scorerName: string;
  tossText: string;
  resultText: string;
  potmText: string;
  innings: ExportInningsData[];
}

export function buildExportScorecardData(
  match: MatchRecord,
  derived: DerivedMatchState,
  playersMap: Record<string, Player>,
  teamsNameMap: Record<string, string>,
  t: TranslationDictionary
): ExportScorecardData {
  const tossWinnerName = teamsNameMap[match.tossWinnerTeamId] || match.tossWinnerTeamId;
  const tossTpl =
    match.tossDecision === 'bat'
      ? t.scorecards.tossWonByBatTpl
      : t.scorecards.tossWonByBowlTpl;
  const tossText = tossTpl.replace('{team}', tossWinnerName);

  const potmId = match.manualPlayerOfTheMatchId || derived.calculatedPotmPlayerId;
  const potmPlayer = potmId ? playersMap[potmId] : undefined;
  const potmSuffix = match.manualPlayerOfTheMatchId
    ? t.scorecards.potmManualSuffix
    : t.scorecards.potmAutoSuffix;
  const potmText = potmPlayer
    ? `${potmPlayer.name} ${potmSuffix}`
    : t.scorecards.potmAutoCalculated;

  const inningsNums = Object.keys(derived.inningsStates)
    .map(Number)
    .sort((a, b) => a - b);

  const innings: ExportInningsData[] = inningsNums.map((num) => {
    const st: DerivedInningsState = derived.inningsStates[num];
    const battingTeamName = teamsNameMap[st.battingTeamId] || st.battingTeamId;
    const bowlingTeamName = teamsNameMap[st.bowlingTeamId] || st.bowlingTeamId;
    const headingPrefix = st.isSuperOver
      ? `${t.scorecards.superOverLabel} (${battingTeamName})`
      : `${t.scorecards.inningsLabel} ${num}: ${battingTeamName}`;
    const headingText = `${headingPrefix} — ${st.totalRuns}/${st.wickets} (${st.oversFormatted})`;

    const battingRows: ExportBattingRow[] = st.battingCard
      .filter((b) => b.status !== 'did-not-bat')
      .map((b) => ({
        playerId: b.playerId,
        batterName: playersMap[b.playerId]?.name || b.playerId,
        statusText: b.dismissalText,
        runs: b.runs,
        balls: b.balls,
        fours: b.fours,
        sixes: b.sixes,
        strikeRate: b.strikeRate.toFixed(1),
      }));

    const didNotBatNames = st.battingCard
      .filter((b) => b.status === 'did-not-bat')
      .map((b) => playersMap[b.playerId]?.name || b.playerId);

    const extrasText = `${st.extras.total} (${t.scoring.wide}: ${st.extras.wides}, ${t.scoring.noBall}: ${st.extras.noBalls}, ${t.scoring.bye}: ${st.extras.byes}, ${t.scoring.legBye}: ${st.extras.legByes}, ${t.scoring.penalty}: ${st.extras.penalty})`;
    const totalText = `${st.totalRuns}/${st.wickets} (${st.oversFormatted} ${t.scorecards.oversLabel}, ${t.scoring.crr}: ${st.currentRunRate.toFixed(2)})`;

    const bowlingRows: ExportBowlingRow[] = st.bowlingCard.map((bw) => ({
      playerId: bw.playerId,
      bowlerName: playersMap[bw.playerId]?.name || bw.playerId,
      overs: bw.oversFormatted,
      maidens: bw.maidens,
      runs: bw.runsConceded,
      wickets: bw.wickets,
      economy: bw.economy.toFixed(2),
    }));

    const fallOfWickets: ExportFowItem[] = st.fallOfWickets.map((fow) => {
      const batterName = playersMap[fow.dismissedPlayerId]?.name || fow.dismissedPlayerId;
      return {
        wicketNumber: fow.wicketNumber,
        scoreAtDismissal: fow.scoreAtDismissal,
        batterName,
        oversFormatted: fow.oversFormatted,
        formattedText: `${fow.scoreAtDismissal}-${fow.wicketNumber} (${batterName}, ${fow.oversFormatted} ${t.scoring.oversShort})`,
      };
    });

    const partnerships: ExportPartnershipItem[] = st.partnerships.map((pt) => {
      const batter1Name = playersMap[pt.batter1Id]?.name || pt.batter1Id;
      const batter2Name = playersMap[pt.batter2Id]?.name || pt.batter2Id;
      const unbrokenMark = pt.isUnbroken ? '*' : '';
      return {
        batter1Name,
        batter2Name,
        runs: pt.runs,
        balls: pt.balls,
        isUnbroken: pt.isUnbroken,
        formattedText: `${batter1Name} & ${batter2Name}: ${pt.runs}${unbrokenMark} (${pt.balls}${t.scoring.ballsSuffix})`,
      };
    });

    return {
      inningsNumber: num,
      isSuperOver: st.isSuperOver,
      headingText,
      battingTeamId: st.battingTeamId,
      battingTeamName,
      bowlingTeamId: st.bowlingTeamId,
      bowlingTeamName,
      totalRuns: st.totalRuns,
      wickets: st.wickets,
      oversFormatted: st.oversFormatted,
      runRateFormatted: st.currentRunRate.toFixed(2),
      extrasText,
      totalText,
      didNotBatNames,
      didNotBatText: didNotBatNames.join(' · '),
      battingRows,
      bowlingRows,
      fallOfWickets,
      partnerships,
    };
  });

  return {
    matchId: match.id,
    matchTitle: match.title,
    date: match.date,
    venue: match.venue,
    format: match.format,
    scorerName: match.scorerName,
    tossText,
    resultText: derived.resultSummaryText,
    potmText,
    innings,
  };
}

export function buildScorecardPdfFilename(matchTitle: string, date: string): string {
  const safeTitle = matchTitle.replace(/[\\/:*?"<>|]/g, '-').trim();
  const safeDate = date.replace(/[\\/:*?"<>|]/g, '-').trim();
  return `${safeTitle}-${safeDate}.pdf`;
}

export function buildScorecardPngFilename(matchTitle: string, date: string): string {
  const safeTitle = matchTitle.replace(/[\\/:*?"<>|]/g, '-').trim();
  const safeDate = date.replace(/[\\/:*?"<>|]/g, '-').trim();
  return `${safeTitle}-${safeDate}.png`;
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1500);
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const binaryStr = atob(parts[1]);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export interface ShareNavigatorLike {
  canShare?: (data?: ShareData) => boolean;
  share?: (data?: ShareData) => Promise<void>;
}

export interface ShareOrDownloadOptions {
  blob: Blob;
  filename: string;
  mimeType: string;
  title: string;
  text: string;
  nav?: ShareNavigatorLike;
  triggerDownload?: (blob: Blob, filename: string) => void;
}

export async function shareOrDownloadFile(
  fileOrOptions: File | ShareOrDownloadOptions,
  titleArg?: string,
  navArg?: ShareNavigatorLike,
  triggerDownloadArg?: (blob: Blob, filename: string) => void
): Promise<'shared' | 'downloaded'> {
  if (fileOrOptions instanceof File) {
    const file = fileOrOptions;
    const title = titleArg || file.name;
    const nav = navArg ?? (typeof navigator !== 'undefined' ? navigator : undefined);
    const triggerDownload = triggerDownloadArg ?? triggerBlobDownload;
    if (
      nav &&
      typeof nav.canShare === 'function' &&
      typeof nav.share === 'function' &&
      nav.canShare({ files: [file] })
    ) {
      await nav.share({ files: [file], title });
      return 'shared';
    }
    triggerDownload(file, file.name);
    return 'downloaded';
  }

  const {
    blob,
    filename,
    mimeType,
    title,
    text,
    nav = typeof navigator !== 'undefined' ? navigator : undefined,
    triggerDownload = triggerBlobDownload,
  } = fileOrOptions;

  const file = new File([blob], filename, { type: mimeType });
  if (
    nav &&
    typeof nav.canShare === 'function' &&
    typeof nav.share === 'function' &&
    nav.canShare({ files: [file] })
  ) {
    await nav.share({ files: [file], title, text });
    return 'shared';
  }

  triggerDownload(blob, filename);
  return 'downloaded';
}
