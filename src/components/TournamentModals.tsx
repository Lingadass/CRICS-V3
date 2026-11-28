import React from 'react';
import {
  KnockoutStagePreset,
  MatchFormat,
  Team,
  Tournament,
} from '../engine/types';
import { TranslationDictionary } from '../i18n/translations';
import { normalizeTournamentGroupKey } from '../utils/tournamentGroupUtils';

interface AddFixtureModalProps {
  isOpen: boolean;
  tournament: Tournament;
  teamsNameMap: Record<string, string>;
  fixRoundName: string;
  setFixRoundName: (v: string) => void;
  fixTeamAId: string;
  setFixTeamAId: (v: string) => void;
  fixTeamBId: string;
  setFixTeamBId: (v: string) => void;
  fixDate: string;
  setFixDate: (v: string) => void;
  fixVenue: string;
  setFixVenue: (v: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  t: TranslationDictionary;
}

export const AddFixtureModal: React.FC<AddFixtureModalProps> = ({
  isOpen,
  tournament,
  teamsNameMap,
  fixRoundName,
  setFixRoundName,
  fixTeamAId,
  setFixTeamAId,
  fixTeamBId,
  setFixTeamBId,
  fixDate,
  setFixDate,
  fixVenue,
  setFixVenue,
  onClose,
  onSubmit,
  t,
}) => {
  if (!isOpen) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      aria-labelledby="add-fixture-dialog-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-3xl bg-card border border-line p-6 space-y-4"
      >
        <h3 id="add-fixture-dialog-title" className="text-lg font-bold text-text">
          {t.tournaments.addFixtureBtn}
        </h3>
        <div>
          <label htmlFor="fixture-round-name" className="block text-xs font-semibold text-muted mb-1">
            {t.tournaments.roundStageLabel}
          </label>
          <input
            id="fixture-round-name"
            type="text"
            value={fixRoundName}
            onChange={(e) => setFixRoundName(e.target.value)}
            className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm text-text"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="fixture-team-a" className="block text-xs font-semibold text-muted mb-1">
              {t.wizard.teamALabel}
            </label>
            <select
              id="fixture-team-a"
              value={fixTeamAId}
              onChange={(e) => setFixTeamAId(e.target.value)}
              className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm text-text"
            >
              {tournament.teamIds.map((tid) => (
                <option key={tid} value={tid}>
                  {teamsNameMap[tid] || tid}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="fixture-team-b" className="block text-xs font-semibold text-muted mb-1">
              {t.wizard.teamBLabel}
            </label>
            <select
              id="fixture-team-b"
              value={fixTeamBId}
              onChange={(e) => setFixTeamBId(e.target.value)}
              className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm text-text"
            >
              {tournament.teamIds.map((tid) => (
                <option key={tid} value={tid}>
                  {teamsNameMap[tid] || tid}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="fixture-date" className="block text-xs font-semibold text-muted mb-1">
              {t.wizard.dateLabel}
            </label>
            <input
              id="fixture-date"
              type="date"
              value={fixDate}
              onChange={(e) => setFixDate(e.target.value)}
              className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm text-text"
            />
          </div>
          <div>
            <label htmlFor="fixture-venue" className="block text-xs font-semibold text-muted mb-1">
              {t.wizard.venueLabel}
            </label>
            <input
              id="fixture-venue"
              type="text"
              value={fixVenue}
              onChange={(e) => setFixVenue(e.target.value)}
              className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm text-text"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] flex-1 rounded-xl bg-page border border-line text-sm font-semibold text-text"
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            className="min-h-[48px] flex-1 rounded-xl bg-brand-600 text-white text-sm font-bold"
          >
            {t.tournaments.addFixtureBtn}
          </button>
        </div>
      </form>
    </div>
  );
};

interface SeedKnockoutModalProps {
  isOpen: boolean;
  tournament: Tournament;
  knockoutPreset: KnockoutStagePreset;
  setKnockoutPreset: (v: KnockoutStagePreset) => void;
  knockoutDate: string;
  setKnockoutDate: (v: string) => void;
  knockoutVenue: string;
  setKnockoutVenue: (v: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  t: TranslationDictionary;
}

export const SeedKnockoutModal: React.FC<SeedKnockoutModalProps> = ({
  isOpen,
  knockoutPreset,
  setKnockoutPreset,
  knockoutDate,
  setKnockoutDate,
  knockoutVenue,
  setKnockoutVenue,
  onClose,
  onSubmit,
  t,
}) => {
  if (!isOpen) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      aria-labelledby="seed-knockout-dialog-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-3xl bg-card border border-line p-6 space-y-4"
      >
        <h3 id="seed-knockout-dialog-title" className="text-lg font-bold text-text">
          {t.tournaments.seedKnockoutBtn}
        </h3>
        <p className="text-xs text-muted">{t.tournaments.seedKnockoutDesc}</p>
        <div>
          <label htmlFor="seed-knockout-preset" className="block text-xs font-semibold text-muted mb-1">
            {t.tournaments.knockoutStructureLabel}
          </label>
          <select
            id="seed-knockout-preset"
            value={knockoutPreset === 'none' ? 'semi-finals' : knockoutPreset}
            onChange={(e) => setKnockoutPreset(e.target.value as KnockoutStagePreset)}
            className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm font-semibold text-text"
          >
            <option value="semi-finals">{t.tournaments.semiFinals}</option>
            <option value="quarter-finals">{t.tournaments.quarterFinals}</option>
            <option value="final-only">{t.tournaments.finalOnly}</option>
            <option value="custom">{t.tournaments.customKnockout}</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="seed-knockout-date" className="block text-xs font-semibold text-muted mb-1">
              {t.tournaments.startDateLabel}
            </label>
            <input
              id="seed-knockout-date"
              type="date"
              value={knockoutDate}
              onChange={(e) => setKnockoutDate(e.target.value)}
              className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm text-text"
            />
          </div>
          <div>
            <label htmlFor="seed-knockout-venue" className="block text-xs font-semibold text-muted mb-1">
              {t.wizard.venueLabel}
            </label>
            <input
              id="seed-knockout-venue"
              type="text"
              value={knockoutVenue}
              onChange={(e) => setKnockoutVenue(e.target.value)}
              className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm text-text"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] flex-1 rounded-xl bg-page border border-line text-sm font-semibold text-text"
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            className="min-h-[48px] flex-1 rounded-xl bg-brand-600 text-white text-sm font-bold"
          >
            {t.tournaments.seedKnockoutBtn}
          </button>
        </div>
      </form>
    </div>
  );
};

interface CreateTournamentModalProps {
  isOpen: boolean;
  activeTeams: Team[];
  newTourName: string;
  setNewTourName: (v: string) => void;
  newTourSeason: string;
  setNewTourSeason: (v: string) => void;
  defaultVenue: string;
  setDefaultVenue: (v: string) => void;
  newTourFormat: MatchFormat;
  setNewTourFormat: (v: MatchFormat) => void;
  newTourType: 'League' | 'Groups';
  setNewTourType: (v: 'League' | 'Groups') => void;
  newTourKnockoutPreset: KnockoutStagePreset;
  setNewTourKnockoutPreset: (v: KnockoutStagePreset) => void;
  selectedTeamIds: string[];
  toggleTeamSelection: (tid: string) => void;
  teamGroupsMap: Record<string, string>;
  setTeamGroupsMap: (m: Record<string, string>) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  t: TranslationDictionary;
}

export const CreateTournamentModal: React.FC<CreateTournamentModalProps> = ({
  isOpen,
  activeTeams,
  newTourName,
  setNewTourName,
  newTourSeason,
  setNewTourSeason,
  defaultVenue,
  setDefaultVenue,
  newTourFormat,
  setNewTourFormat,
  newTourType,
  setNewTourType,
  newTourKnockoutPreset,
  setNewTourKnockoutPreset,
  selectedTeamIds,
  toggleTeamSelection,
  teamGroupsMap,
  setTeamGroupsMap,
  onClose,
  onSubmit,
  t,
}) => {
  if (!isOpen) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      aria-labelledby="create-tournament-dialog-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <form
        onSubmit={onSubmit}
        className="w-full max-w-lg rounded-3xl bg-card border border-line p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <h3 id="create-tournament-dialog-title" className="text-lg font-bold text-text">
          {t.tournaments.newTournamentBtn}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label htmlFor="create-tour-name" className="block text-xs font-semibold text-muted mb-1">
              {t.tournaments.tournamentNameLabel}
            </label>
            <input
              id="create-tour-name"
              type="text"
              required
              value={newTourName}
              onChange={(e) => setNewTourName(e.target.value)}
              placeholder={t.tournaments.tournamentNamePlaceholder}
              className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm text-text"
            />
          </div>
          <div>
            <label htmlFor="create-tour-season" className="block text-xs font-semibold text-muted mb-1">
              {t.wizard.seasonLabel}
            </label>
            <input
              id="create-tour-season"
              type="text"
              value={newTourSeason}
              onChange={(e) => setNewTourSeason(e.target.value)}
              className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm text-text"
            />
          </div>
          <div>
            <label htmlFor="create-tour-venue" className="block text-xs font-semibold text-muted mb-1">
              {t.tournaments.defaultVenueLabel}
            </label>
            <input
              id="create-tour-venue"
              type="text"
              value={defaultVenue}
              onChange={(e) => setDefaultVenue(e.target.value)}
              className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm text-text"
            />
          </div>
          <div>
            <label htmlFor="create-tour-format" className="block text-xs font-semibold text-muted mb-1">
              {t.wizard.formatLabel}
            </label>
            <select
              id="create-tour-format"
              value={newTourFormat}
              onChange={(e) => setNewTourFormat(e.target.value as MatchFormat)}
              className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm text-text"
            >
              <option value="T20">{'T20'}</option>
              <option value="T10">{'T10'}</option>
              <option value="ODI">{'ODI'}</option>
              <option value="Custom">{t.careers.customFormatOption}</option>
            </select>
          </div>
          <div>
            <label htmlFor="create-tour-type" className="block text-xs font-semibold text-muted mb-1">
              {t.tournaments.structureLabel}
            </label>
            <select
              id="create-tour-type"
              value={newTourType}
              onChange={(e) => setNewTourType(e.target.value as 'League' | 'Groups')}
              className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm text-text"
            >
              <option value="League">{t.tournaments.roundRobinLeagueOption}</option>
              <option value="Groups">{t.tournaments.groupStageOption}</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="create-tour-knockout" className="block text-xs font-semibold text-muted mb-1">
              {t.tournaments.knockoutStageLabel}
            </label>
            <select
              id="create-tour-knockout"
              value={newTourKnockoutPreset}
              onChange={(e) => setNewTourKnockoutPreset(e.target.value as KnockoutStagePreset)}
              className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm text-text"
            >
              <option value="semi-finals">{t.tournaments.semiFinals}</option>
              <option value="quarter-finals">{t.tournaments.quarterFinals}</option>
              <option value="final-only">{t.tournaments.finalOnly}</option>
              <option value="none">{t.tournaments.noneLeagueOnlyOption}</option>
            </select>
          </div>
        </div>

        <div>
          <span className="block text-xs font-semibold text-muted mb-1">
            {t.tournaments.participatingTeamsLabel} ({selectedTeamIds.length} {t.tournaments.selectedSuffix})
          </span>
          <div className="space-y-1.5 max-h-44 overflow-y-auto p-2 rounded-xl bg-page border border-line">
            {activeTeams.map((tm) => {
              const checked = selectedTeamIds.includes(tm.id);
              return (
                <div key={tm.id} className="flex items-center justify-between text-xs p-1.5 rounded-lg text-text">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTeamSelection(tm.id)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="font-semibold">{tm.name}</span>
                  </label>
                  {checked && newTourType === 'Groups' && (
                    <select
                      aria-label={`${tm.name} ${t.tournaments.structureLabel}`}
                      value={normalizeTournamentGroupKey(teamGroupsMap[tm.id])}
                      onChange={(e) => setTeamGroupsMap({ ...teamGroupsMap, [tm.id]: e.target.value })}
                      className="min-h-[48px] rounded-lg bg-card border border-line px-2 py-1 text-xs font-bold text-text"
                    >
                      <option value="A">{t.tournaments.groupAOption}</option>
                      <option value="B">{t.tournaments.groupBOption}</option>
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] flex-1 rounded-xl bg-page border border-line text-sm font-semibold text-text"
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            className="min-h-[48px] flex-1 rounded-xl bg-brand-600 text-white text-sm font-bold"
          >
            {t.tournaments.createAndGenerateBtn}
          </button>
        </div>
      </form>
    </div>
  );
};
