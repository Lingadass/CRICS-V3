import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Share2 } from 'lucide-react';
import { aggregateCareerStatsFromCache, db } from '../db/database';
import { deriveHeadToHead } from '../engine/scoringEngine';
import { MatchFormat, MatchRecord } from '../engine/types';
import { formatBowlingStyle, getTranslations } from '../i18n/translations';
import { useCricsStore } from '../store/useCricsStore';
import { getLocalYearString } from '../utils/dateUtils';
import {
  blobToDataUrl,
  buildProfileCardExportModel,
  exportElementAsImage,
} from '../utils/imageExportUtils';
import { shareOrDownloadFile, triggerBlobDownload } from '../utils/scorecardExportUtils';
import { CareersAnalyticsSections } from './CareersAnalyticsSections';
import { ProfileCardExport } from './ProfileCardExport';

export const CareersView: React.FC = () => {
  const {
    players, teams, matches, ballEvents, careerCache, settings,
    selectedCareerPlayerId, setSelectedCareerPlayerId, setActiveMatchId,
    loadMatchBallEvents,
  } = useCricsStore();
  const t = getTranslations(settings.language);

  const [formatFilter, setFormatFilter] = useState<MatchFormat | 'ALL'>('ALL');
  const [seasonFilter, setSeasonFilter] = useState<string>('ALL');
  const [teamFilter, setTeamFilter] = useState<string>('ALL');
  const [opponentFilter, setOpponentFilter] = useState<string>('ALL');
  const [playerPhotoDataUrl, setPlayerPhotoDataUrl] = useState<string | undefined>(undefined);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [exportError, setExportError] = useState<string>('');
  const [lastAction, setLastAction] = useState<'share' | 'save' | null>(null);

  const [h2hOpponentId, setH2hOpponentId] = useState<string>(
    players.find((p) => p.role === 'Bowler')?.id || players[1]?.id || ''
  );
  const [h2hRole, setH2hRole] = useState<'batter' | 'bowler'>('batter');
  const profileCardExportRef = useRef<HTMLDivElement>(null);

  const seasons = useMemo(() => {
    const s = new Set<string>(matches.map((m) => m.season));
    if (s.size === 0) s.add(getLocalYearString());
    return Array.from(s);
  }, [matches]);

  const careerStatsMap = useMemo(
    () =>
      aggregateCareerStatsFromCache(players, careerCache, {
        format: formatFilter,
        season: seasonFilter,
        teamId: teamFilter,
        opponentTeamId: opponentFilter,
      }),
    [players, careerCache, formatFilter, seasonFilter, teamFilter, opponentFilter]
  );

  const activePlayer = useMemo(
    () => players.find((p) => p.id === selectedCareerPlayerId) || players[0],
    [players, selectedCareerPlayerId]
  );

  // Convert player photo Blob to a data URL upfront so we never pass blob: URLs to the renderer
  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      if (!active) return;
      if (!activePlayer) {
        setPlayerPhotoDataUrl(undefined);
        return;
      }
      try {
        const rec = await db.playerPhotos.get(activePlayer.id);
        if (!active) return;
        if (rec?.blob) {
          const dUrl = await blobToDataUrl(rec.blob);
          if (active) setPlayerPhotoDataUrl(dUrl);
        } else {
          setPlayerPhotoDataUrl(activePlayer.photoDataUrl);
        }
      } catch {
        if (active) setPlayerPhotoDataUrl(activePlayer.photoDataUrl);
      }
    });
    return () => {
      active = false;
    };
  }, [activePlayer]);

  useEffect(() => {
    if (!activePlayer || !h2hOpponentId) return;
    const h2hMatches = matches.filter(
      (m) =>
        (m.teamAXI.includes(activePlayer.id) || m.teamBXI.includes(activePlayer.id)) &&
        (m.teamAXI.includes(h2hOpponentId) || m.teamBXI.includes(h2hOpponentId))
    );
    for (const m of h2hMatches) {
      void loadMatchBallEvents(m.id);
    }
  }, [activePlayer, h2hOpponentId, matches, loadMatchBallEvents]);

  const stats = activePlayer ? careerStatsMap[activePlayer.id] : undefined;

  const matchesMap = useMemo(() => {
    const m: Record<string, MatchRecord> = {};
    matches.forEach((mt) => { m[mt.id] = mt; });
    return m;
  }, [matches]);

  const teamsNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    teams.forEach((tm) => { map[tm.id] = tm.name; });
    return map;
  }, [teams]);

  const playerTeamNames = useMemo(() => {
    if (!activePlayer) return [];
    return teams.filter((tm) => tm.playerIds.includes(activePlayer.id)).map((tm) => tm.name);
  }, [activePlayer, teams]);

  const exportModel = useMemo(() => {
    if (!activePlayer || !stats) return null;
    return buildProfileCardExportModel({
      player: activePlayer,
      teamNames: playerTeamNames,
      stats,
      filters: {
        format: formatFilter,
        season: seasonFilter,
        teamId: teamFilter,
        opponentTeamId: opponentFilter,
      },
      teamsNameMap,
      t,
    });
  }, [activePlayer, playerTeamNames, stats, formatFilter, seasonFilter, teamFilter, opponentFilter, teamsNameMap, t]);

  const h2hStats = useMemo(() => {
    if (!activePlayer || !h2hOpponentId) return null;
    return h2hRole === 'bowler'
      ? deriveHeadToHead(h2hOpponentId, activePlayer.id, ballEvents, matchesMap)
      : deriveHeadToHead(activePlayer.id, h2hOpponentId, ballEvents, matchesMap);
  }, [activePlayer, h2hOpponentId, h2hRole, ballEvents, matchesMap]);

  const potmHistoryMatches = useMemo(() => {
    if (!stats?.potmMatchIds) return [];
    return stats.potmMatchIds
      .map((id) => matchesMap[id])
      .filter((m): m is MatchRecord => Boolean(m));
  }, [stats, matchesMap]);

  const runProfileCardExport = async (mode: 'share' | 'save') => {
    if (!activePlayer) return;
    setExportError('');
    setLastAction(null);
    try {
      setExportStatus(t.scorecards.generatingImage);
      if (!profileCardExportRef.current) {
        throw new Error('Profile card export node missing');
      }
      const blob = await exportElementAsImage(profileCardExportRef.current, {
        backgroundColor: 'rgb(18, 26, 69)',
        pixelRatio: 2,
        width: 540,
        height: 675,
      });
      const filename = `${activePlayer.id}-profile-card.png`;
      if (mode === 'share') {
        const file = new File([blob], filename, { type: 'image/png' });
        const outcome = await shareOrDownloadFile(file, `${activePlayer.name} — ${t.appName.split(' ')[0]}`);
        setExportStatus(
          outcome === 'shared'
            ? t.scorecards.sharedSuccess
            : t.careers.savedProfileCard
        );
      } else {
        triggerBlobDownload(blob, filename);
        setExportStatus(t.careers.savedProfileCard);
      }
    } catch {
      setExportStatus('');
      setExportError(t.careers.failedExportProfileCard);
      setLastAction(mode);
    }
  };

  if (!activePlayer || !stats || !exportModel) {
    return <div className="p-6 text-center text-muted">{t.careers.noPlayersRegistered}</div>;
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      <ProfileCardExport
        ref={profileCardExportRef}
        model={exportModel}
        photoDataUrl={playerPhotoDataUrl}
        jerseyNumber={activePlayer.jerseyNumber}
        t={t}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">{t.careers.title}</h1>
          <p className="text-sm text-muted">{t.careers.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {exportStatus && (
            <span data-testid="career-export-status" className="text-xs font-semibold text-success">
              {exportStatus}
            </span>
          )}
          {exportError && (
            <div
              data-testid="career-export-error"
              role="alert"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-wicket/10 border border-wicket/40 text-xs font-semibold text-wicket"
            >
              <span>{exportError}</span>
              {lastAction && (
                <button
                  type="button"
                  data-testid="career-export-retry-btn"
                  onClick={() => void runProfileCardExport(lastAction)}
                  className="min-h-[48px] px-3 py-1 rounded-lg bg-wicket text-white font-bold"
                >
                  {t.scorecards.retryBtn}
                </button>
              )}
            </div>
          )}

          <select
            aria-label={t.careers.selectPlayerAria}
            value={activePlayer.id}
            onChange={(e) => setSelectedCareerPlayerId(e.target.value)}
            className="min-h-[48px] rounded-xl bg-card border border-line px-3.5 py-2 text-sm font-bold text-text"
          >
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.jerseyNumber !== null ? `#${p.jerseyNumber} ` : ''}
                {p.name} ({p.role})
              </option>
            ))}
          </select>

          <button
            type="button"
            data-testid="share-profile-card-btn"
            onClick={() => void runProfileCardExport('share')}
            className="min-h-[48px] px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <Share2 className="w-4 h-4" /> {t.careers.shareCardBtn}
          </button>

          <button
            type="button"
            data-testid="save-profile-card-btn"
            onClick={() => void runProfileCardExport('save')}
            className="min-h-[48px] px-3.5 py-2 rounded-xl border border-line bg-card hover:bg-page text-text text-xs font-semibold flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" /> {t.careers.saveImageBtn}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-card border border-line rounded-2xl p-4">
        <div>
          <label htmlFor="career-format-filter" className="block text-xs font-semibold text-muted mb-1">
            {t.careers.formatSplitLabel}
          </label>
          <select
            id="career-format-filter"
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value as MatchFormat | 'ALL')}
            className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-xs font-semibold text-text"
          >
            <option value="ALL">{t.careers.allFormatsOption}</option>
            <option value="T20">{'T20'}</option>
            <option value="T10">{'T10'}</option>
            <option value="ODI">{'ODI'}</option>
            <option value="Custom">{t.careers.customFormatOption}</option>
          </select>
        </div>

        <div>
          <label htmlFor="career-season-filter" className="block text-xs font-semibold text-muted mb-1">
            {t.careers.seasonSplitLabel}
          </label>
          <select
            id="career-season-filter"
            value={seasonFilter}
            onChange={(e) => setSeasonFilter(e.target.value)}
            className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-xs font-semibold text-text"
          >
            <option value="ALL">{t.careers.allSeasonsOption}</option>
            {seasons.map((s) => (
              <option key={s} value={s}>{t.careers.seasonPrefix} {s}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="career-team-filter" className="block text-xs font-semibold text-muted mb-1">
            {t.careers.playingForTeamLabel}
          </label>
          <select
            id="career-team-filter"
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-xs font-semibold text-text"
          >
            <option value="ALL">{t.careers.allTeamsOption}</option>
            {teams.map((tm) => (
              <option key={tm.id} value={tm.id}>{tm.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="career-opponent-filter" className="block text-xs font-semibold text-muted mb-1">
            {t.careers.vsOpponentLabel}
          </label>
          <select
            id="career-opponent-filter"
            value={opponentFilter}
            onChange={(e) => setOpponentFilter(e.target.value)}
            className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-xs font-semibold text-text"
          >
            <option value="ALL">{t.careers.allOpponentsOption}</option>
            {teams.map((tm) => (
              <option key={tm.id} value={tm.id}>{t.scoring.vsShort} {tm.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-3xl bg-card border border-line p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
          <div className="flex items-center gap-4">
            {playerPhotoDataUrl ? (
              <img
                src={playerPhotoDataUrl}
                alt={activePlayer.name}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-brand-500"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-brand-950 text-brand-200 font-extrabold text-xl flex items-center justify-center">
                {activePlayer.jerseyNumber !== null
                  ? `#${activePlayer.jerseyNumber}`
                  : activePlayer.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <span className="text-xs font-mono text-muted">
                {activePlayer.id} · {t.players.dobLabel}: {activePlayer.dob || '—'}
              </span>
              <h2 className="text-2xl font-bold text-text">{activePlayer.name}</h2>
              <p className="text-xs text-muted">
                {activePlayer.role} · {activePlayer.battingStyle} · {formatBowlingStyle(activePlayer.bowlingStyle, t)}
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-muted">
              {t.careers.matchesLabel}: <strong className="text-text">{stats.matches}</strong> ·{' '}
              {t.careers.potmAwardsLabel}: <strong className="text-accent">{stats.potmCount}</strong>
            </div>
            <div className="text-xs text-brand-600 dark:text-brand-300 font-medium mt-1">
              {stats.badges.length > 0 ? stats.badges.join(' · ') : t.careers.defaultContenderBadge}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-4 rounded-2xl bg-page border border-line space-y-3">
            <h3 className="text-xs font-bold text-muted uppercase">{t.careers.battingCareerHeading}</h3>
            <div className="grid grid-cols-3 gap-2 font-mono tabular-nums">
              <div>
                <span className="text-xs text-muted block font-sans">{t.careers.runsLabel}</span>
                <span className="text-xl font-extrabold text-text">{stats.runs}</span>
              </div>
              <div>
                <span className="text-xs text-muted block font-sans">{t.careers.hsLabel}</span>
                <span className="text-xl font-extrabold text-text">
                  {stats.highestScore}{stats.highestScoreNotOut ? '*' : ''}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted block font-sans">{t.careers.srLabel}</span>
                <span className="text-xl font-extrabold text-brand-600 dark:text-brand-300">
                  {stats.strikeRate.toFixed(1)}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted block font-sans">{t.careers.avgLabel}</span>
                <span className="text-sm font-bold text-text">{stats.average.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-xs text-muted block font-sans">{t.careers.foursSixesLabel}</span>
                <span className="text-sm font-bold text-text">{stats.fours} / {stats.sixes}</span>
              </div>
              <div>
                <span className="text-xs text-muted block font-sans">{t.careers.inningsLabel}</span>
                <span className="text-sm font-bold text-text">{stats.inningsBatted}</span>
              </div>
            </div>
            <div
              data-testid="batting-milestones-row"
              className="grid grid-cols-3 gap-2 pt-2 border-t border-line font-mono tabular-nums"
            >
              {[
                { label: t.careers.thirtiesShort, value: stats.thirties },
                { label: t.careers.fiftiesShort, value: stats.fifties },
                { label: t.careers.hundredsShort, value: stats.hundreds },
              ].map((m) => (
                <div key={m.label}>
                  <span className="text-xs text-muted block font-sans">{m.label}</span>
                  <span className="text-sm font-bold text-text">{m.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-page border border-line space-y-3">
            <h3 className="text-xs font-bold text-muted uppercase">{t.careers.bowlingCareerHeading}</h3>
            <div className="grid grid-cols-3 gap-2 font-mono tabular-nums">
              {[
                { label: t.careers.wicketsLabel, value: stats.wickets, cls: 'text-xl font-extrabold text-text' },
                { label: t.careers.bestLabel, value: `${stats.bestBowlingWickets}/${stats.bestBowlingRuns}`, cls: 'text-xl font-extrabold text-text' },
                { label: t.careers.econLabel, value: stats.economy.toFixed(2), cls: 'text-xl font-extrabold text-brand-600 dark:text-brand-300' },
                { label: t.careers.oversLabel, value: stats.oversBowledFormatted, cls: 'text-sm font-bold text-text' },
                { label: t.careers.fiveWHaulsLabel, value: stats.fiveWicketHauls, cls: 'text-sm font-bold text-text' },
                { label: t.careers.hatTricksLabel, value: stats.hatTricks, cls: 'text-sm font-bold text-text' },
              ].map((cell) => (
                <div key={cell.label}>
                  <span className="text-xs text-muted block font-sans">{cell.label}</span>
                  <span className={cell.cls}>{cell.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-page border border-line space-y-3">
            <h3 className="text-xs font-bold text-muted uppercase">{t.careers.fieldingImpactHeading}</h3>
            <div className="grid grid-cols-3 gap-2 font-mono tabular-nums">
              {[
                { label: t.careers.catchesLabel, value: stats.catches, cls: 'text-xl font-extrabold text-text' },
                { label: t.careers.stumpingsLabel, value: stats.stumpings, cls: 'text-xl font-extrabold text-text' },
                { label: t.careers.runOutsLabel, value: stats.runOuts, cls: 'text-xl font-extrabold text-text' },
                { label: t.careers.ducksLabel, value: stats.ducks, cls: 'text-sm font-bold text-text' },
                { label: t.careers.threeWHaulsLabel, value: stats.threeWicketHauls, cls: 'text-sm font-bold text-text' },
                { label: t.careers.potmShortLabel, value: stats.potmCount, cls: 'text-sm font-bold text-accent' },
              ].map((cell) => (
                <div key={cell.label}>
                  <span className="text-xs text-muted block font-sans">{cell.label}</span>
                  <span className={cell.cls}>{cell.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <CareersAnalyticsSections
        activePlayer={activePlayer}
        players={players}
        stats={stats}
        h2hOpponentId={h2hOpponentId}
        setH2hOpponentId={setH2hOpponentId}
        h2hRole={h2hRole}
        setH2hRole={setH2hRole}
        h2hStats={h2hStats}
        potmHistoryMatches={potmHistoryMatches}
        setActiveMatchId={setActiveMatchId}
        t={t}
      />
    </div>
  );
};
