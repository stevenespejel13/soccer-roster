import type { Player } from '../types';
import SetupField from './SetupField';

interface Props {
  teamName: string;
  opponentName: string;
  quarterLengthMinutes: number;
  players: Player[];
  onSetTeamName: (n: string) => void;
  onSetOpponentName: (n: string) => void;
  onSetQuarterLength: (m: number) => void;
  onSetGoalie: (id: string | null) => void;
  onMovePlayer: (id: string, x: number, y: number) => void;
  onAddToField: (id: string, x: number, y: number) => void;
  onRemoveFromField: (id: string) => void;
  onStartGame: () => void;
  onBackToRoster: () => void;
}

export default function SetupView({
  teamName,
  opponentName,
  quarterLengthMinutes,
  players,
  onSetTeamName,
  onSetOpponentName,
  onSetQuarterLength,
  onSetGoalie,
  onMovePlayer,
  onAddToField,
  onRemoveFromField,
  onStartGame,
  onBackToRoster,
}: Props) {
  const onField = players.filter((p) => p.status === 'playing');
  const onFieldCount = onField.length;
  const hasGoalie = onField.some((p) => p.isGoalie);
  const fieldFull = onFieldCount >= 7;

  const canStart =
    !!teamName.trim() && !!opponentName.trim() && onFieldCount >= 1 && hasGoalie;

  function hint() {
    if (!teamName.trim() || !opponentName.trim()) return 'Enter both team names to continue.';
    if (onFieldCount === 0) return 'Drag or tap a player from the bench to place them on the field.';
    if (!hasGoalie) return "Tap a player's circle on the field to set the goalkeeper (⚽).";
    return '';
  }

  const h = hint();

  return (
    <div className="setup-view">
      <header className="app-header">
        <button className="btn btn-outline btn-sm" onClick={onBackToRoster}>
          ← Roster
        </button>
        <div className="header-title" style={{ justifyContent: 'center', flex: 1 }}>
          <span className="soccer-icon">⚽</span>
          <h1>Game Setup</h1>
        </div>
        <span className="header-meta">7 v 7 · 4Q</span>
      </header>

      <div className="setup-body">
        {/* ── Game Info (compact row) ── */}
        <div className="setup-info-row">
          <div className="form-group setup-info-field">
            <label>Your Team</label>
            <input
              value={teamName}
              onChange={(e) => onSetTeamName(e.target.value)}
              placeholder="e.g. Lightning FC"
            />
          </div>
          <div className="form-group setup-info-field">
            <label>Opponent</label>
            <input
              value={opponentName}
              onChange={(e) => onSetOpponentName(e.target.value)}
              placeholder="e.g. Thunder United"
            />
          </div>
          <div className="form-group setup-info-field setup-info-quarter">
            <label>Quarter</label>
            <select
              value={quarterLengthMinutes}
              onChange={(e) => onSetQuarterLength(Number(e.target.value))}
            >
              {[8, 10, 12, 15].map((m) => (
                <option key={m} value={m}>{m} min</option>
              ))}
            </select>
          </div>
          <div className="setup-info-count">
            <span className={`lineup-count ${fieldFull ? 'at-max' : ''}`}>
              <strong>{onFieldCount}</strong>/7
            </span>
            {onFieldCount > 0 && hasGoalie && (
              <span className="gk-confirmed">✓ GK</span>
            )}
            {onFieldCount > 0 && !hasGoalie && (
              <span className="gk-warning">⚠ GK?</span>
            )}
          </div>
        </div>

        {/* ── Field + Bench ── */}
        {players.length === 0 ? (
          <div className="card setup-empty-card">
            <p className="empty-state">No players on roster — go back and add players first.</p>
          </div>
        ) : (
          <div className="card field-card setup-field-card">
            <SetupField
              players={players}
              fieldFull={fieldFull}
              onSetGoalie={onSetGoalie}
              onMovePlayer={onMovePlayer}
              onAddToField={onAddToField}
              onRemoveFromField={onRemoveFromField}
            />
          </div>
        )}
      </div>

      <div className="start-bar">
        {h && <p className="start-hint">{h}</p>}
        <button
          className="btn btn-primary btn-large"
          disabled={!canStart}
          onClick={onStartGame}
        >
          Kick Off!
        </button>
      </div>
    </div>
  );
}
