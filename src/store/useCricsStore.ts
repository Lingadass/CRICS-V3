import { create } from 'zustand';
import {
  AppSettingsRecord, CareerCacheRecord, CricsBackupPayload, db, exportDatabaseToJson,
  importDatabaseFromJson, loadSampleSeedData, markBackupSavedSuccess, MergeConflictPolicy,
  putBallEventAndRecalculateAtomic, queryBallEventsByMatch, rebuildCareerStatsCache,
  recordBallEventWithAutoSequenceAtomic, removeSampleSeedData, undoLastBallAtomic,
} from '../db/database';
import { CustomKnockoutPairing } from '../engine/scoringEngine';
import { BallEvent, InningsSetup, KnockoutStagePreset, MatchRecord, Player, Team, Tournament } from '../engine/types';
import { applyLanguageToDocument, applyThemeToDocument, LanguageCode, ThemeMode } from '../i18n/translations';
import { buildHashRoute, hashScorerPin, parseHashRoute } from '../utils/routeAndSecurityUtils';
import {
  completeMatchInDb, createMatchInDb, deleteMatchInDb, deleteOrArchivePlayerInDb,
  deleteOrArchiveTeamInDb, DeleteResult, savePlayerWithPhotoToDb,
  seedTournamentKnockoutInDb, startNextInningsInDb, updateManualPotmInDb, updateRevisedTargetInDb,
} from './storeEntityHelpers';

export type { DeleteResult };
export type NavTab = 'home' | 'live' | 'wizard' | 'scorecards' | 'players' | 'teams' | 'careers' | 'tournaments' | 'leaderboards' | 'settings' | 'scan' | 'privacy';
interface StorageQuotaInfo { persisted: boolean | null; usageBytes: number; quotaBytes: number; }

interface CricsState {
  isInitialized: boolean; activeTab: NavTab; activeMatchId: string;
  selectedScorecardMatchId: string; selectedCareerPlayerId: string;
  selectedTournamentId: string; pendingWizardTournamentId: string;
  pendingWizardFixtureId: string; isScoringWriteInFlight: boolean;
  isScoringLocked: boolean; lastScoringActionTimestamp?: number;
  players: Player[]; teams: Team[]; matches: MatchRecord[];
  ballEvents: BallEvent[]; totalBallEventsCount: number;
  careerCache: CareerCacheRecord[]; tournaments: Tournament[];
  settings: AppSettingsRecord; redoStacks: Record<string, BallEvent[]>;
  storageInfo: StorageQuotaInfo; swUpdateAvailable: boolean;
  triggerSwUpdate?: () => void;

  initApp: () => Promise<void>;
  loadMatchBallEvents: (matchId: string, inningsNumber?: 1 | 2 | 3 | 4) => Promise<BallEvent[]>;
  rebuildCareerStats: () => Promise<void>;
  syncFromHash: (rawHash: string) => void;
  setActiveTab: (tab: NavTab) => void;
  setActiveMatchId: (matchId: string, switchToTab?: NavTab) => void;
  setSelectedScorecardMatchId: (matchId: string) => void;
  setSelectedCareerPlayerId: (playerId: string) => void;
  setSelectedTournamentId: (tournamentId: string) => void;
  startTournamentFixtureInWizard: (tournamentId: string, fixtureId: string) => void;
  setScoringLocked: (locked: boolean) => Promise<void>;
  setSwUpdateState: (available: boolean, updateFn?: () => void) => void;
  loadSampleData: () => Promise<void>;
  removeSampleData: () => Promise<void>;
  savePlayer: (player: Player, photoBlob?: Blob) => Promise<void>;
  bulkSavePlayers: (players: Player[]) => Promise<void>;
  deletePlayer: (playerId: string) => Promise<DeleteResult>;
  unarchivePlayer: (playerId: string) => Promise<void>;
  saveTeam: (team: Team) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<DeleteResult>;
  unarchiveTeam: (teamId: string) => Promise<void>;
  createMatch: (match: MatchRecord) => Promise<void>;
  deleteMatch: (matchId: string) => Promise<number>;
  recordBall: (matchId: string, partialEvent: Omit<BallEvent, 'id' | 'matchId' | 'sequence' | 'timestamp'>) => Promise<void>;
  undoLastBall: (matchId: string) => Promise<void>;
  redoBall: (matchId: string) => Promise<void>;
  editBallEvent: (editedEvent: BallEvent) => Promise<void>;
  startNextInnings: (matchId: string, setup: InningsSetup) => Promise<void>;
  updateRevisedTarget: (matchId: string, inningsNumber: 1 | 2 | 3 | 4, revisedTargetRuns: number, revisedOvers?: number) => Promise<void>;
  updateManualPotm: (matchId: string, playerId: string) => Promise<void>;
  completeMatch: (matchId: string, potmPlayerId?: string, isNoResult?: boolean) => Promise<void>;
  saveTournament: (tournament: Tournament) => Promise<void>;
  seedTournamentKnockout: (tournamentId: string, preset: KnockoutStagePreset, startDate?: string, venue?: string, customPairings?: CustomKnockoutPairing[]) => Promise<void>;
  deleteTournament: (tournamentId: string) => Promise<void>;
  updateSettings: (partial: Partial<AppSettingsRecord>) => Promise<void>;
  setScorerPin: (pin: string) => Promise<void>;
  clearScorerPin: () => Promise<void>;
  setTheme: (theme: ThemeMode) => Promise<void>;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  exportAllData: (options?: { includePin?: boolean }) => Promise<CricsBackupPayload>;
  confirmBackupSaved: () => Promise<void>;
  importAllData: (payload: CricsBackupPayload, mode: 'replace' | 'merge', conflictPolicy?: MergeConflictPolicy) => Promise<void>;
  refreshStorageEstimate: () => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettingsRecord = {
  id: 'singleton', theme: 'system', language: 'en', keepScreenAwake: true,
  defaultOvers: 20, defaultWideRuns: 1, defaultNoBallRuns: 1, defaultFreeHit: true,
  backupReminderIntervalMatches: 3, matchesSinceLastBackup: 0,
  vibrationEnabled: false, highContrastScoring: false,
  lastUsedTeamAId: '', lastUsedTeamBId: '', lastUsedOvers: 20, lastUsedFormat: 'T20',
  showIntroAnimation: true, clubSecurityCode: '',
};

function pushHashSilently(hash: string) {
  if (typeof window === 'undefined') return;
  if (window.location.hash !== hash) window.history.pushState(null, '', hash);
}

let scoringActionQueue: Promise<unknown> = Promise.resolve();
let activeScoringOperations = 0;

function enqueueScoringOperation<T>(
  setInFlight: (inFlight: boolean) => void,
  operation: () => Promise<T>
): Promise<T> {
  activeScoringOperations += 1;
  setInFlight(true);
  const nextTask = scoringActionQueue
    .catch(() => undefined)
    .then(() => operation())
    .finally(() => {
      activeScoringOperations = Math.max(0, activeScoringOperations - 1);
      if (activeScoringOperations === 0) setInFlight(false);
    });
  scoringActionQueue = nextTask;
  return nextTask;
}

export const useCricsStore = create<CricsState>((set, get) => ({
  isInitialized: false, activeTab: 'home', activeMatchId: '', selectedScorecardMatchId: '',
  selectedCareerPlayerId: '', selectedTournamentId: '', pendingWizardTournamentId: '',
  pendingWizardFixtureId: '', isScoringWriteInFlight: false, isScoringLocked: false,
  players: [], teams: [], matches: [], ballEvents: [], totalBallEventsCount: 0,
  careerCache: [], tournaments: [], settings: DEFAULT_SETTINGS, redoStacks: {},
  storageInfo: { persisted: null, usageBytes: 0, quotaBytes: 0 }, swUpdateAvailable: false,

  initApp: async () => {
    let persisted: boolean | null = null;
    let usageBytes = 0;
    let quotaBytes = 0;
    if (typeof navigator !== 'undefined' && navigator.storage) {
      try {
        if (navigator.storage.persist) persisted = await navigator.storage.persist();
        if (navigator.storage.estimate) {
          const est = await navigator.storage.estimate();
          usageBytes = est.usage || 0;
          quotaBytes = est.quota || 0;
        }
      } catch {
        persisted = false;
      }
    }
    const [players, teams, matches, tournaments, settingsArr, careerCache, totalBallEventsCount] =
      await Promise.all([
        db.players.toArray(), db.teams.toArray(), db.matches.toArray(),
        db.tournaments.toArray(), db.settings.toArray(), db.careerCache.toArray(), db.ballEvents.count(),
      ]);
    const loadedSettings: AppSettingsRecord = settingsArr[0] ? { ...settingsArr[0] } : { ...DEFAULT_SETTINGS };
    if (loadedSettings.showIntroAnimation === undefined) loadedSettings.showIntroAnimation = true;
    if (persisted !== null) loadedSettings.storagePersisted = persisted;
    const hasPin = Boolean(loadedSettings.scorerPinSalt && loadedSettings.scorerPinHash);
    const restoredLock = hasPin ? Boolean(loadedSettings.isScoringLocked) : false;
    loadedSettings.isScoringLocked = restoredLock;
    await db.settings.put(loadedSettings);
    applyThemeToDocument(loadedSettings.theme);
    applyLanguageToDocument(loadedSettings.language);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('crics_show_intro', loadedSettings.showIntroAnimation ? '1' : '0');
      } catch {
        // Ignore storage errors
      }
    }

    const sortedMatches = [...matches].sort((a, b) => b.updatedAt - a.updatedAt);
    const liveMatch = sortedMatches.find((m) => m.status === 'live') || sortedMatches[0];
    const completedMatch = sortedMatches.find((m) => m.status === 'completed') || sortedMatches[0];
    const parsedHash = typeof window !== 'undefined' && window.location.hash ? parseHashRoute(window.location.hash) : { tab: 'home' as NavTab };
    const nextActiveMatchId = parsedHash.matchId || liveMatch?.id || '';
    const nextScorecardMatchId = parsedHash.scorecardMatchId || completedMatch?.id || liveMatch?.id || '';
    let initialBallEvents: BallEvent[] = [];
    if (parsedHash.tab === 'live' && nextActiveMatchId) initialBallEvents = await queryBallEventsByMatch(nextActiveMatchId);
    else if (parsedHash.tab === 'scorecards' && nextScorecardMatchId) initialBallEvents = await queryBallEventsByMatch(nextScorecardMatchId);

    set({
      isInitialized: true, players, teams, matches: sortedMatches, ballEvents: initialBallEvents,
      totalBallEventsCount, careerCache, tournaments, settings: loadedSettings,
      isScoringLocked: restoredLock, lastScoringActionTimestamp: undefined,
      activeTab: parsedHash.tab, activeMatchId: nextActiveMatchId, selectedScorecardMatchId: nextScorecardMatchId,
      selectedCareerPlayerId: parsedHash.playerId || players[0]?.id || '',
      selectedTournamentId: parsedHash.tournamentId || tournaments[0]?.id || '',
      storageInfo: { persisted, usageBytes, quotaBytes },
    });
  },

  loadMatchBallEvents: async (matchId, inningsNumber) => {
    if (!matchId) return [];
    const fetched = await queryBallEventsByMatch(matchId, inningsNumber);
    const fetchedIds = new Set(fetched.map((e) => e.id));
    set((state) => {
      const kept = state.ballEvents.filter((ev) => {
        if (ev.matchId !== matchId) return true;
        if (typeof inningsNumber === 'number' && ev.inningsNumber !== inningsNumber) return true;
        return !fetchedIds.has(ev.id);
      });
      return { ballEvents: [...kept, ...fetched] };
    });
    return fetched;
  },

  rebuildCareerStats: async () => {
    const records = await rebuildCareerStatsCache();
    set({ careerCache: records });
  },

  syncFromHash: (rawHash) => {
    const parsed = parseHashRoute(rawHash);
    set((state) => ({
      activeTab: parsed.tab,
      activeMatchId: parsed.matchId || state.activeMatchId,
      selectedScorecardMatchId: parsed.scorecardMatchId || state.selectedScorecardMatchId,
      selectedCareerPlayerId: parsed.playerId || state.selectedCareerPlayerId,
      selectedTournamentId: parsed.tournamentId || state.selectedTournamentId,
    }));
    const st = get();
    if (parsed.tab === 'live' && st.activeMatchId) void st.loadMatchBallEvents(st.activeMatchId);
    if (parsed.tab === 'scorecards' && st.selectedScorecardMatchId) void st.loadMatchBallEvents(st.selectedScorecardMatchId);
  },

  setActiveTab: (tab) => {
    const state = get();
    pushHashSilently(buildHashRoute({
      tab,
      matchId: tab === 'live' ? state.activeMatchId : undefined,
      scorecardMatchId: tab === 'scorecards' ? state.selectedScorecardMatchId : undefined,
      playerId: tab === 'careers' ? state.selectedCareerPlayerId : undefined,
      tournamentId: tab === 'tournaments' ? state.selectedTournamentId : undefined,
    }));
    set({ activeTab: tab });
    if (tab === 'live' && state.activeMatchId) void get().loadMatchBallEvents(state.activeMatchId);
    if (tab === 'scorecards' && state.selectedScorecardMatchId) void get().loadMatchBallEvents(state.selectedScorecardMatchId);
  },

  setActiveMatchId: (matchId, switchToTab) => {
    const nextTab = switchToTab || get().activeTab;
    pushHashSilently(buildHashRoute({
      tab: nextTab,
      matchId: nextTab === 'live' ? matchId : undefined,
      scorecardMatchId: nextTab === 'scorecards' ? matchId : undefined,
    }));
    set({ activeMatchId: matchId, selectedScorecardMatchId: matchId, activeTab: nextTab });
    if (matchId) void get().loadMatchBallEvents(matchId);
  },

  setSelectedScorecardMatchId: (matchId) => {
    if (get().activeTab === 'scorecards') pushHashSilently(buildHashRoute({ tab: 'scorecards', scorecardMatchId: matchId }));
    set({ selectedScorecardMatchId: matchId });
    if (matchId) void get().loadMatchBallEvents(matchId);
  },

  setSelectedCareerPlayerId: (playerId) => {
    if (get().activeTab === 'careers') pushHashSilently(buildHashRoute({ tab: 'careers', playerId }));
    set({ selectedCareerPlayerId: playerId });
  },

  setSelectedTournamentId: (tournamentId) => {
    if (get().activeTab === 'tournaments') pushHashSilently(buildHashRoute({ tab: 'tournaments', tournamentId }));
    set({ selectedTournamentId: tournamentId });
  },

  startTournamentFixtureInWizard: (tournamentId, fixtureId) => {
    pushHashSilently(buildHashRoute({ tab: 'wizard' }));
    set({ pendingWizardTournamentId: tournamentId, pendingWizardFixtureId: fixtureId, activeTab: 'wizard' });
  },

  setScoringLocked: async (locked) => {
    const currentSettings = get().settings;
    const hasPin = Boolean(currentSettings.scorerPinSalt && currentSettings.scorerPinHash);
    const nextSettings: AppSettingsRecord = { ...currentSettings, isScoringLocked: hasPin ? locked : false };
    await db.settings.put(nextSettings);
    set({ isScoringLocked: locked, settings: nextSettings });
  },
  setSwUpdateState: (available, updateFn) => set({ swUpdateAvailable: available, triggerSwUpdate: updateFn }),
  loadSampleData: async () => { await loadSampleSeedData(); await get().initApp(); },
  removeSampleData: async () => { await removeSampleSeedData(); await get().initApp(); },

  savePlayer: async (player, photoBlob) => {
    const players = await savePlayerWithPhotoToDb(player, photoBlob);
    set((state) => ({ players, selectedCareerPlayerId: state.selectedCareerPlayerId || player.id }));
  },

  bulkSavePlayers: async (newPlayers) => {
    await db.players.bulkPut(newPlayers.map((p) => ({ ...p, archived: p.archived ?? false })));
    set({ players: await db.players.toArray() });
  },

  deletePlayer: async (playerId) => {
    const { result, players, teams } = await deleteOrArchivePlayerInDb(playerId);
    set({ players, teams });
    return result;
  },

  unarchivePlayer: async (playerId) => {
    const existing = await db.players.get(playerId);
    if (!existing) return;
    await db.players.put({ ...existing, archived: false });
    set({ players: await db.players.toArray() });
  },

  saveTeam: async (team) => {
    await db.teams.put({ ...team, archived: team.archived ?? false });
    set({ teams: await db.teams.toArray() });
  },

  deleteTeam: async (teamId) => {
    const { result, teams } = await deleteOrArchiveTeamInDb(teamId);
    set({ teams });
    return result;
  },

  unarchiveTeam: async (teamId) => {
    const existing = await db.teams.get(teamId);
    if (!existing) return;
    await db.teams.put({ ...existing, archived: false });
    set({ teams: await db.teams.toArray() });
  },

  createMatch: async (match) => {
    const { matches, tournaments } = await createMatchInDb(match);
    const nextSettings: AppSettingsRecord = {
      ...get().settings,
      lastUsedTeamAId: match.teamAId,
      lastUsedTeamBId: match.teamBId,
      lastUsedOvers: match.rules.oversPerInnings,
      lastUsedFormat: match.format,
    };
    await db.settings.put(nextSettings);
    pushHashSilently(buildHashRoute({ tab: 'live', matchId: match.id }));
    set({
      matches, tournaments, settings: nextSettings, activeMatchId: match.id, selectedScorecardMatchId: match.id,
      pendingWizardTournamentId: '', pendingWizardFixtureId: '', activeTab: 'live',
    });
  },

  deleteMatch: async (matchId) => {
    const { removedBalls, matches, tournaments } = await deleteMatchInDb(matchId);
    const [careerCache, totalBallEventsCount] = await Promise.all([db.careerCache.toArray(), db.ballEvents.count()]);
    set((state) => ({
      matches, ballEvents: state.ballEvents.filter((e) => e.matchId !== matchId),
      totalBallEventsCount, careerCache, tournaments,
      activeMatchId: state.activeMatchId === matchId ? matches[0]?.id || '' : state.activeMatchId,
      selectedScorecardMatchId: state.selectedScorecardMatchId === matchId ? matches[0]?.id || '' : state.selectedScorecardMatchId,
    }));
    return removedBalls;
  },

  recordBall: (matchId, partialEvent) =>
    enqueueScoringOperation((inFlight) => set({ isScoringWriteInFlight: inFlight }), async () => {
      const playersMap = Object.fromEntries(get().players.map((p) => [p.id, p]));
      const txResult = await recordBallEventWithAutoSequenceAtomic(matchId, partialEvent, playersMap);
      if (!txResult) return;
      const { newEvent, updatedMatch, updatedSettings } = txResult;
      const [careerCache, tournaments] = await Promise.all([
        db.careerCache.toArray(),
        updatedMatch.tournamentId && updatedMatch.status === 'completed' ? db.tournaments.toArray() : Promise.resolve(get().tournaments),
      ]);
      set((state) => ({
        ballEvents: [...state.ballEvents, newEvent], totalBallEventsCount: state.totalBallEventsCount + 1,
        careerCache, tournaments, matches: state.matches.map((m) => (m.id === matchId ? updatedMatch : m)),
        settings: updatedSettings || state.settings, redoStacks: { ...state.redoStacks, [matchId]: [] },
        lastScoringActionTimestamp: Date.now(),
      }));
    }),

  undoLastBall: (matchId) =>
    enqueueScoringOperation((inFlight) => set({ isScoringWriteInFlight: inFlight }), async () => {
      const txResult = await undoLastBallAtomic(matchId);
      if (!txResult) return;
      const { removedEvent, updatedMatch } = txResult;
      const careerCache = await db.careerCache.toArray();
      set((state) => ({
        ballEvents: state.ballEvents.filter((e) => e.id !== removedEvent.id),
        totalBallEventsCount: Math.max(0, state.totalBallEventsCount - 1), careerCache,
        matches: state.matches.map((m) => (m.id === matchId ? updatedMatch : m)),
        redoStacks: { ...state.redoStacks, [matchId]: [removedEvent, ...(state.redoStacks[matchId] || [])] },
        lastScoringActionTimestamp: Date.now(),
      }));
    }),

  redoBall: (matchId) =>
    enqueueScoringOperation((inFlight) => set({ isScoringWriteInFlight: inFlight }), async () => {
      const redoStack = get().redoStacks[matchId] || [];
      if (redoStack.length === 0) return;
      const [eventToRestore, ...restRedo] = redoStack;
      const playersMap = Object.fromEntries(get().players.map((p) => [p.id, p]));
      const txResult = await putBallEventAndRecalculateAtomic(eventToRestore, playersMap);
      if (!txResult) return;
      const [careerCache, tournaments] = await Promise.all([
        db.careerCache.toArray(),
        txResult.updatedMatch.tournamentId ? db.tournaments.toArray() : Promise.resolve(get().tournaments),
      ]);
      set((state) => ({
        ballEvents: [...state.ballEvents, txResult.savedEvent], totalBallEventsCount: state.totalBallEventsCount + 1,
        careerCache, tournaments, matches: state.matches.map((m) => (m.id === matchId ? txResult.updatedMatch : m)),
        redoStacks: { ...state.redoStacks, [matchId]: restRedo }, lastScoringActionTimestamp: Date.now(),
      }));
    }),

  editBallEvent: (editedEvent) =>
    enqueueScoringOperation((inFlight) => set({ isScoringWriteInFlight: inFlight }), async () => {
      const playersMap = Object.fromEntries(get().players.map((p) => [p.id, p]));
      const txResult = await putBallEventAndRecalculateAtomic(editedEvent, playersMap);
      if (!txResult) return;
      const [careerCache, tournaments] = await Promise.all([
        db.careerCache.toArray(),
        txResult.updatedMatch.tournamentId ? db.tournaments.toArray() : Promise.resolve(get().tournaments),
      ]);
      set((state) => {
        const existsInState = state.ballEvents.some((e) => e.id === editedEvent.id);
        const nextBallEvents = existsInState
          ? state.ballEvents.map((e) => (e.id === editedEvent.id ? txResult.savedEvent : e))
          : [...state.ballEvents, txResult.savedEvent];
        return {
          ballEvents: nextBallEvents, careerCache, tournaments,
          matches: state.matches.map((m) => (m.id === editedEvent.matchId ? txResult.updatedMatch : m)),
          lastScoringActionTimestamp: Date.now(),
        };
      });
    }),

  startNextInnings: async (matchId, setup) => {
    const match = get().matches.find((m) => m.id === matchId);
    if (!match) return;
    const updatedMatch = await startNextInningsInDb(match, setup);
    set((state) => ({ matches: state.matches.map((m) => (m.id === matchId ? updatedMatch : m)) }));
  },
  updateRevisedTarget: async (matchId, inningsNumber, revisedTargetRuns, revisedOvers) => {
    const match = get().matches.find((m) => m.id === matchId);
    if (!match) return;
    const updatedMatch = await updateRevisedTargetInDb(match, inningsNumber, revisedTargetRuns, revisedOvers);
    set((state) => ({ matches: state.matches.map((m) => (m.id === matchId ? updatedMatch : m)) }));
  },
  updateManualPotm: async (matchId, playerId) => {
    const match = get().matches.find((m) => m.id === matchId);
    if (!match) return;
    const updatedMatch = await updateManualPotmInDb(match, playerId);
    const careerCache = await db.careerCache.toArray();
    set((state) => ({ matches: state.matches.map((m) => (m.id === matchId ? updatedMatch : m)), careerCache }));
  },
  completeMatch: async (matchId, potmPlayerId, isNoResult) => {
    const res = await completeMatchInDb(matchId, get().settings, potmPlayerId, isNoResult);
    if (!res) return;
    const [careerCache, tournaments] = await Promise.all([
      db.careerCache.toArray(),
      res.updatedMatch.tournamentId ? db.tournaments.toArray() : Promise.resolve(get().tournaments),
    ]);
    set((state) => ({
      matches: state.matches.map((m) => (m.id === matchId ? res.updatedMatch : m)),
      settings: res.nextSettings, careerCache, tournaments,
    }));
  },
  saveTournament: async (tournament) => {
    await db.tournaments.put({ ...tournament, archived: tournament.archived ?? false });
    set({ tournaments: await db.tournaments.toArray() });
  },
  seedTournamentKnockout: async (tournamentId, preset, startDate, venue, customPairings) => {
    set({ tournaments: await seedTournamentKnockoutInDb(tournamentId, preset, startDate, venue, customPairings) });
  },
  deleteTournament: async (tournamentId) => {
    await db.tournaments.delete(tournamentId);
    set({ tournaments: await db.tournaments.toArray() });
  },
  updateSettings: async (partial) => {
    const nextSettings = { ...get().settings, ...partial };
    if (partial.theme) applyThemeToDocument(partial.theme);
    if (partial.language) applyLanguageToDocument(partial.language);
    if (partial.showIntroAnimation !== undefined && typeof window !== 'undefined' && window.localStorage) {
      try { window.localStorage.setItem('crics_show_intro', partial.showIntroAnimation ? '1' : '0'); } catch { /* noop */ }
    }
    set({ settings: nextSettings });
    await db.settings.put(nextSettings);
  },
  setScorerPin: async (pin) => {
    const { salt, hash } = await hashScorerPin(pin);
    await get().updateSettings({ scorerPinSalt: salt, scorerPinHash: hash });
  },
  clearScorerPin: async () => {
    await get().updateSettings({ scorerPinSalt: undefined, scorerPinHash: undefined, isScoringLocked: false });
    set({ isScoringLocked: false });
  },
  setTheme: async (theme) => get().updateSettings({ theme }),
  setLanguage: async (language) => get().updateSettings({ language }),
  exportAllData: async (options) => exportDatabaseToJson(options),
  confirmBackupSaved: async () => {
    const updated = await markBackupSavedSuccess();
    if (updated) set({ settings: updated });
  },
  importAllData: async (payload, mode, conflictPolicy = 'keep-imported') => {
    await importDatabaseFromJson(payload, mode, conflictPolicy);
    await get().initApp();
  },
  refreshStorageEstimate: async () => {
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      set((state) => ({ storageInfo: { ...state.storageInfo, usageBytes: est.usage || 0, quotaBytes: est.quota || 0 } }));
    }
  },
}));
