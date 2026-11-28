import React, { useMemo, useState } from 'react';
import { CalendarPlus, GitBranch, Plus, Trash2, Trophy } from 'lucide-react';
import { aggregateCareerStatsFromCache } from '../db/database';
import {
  deriveTournamentStandings,
  generateKnockoutFixturesFromStandings, generateRoundRobinFixtures, rankLeaderboardEntries,
} from '../engine/scoringEngine';
import {
  KnockoutStagePreset, MatchFormat, Player, Tournament, TournamentFixture,
} from '../engine/types';
import { useModalEscape } from '../hooks/useModalEscape';
import { getTranslations } from '../i18n/translations';
import { useCricsStore } from '../store/useCricsStore';
import { getLocalDateString, getLocalYearString } from '../utils/dateUtils';
import { buildMatchSummary, formatMatchResultText } from '../utils/matchSummaryUtils';
import { createTournamentTimestampMs, formatTournamentGroupLabel } from '../utils/tournamentGroupUtils';
import { AddFixtureModal, CreateTournamentModal, SeedKnockoutModal } from './TournamentModals';

export const TournamentsView: React.FC = () => {
  const {
    tournaments, teams, matches, careerCache, players, settings,
    selectedTournamentId, setSelectedTournamentId, saveTournament,
    seedTournamentKnockout, deleteTournament, setActiveMatchId,
    startTournamentFixtureInWizard, completeMatch,
  } = useCricsStore();
  const t = getTranslations(settings.language);
  const activeTeams = useMemo(() => teams.filter((tm) => !tm.archived), [teams]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTourName, setNewTourName] = useState('');
  const [newTourSeason, setNewTourSeason] = useState(() => getLocalYearString());
  const [newTourFormat, setNewTourFormat] = useState<MatchFormat>('T20');
  const [newTourType, setNewTourType] = useState<'League' | 'Groups'>('League');
  const [newTourKnockoutPreset, setNewTourKnockoutPreset] = useState<KnockoutStagePreset>('semi-finals');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [teamGroupsMap, setTeamGroupsMap] = useState<Record<string, string>>({});
  const [defaultVenue, setDefaultVenue] = useState(t.tournaments.defaultVenueName);

  const [groupStandingsFilter, setGroupStandingsFilter] = useState<string>('ALL');
  const [confirmDeleteTour, setConfirmDeleteTour] = useState<Tournament | null>(null);

  const [showAddFixtureModal, setShowAddFixtureModal] = useState(false);
  const [fixRoundName, setFixRoundName] = useState(t.tournaments.defaultFixtureRound);
  const [fixTeamAId, setFixTeamAId] = useState('');
  const [fixTeamBId, setFixTeamBId] = useState('');
  const [fixDate, setFixDate] = useState(() => getLocalDateString());
  const [fixVenue, setFixVenue] = useState(t.tournaments.defaultVenueName);

  const [showSeedKnockoutModal, setShowSeedKnockoutModal] = useState(false);
  const [knockoutPreset, setKnockoutPreset] = useState<KnockoutStagePreset>('semi-finals');
  const [knockoutDate, setKnockoutDate] = useState(() => getLocalDateString());
  const [knockoutVenue, setKnockoutVenue] = useState(t.tournaments.defaultVenueName);

  useModalEscape(
    Boolean(showCreateModal || showAddFixtureModal || showSeedKnockoutModal || confirmDeleteTour),
    () => {
      setShowCreateModal(false);
      setShowAddFixtureModal(false);
      setShowSeedKnockoutModal(false);
      setConfirmDeleteTour(null);
    }
  );
  const activeTournament = useMemo(
    () => tournaments.find((tr) => tr.id === selectedTournamentId) || tournaments[0],
    [tournaments, selectedTournamentId]
  );

  const playersMap = useMemo(() => {
    const map: Record<string, Player> = {};
    players.forEach((p) => { map[p.id] = p; });
    return map;
  }, [players]);

  const teamsNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    teams.forEach((tm) => { map[tm.id] = tm.name; });
    return map;
  }, [teams]);

  const standings = useMemo(() => {
    if (!activeTournament) return [];
    return deriveTournamentStandings(
      activeTournament, matches, [], playersMap,
      activeTournament.type === 'Groups' ? groupStandingsFilter : 'ALL'
    );
  }, [activeTournament, matches, playersMap, groupStandingsFilter]);

  const knockoutFixtures = useMemo(
    () => (activeTournament?.fixtures || []).filter((fx) => fx.stage && fx.stage !== 'league'),
    [activeTournament]
  );

  const leagueFixtures = useMemo(
    () => (activeTournament?.fixtures || []).filter((fx) => !fx.stage || fx.stage === 'league'),
    [activeTournament]
  );

  const topPerformers = useMemo(() => {
    if (!activeTournament) return { topBatter: null, topBowler: null };
    const stats = Object.values(
      aggregateCareerStatsFromCache(players, careerCache, { tournamentId: activeTournament.id })
    );
    const topBatter = rankLeaderboardEntries(stats, 'runs').find((s) => s.runs > 0) || null;
    const topBowler = rankLeaderboardEntries(stats, 'wickets').find((s) => s.wickets > 0) || null;
    return { topBatter, topBowler };
  }, [activeTournament, players, careerCache]);

  const openNewTourModal = () => {
    const defaultIds = activeTeams.map((tm) => tm.id);
    setSelectedTeamIds(defaultIds);
    const gMap: Record<string, string> = {};
    defaultIds.forEach((id, i) => { gMap[id] = i % 2 === 0 ? 'A' : 'B'; });
    setTeamGroupsMap(gMap);
    setNewTourName('');
    setShowCreateModal(true);
  };

  const toggleTeamSelection = (tid: string) => {
    if (selectedTeamIds.includes(tid)) setSelectedTeamIds(selectedTeamIds.filter((id) => id !== tid));
    else setSelectedTeamIds([...selectedTeamIds, tid]);
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTourName.trim()) return;
    const nowMs = createTournamentTimestampMs();
    const tId = `TOUR-${nowMs}`;
    const chosenTeams = selectedTeamIds.length >= 2 ? selectedTeamIds : activeTeams.map((tm) => tm.id);
    const groupData = newTourType === 'Groups' ? teamGroupsMap : undefined;
    const roundRobinFixtures = generateRoundRobinFixtures(
      tId, chosenTeams, getLocalDateString(), defaultVenue.trim() || t.tournaments.defaultVenueName, groupData
    );

    const baseTour: Tournament = {
      id: tId, name: newTourName.trim(), season: newTourSeason.trim() || getLocalYearString(),
      format: newTourFormat, type: newTourType, teamIds: chosenTeams, teamGroups: groupData,
      knockoutPreset: newTourKnockoutPreset, pointsForWin: 2, pointsForTie: 1, pointsForNoResult: 1,
      createdAt: nowMs, fixtures: roundRobinFixtures,
    };

    const initialStandings = deriveTournamentStandings(baseTour, [], [], playersMap, 'ALL');
    const koFixtures = newTourKnockoutPreset !== 'none'
      ? generateKnockoutFixturesFromStandings(
          baseTour, initialStandings, newTourKnockoutPreset,
          getLocalDateString(), defaultVenue.trim() || t.tournaments.defaultVenueName
        )
      : [];

    const newTour: Tournament = { ...baseTour, fixtures: [...roundRobinFixtures, ...koFixtures] };
    await saveTournament(newTour);
    setSelectedTournamentId(newTour.id);
    setShowCreateModal(false);
  };

  const handleSeedKnockoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTournament) return;
    await seedTournamentKnockout(
      activeTournament.id,
      knockoutPreset === 'none' ? 'semi-finals' : knockoutPreset,
      knockoutDate,
      knockoutVenue.trim() || t.tournaments.defaultVenueName
    );
    setShowSeedKnockoutModal(false);
  };

  const handleAddFixture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTournament || !fixTeamAId || !fixTeamBId || fixTeamAId === fixTeamBId) return;
    const newFix: TournamentFixture = {
      id: `FIX-${createTournamentTimestampMs()}`, tournamentId: activeTournament.id,
      roundName: fixRoundName.trim() || t.tournaments.defaultFixtureRound, stage: 'league',
      teamAId: fixTeamAId, teamBId: fixTeamBId, date: fixDate, venue: fixVenue.trim() || t.tournaments.defaultVenueName,
    };
    await saveTournament({ ...activeTournament, fixtures: [...activeTournament.fixtures, newFix] });
    setShowAddFixtureModal(false);
  };

  const handleConfirmDeleteTournament = async () => {
    if (!confirmDeleteTour) return;
    await deleteTournament(confirmDeleteTour.id);
    setConfirmDeleteTour(null);
  };

  const renderFixtureCard = (fx: TournamentFixture) => {
    const linkedMatch = matches.find((m) => m.id === fx.matchId);
    const summary = linkedMatch
      ? linkedMatch.summary ?? buildMatchSummary(linkedMatch, [], playersMap, teamsNameMap)
      : null;
    const resultText = summary ? formatMatchResultText(summary, teamsNameMap, t) : null;
    const teamAName = fx.teamAId ? teamsNameMap[fx.teamAId] || fx.teamAId : fx.seedLabelA || t.tournaments.tbdLabel;
    const teamBName = fx.teamBId ? teamsNameMap[fx.teamBId] || fx.teamBId : fx.seedLabelB || t.tournaments.tbdLabel;
    const canStartFixture = Boolean(fx.teamAId && fx.teamBId);

    return (
      <div
        key={fx.id}
        className="p-3.5 rounded-xl bg-page border border-line flex flex-wrap items-center justify-between gap-2"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-text">{formatTournamentGroupLabel(fx.roundName, t)}</span>
            <span className="text-xs text-muted">· {fx.date} · {fx.venue}</span>
          </div>
          <h4 className="text-sm font-bold text-text mt-0.5">
            {teamAName} {t.scoring.vsShort} {teamBName}
          </h4>
          {fx.seedLabelA && fx.seedLabelB && (
            <span className="text-xs text-muted block">
              {t.tournaments.seedsLabel}: {fx.seedLabelA} {t.scoring.vsShort} {fx.seedLabelB}
            </span>
          )}
          {resultText && (
            <p className="text-xs text-brand-600 dark:text-brand-300 font-medium mt-0.5">{resultText}</p>
          )}
          {fx.winnerTeamId && (
            <span className="inline-block mt-1 px-2 py-0.5 rounded bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-200 text-xs font-bold">
              {t.tournaments.winnerLabel}: {teamsNameMap[fx.winnerTeamId] || fx.winnerTeamId}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {linkedMatch ? (
            <>
              {linkedMatch.status === 'live' && (
                <button
                  type="button"
                  onClick={() => void completeMatch(linkedMatch.id, undefined, true)}
                  className="min-h-[48px] px-3 py-2 rounded-lg border border-extra text-extra text-xs font-semibold"
                >
                  {t.tournaments.markNoResultBtn}
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveMatchId(linkedMatch.id, linkedMatch.status === 'live' ? 'live' : 'scorecards')}
                className="min-h-[48px] px-3.5 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold"
              >
                {linkedMatch.status === 'live' ? t.tournaments.resumeScoringBtn : t.tournaments.viewScorecardBtn}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={!canStartFixture || !activeTournament}
              onClick={() => activeTournament && startTournamentFixtureInWizard(activeTournament.id, fx.id)}
              className="min-h-[48px] px-3.5 py-2 rounded-lg border border-brand-600 text-brand-600 dark:text-brand-300 disabled:opacity-40 text-xs font-semibold"
            >
              {t.tournaments.startFixtureBtn}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">{t.tournaments.title}</h1>
          <p className="text-sm text-muted">{t.tournaments.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {tournaments.length > 0 && (
            <>
              <select
                aria-label={t.tournaments.selectTournamentAria}
                value={activeTournament?.id || ''}
                onChange={(e) => { setSelectedTournamentId(e.target.value); setGroupStandingsFilter('ALL'); }}
                className="min-h-[48px] rounded-xl bg-card border border-line px-3.5 py-2 text-sm font-bold text-text"
              >
                {tournaments.map((tr) => (
                  <option key={tr.id} value={tr.id}>{tr.name} ({tr.season})</option>
                ))}
              </select>
              {activeTournament && (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteTour(activeTournament)}
                  aria-label={`${t.tournaments.deleteTournamentAria} ${activeTournament.name}`}
                  className="min-h-[48px] min-w-[48px] rounded-xl border border-wicket/40 text-wicket flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
          <button
            type="button"
            data-testid="create-tournament-btn"
            onClick={openNewTourModal}
            className="min-h-[48px] px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> {t.tournaments.newTournamentBtn}
          </button>
        </div>
      </div>

      {!activeTournament ? (
        <div className="p-6 rounded-2xl bg-card border border-line text-center text-sm text-muted">
          {t.tournaments.emptyMessage}
        </div>
      ) : (
        <>
          <section className="rounded-2xl bg-card border border-line overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-accent" />
                <h2 className="text-base font-bold text-text">
                  {activeTournament.name} — {t.tournaments.standingsTitle}{activeTournament.type === 'Groups' && groupStandingsFilter !== 'ALL' ? ` (${formatTournamentGroupLabel(groupStandingsFilter, t)})` : ''}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {activeTournament.type === 'Groups' && (
                  <div className="flex items-center gap-1">
                    {(['ALL', 'A', 'B'] as const).map((g) => (
                      <button
                        key={g} type="button" onClick={() => setGroupStandingsFilter(g)}
                        className={`min-h-[48px] px-2.5 py-1 rounded-lg text-xs font-bold ${groupStandingsFilter === g ? 'bg-brand-600 text-white' : 'bg-page border border-line text-text'}`}
                      >
                        {g === 'ALL' ? t.tournaments.allGroupsFilter : formatTournamentGroupLabel(g, t)}
                      </button>
                    ))}
                  </div>
                )}
                <span className="text-xs text-muted">{activeTournament.type === 'Groups' ? t.tournaments.groupStageOption : t.tournaments.roundRobinLeagueOption} · {activeTournament.format}</span>
              </div>
            </div>

            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={t.tournaments.standingsTitle}>
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-xs text-muted">
                    <th className="py-3 px-4 font-semibold">{t.tournaments.posCol}</th>
                    <th className="py-3 px-4 font-semibold">{t.tournaments.teamCol}</th>
                    <th className="py-3 px-3 text-right font-semibold">{t.tournaments.playedCol}</th>
                    <th className="py-3 px-3 text-right font-semibold">{t.tournaments.wonCol}</th>
                    <th className="py-3 px-3 text-right font-semibold">{t.tournaments.lostCol}</th>
                    <th className="py-3 px-3 text-right font-semibold">{t.tournaments.tiedCol}</th>
                    <th className="py-3 px-3 text-right font-semibold">{t.tournaments.nrCol}</th>
                    <th className="py-3 px-3 text-right font-semibold">{t.tournaments.ptsCol}</th>
                    <th className="py-3 px-4 text-right font-semibold">{t.tournaments.nrrCol}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line font-mono tabular-nums">
                  {standings.map((row, idx) => (
                    <tr key={row.teamId}>
                      <td className="py-3 px-4 text-muted font-bold">{idx + 1}</td>
                      <td className="py-3 px-4 font-sans font-bold text-text">
                        {teamsNameMap[row.teamId] || row.teamId}
                        {activeTournament.type === 'Groups' && activeTournament.teamGroups?.[row.teamId] && (
                          <span className="ml-2 text-xs font-mono px-1.5 py-0.5 rounded bg-page border border-line text-muted">{formatTournamentGroupLabel(activeTournament.teamGroups[row.teamId], t)}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right text-text">{row.played}</td>
                      <td className="py-3 px-3 text-right text-brand-600 dark:text-brand-300 font-bold">{row.won}</td>
                      <td className="py-3 px-3 text-right text-text">{row.lost}</td>
                      <td className="py-3 px-3 text-right text-text">{row.tied}</td>
                      <td className="py-3 px-3 text-right text-text">{row.noResult || 0}</td>
                      <td className="py-3 px-3 text-right font-extrabold text-text">{row.points}</td>
                      <td className="py-3 px-4 text-right font-bold text-text">{row.netRunRate >= 0 ? `+${row.netRunRate.toFixed(3)}` : row.netRunRate.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl bg-card border border-line p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-brand-600 dark:text-brand-300" />
                <h2 className="text-base font-bold text-text">{t.tournaments.knockoutTitle}</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setKnockoutPreset(activeTournament.knockoutPreset && activeTournament.knockoutPreset !== 'none' ? activeTournament.knockoutPreset : 'semi-finals');
                  setShowSeedKnockoutModal(true);
                }}
                className="min-h-[48px] px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <GitBranch className="w-4 h-4" /> {t.tournaments.seedKnockoutBtn}
              </button>
            </div>
            {knockoutFixtures.length === 0 ? (
              <p className="text-xs text-muted">{t.tournaments.emptyKnockoutDesc}</p>
            ) : (
              <div className="space-y-2.5">{knockoutFixtures.map((fx) => renderFixtureCard(fx))}</div>
            )}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <section className="lg:col-span-5 rounded-2xl bg-card border border-line p-5 space-y-4">
              <h3 className="text-sm font-bold text-text">{t.tournaments.topPerformersTitle}</h3>
              <div className="space-y-3">
                {topPerformers.topBatter ? (
                  <div className="p-3.5 rounded-xl bg-page border border-line flex items-center justify-between">
                    <div>
                      <span className="text-xs text-brand-600 dark:text-brand-300 font-bold block">
                        {t.tournaments.leadingRunScorer}
                      </span>
                      <span className="text-sm font-bold text-text">{playersMap[topPerformers.topBatter.playerId]?.name}</span>
                    </div>
                    <span className="font-mono text-lg font-extrabold text-text">
                      {topPerformers.topBatter.runs} {t.scorecards.runsWord}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-muted">{t.tournaments.noBattingRecords}</p>
                )}
                {topPerformers.topBowler ? (
                  <div className="p-3.5 rounded-xl bg-page border border-line flex items-center justify-between">
                    <div>
                      <span className="text-xs text-wicket font-bold block">
                        {t.tournaments.leadingWicketTaker}
                      </span>
                      <span className="text-sm font-bold text-text">{playersMap[topPerformers.topBowler.playerId]?.name}</span>
                    </div>
                    <span className="font-mono text-lg font-extrabold text-text">
                      {topPerformers.topBowler.wickets} {t.tournaments.wktsShort}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-muted">{t.tournaments.noWicketsRecords}</p>
                )}
              </div>
            </section>

            <section className="lg:col-span-7 rounded-2xl bg-card border border-line p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-text">{t.tournaments.fixturesTitle} ({leagueFixtures.length})</h3>
                <button
                  type="button"
                  onClick={() => { setFixTeamAId(activeTournament.teamIds[0] || ''); setFixTeamBId(activeTournament.teamIds[1] || ''); setShowAddFixtureModal(true); }}
                  className="min-h-[48px] px-3.5 py-2 rounded-xl border border-line text-xs font-bold text-text flex items-center gap-1"
                >
                  <CalendarPlus className="w-3.5 h-3.5" /> {t.tournaments.addFixtureBtn}
                </button>
              </div>
              <div className="space-y-2.5">{leagueFixtures.map((fx) => renderFixtureCard(fx))}</div>
            </section>
          </div>
        </>
      )}

      {activeTournament && (
        <AddFixtureModal
          isOpen={showAddFixtureModal} tournament={activeTournament} teamsNameMap={teamsNameMap}
          fixRoundName={fixRoundName} setFixRoundName={setFixRoundName} fixTeamAId={fixTeamAId} setFixTeamAId={setFixTeamAId}
          fixTeamBId={fixTeamBId} setFixTeamBId={setFixTeamBId} fixDate={fixDate} setFixDate={setFixDate} fixVenue={fixVenue} setFixVenue={setFixVenue}
          onClose={() => setShowAddFixtureModal(false)} onSubmit={handleAddFixture} t={t}
        />
      )}

      {activeTournament && (
        <SeedKnockoutModal
          isOpen={showSeedKnockoutModal} tournament={activeTournament}
          knockoutPreset={knockoutPreset} setKnockoutPreset={setKnockoutPreset}
          knockoutDate={knockoutDate} setKnockoutDate={setKnockoutDate} knockoutVenue={knockoutVenue} setKnockoutVenue={setKnockoutVenue}
          onClose={() => setShowSeedKnockoutModal(false)} onSubmit={handleSeedKnockoutSubmit} t={t}
        />
      )}

      {confirmDeleteTour && (
        <div role="dialog" aria-modal="true" tabIndex={-1} aria-labelledby="delete-tournament-dialog-title" className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-card border border-line p-6 space-y-4 shadow-xl">
            <h3 id="delete-tournament-dialog-title" className="text-lg font-bold text-wicket">
              {t.tournaments.deleteTournamentTitle}
            </h3>
            <p className="text-sm text-text">
              {t.tournaments.deleteTournamentConfirmPrefix} <strong>{confirmDeleteTour.name}</strong> ({confirmDeleteTour.season})?
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button type="button" onClick={() => setConfirmDeleteTour(null)} className="min-h-[48px] flex-1 rounded-xl bg-page border border-line text-sm font-semibold text-text">{t.common.cancel}</button>
              <button type="button" onClick={handleConfirmDeleteTournament} className="min-h-[48px] flex-1 rounded-xl bg-wicket text-white text-sm font-bold">{t.common.delete}</button>
            </div>
          </div>
        </div>
      )}

      <CreateTournamentModal
        isOpen={showCreateModal} activeTeams={activeTeams} newTourName={newTourName} setNewTourName={setNewTourName}
        newTourSeason={newTourSeason} setNewTourSeason={setNewTourSeason} defaultVenue={defaultVenue} setDefaultVenue={setDefaultVenue}
        newTourFormat={newTourFormat} setNewTourFormat={setNewTourFormat} newTourType={newTourType} setNewTourType={setNewTourType}
        newTourKnockoutPreset={newTourKnockoutPreset} setNewTourKnockoutPreset={setNewTourKnockoutPreset}
        selectedTeamIds={selectedTeamIds} toggleTeamSelection={toggleTeamSelection} teamGroupsMap={teamGroupsMap} setTeamGroupsMap={setTeamGroupsMap}
        onClose={() => setShowCreateModal(false)} onSubmit={handleCreateTournament} t={t}
      />
    </div>
  );
};
