import React from 'react';
import { Edit2, QrCode, Trash2, UserPlus } from 'lucide-react';
import { Player, Team } from '../engine/types';
import { formatBowlingStyle, TranslationDictionary } from '../i18n/translations';

interface PlayerCardGridProps {
  filteredPlayers: Player[];
  teams: Team[];
  playerPhotoUrls: Record<string, string>;
  onNewPlayer: () => void;
  onEditPlayer: (player: Player) => void;
  onDeleteOrArchive: (player: Player) => void;
  onUnarchive: (player: Player) => void;
  onOpenIdCard: (player: Player) => void;
  onOpenCareers: (playerId: string) => void;
  t: TranslationDictionary;
}

export const PlayerCardGrid: React.FC<PlayerCardGridProps> = ({
  filteredPlayers,
  teams,
  playerPhotoUrls,
  onNewPlayer,
  onEditPlayer,
  onDeleteOrArchive,
  onUnarchive,
  onOpenIdCard,
  onOpenCareers,
  t,
}) => {
  if (filteredPlayers.length === 0) {
    return (
      <div className="rounded-2xl bg-card border border-line p-8 text-center space-y-3">
        <p className="text-sm text-muted">{t.players.emptyMessage}</p>
        <button
          type="button"
          onClick={onNewPlayer}
          className="min-h-[48px] px-5 py-2.5 rounded-xl bg-brand-600 text-white text-xs font-bold inline-flex items-center gap-1.5"
        >
          <UserPlus className="w-4 h-4" />
          <span>{t.players.registerBtn}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredPlayers.map((p) => {
        const playerTeams = teams.filter((tm) => tm.playerIds.includes(p.id));
        const photoSrc = playerPhotoUrls[p.id] || p.photoDataUrl;
        return (
          <div
            key={p.id}
            className={`rounded-2xl bg-card border p-4 flex flex-col justify-between gap-3 ${
              p.archived ? 'border-accent/50 opacity-75' : 'border-line'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {photoSrc ? (
                  <img
                    src={photoSrc}
                    alt={p.name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-2xl object-cover border border-line"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-brand-950 text-brand-300 font-bold text-sm flex items-center justify-center shrink-0">
                    {p.jerseyNumber !== null ? `#${p.jerseyNumber}` : p.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <span className="text-xs font-mono text-muted block">
                    {p.id} {p.archived ? `· ${t.players.archivedBadge}` : ''}
                  </span>
                  <h3 className="text-base font-bold text-text">{p.name}</h3>
                  <p className="text-xs text-muted">
                    {p.role} · {p.battingStyle}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-xs text-muted space-y-1">
              <p>
                {t.players.bowlingLabel}: {formatBowlingStyle(p.bowlingStyle, t)} · {t.players.dobLabel}: {p.dob || '—'}
              </p>
              {playerTeams.length > 0 && (
                <p>
                  {t.players.squadsLabel}: {playerTeams.map((tm) => tm.name).join(' · ')}
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-line flex items-center justify-between gap-2">
              <button
                onClick={() => onOpenCareers(p.id)}
                className="min-h-[48px] px-3 py-1.5 rounded-xl text-xs font-semibold text-brand-600 dark:text-brand-400 hover:bg-page"
              >
                {t.players.careerStatsBtn}
              </button>

              <div className="flex items-center gap-1">
                {p.archived ? (
                  <button
                    onClick={() => onUnarchive(p)}
                    className="min-h-[48px] px-3 rounded-xl bg-accent text-brand-950 text-xs font-bold"
                  >
                    {t.players.restoreBtn}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => onOpenIdCard(p)}
                      aria-label={`${t.players.idCardAria} ${p.name}`}
                      className="min-h-[48px] min-w-[48px] rounded-xl hover:bg-page flex items-center justify-center text-muted"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEditPlayer(p)}
                      aria-label={`${t.common.edit} ${p.name}`}
                      className="min-h-[48px] min-w-[48px] rounded-xl hover:bg-page flex items-center justify-center text-muted"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteOrArchive(p)}
                      aria-label={`${t.common.delete} ${p.name}`}
                      className="min-h-[48px] min-w-[48px] rounded-xl hover:bg-wicket/10 flex items-center justify-center text-wicket"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
