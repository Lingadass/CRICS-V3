import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive, Download, Printer, QrCode, RotateCcw, Search, Upload, UserPlus,
} from 'lucide-react';
import { db } from '../db/database';
import { BattingStyle, BowlingStyle, Player, PlayerRole } from '../engine/types';
import { useModalEscape } from '../hooks/useModalEscape';
import { getTranslations } from '../i18n/translations';
import { useCricsStore } from '../store/useCricsStore';
import { getLocalDateString } from '../utils/dateUtils';
import { blobToDataUrl } from '../utils/imageExportUtils';
import {
  compressImageTo300pxBlob, CsvDuplicateIdPolicy, exportPlayersToCsv,
  findDuplicatePlayers, generateAutoPlayerId, parsePlayersFromCsv,
} from '../utils/mediaUtils';
import {
  buildClubRosterExport, encodePlayerQrPayload, generatePlayerQrDataUrl,
  parseClubRosterImport, saveImportedClubRoster,
} from '../utils/playerQrUtils';
import { triggerBlobDownload } from '../utils/scorecardExportUtils';
import { PlayerCardGrid } from './PlayerCardGrid';
import { PlayerExtraModals, PlayerFormModal, ROLES } from './PlayerModals';
import { PlayerPassCardData } from './PlayerPassExportAndPrint';

export const PlayersView: React.FC = () => {
  const {
    players, teams, matches, careerCache, settings, savePlayer, bulkSavePlayers,
    deletePlayer, unarchivePlayer, setSelectedCareerPlayerId, setActiveTab,
  } = useCricsStore();
  const t = getTranslations(settings.language);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<PlayerRole | 'ALL'>('ALL');
  const [showArchived, setShowArchived] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [csvDuplicatePolicy, setCsvDuplicatePolicy] = useState<CsvDuplicateIdPolicy>('update-existing');
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [archivedUndoPlayer, setArchivedUndoPlayer] = useState<Player | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [role, setRole] = useState<PlayerRole>('All-Rounder');
  const [battingStyle, setBattingStyle] = useState<BattingStyle>('Right-hand bat');
  const [bowlingStyle, setBowlingStyle] = useState<BowlingStyle>('Right-arm medium');
  const [jerseyNumberInput, setJerseyNumberInput] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [photoBlob, setPhotoBlob] = useState<Blob | undefined>(undefined);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState('');

  const [playerPhotoUrls, setPlayerPhotoUrls] = useState<Record<string, string>>({});
  const [playerQrUrls, setPlayerQrUrls] = useState<Record<string, string>>({});
  const [confirmDeletePlayer, setConfirmDeletePlayer] = useState<Player | null>(null);
  const [idCardPlayer, setIdCardPlayer] = useState<Player | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [printMode, setPrintMode] = useState<'single' | 'sheet' | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const rosterInputRef = useRef<HTMLInputElement>(null);

  const hasClubSecurityCode = Boolean((settings.clubSecurityCode || '').trim());

  useModalEscape(Boolean(showForm || confirmDeletePlayer || idCardPlayer || printMode), () => {
    setShowForm(false);
    setConfirmDeletePlayer(null);
    setIdCardPlayer(null);
    setPrintMode(null);
  });

  useEffect(() => {
    let active = true;
    db.playerPhotos
      .toArray()
      .then(async (records) => {
        if (!active) return;
        const map: Record<string, string> = {};
        for (const rec of records) {
          if (rec.blob) {
            try {
              map[rec.playerId] = await blobToDataUrl(rec.blob);
            } catch {
              // ignore corrupt photo record
            }
          }
        }
        if (active) setPlayerPhotoUrls(map);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [players]);

  useEffect(() => {
    if (!idCardPlayer) return;
    let active = true;
    encodePlayerQrPayload(idCardPlayer, settings.clubSecurityCode)
      .then((payload) => generatePlayerQrDataUrl(payload))
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => { active = false; };
  }, [idCardPlayer, settings.clubSecurityCode]);

  useEffect(() => {
    if (printMode !== 'sheet') return;
    let active = true;
    const activePlayers = players.filter((p) => !p.archived);
    Promise.all(
      activePlayers.map(async (p) => {
        const payload = await encodePlayerQrPayload(p, settings.clubSecurityCode);
        const url = await generatePlayerQrDataUrl(payload);
        return [p.id, url] as const;
      })
    )
      .then((entries) => { if (active) setPlayerQrUrls(Object.fromEntries(entries)); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [printMode, players, settings.clubSecurityCode]);

  const potentialDuplicates = useMemo(
    () => findDuplicatePlayers(name, dob, players, editingId || undefined),
    [name, dob, players, editingId]
  );

  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      if (!showArchived && p.archived) return false;
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.jerseyNumber !== null && String(p.jerseyNumber).includes(searchQuery));
      const matchesRole = roleFilter === 'ALL' || p.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [players, searchQuery, roleFilter, showArchived]);

  const isPlayerReferencedInMatches = (playerId: string): boolean => {
    return (
      matches.some(
        (m) =>
          m.teamAXI.includes(playerId) ||
          m.teamBXI.includes(playerId) ||
          m.manualPlayerOfTheMatchId === playerId ||
          m.innings.some(
            (inn) =>
              inn.openingStrikerId === playerId ||
              inn.openingNonStrikerId === playerId ||
              inn.openingBowlerId === playerId
          )
      ) ||
      careerCache.some(
        (c) =>
          c.playerId === playerId &&
          (c.stats.matches > 0 || c.stats.ballsFaced > 0 || c.stats.legalBallsBowled > 0)
      )
    );
  };

  const openNewPlayerForm = () => {
    setEditingId(null); setName(''); setDob(''); setRole('All-Rounder');
    setBattingStyle('Right-hand bat'); setBowlingStyle('Right-arm medium');
    setJerseyNumberInput(''); setPhone(''); setNotes('');
    setPhotoBlob(undefined); setPhotoPreviewUrl(undefined); setFormError(''); setShowForm(true);
  };

  const openEditPlayerForm = (p: Player) => {
    setEditingId(p.id); setName(p.name); setDob(p.dob || ''); setRole(p.role);
    setBattingStyle(p.battingStyle); setBowlingStyle(p.bowlingStyle);
    setJerseyNumberInput(p.jerseyNumber !== null ? String(p.jerseyNumber) : '');
    setPhone(p.phone || ''); setNotes(p.notes || '');
    setPhotoBlob(undefined); setPhotoPreviewUrl(playerPhotoUrls[p.id] || p.photoDataUrl);
    setFormError(''); setShowForm(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedBlob = await compressImageTo300pxBlob(file);
      const dataUrl = await blobToDataUrl(compressedBlob);
      setPhotoBlob(compressedBlob);
      setPhotoPreviewUrl(dataUrl);
    } catch {
      setFormError(t.players.couldNotCompressImageError);
    }
  };

  const handleSavePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError(t.players.playerNameRequiredError);
      return;
    }
    const parsedJersey =
      jerseyNumberInput.trim() === ''
        ? null
        : Number.isFinite(Number(jerseyNumberInput))
        ? Number(jerseyNumberInput)
        : null;
    const existing = editingId ? players.find((p) => p.id === editingId) : undefined;
    const playerRecord: Player = {
      id: editingId || generateAutoPlayerId(players),
      name: name.trim(), dob: dob.trim(), role, battingStyle, bowlingStyle,
      jerseyNumber: parsedJersey, phone: phone.trim(), notes: notes.trim(),
      hasPhoto: Boolean(photoBlob || existing?.hasPhoto),
      archived: existing?.archived, isSample: existing?.isSample,
      createdAt: existing?.createdAt || Date.now(),
    };
    await savePlayer(playerRecord, photoBlob);
    setShowForm(false);
  };

  const handleRequestDeleteOrArchivePlayer = async (p: Player) => {
    if (isPlayerReferencedInMatches(p.id)) {
      await deletePlayer(p.id);
      setArchivedUndoPlayer(p);
    } else {
      setConfirmDeletePlayer(p);
    }
  };

  const handleConfirmDeleteOrArchivePlayer = async () => {
    if (!confirmDeletePlayer) return;
    await deletePlayer(confirmDeletePlayer.id);
    setConfirmDeletePlayer(null);
  };

  const handleUnarchivePlayer = async (p: Player) => {
    await unarchivePlayer(p.id);
    setArchivedUndoPlayer(null);
  };

  const handleExportCsv = () => {
    const csvContent = exportPlayersToCsv(players.filter((p) => !p.archived));
    triggerBlobDownload(
      new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }),
      `crics-players-${getLocalDateString()}.csv`
    );
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const imported = parsePlayersFromCsv(text, players, csvDuplicatePolicy);
    if (imported.length > 0) {
      await bulkSavePlayers(imported);
      setStatusMsg(`${t.players.importedCsvPrefix} ${imported.length} ${t.players.importedCsvMid}.`);
      setTimeout(() => setStatusMsg(''), 3500);
    }
    e.target.value = '';
  };

  const handleExportRoster = async () => {
    const roster = await buildClubRosterExport(players, settings.clubSecurityCode);
    triggerBlobDownload(
      new Blob([JSON.stringify(roster, null, 2)], { type: 'application/json' }),
      `crics-club-roster-${getLocalDateString()}.json`
    );
    setStatusMsg(t.players.rosterExportedStatus);
  };

  const handleImportRoster = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const parsed = parseClubRosterImport(await file.text());
      if (!parsed.valid || !parsed.entries) {
        setStatusMsg(parsed.error || t.players.rosterImportError);
        return;
      }
      saveImportedClubRoster(parsed.entries);
      setStatusMsg(
        `${t.players.rosterImportedPrefix} ${parsed.entries.length} ${t.players.rosterImportedSuffix}`
      );
    } catch {
      setStatusMsg(t.players.rosterImportError);
    }
  };

  const activeCount = players.filter((p) => !p.archived).length;
  const archivedCount = players.filter((p) => p.archived).length;

  const sheetPasses: PlayerPassCardData[] = useMemo(() => {
    return filteredPlayers.map((p) => {
      const pTeams = teams.filter((tm) => tm.playerIds.includes(p.id)).map((tm) => tm.name).join(' · ');
      return {
        player: p,
        teamNamesText: pTeams,
        photoDataUrl: playerPhotoUrls[p.id] || p.photoDataUrl,
        qrDataUrl: playerQrUrls[p.id] || qrDataUrl,
        hasClubSecurityCode,
      };
    });
  }, [filteredPlayers, teams, playerPhotoUrls, playerQrUrls, qrDataUrl, hasClubSecurityCode]);

  const idCardPlayerTeamsText = useMemo(() => {
    if (!idCardPlayer) return '';
    return teams.filter((tm) => tm.playerIds.includes(idCardPlayer.id)).map((tm) => tm.name).join(' · ');
  }, [idCardPlayer, teams]);

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">{t.players.title} ({activeCount})</h1>
          <p className="text-sm text-muted">{t.players.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input ref={csvInputRef} type="file" accept=".csv,text/csv" onChange={handleImportCsv} className="hidden" />
          <input ref={rosterInputRef} data-testid="players-roster-file-input" type="file" accept=".json,application/json" onChange={(e) => void handleImportRoster(e)} className="hidden" />
          <select
            aria-label={t.players.csvPolicyAria} value={csvDuplicatePolicy}
            onChange={(e) => setCsvDuplicatePolicy(e.target.value as CsvDuplicateIdPolicy)}
            className="min-h-[48px] rounded-xl bg-card border border-line px-3 py-2 text-xs font-semibold"
          >
            <option value="update-existing">{t.players.csvUpdateExisting}</option>
            <option value="create-new">{t.players.csvCreateNew}</option>
            <option value="skip">{t.players.csvSkip}</option>
          </select>
          <button
            type="button" onClick={() => csvInputRef.current?.click()}
            className="min-h-[48px] px-3.5 py-2 rounded-xl border border-line text-xs font-semibold flex items-center gap-1.5 hover:bg-page"
          >
            <Upload className="w-4 h-4" /> {t.players.importCsv}
          </button>
          <button
            type="button" onClick={handleExportCsv}
            className="min-h-[48px] px-3.5 py-2 rounded-xl border border-line text-xs font-semibold flex items-center gap-1.5 hover:bg-page"
          >
            <Download className="w-4 h-4" /> {t.players.downloadCsv}
          </button>
          <button
            type="button" data-testid="players-export-roster-btn" onClick={() => void handleExportRoster()}
            className="min-h-[48px] px-3.5 py-2 rounded-xl border border-line text-xs font-semibold flex items-center gap-1.5 hover:bg-page"
          >
            <Download className="w-4 h-4" /> {t.players.exportRosterBtn}
          </button>
          <button
            type="button" data-testid="players-import-roster-btn" onClick={() => rosterInputRef.current?.click()}
            className="min-h-[48px] px-3.5 py-2 rounded-xl border border-line text-xs font-semibold flex items-center gap-1.5 hover:bg-page"
          >
            <Upload className="w-4 h-4" /> {t.players.importRosterBtn}
          </button>
          <button
            type="button" data-testid="players-scan-pass-btn" onClick={() => setActiveTab('scan')}
            className="min-h-[48px] px-3.5 py-2 rounded-xl border border-brand-600 text-brand-700 dark:text-brand-300 text-xs font-bold flex items-center gap-1.5 hover:bg-page"
          >
            <QrCode className="w-4 h-4" /> {t.scanner.scanPassBtn}
          </button>
          <button
            type="button" data-testid="print-squad-sheet-btn" onClick={() => setPrintMode('sheet')}
            className="min-h-[48px] px-3.5 py-2 rounded-xl border border-line text-xs font-semibold flex items-center gap-1.5 hover:bg-page"
          >
            <Printer className="w-4 h-4" /> {t.players.printSheetBtn}
          </button>
          <button
            type="button" data-testid="add-player-btn" onClick={openNewPlayerForm}
            className="min-h-[48px] px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus className="w-4 h-4" /> {t.players.registerBtn}
          </button>
        </div>
      </div>

      {statusMsg && (
        <div role="status" className="p-3 rounded-2xl bg-success/10 border border-success/40 text-xs font-semibold text-success">
          {statusMsg}
        </div>
      )}

      {archivedUndoPlayer && (
        <div
          role="status" data-testid="archive-undo-toast"
          className="p-3.5 rounded-2xl bg-brand-950 text-white border border-brand-700 flex items-center justify-between gap-3"
        >
          <span className="text-xs font-semibold">
            <strong>{archivedUndoPlayer.name}</strong> {t.players.archivedToastSuffix}
          </span>
          <button
            type="button" onClick={() => void handleUnarchivePlayer(archivedUndoPlayer)}
            className="min-h-[48px] px-3.5 py-1.5 rounded-xl bg-accent text-brand-950 text-xs font-bold flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.common.undoAction}</span>
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-line rounded-2xl p-3.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text" aria-label={t.players.searchPlaceholder} placeholder={t.players.searchPlaceholder}
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[48px] pl-10 pr-4 rounded-xl bg-page border border-line text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(['ALL', ...ROLES] as const).map((r) => (
            <button
              key={r} onClick={() => setRoleFilter(r)}
              className={`min-h-[48px] px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ${
                roleFilter === r ? 'bg-brand-600 text-white' : 'text-muted hover:bg-page'
              }`}
            >
              {r === 'ALL' ? t.players.allRolesFilter : r}
            </button>
          ))}
          {archivedCount > 0 && (
            <button
              type="button" onClick={() => setShowArchived((v) => !v)}
              className={`min-h-[48px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 ${
                showArchived ? 'bg-accent text-brand-950' : 'border border-line text-muted'
              }`}
            >
              <Archive className="w-3.5 h-3.5" /> {t.players.archivedBtnLabel} ({archivedCount})
            </button>
          )}
        </div>
      </div>

      <PlayerFormModal
        showForm={showForm} editingId={editingId} autoPlayerId={generateAutoPlayerId(players)}
        name={name} setName={setName} dob={dob} setDob={setDob} role={role} setRole={setRole}
        battingStyle={battingStyle} setBattingStyle={setBattingStyle}
        bowlingStyle={bowlingStyle} setBowlingStyle={setBowlingStyle}
        jerseyNumberInput={jerseyNumberInput} setJerseyNumberInput={setJerseyNumberInput}
        phone={phone} setPhone={setPhone} notes={notes} setNotes={setNotes}
        photoPreviewUrl={photoPreviewUrl} formError={formError}
        potentialDuplicates={potentialDuplicates} onPhotoUpload={handlePhotoUpload}
        onSavePlayer={handleSavePlayer} onClose={() => setShowForm(false)} t={t}
      />

      <PlayerExtraModals
        confirmDeletePlayer={confirmDeletePlayer}
        isReferenced={confirmDeletePlayer ? isPlayerReferencedInMatches(confirmDeletePlayer.id) : false}
        onCancelDelete={() => setConfirmDeletePlayer(null)}
        onConfirmDelete={handleConfirmDeleteOrArchivePlayer}
        idCardPlayer={idCardPlayer} teamNamesText={idCardPlayerTeamsText}
        photoSrc={idCardPlayer ? playerPhotoUrls[idCardPlayer.id] || idCardPlayer.photoDataUrl : undefined}
        qrDataUrl={qrDataUrl} hasClubSecurityCode={hasClubSecurityCode}
        sheetPasses={sheetPasses} printMode={printMode} setPrintMode={setPrintMode}
        onCloseIdCard={() => setIdCardPlayer(null)} t={t}
      />

      <PlayerCardGrid
        filteredPlayers={filteredPlayers}
        teams={teams}
        playerPhotoUrls={playerPhotoUrls}
        onNewPlayer={openNewPlayerForm}
        onEditPlayer={openEditPlayerForm}
        onDeleteOrArchive={(p) => void handleRequestDeleteOrArchivePlayer(p)}
        onUnarchive={(p) => void handleUnarchivePlayer(p)}
        onOpenIdCard={(p) => setIdCardPlayer(p)}
        onOpenCareers={(id) => {
          setSelectedCareerPlayerId(id);
          setActiveTab('careers');
        }}
        t={t}
      />
    </div>
  );
};
