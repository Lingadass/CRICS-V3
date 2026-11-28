import React, { useMemo, useState } from 'react';
import { Edit2, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Team } from '../engine/types';
import { useModalEscape } from '../hooks/useModalEscape';
import { getTranslations } from '../i18n/translations';
import { useCricsStore } from '../store/useCricsStore';

export const TeamsView: React.FC = () => {
  const { teams, players, matches, tournaments, settings, saveTeam, deleteTeam, unarchiveTeam } = useCricsStore();
  const t = getTranslations(settings.language);

  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('var(--color-brand-600)');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [captainId, setCaptainId] = useState<string>('');
  const [viceCaptainId, setViceCaptainId] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [showArchivedTeams, setShowArchivedTeams] = useState(false);
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState<Team | null>(null);
  const [archivedUndoTeam, setArchivedUndoTeam] = useState<Team | null>(null);

  useModalEscape(Boolean(showModal || confirmDeleteTeam), () => {
    setShowModal(false);
    setConfirmDeleteTeam(null);
  });

  const activePlayers = useMemo(() => players.filter((p) => !p.archived), [players]);

  const isTeamReferenced = (teamId: string): boolean => {
    return (
      matches.some((m) => m.teamAId === teamId || m.teamBId === teamId) ||
      tournaments.some((tr) => tr.teamIds.includes(teamId))
    );
  };

  const openCreateTeam = () => {
    setEditingTeam(null);
    setName('');
    setShortName('');
    setPrimaryColor('var(--color-brand-600)');
    setSelectedPlayerIds([]);
    setCaptainId('');
    setViceCaptainId('');
    setShowModal(true);
  };

  const openEditTeam = (team: Team) => {
    setEditingTeam(team);
    setName(team.name);
    setShortName(team.shortName);
    setPrimaryColor(team.primaryColor);
    setSelectedPlayerIds([...team.playerIds]);
    setCaptainId(team.captainId || '');
    setViceCaptainId(team.viceCaptainId || '');
    setShowModal(true);
  };

  const toggleSquadMember = (playerId: string) => {
    if (selectedPlayerIds.includes(playerId)) {
      setSelectedPlayerIds(selectedPlayerIds.filter((id) => id !== playerId));
    } else {
      setSelectedPlayerIds([...selectedPlayerIds, playerId]);
    }
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const resolvedCaptain = selectedPlayerIds.includes(captainId)
      ? captainId
      : selectedPlayerIds[0];
    const resolvedViceCaptain =
      selectedPlayerIds.includes(viceCaptainId) && viceCaptainId !== resolvedCaptain
        ? viceCaptainId
        : selectedPlayerIds.find((id) => id !== resolvedCaptain);

    const newTeam: Team = {
      id: editingTeam?.id || `TEAM-${Date.now()}`,
      name: name.trim(),
      shortName: shortName.trim().toUpperCase() || name.trim().slice(0, 3).toUpperCase(),
      primaryColor,
      playerIds: selectedPlayerIds,
      captainId: resolvedCaptain,
      viceCaptainId: resolvedViceCaptain,
      archived: editingTeam?.archived,
      isSample: editingTeam?.isSample,
      createdAt: editingTeam?.createdAt || Date.now(),
    };
    await saveTeam(newTeam);
    setShowModal(false);
  };

  const handleRequestDeleteOrArchiveTeam = async (tm: Team) => {
    if (isTeamReferenced(tm.id)) {
      await deleteTeam(tm.id);
      setArchivedUndoTeam(tm);
    } else {
      setConfirmDeleteTeam(tm);
    }
  };

  const handleConfirmDeleteOrArchiveTeam = async () => {
    if (!confirmDeleteTeam) return;
    await deleteTeam(confirmDeleteTeam.id);
    setConfirmDeleteTeam(null);
  };

  const visibleTeams = teams.filter((tm) => (showArchivedTeams ? true : !tm.archived));
  const archivedTeamsCount = teams.filter((tm) => tm.archived).length;

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">{t.teams.title}</h1>
          <p className="text-sm text-muted">{t.teams.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {archivedTeamsCount > 0 && (
            <button
              type="button"
              onClick={() => setShowArchivedTeams((v) => !v)}
              className="min-h-[48px] px-3.5 py-2 rounded-xl border border-line text-xs font-semibold"
            >
              {showArchivedTeams
                ? t.teams.hideArchivedBtn
                : `${t.teams.showArchivedBtn} (${archivedTeamsCount})`}
            </button>
          )}
          <button
            onClick={openCreateTeam}
            className="min-h-[48px] px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> {t.teams.createBtn}
          </button>
        </div>
      </div>

      {archivedUndoTeam && (
        <div
          role="status"
          data-testid="team-archive-undo-toast"
          className="p-3.5 rounded-2xl bg-brand-950 text-white border border-brand-700 flex items-center justify-between gap-3"
        >
          <span className="text-xs font-semibold">
            <strong>{archivedUndoTeam.name}</strong> {t.teams.archivedToastSuffix}
          </span>
          <button
            type="button"
            onClick={async () => {
              await unarchiveTeam(archivedUndoTeam.id);
              setArchivedUndoTeam(null);
            }}
            className="min-h-[48px] px-3.5 py-1.5 rounded-xl bg-accent text-brand-950 text-xs font-bold flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.common.undoAction}</span>
          </button>
        </div>
      )}

      {visibleTeams.length === 0 ? (
        <div className="rounded-2xl bg-card border border-line p-8 text-center space-y-3">
          <p className="text-sm text-muted">{t.teams.emptyMessage}</p>
          <button
            type="button"
            onClick={openCreateTeam}
            className="min-h-[48px] px-5 py-2.5 rounded-xl bg-brand-600 text-white text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{t.teams.createBtn}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {visibleTeams.map((tm) => {
            const capt = players.find((p) => p.id === tm.captainId);
            const vc = players.find((p) => p.id === tm.viceCaptainId);
            return (
              <section
                key={tm.id}
                className={`rounded-2xl bg-card border p-5 space-y-4 ${
                  tm.archived ? 'border-accent/50 opacity-75' : 'border-line'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center text-white font-extrabold text-sm">
                      {tm.shortName}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-text">
                        {tm.name} {tm.archived ? t.teams.archivedSuffix : ''}
                      </h2>
                      <p className="text-xs text-muted">
                        {tm.playerIds.length} {t.teams.squadMembersLabel} · {t.teams.captShort}:{' '}
                        {capt?.name || t.teams.unassigned} · {t.teams.vcShort}:{' '}
                        {vc?.name || t.teams.unassigned}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {tm.archived ? (
                      <button
                        onClick={() => saveTeam({ ...tm, archived: false })}
                        className="min-h-[48px] px-3 rounded-xl bg-accent text-brand-950 text-xs font-bold"
                      >
                        {t.players.restoreBtn}
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => openEditTeam(tm)}
                          aria-label={`${t.common.edit} ${tm.name}`}
                          className="min-h-[48px] min-w-[48px] rounded-xl hover:bg-page flex items-center justify-center"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => void handleRequestDeleteOrArchiveTeam(tm)}
                          aria-label={`${t.common.delete} ${tm.name}`}
                          className="min-h-[48px] min-w-[48px] rounded-xl hover:bg-wicket/10 text-wicket flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-line">
                  {tm.playerIds.map((pid) => {
                    const p = players.find((pl) => pl.id === pid);
                    if (!p) return null;
                    const isC = tm.captainId === pid;
                    const isVC = tm.viceCaptainId === pid;
                    return (
                      <div
                        key={pid}
                        className="px-3 py-2 rounded-xl bg-page border border-line text-xs flex items-center justify-between"
                      >
                        <span className="font-medium text-text truncate">
                          {p.jerseyNumber !== null ? `#${p.jerseyNumber} ` : ''}
                          {p.name}
                        </span>
                        <span className="text-xs text-muted shrink-0">
                          {isC ? t.teams.captain : isVC ? t.teams.viceCaptBadge : p.role}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {confirmDeleteTeam && (
        <div role="dialog" aria-modal="true" tabIndex={-1} aria-labelledby="delete-team-modal-title" className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-card border border-line p-6 space-y-4 shadow-xl">
            <h3 id="delete-team-modal-title" className="text-lg font-bold text-text">
              {isTeamReferenced(confirmDeleteTeam.id) ? t.teams.archiveTeamTitle : t.teams.deleteTeamTitle}
            </h3>
            <p className="text-sm text-muted">
              {isTeamReferenced(confirmDeleteTeam.id) ? (
                <>
                  <strong>{confirmDeleteTeam.name}</strong> {t.teams.archiveTeamDesc}
                </>
              ) : (
                <>
                  {t.teams.deleteTeamDescPrefix} <strong>{confirmDeleteTeam.name}</strong>?{' '}
                  {t.teams.deleteTeamDescSuffix}
                </>
              )}
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteTeam(null)}
                className="min-h-[48px] flex-1 rounded-xl bg-page border border-line text-sm font-semibold"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteOrArchiveTeam}
                className="min-h-[48px] flex-1 rounded-xl bg-wicket hover:opacity-90 text-white text-sm font-bold"
              >
                {isTeamReferenced(confirmDeleteTeam.id)
                  ? t.teams.archiveTeamConfirmBtn
                  : t.teams.deleteTeamConfirmBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div role="dialog" aria-modal="true" tabIndex={-1} aria-labelledby="team-form-modal-title" className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveTeam}
            className="w-full max-w-xl rounded-3xl bg-card border border-line p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <h2 id="team-form-modal-title" className="text-lg font-bold text-text">
              {editingTeam ? t.teams.editModalTitle : t.teams.createModalTitle}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label htmlFor="team-form-name" className="block text-xs font-semibold text-muted mb-1">
                  {t.teams.teamNameLabel}
                </label>
                <input
                  id="team-form-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.teams.teamNamePlaceholder}
                  className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="team-form-shortcode" className="block text-xs font-semibold text-muted mb-1">
                  {t.teams.shortCodeLabel}
                </label>
                <input
                  id="team-form-shortcode"
                  type="text"
                  maxLength={4}
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  placeholder={t.teams.shortCodePlaceholder}
                  className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm uppercase"
                />
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-muted mb-1">
                {t.teams.selectSquadLabel}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto p-2 rounded-xl bg-page border border-line">
                {activePlayers.map((p) => {
                  const checked = selectedPlayerIds.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 text-xs p-1.5 rounded-lg hover:bg-card cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSquadMember(p.id)}
                        className="w-4 h-4 rounded"
                      />
                      <span className="truncate">
                        {p.jerseyNumber !== null ? `#${p.jerseyNumber} ` : ''}
                        {p.name} ({p.role})
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="team-form-captain" className="block text-xs font-semibold text-muted mb-1">
                  {t.teams.captain}
                </label>
                <select
                  id="team-form-captain"
                  value={captainId}
                  onChange={(e) => setCaptainId(e.target.value)}
                  className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm"
                >
                  <option value="">{t.teams.selectCaptainOption}</option>
                  {selectedPlayerIds.map((pid) => {
                    const p = players.find((pl) => pl.id === pid);
                    return (
                      <option key={pid} value={pid}>
                        {p?.name || pid}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label htmlFor="team-form-vicecaptain" className="block text-xs font-semibold text-muted mb-1">
                  {t.teams.viceCaptain}
                </label>
                <select
                  id="team-form-vicecaptain"
                  value={viceCaptainId}
                  onChange={(e) => setViceCaptainId(e.target.value)}
                  className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm"
                >
                  <option value="">{t.teams.selectViceCaptainOption}</option>
                  {selectedPlayerIds
                    .filter((pid) => pid !== captainId)
                    .map((pid) => {
                      const p = players.find((pl) => pl.id === pid);
                      return (
                        <option key={pid} value={pid}>
                          {p?.name || pid}
                        </option>
                      );
                    })}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="min-h-[48px] flex-1 rounded-xl bg-page border border-line text-sm font-semibold"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                className="min-h-[48px] flex-1 rounded-xl bg-brand-600 text-white text-sm font-bold"
              >
                {t.teams.saveTeamBtn}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
