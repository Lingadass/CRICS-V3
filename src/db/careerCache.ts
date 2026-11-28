import { type Table } from 'dexie';
import { CareerFilterOptions } from '../engine/careerStatsEngine';
import { deriveMatchState } from '../engine/matchEngine';
import { formatOvers, isBowlerCreditedWicket, oversToDecimal } from '../engine/scoringRules';
import { BallEvent, MatchFormat, MatchRecord, Player, PlayerCareerStats } from '../engine/types';
import { db } from './database';

export interface PlayerMatchInningsBatting {
  battingTeamId: string; bowlingTeamId: string;
  runs: number; balls: number; fours: number; sixes: number; isNotOut: boolean;
}

export interface PlayerMatchInningsBowling {
  battingTeamId: string; bowlingTeamId: string;
  legalBalls: number; maidens: number; runsConceded: number; wickets: number;
  catches: number; stumpings: number; runOuts: number; hatTricks: number;
}

export interface PlayerMatchContribution {
  matchId: string; date: string; format: MatchFormat; season: string;
  tournamentId?: string; playerTeamId: string; opponentTeamId: string;
  isPotm: boolean;
  battingInnings: PlayerMatchInningsBatting[];
  bowlingInnings: PlayerMatchInningsBowling[];
}

export interface CareerCacheRecord {
  id: string; playerId: string; format: MatchFormat; season: string;
  stats: PlayerCareerStats;
  matchContributions: Record<string, PlayerMatchContribution>;
  updatedAt: number;
}

export interface CareerCacheFilterOptions extends CareerFilterOptions {
  tournamentId?: string;
}

export function buildCareerCacheId(playerId: string, format: MatchFormat, season: string): string {
  return `${playerId}::${format}::${season}`;
}

export function createEmptyCareerStats(playerId: string): PlayerCareerStats {
  return {
    playerId, matches: 0, inningsBatted: 0, notOuts: 0, runs: 0, ballsFaced: 0,
    highestScore: 0, highestScoreNotOut: false, average: 0, strikeRate: 0,
    fours: 0, sixes: 0, ducks: 0, thirties: 0, fifties: 0, hundreds: 0,
    inningsBowled: 0, legalBallsBowled: 0, oversBowledFormatted: '0.0',
    maidens: 0, runsConceded: 0, wickets: 0, bestBowlingWickets: 0, bestBowlingRuns: 0,
    bowlingAverage: 0, economy: 0, bowlingStrikeRate: 0,
    threeWicketHauls: 0, fiveWicketHauls: 0, hatTricks: 0,
    catches: 0, stumpings: 0, runOuts: 0, potmCount: 0, potmMatchIds: [],
    recentForm: [], badges: [],
  };
}

export async function queryBallEventsByMatch(
  matchId: string,
  inningsNumber?: 1 | 2 | 3 | 4
): Promise<BallEvent[]> {
  if (!matchId) return [];
  if (typeof inningsNumber === 'number') {
    const events = await db.ballEvents
      .where('[matchId+inningsNumber]')
      .equals([matchId, inningsNumber])
      .toArray();
    return events.sort((a, b) => a.sequence - b.sequence);
  }
  const events = await db.ballEvents.where('matchId').equals(matchId).toArray();
  return events.sort((a, b) => a.sequence - b.sequence);
}

export function deriveMatchContributionsForMatch(
  match: MatchRecord,
  matchEvents: BallEvent[],
  playersMap: Record<string, Player> = {}
): Record<string, PlayerMatchContribution> {
  const derived = deriveMatchState(match, matchEvents, playersMap);
  const participants = new Set<string>([...match.teamAXI, ...match.teamBXI]);
  const result: Record<string, PlayerMatchContribution> = {};

  for (const pid of participants) {
    const playerTeamId = match.teamAXI.includes(pid) ? match.teamAId : match.teamBId;
    const opponentTeamId = playerTeamId === match.teamAId ? match.teamBId : match.teamAId;
    result[pid] = {
      matchId: match.id, date: match.date, format: match.format, season: match.season,
      tournamentId: match.tournamentId, playerTeamId, opponentTeamId,
      isPotm: Boolean(derived.isMatchCompleted && derived.calculatedPotmPlayerId === pid),
      battingInnings: [], bowlingInnings: [],
    };
  }

  const eventMap = new Map<string, BallEvent>();
  for (const ev of matchEvents) eventMap.set(ev.id, ev);

  for (const innNum of [1, 2] as const) {
    const st = derived.inningsStates[innNum];
    if (!st) continue;

    for (const bRow of st.battingCard) {
      if (bRow.status === 'did-not-bat') continue;
      const contrib = result[bRow.playerId];
      if (!contrib) continue;
      contrib.battingInnings.push({
        battingTeamId: st.battingTeamId, bowlingTeamId: st.bowlingTeamId,
        runs: bRow.runs, balls: bRow.balls, fours: bRow.fours, sixes: bRow.sixes,
        isNotOut: bRow.status === 'batting' || bRow.status === 'retired-hurt',
      });
    }

    const fieldingByPlayer = new Map<string, { catches: number; stumpings: number; runOuts: number }>();
    for (const fow of st.fallOfWickets) {
      if (!fow.fielderId) continue;
      const f = fieldingByPlayer.get(fow.fielderId) || { catches: 0, stumpings: 0, runOuts: 0 };
      if (fow.wicketType === 'caught') f.catches += 1;
      if (fow.wicketType === 'stumped') f.stumpings += 1;
      if (fow.wicketType === 'run-out') f.runOuts += 1;
      fieldingByPlayer.set(fow.fielderId, f);
    }

    const hatTricksByBowler = new Map<string, number>();
    const bowlerDeliveries = new Map<string, boolean[]>();
    for (const chip of st.overSummaries.flatMap((os) => os.balls)) {
      const ev = eventMap.get(chip.eventId);
      if (!ev || ev.extraType === 'penalty') continue;
      const arr = bowlerDeliveries.get(chip.bowlerId) || [];
      arr.push(Boolean(ev.isWicket && isBowlerCreditedWicket(ev.wicketType)));
      bowlerDeliveries.set(chip.bowlerId, arr);
    }
    for (const [bId, flags] of bowlerDeliveries.entries()) {
      let streak = 0;
      let count = 0;
      for (const isW of flags) {
        if (isW) {
          streak += 1;
          if (streak === 3) { count += 1; streak = 0; }
        } else streak = 0;
      }
      if (count > 0) hatTricksByBowler.set(bId, count);
    }

    const recordedBowlerIds = new Set<string>();
    for (const bwRow of st.bowlingCard) {
      const contrib = result[bwRow.playerId];
      if (!contrib) continue;
      if (bwRow.legalBalls > 0 || bwRow.runsConceded > 0) {
        const f = fieldingByPlayer.get(bwRow.playerId) || { catches: 0, stumpings: 0, runOuts: 0 };
        recordedBowlerIds.add(bwRow.playerId);
        contrib.bowlingInnings.push({
          battingTeamId: st.battingTeamId, bowlingTeamId: st.bowlingTeamId,
          legalBalls: bwRow.legalBalls, maidens: bwRow.maidens,
          runsConceded: bwRow.runsConceded, wickets: bwRow.wickets,
          catches: f.catches, stumpings: f.stumpings, runOuts: f.runOuts,
          hatTricks: hatTricksByBowler.get(bwRow.playerId) || 0,
        });
      }
    }

    for (const [fielderId, f] of fieldingByPlayer.entries()) {
      if (recordedBowlerIds.has(fielderId)) continue;
      const contrib = result[fielderId];
      if (!contrib) continue;
      contrib.bowlingInnings.push({
        battingTeamId: st.battingTeamId, bowlingTeamId: st.bowlingTeamId,
        legalBalls: 0, maidens: 0, runsConceded: 0, wickets: 0,
        catches: f.catches, stumpings: f.stumpings, runOuts: f.runOuts, hatTricks: 0,
      });
    }
  }

  return result;
}

export function computeCareerStatsFromContributions(
  playerId: string,
  contributions: PlayerMatchContribution[],
  filters: CareerCacheFilterOptions = {}
): PlayerCareerStats {
  const ps = createEmptyCareerStats(playerId);
  let hasBestBowling = false;
  const sorted = [...contributions].sort((a, b) => a.date.localeCompare(b.date));

  for (const mc of sorted) {
    if (filters.format && filters.format !== 'ALL' && mc.format !== filters.format) continue;
    if (filters.season && filters.season !== 'ALL' && mc.season !== filters.season) continue;
    if (filters.tournamentId && mc.tournamentId !== filters.tournamentId) continue;
    if (filters.teamId && filters.teamId !== 'ALL' && mc.playerTeamId !== filters.teamId) continue;
    if (filters.opponentTeamId && filters.opponentTeamId !== 'ALL' && mc.opponentTeamId !== filters.opponentTeamId) continue;

    ps.matches += 1;
    if (mc.isPotm) { ps.potmCount += 1; ps.potmMatchIds?.push(mc.matchId); }

    let formRuns = 0; let formBalls = 0; let formWickets = 0; let formRunsConceded = 0; let hasFormEntry = false;

    for (const bat of mc.battingInnings) {
      const batAllowed =
        (!filters.teamId || filters.teamId === 'ALL' || bat.battingTeamId === filters.teamId) &&
        (!filters.opponentTeamId || filters.opponentTeamId === 'ALL' || bat.bowlingTeamId === filters.opponentTeamId);
      if (!batAllowed) continue;

      ps.inningsBatted += 1; ps.runs += bat.runs; ps.ballsFaced += bat.balls;
      ps.fours += bat.fours; ps.sixes += bat.sixes;
      if (bat.isNotOut) ps.notOuts += 1;

      if (bat.runs > ps.highestScore || (bat.runs === ps.highestScore && bat.isNotOut && !ps.highestScoreNotOut)) {
        ps.highestScore = bat.runs; ps.highestScoreNotOut = bat.isNotOut;
      }
      if (bat.runs === 0 && !bat.isNotOut) ps.ducks += 1;
      if (bat.runs >= 30 && bat.runs < 50) ps.thirties += 1;
      if (bat.runs >= 50 && bat.runs < 100) ps.fifties += 1;
      if (bat.runs >= 100) ps.hundreds += 1;

      formRuns += bat.runs; formBalls += bat.balls; hasFormEntry = true;
    }

    for (const bowl of mc.bowlingInnings) {
      const bowlAllowed =
        (!filters.teamId || filters.teamId === 'ALL' || bowl.bowlingTeamId === filters.teamId) &&
        (!filters.opponentTeamId || filters.opponentTeamId === 'ALL' || bowl.battingTeamId === filters.opponentTeamId);
      if (!bowlAllowed) continue;

      ps.catches += bowl.catches; ps.stumpings += bowl.stumpings;
      ps.runOuts += bowl.runOuts; ps.hatTricks += bowl.hatTricks;

      if (bowl.legalBalls > 0 || bowl.runsConceded > 0) {
        ps.inningsBowled += 1; ps.legalBallsBowled += bowl.legalBalls;
        ps.maidens += bowl.maidens; ps.runsConceded += bowl.runsConceded; ps.wickets += bowl.wickets;

        if (!hasBestBowling || bowl.wickets > ps.bestBowlingWickets || (bowl.wickets === ps.bestBowlingWickets && bowl.runsConceded < ps.bestBowlingRuns)) {
          ps.bestBowlingWickets = bowl.wickets; ps.bestBowlingRuns = bowl.runsConceded; hasBestBowling = true;
        }
        if (bowl.wickets >= 3 && bowl.wickets < 5) ps.threeWicketHauls += 1;
        if (bowl.wickets >= 5) ps.fiveWicketHauls += 1;

        formWickets += bowl.wickets; formRunsConceded += bowl.runsConceded; hasFormEntry = true;
      }
    }

    if (hasFormEntry) {
      ps.recentForm.push({
        matchId: mc.matchId, date: mc.date, opponentTeamId: mc.opponentTeamId,
        runs: formRuns, balls: formBalls, wickets: formWickets, runsConceded: formRunsConceded,
      });
    }
  }

  const dismissals = ps.inningsBatted - ps.notOuts;
  ps.average = dismissals > 0 ? Number((ps.runs / dismissals).toFixed(2)) : ps.runs;
  ps.strikeRate = ps.ballsFaced > 0 ? Number(((ps.runs / ps.ballsFaced) * 100).toFixed(2)) : 0;

  ps.oversBowledFormatted = formatOvers(ps.legalBallsBowled, 6);
  const decOvers = oversToDecimal(ps.legalBallsBowled, 6);
  ps.economy = decOvers > 0 ? Number((ps.runsConceded / decOvers).toFixed(2)) : 0;
  ps.bowlingAverage = ps.wickets > 0 ? Number((ps.runsConceded / ps.wickets).toFixed(2)) : 0;
  ps.bowlingStrikeRate = ps.wickets > 0 ? Number((ps.legalBallsBowled / ps.wickets).toFixed(1)) : 0;

  const badges: string[] = [];
  if (ps.hundreds > 0) badges.push('Centurion');
  if (ps.fifties > 0) badges.push('Half-Centurion');
  if (ps.fiveWicketHauls > 0) badges.push('5-Wicket Finisher');
  if (ps.hatTricks > 0) badges.push('Hat-Trick Hero');
  if (ps.sixes >= 5) badges.push('Boundary Six Hitter');
  if (ps.catches + ps.stumpings + ps.runOuts >= 3) badges.push('Safe Hands');
  if (ps.potmCount > 0) badges.push('Match Winner (POTM)');
  ps.badges = badges;

  return ps;
}

export function aggregateCareerStatsFromCache(
  players: Player[],
  cacheRecords: CareerCacheRecord[],
  filters: CareerCacheFilterOptions = {}
): Record<string, PlayerCareerStats> {
  const isExactBucket =
    Boolean(filters.format && filters.format !== 'ALL') &&
    Boolean(filters.season && filters.season !== 'ALL') &&
    (!filters.teamId || filters.teamId === 'ALL') &&
    (!filters.opponentTeamId || filters.opponentTeamId === 'ALL') &&
    !filters.tournamentId;

  const byPlayer = new Map<string, CareerCacheRecord[]>();
  for (const rec of cacheRecords) {
    if (filters.format && filters.format !== 'ALL' && rec.format !== filters.format) continue;
    if (filters.season && filters.season !== 'ALL' && rec.season !== filters.season) continue;
    const list = byPlayer.get(rec.playerId) || [];
    list.push(rec);
    byPlayer.set(rec.playerId, list);
  }

  const out: Record<string, PlayerCareerStats> = {};
  for (const p of players) {
    const records = byPlayer.get(p.id) || [];
    if (records.length === 0) { out[p.id] = createEmptyCareerStats(p.id); continue; }
    if (isExactBucket && records.length === 1) { out[p.id] = records[0].stats; continue; }
    const allContribs: PlayerMatchContribution[] = [];
    for (const r of records) {
      for (const mc of Object.values(r.matchContributions)) allContribs.push(mc);
    }
    out[p.id] = computeCareerStatsFromContributions(p.id, allContribs, filters);
  }
  return out;
}

export async function updateCareerCacheForMatch(
  match: MatchRecord,
  matchEvents?: BallEvent[],
  playersMap?: Record<string, Player>,
  cacheTable: Table<CareerCacheRecord, string> = db.careerCache
): Promise<CareerCacheRecord[]> {
  const events = matchEvents ?? (await queryBallEventsByMatch(match.id));
  let resolvedPlayersMap = playersMap;
  if (!resolvedPlayersMap) {
    const allPlayers = await db.players.toArray();
    resolvedPlayersMap = Object.fromEntries(allPlayers.map((p) => [p.id, p]));
  }

  const contribsByPlayer = deriveMatchContributionsForMatch(match, events, resolvedPlayersMap);
  const participantIds = Object.keys(contribsByPlayer);
  const recordIds = participantIds.map((pid) => buildCareerCacheId(pid, match.format, match.season));
  const existingRecords = await cacheTable.bulkGet(recordIds);

  const toPut: CareerCacheRecord[] = [];
  const now = Date.now();

  for (let i = 0; i < participantIds.length; i++) {
    const pid = participantIds[i];
    const cacheId = recordIds[i];
    const existing = existingRecords[i];
    const nextContribs: Record<string, PlayerMatchContribution> = {
      ...(existing?.matchContributions || {}),
      [match.id]: contribsByPlayer[pid],
    };
    toPut.push({
      id: cacheId, playerId: pid, format: match.format, season: match.season,
      stats: computeCareerStatsFromContributions(pid, Object.values(nextContribs)),
      matchContributions: nextContribs, updatedAt: now,
    });
  }

  if (toPut.length > 0) await cacheTable.bulkPut(toPut);
  return toPut;
}

export async function removeMatchFromCareerCache(
  matchId: string,
  cacheTable: Table<CareerCacheRecord, string> = db.careerCache
): Promise<void> {
  const allRecords = await cacheTable.toArray();
  const toPut: CareerCacheRecord[] = [];
  const toDelete: string[] = [];
  const now = Date.now();

  for (const rec of allRecords) {
    if (!rec.matchContributions || !rec.matchContributions[matchId]) continue;
    const nextContribs = { ...rec.matchContributions };
    delete nextContribs[matchId];
    const remaining = Object.values(nextContribs);
    if (remaining.length === 0) toDelete.push(rec.id);
    else {
      toPut.push({
        ...rec,
        stats: computeCareerStatsFromContributions(rec.playerId, remaining),
        matchContributions: nextContribs,
        updatedAt: now,
      });
    }
  }

  if (toDelete.length > 0) await cacheTable.bulkDelete(toDelete);
  if (toPut.length > 0) await cacheTable.bulkPut(toPut);
}

export function buildAllCareerCacheRecordsPure(
  players: Player[],
  matches: MatchRecord[],
  allEvents: BallEvent[]
): CareerCacheRecord[] {
  const playersMap = Object.fromEntries(players.map((p) => [p.id, p]));
  const eventsByMatch = new Map<string, BallEvent[]>();
  for (const ev of allEvents) {
    const arr = eventsByMatch.get(ev.matchId) || [];
    arr.push(ev);
    eventsByMatch.set(ev.matchId, arr);
  }

  const bucketMap = new Map<
    string,
    { playerId: string; format: MatchFormat; season: string; matchContributions: Record<string, PlayerMatchContribution> }
  >();

  for (const match of matches) {
    const mEvents = (eventsByMatch.get(match.id) || []).sort((a, b) => a.sequence - b.sequence);
    const contribs = deriveMatchContributionsForMatch(match, mEvents, playersMap);
    for (const [pid, mc] of Object.entries(contribs)) {
      const id = buildCareerCacheId(pid, match.format, match.season);
      const bucket = bucketMap.get(id) || {
        playerId: pid, format: match.format, season: match.season, matchContributions: {},
      };
      bucket.matchContributions[match.id] = mc;
      bucketMap.set(id, bucket);
    }
  }

  const now = Date.now();
  const records: CareerCacheRecord[] = [];
  for (const [id, b] of bucketMap.entries()) {
    records.push({
      id, playerId: b.playerId, format: b.format, season: b.season,
      stats: computeCareerStatsFromContributions(b.playerId, Object.values(b.matchContributions)),
      matchContributions: b.matchContributions, updatedAt: now,
    });
  }
  return records;
}

export async function rebuildCareerStatsCache(): Promise<CareerCacheRecord[]> {
  const [players, matches, allEvents] = await Promise.all([
    db.players.toArray(), db.matches.toArray(), db.ballEvents.toArray(),
  ]);
  const records = buildAllCareerCacheRecordsPure(players, matches, allEvents);
  await db.transaction('rw', db.careerCache, async () => {
    await db.careerCache.clear();
    if (records.length > 0) await db.careerCache.bulkPut(records);
  });
  return records;
}
