import React, { useMemo, useState } from 'react';
import { Play } from 'lucide-react';
import { validateMatchSetup } from '../engine/scoringEngine';
import { MatchFormat, MatchRecord } from '../engine/types';
import { getTranslations } from '../i18n/translations';
import { useCricsStore } from '../store/useCricsStore';
import { getLocalDateString, getLocalYearString } from '../utils/dateUtils';
import { MatchWizardTeamsSection } from './MatchWizardTeamsSection';

export const MatchWizardView: React.FC = () => {
  const {
    teams, players, tournaments, settings,
    pendingWizardTournamentId, pendingWizardFixtureId, createMatch,
  } = useCricsStore();
  const t = getTranslations(settings.language);

  const activeTeams = useMemo(() => teams.filter((tm) => !tm.archived), [teams]);
  const activePlayers = useMemo(() => players.filter((p) => !p.archived), [players]);

  const initialTour = tournaments.find((tr) => tr.id === pendingWizardTournamentId);
  const initialFix = initialTour?.fixtures.find((f) => f.id === pendingWizardFixtureId);
  const rememberedTeamA = settings.lastUsedTeamAId ? activeTeams.find((tm) => tm.id === settings.lastUsedTeamAId) : undefined;
  const rememberedTeamB = settings.lastUsedTeamBId ? activeTeams.find((tm) => tm.id === settings.lastUsedTeamBId) : undefined;
  const initialTeamA = (initialFix && activeTeams.find((tm) => tm.id === initialFix.teamAId)) || rememberedTeamA || activeTeams[0];
  const initialTeamB =
    (initialFix && activeTeams.find((tm) => tm.id === initialFix.teamBId)) ||
    (rememberedTeamB && rememberedTeamB.id !== initialTeamA?.id ? rememberedTeamB : undefined) ||
    activeTeams.find((tm) => tm.id !== initialTeamA?.id) ||
    activeTeams[0];
  const initialFormat: MatchFormat = initialTour?.format || settings.lastUsedFormat || 'T20';

  const [title, setTitle] = useState(() =>
    initialTour && initialTeamA && initialTeamB
      ? `${initialTour.name}: ${initialTeamA.shortName} ${t.scoring.vsShort} ${initialTeamB.shortName}`
      : t.wizard.defaultMatchTitle
  );
  const [format, setFormat] = useState<MatchFormat>(initialFormat);
  const [season, setSeason] = useState(initialTour?.season || getLocalYearString());
  const [venue, setVenue] = useState(initialFix?.venue || t.wizard.defaultVenueName);
  const [date, setDate] = useState(initialFix?.date || getLocalDateString());
  const [scorerName, setScorerName] = useState(t.wizard.defaultScorerName);
  const [tournamentId, setTournamentId] = useState<string>(pendingWizardTournamentId || '');
  const [fixtureId, setFixtureId] = useState<string>(pendingWizardFixtureId || '');

  const [teamAId, setTeamAId] = useState(initialTeamA?.id || '');
  const [teamBId, setTeamBId] = useState(initialTeamB?.id || '');

  const teamAObj = useMemo(() => activeTeams.find((tm) => tm.id === teamAId), [activeTeams, teamAId]);
  const teamBObj = useMemo(() => activeTeams.find((tm) => tm.id === teamBId), [activeTeams, teamBId]);

  const [teamAXI, setTeamAXI] = useState<string[]>(() =>
    (initialTeamA?.playerIds || []).filter((pid) => activePlayers.some((p) => p.id === pid)).slice(0, 11)
  );
  const [teamBXI, setTeamBXI] = useState<string[]>(() => {
    const aSet = new Set((initialTeamA?.playerIds || []).filter((pid) => activePlayers.some((p) => p.id === pid)).slice(0, 11));
    return (initialTeamB?.playerIds || []).filter((pid) => activePlayers.some((p) => p.id === pid) && !aSet.has(pid)).slice(0, 11);
  });

  const [tossWinnerTeamId, setTossWinnerTeamId] = useState(initialTeamA?.id || '');
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl'>('bat');

  const [oversPerInnings, setOversPerInnings] = useState(
    initialFormat === 'ODI' ? 50 : initialFormat === 'T10' ? 10 : settings.lastUsedOvers || settings.defaultOvers || 20
  );
  const [powerplayOvers, setPowerplayOvers] = useState(initialFormat === 'ODI' ? 10 : initialFormat === 'T10' ? 3 : 6);
  const [maxOversPerBowler, setMaxOversPerBowler] = useState(initialFormat === 'ODI' ? 10 : initialFormat === 'T10' ? 2 : 4);
  const [wideRuns, setWideRuns] = useState(settings.defaultWideRuns ?? 1);
  const [noBallRuns, setNoBallRuns] = useState(settings.defaultNoBallRuns ?? 1);
  const [freeHitEnabled, setFreeHitEnabled] = useState(settings.defaultFreeHit ?? true);

  const selectedTournament = useMemo(() => tournaments.find((tr) => tr.id === tournamentId), [tournaments, tournamentId]);

  const applyFormatPresets = (f: MatchFormat) => {
    setFormat(f);
    if (f === 'T20') { setOversPerInnings(20); setPowerplayOvers(6); setMaxOversPerBowler(4); }
    else if (f === 'ODI') { setOversPerInnings(50); setPowerplayOvers(10); setMaxOversPerBowler(10); }
    else if (f === 'T10') { setOversPerInnings(10); setPowerplayOvers(3); setMaxOversPerBowler(2); }
  };

  const handleTeamAChange = (newId: string, currentBXI = teamBXI) => {
    setTeamAId(newId);
    const tm = activeTeams.find((item) => item.id === newId);
    if (tm) {
      const bSet = new Set(currentBXI);
      setTeamAXI(tm.playerIds.filter((pid) => activePlayers.some((p) => p.id === pid) && !bSet.has(pid)).slice(0, 11));
    }
    setTossWinnerTeamId(newId);
  };

  const handleTeamBChange = (newId: string, currentAXI = teamAXI) => {
    setTeamBId(newId);
    const tm = activeTeams.find((item) => item.id === newId);
    if (tm) {
      const aSet = new Set(currentAXI);
      setTeamBXI(tm.playerIds.filter((pid) => activePlayers.some((p) => p.id === pid) && !aSet.has(pid)).slice(0, 11));
    }
  };

  const battingFirstTeamId = useMemo(() => {
    if (tossWinnerTeamId === teamAId) return tossDecision === 'bat' ? teamAId : teamBId;
    return tossDecision === 'bat' ? teamBId : teamAId;
  }, [tossWinnerTeamId, teamAId, teamBId, tossDecision]);

  const bowlingFirstTeamId = battingFirstTeamId === teamAId ? teamBId : teamAId;
  const battingFirstXI = battingFirstTeamId === teamAId ? teamAXI : teamBXI;
  const bowlingFirstXI = bowlingFirstTeamId === teamAId ? teamAXI : teamBXI;

  const [openingStrikerId, setOpeningStrikerId] = useState('');
  const [openingNonStrikerId, setOpeningNonStrikerId] = useState('');
  const [openingBowlerId, setOpeningBowlerId] = useState('');
  const [validationError, setValidationError] = useState('');

  const resolvedStrikerId = openingStrikerId && battingFirstXI.includes(openingStrikerId) ? openingStrikerId : battingFirstXI[0] || '';
  const resolvedNonStrikerId = openingNonStrikerId && battingFirstXI.includes(openingNonStrikerId)
    ? openingNonStrikerId
    : battingFirstXI.find((id) => id !== resolvedStrikerId) || battingFirstXI[1] || '';
  const resolvedBowlerId = openingBowlerId && bowlingFirstXI.includes(openingBowlerId) ? openingBowlerId : bowlingFirstXI[0] || '';

  const step1Ready = Boolean(title.trim() && venue.trim() && oversPerInnings >= 1);
  const step2Ready = Boolean(teamAId && teamBId && teamAId !== teamBId && teamAXI.length >= 2 && teamBXI.length >= 1);
  const step3Ready = Boolean(resolvedStrikerId && resolvedNonStrikerId && resolvedStrikerId !== resolvedNonStrikerId && resolvedBowlerId);

  const togglePlayerInXI = (
    playerId: string,
    currentXI: string[],
    setXI: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (currentXI.includes(playerId)) setXI(currentXI.filter((id) => id !== playerId));
    else if (currentXI.length < 11) setXI([...currentXI, playerId]);
  };

  const handleStartMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const validation = validateMatchSetup({
      teamAId, teamBId, teamAXI, teamBXI,
      openingStrikerId: resolvedStrikerId,
      openingNonStrikerId: resolvedNonStrikerId,
      openingBowlerId: resolvedBowlerId,
      battingFirstTeamId, oversPerInnings, powerplayOvers, maxOversPerBowler,
    });

    if (!validation.valid) {
      setValidationError(validation.error || t.wizard.checkDetailsError);
      return;
    }

    const matchRecord: MatchRecord = {
      id: `MATCH-${Date.now()}`,
      title: title.trim() || `${teamAObj?.shortName || t.wizard.teamALabel} ${t.scoring.vsShort} ${teamBObj?.shortName || t.wizard.teamBLabel}`,
      format, season,
      tournamentId: tournamentId || undefined,
      fixtureId: fixtureId || undefined,
      venue: venue.trim() || t.wizard.defaultVenueName,
      date,
      scorerName: scorerName.trim() || t.wizard.defaultScorerName,
      teamAId, teamBId, teamAXI, teamBXI,
      tossWinnerTeamId: tossWinnerTeamId || teamAId,
      tossDecision,
      rules: {
        oversPerInnings: Math.max(1, oversPerInnings),
        ballsPerOver: 6,
        wideRuns: Math.max(0, wideRuns),
        noBallRuns: Math.max(0, noBallRuns),
        freeHitEnabled,
        powerplayOvers: Math.max(0, powerplayOvers),
        maxOversPerBowler: Math.max(1, maxOversPerBowler),
      },
      innings: [{
        inningsNumber: 1,
        battingTeamId: battingFirstTeamId,
        bowlingTeamId: bowlingFirstTeamId,
        openingStrikerId: resolvedStrikerId,
        openingNonStrikerId: resolvedNonStrikerId,
        openingBowlerId: resolvedBowlerId,
      }],
      currentInningsNumber: 1,
      status: 'live',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await createMatch(matchRecord);
  };

  return (
    <form onSubmit={handleStartMatch} className="space-y-6 pb-20 lg:pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">{t.wizard.title}</h1>
          <p className="text-sm text-muted">{t.wizard.subtitle}</p>
        </div>
        <button
          type="submit"
          className="min-h-[48px] px-6 py-3 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm flex items-center gap-2 shadow-sm"
        >
          <Play className="w-4 h-4" /> {t.wizard.startMatchBtn}
        </button>
      </div>

      <div
        data-testid="wizard-step-indicator"
        className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-card border border-line"
      >
        {[
          { label: t.wizard.step1Title, ready: step1Ready },
          { label: t.wizard.step2Title, ready: step2Ready },
          { label: t.wizard.step3Title, ready: step3Ready },
        ].map((item) => (
          <div
            key={item.label}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-between ${
              item.ready ? 'bg-brand-50/70 dark:bg-brand-950/40 border-brand-500/50 text-text' : 'bg-page border-line text-muted'
            }`}
          >
            <span>{item.label}</span>
            <span className={item.ready ? 'text-success' : 'text-extra'}>
              {item.ready ? t.wizard.stepReady : t.wizard.stepCheck}
            </span>
          </div>
        ))}
      </div>

      {validationError && (
        <div role="alert" className="p-4 rounded-2xl bg-wicket/10 border border-wicket/40 text-sm text-wicket font-medium">
          {validationError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-2xl bg-card border border-line p-5 space-y-4">
          <h2 className="text-base font-bold text-text">{t.wizard.metadataSection}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="wizard-match-title" className="block text-xs font-semibold text-muted mb-1">{t.wizard.matchTitleLabel}</label>
              <input
                id="wizard-match-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3.5 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="wizard-format" className="block text-xs font-semibold text-muted mb-1">{t.wizard.formatLabel}</label>
              <select
                id="wizard-format" value={format} onChange={(e) => applyFormatPresets(e.target.value as MatchFormat)}
                className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3.5 py-2 text-sm"
              >
                <option value="T20">{t.wizard.formatT20Option}</option>
                <option value="T10">{t.wizard.formatT10Option}</option>
                <option value="ODI">{t.wizard.formatOdiOption}</option>
                <option value="Custom">{t.wizard.formatCustomOption}</option>
              </select>
            </div>

            <div>
              <label htmlFor="wizard-tournament" className="block text-xs font-semibold text-muted mb-1">{t.wizard.tournamentOptionalLabel}</label>
              <select
                id="wizard-tournament" value={tournamentId}
                onChange={(e) => { setTournamentId(e.target.value); setFixtureId(''); }}
                className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3.5 py-2 text-sm"
              >
                <option value="">{t.wizard.friendlyStandaloneOption}</option>
                {tournaments.map((tr) => (
                  <option key={tr.id} value={tr.id}>{tr.name} ({tr.season})</option>
                ))}
              </select>
            </div>

            {selectedTournament && selectedTournament.fixtures.some((f) => !f.matchId) && (
              <div className="sm:col-span-2">
                <label htmlFor="wizard-fixture" className="block text-xs font-semibold text-muted mb-1">{t.wizard.linkFixtureLabel}</label>
                <select
                  id="wizard-fixture" value={fixtureId}
                  onChange={(e) => {
                    const fxId = e.target.value;
                    setFixtureId(fxId);
                    const fx = selectedTournament.fixtures.find((f) => f.id === fxId);
                    if (fx) {
                      setDate(fx.date); setVenue(fx.venue);
                      handleTeamAChange(fx.teamAId); handleTeamBChange(fx.teamBId);
                    }
                  }}
                  className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3.5 py-2 text-sm"
                >
                  <option value="">{t.wizard.adhocFixtureOption}</option>
                  {selectedTournament.fixtures.filter((f) => !f.matchId).map((fx) => {
                    const tA = teams.find((tm) => tm.id === fx.teamAId)?.shortName || fx.teamAId;
                    const tB = teams.find((tm) => tm.id === fx.teamBId)?.shortName || fx.teamBId;
                    return (
                      <option key={fx.id} value={fx.id}>{fx.roundName}: {tA} {t.scoring.vsShort} {tB} ({fx.date})</option>
                    );
                  })}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="wizard-venue" className="block text-xs font-semibold text-muted mb-1">{t.wizard.venueLabel}</label>
              <input
                id="wizard-venue" type="text" value={venue} onChange={(e) => setVenue(e.target.value)}
                className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3.5 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="wizard-date" className="block text-xs font-semibold text-muted mb-1">{t.wizard.dateLabel}</label>
              <input
                id="wizard-date" type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3.5 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="wizard-season" className="block text-xs font-semibold text-muted mb-1">{t.wizard.seasonLabel}</label>
              <input
                id="wizard-season" type="text" value={season} onChange={(e) => setSeason(e.target.value)}
                className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3.5 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="wizard-scorer" className="block text-xs font-semibold text-muted mb-1">{t.wizard.scorerNameLabel}</label>
              <input
                id="wizard-scorer" type="text" value={scorerName} onChange={(e) => setScorerName(e.target.value)}
                className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3.5 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-card border border-line p-5 space-y-4">
          <h2 className="text-base font-bold text-text">{t.wizard.rulesSection}</h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="wizard-overs-per-innings" className="block text-xs font-semibold text-muted mb-1">{t.wizard.oversPerInningsLabel}</label>
              <input
                id="wizard-overs-per-innings" type="number" min={1} max={90} value={oversPerInnings}
                onChange={(e) => setOversPerInnings(Number(e.target.value))}
                className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm font-mono"
              />
            </div>

            <div>
              <label htmlFor="wizard-powerplay-overs" className="block text-xs font-semibold text-muted mb-1">{t.wizard.powerplayOversLabel}</label>
              <input
                id="wizard-powerplay-overs" type="number" min={0} max={oversPerInnings} value={powerplayOvers}
                onChange={(e) => setPowerplayOvers(Number(e.target.value))}
                className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm font-mono"
              />
            </div>

            <div>
              <label htmlFor="wizard-max-overs-bowler" className="block text-xs font-semibold text-muted mb-1">{t.wizard.maxOversPerBowlerLabel}</label>
              <input
                id="wizard-max-overs-bowler" type="number" min={1} max={oversPerInnings} value={maxOversPerBowler}
                onChange={(e) => setMaxOversPerBowler(Number(e.target.value))}
                className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm font-mono"
              />
            </div>

            <div>
              <label htmlFor="wizard-wide-runs" className="block text-xs font-semibold text-muted mb-1">{t.wizard.widePenaltyLabel}</label>
              <input
                id="wizard-wide-runs" type="number" min={0} max={5} value={wideRuns}
                onChange={(e) => setWideRuns(Number(e.target.value))}
                className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm font-mono"
              />
            </div>

            <div>
              <label htmlFor="wizard-noball-runs" className="block text-xs font-semibold text-muted mb-1">{t.wizard.noBallPenaltyLabel}</label>
              <input
                id="wizard-noball-runs" type="number" min={0} max={5} value={noBallRuns}
                onChange={(e) => setNoBallRuns(Number(e.target.value))}
                className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm font-mono"
              />
            </div>

            <div className="flex items-end pb-2">
              <label htmlFor="wizard-free-hit" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  id="wizard-free-hit" type="checkbox" checked={freeHitEnabled}
                  onChange={(e) => setFreeHitEnabled(e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <span>{t.wizard.freeHitOnNoBallLabel}</span>
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-line grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="wizard-toss-winner" className="block text-xs font-semibold text-muted mb-1">{t.wizard.tossWonBy}</label>
              <select
                id="wizard-toss-winner" value={tossWinnerTeamId} onChange={(e) => setTossWinnerTeamId(e.target.value)}
                className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm"
              >
                {teamAObj && <option value={teamAObj.id}>{teamAObj.name}</option>}
                {teamBObj && <option value={teamBObj.id}>{teamBObj.name}</option>}
              </select>
            </div>

            <div>
              <span className="block text-xs font-semibold text-muted mb-1">{t.wizard.tossDecision}</span>
              <div className="grid grid-cols-2 gap-2">
                {(['bat', 'bowl'] as const).map((dec) => (
                  <button
                    key={dec} type="button" onClick={() => setTossDecision(dec)}
                    className={`min-h-[48px] rounded-xl text-sm font-bold ${
                      tossDecision === dec ? 'bg-brand-600 text-white' : 'bg-page border border-line text-muted'
                    }`}
                  >
                    {dec === 'bat' ? t.wizard.electToBat : t.wizard.electToBowl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <MatchWizardTeamsSection
        activeTeams={activeTeams} activePlayers={activePlayers} allPlayers={players}
        teamAId={teamAId} teamBId={teamBId} teamAObj={teamAObj} teamBObj={teamBObj}
        teamAXI={teamAXI} teamBXI={teamBXI} setTeamAXI={setTeamAXI} setTeamBXI={setTeamBXI}
        onTeamAChange={(id) => handleTeamAChange(id)} onTeamBChange={(id) => handleTeamBChange(id)}
        togglePlayerInXI={togglePlayerInXI} battingFirstXI={battingFirstXI} bowlingFirstXI={bowlingFirstXI}
        openingStrikerId={resolvedStrikerId} setOpeningStrikerId={setOpeningStrikerId}
        openingNonStrikerId={resolvedNonStrikerId} setOpeningNonStrikerId={setOpeningNonStrikerId}
        openingBowlerId={resolvedBowlerId} setOpeningBowlerId={setOpeningBowlerId}
        t={t}
      />
    </form>
  );
};
