import React from 'react';
import { CheckCircle2, Shield, Users } from 'lucide-react';
import { Player, Team } from '../engine/types';
import { TranslationDictionary } from '../i18n/translations';

interface MatchWizardTeamsSectionProps {
  activeTeams: Team[];
  activePlayers: Player[];
  allPlayers: Player[];
  teamAId: string;
  teamBId: string;
  teamAObj?: Team;
  teamBObj?: Team;
  teamAXI: string[];
  teamBXI: string[];
  setTeamAXI: React.Dispatch<React.SetStateAction<string[]>>;
  setTeamBXI: React.Dispatch<React.SetStateAction<string[]>>;
  onTeamAChange: (newId: string) => void;
  onTeamBChange: (newId: string) => void;
  togglePlayerInXI: (
    playerId: string,
    currentXI: string[],
    setXI: React.Dispatch<React.SetStateAction<string[]>>
  ) => void;
  battingFirstXI: string[];
  bowlingFirstXI: string[];
  openingStrikerId: string;
  setOpeningStrikerId: (id: string) => void;
  openingNonStrikerId: string;
  setOpeningNonStrikerId: (id: string) => void;
  openingBowlerId: string;
  setOpeningBowlerId: (id: string) => void;
  t: TranslationDictionary;
}

export const MatchWizardTeamsSection: React.FC<MatchWizardTeamsSectionProps> = ({
  activeTeams,
  activePlayers,
  allPlayers,
  teamAId,
  teamBId,
  teamAObj,
  teamBObj,
  teamAXI,
  teamBXI,
  setTeamAXI,
  setTeamBXI,
  onTeamAChange,
  onTeamBChange,
  togglePlayerInXI,
  battingFirstXI,
  bowlingFirstXI,
  openingStrikerId,
  setOpeningStrikerId,
  openingNonStrikerId,
  setOpeningNonStrikerId,
  openingBowlerId,
  setOpeningBowlerId,
  t,
}) => {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[
          {
            label: t.wizard.teamALabel,
            teamId: teamAId,
            onTeamChange: onTeamAChange,
            teamObj: teamAObj,
            selectedXI: teamAXI,
            otherXI: teamBXI,
            setXI: setTeamAXI,
          },
          {
            label: t.wizard.teamBLabel,
            teamId: teamBId,
            onTeamChange: onTeamBChange,
            teamObj: teamBObj,
            selectedXI: teamBXI,
            otherXI: teamAXI,
            setXI: setTeamBXI,
          },
        ].map(({ label, teamId, onTeamChange, teamObj, selectedXI, otherXI, setXI }) => (
          <section
            key={label}
            className="rounded-2xl bg-card border border-line p-5 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <h3 className="text-base font-bold text-text">
                  {label} & {t.wizard.playingXiLabel} ({selectedXI.length}/11)
                </h3>
              </div>
              <select
                aria-label={`${t.wizard.selectTeamAria} ${label}`}
                value={teamId}
                onChange={(e) => onTeamChange(e.target.value)}
                className="min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm font-semibold"
              >
                {activeTeams.map((tm) => (
                  <option key={tm.id} value={tm.id}>
                    {tm.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedXI.length < 2 && (
              <p className="text-xs font-semibold text-extra">
                {t.wizard.chooseAtLeast2Players} {label}.
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
              {(teamObj?.playerIds || []).map((pid) => {
                const p = activePlayers.find((pl) => pl.id === pid);
                if (!p) return null;
                const isSelected = selectedXI.includes(pid);
                const isInOpposingXI = otherXI.includes(pid);
                const isCapt = teamObj?.captainId === pid;
                return (
                  <button
                    key={pid}
                    type="button"
                    disabled={isInOpposingXI}
                    onClick={() => togglePlayerInXI(pid, selectedXI, setXI)}
                    className={`min-h-[48px] px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between border transition-colors ${
                      isSelected
                        ? 'bg-brand-50 dark:bg-brand-950/50 border-brand-500/50 text-text font-semibold'
                        : isInOpposingXI
                        ? 'border-line text-muted opacity-50 cursor-not-allowed'
                        : 'border-line text-muted'
                    }`}
                  >
                    <span className="truncate">
                      {p.jerseyNumber !== null ? `#${p.jerseyNumber} ` : ''}
                      {p.name} {isCapt ? '(C)' : ''}
                      {isInOpposingXI ? ` · ${t.wizard.inOpposingXiSuffix}` : ''}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {teamAId && teamAId === teamBId && (
        <div role="alert" className="p-3.5 rounded-2xl bg-wicket/10 border border-wicket/40 text-xs font-bold text-wicket">
          {t.wizard.sameTeamError}
        </div>
      )}

      <section className="rounded-2xl bg-card border border-line p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <h2 className="text-base font-bold text-text">
              {t.wizard.openersSectionTitle}
            </h2>
          </div>
          {openingStrikerId && openingStrikerId === openingNonStrikerId && (
            <span className="text-xs font-bold text-wicket">
              {t.wizard.differentOpenersError}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="wizard-opening-striker" className="block text-xs font-semibold text-muted mb-1">
              {t.wizard.openingStrikerLabel}
            </label>
            <select
              id="wizard-opening-striker"
              value={openingStrikerId}
              onChange={(e) => setOpeningStrikerId(e.target.value)}
              className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm"
            >
              {battingFirstXI.map((id) => {
                const p = allPlayers.find((pl) => pl.id === id);
                return (
                  <option key={id} value={id}>
                    {p?.name || id}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label htmlFor="wizard-opening-nonstriker" className="block text-xs font-semibold text-muted mb-1">
              {t.wizard.openingNonStrikerLabel}
            </label>
            <select
              id="wizard-opening-nonstriker"
              value={openingNonStrikerId}
              onChange={(e) => setOpeningNonStrikerId(e.target.value)}
              className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm"
            >
              {battingFirstXI.map((id) => {
                const p = allPlayers.find((pl) => pl.id === id);
                return (
                  <option key={id} value={id}>
                    {p?.name || id}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label htmlFor="wizard-opening-bowler" className="block text-xs font-semibold text-muted mb-1">
              {t.wizard.openingBowlerLabel}
            </label>
            <select
              id="wizard-opening-bowler"
              value={openingBowlerId}
              onChange={(e) => setOpeningBowlerId(e.target.value)}
              className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm"
            >
              {bowlingFirstXI.map((id) => {
                const p = allPlayers.find((pl) => pl.id === id);
                return (
                  <option key={id} value={id}>
                    {p?.name || id}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </section>
    </>
  );
};
