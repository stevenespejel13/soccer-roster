import type { Player, Position } from '../types';

interface Props {
  teamName: string;
  opponentName: string;
  quarterLengthMinutes: number;
  players: Player[];
  onSetTeamName: (n: string) => void;
  onSetOpponentName: (n: string) => void;
  onSetQuarterLength: (m: number) => void;
  onToggleStarting: (id: string) => void;
  onSetGoalie: (id: string | null) => void;
  onSetPosition: (id: string, pos: Position) => void;
  onStartGame: () => void;
  onBackToRoster: () => void;
}

const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'FWD'];

const POS_COLOR: Record<Position, string> = {
  GK: '#f59e0b',
  DEF: '#3b82f6',
  MID: '#10b981',
  FWD: '#ef4444',
};

export default function SetupView({
  teamName,
  opponentName,
  quarterLengthMinutes,
  players,
  onSetTeamName,
  onSetOpponentName,
  onSetQuarterLength,
  onToggleStarting,
  onSetGoalie,
  onSetPosition,
  onStartGame,
  onBackToRoster,
}: Props) {
  const onField = players.filter((p) => p.status === 'playing');
  const bench = players.filter((p) => p.status === 'bench');
  const onFieldCount = onField.length;
  const hasGoalie = onField.some((p) => p.isGoalie);
  const fieldFull = onFieldCount >= 7;

  const canStart =
    !!teamName.trim() && !!opponentName.trim() && onFieldCount >= 1 && hasGoalie;

  function hint() {
    if (!teamName.trim() || !opponentName.trim()) return 'Enter both team names to continue.';
    if (onFieldCount === 0) return 'Select at least one starting player.';
    if (!hasGoalie) return 'Tap 🥅 on a starting player to set the goalkeeper.';
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
        <span className="header-meta">7 v 7 · 4 quarters</span>
      </header>

      <div className="setup-grid">
        {/* Game config */}
        <section className="card">
          <h2>Game Info</h2>
          <div className="form-group">
            <label>Your Team</label>
            <input
              value={teamName}
              onChange={(e) => onSetTeamName(e.target.value)}
              placeholder="e.g. Lightning FC"
            />
          </div>
          <div className="form-group">
            <label>Opponent</label>
            <input
              value={opponentName}
              onChange={(e) => onSetOpponentName(e.target.value)}
              placeholder="e.g. Thunder United"
            />
          </div>
          <div className="form-group">
            <label>Quarter Length</label>
            <select
              value={quarterLengthMinutes}
              onChange={(e) => onSetQuarterLength(Number(e.target.value))}
            >
              {[8, 10, 12, 15].map((m) => (
                <option key={m} value={m}>{m} minutes</option>
              ))}
            </select>
          </div>
        </section>

        {/* Lineup builder */}
        <section className="card card-wide">
          <div className="roster-header">
            <h2>Starting Lineup</h2>
            <div className="roster-counts">
              <span className={`lineup-count ${fieldFull ? 'at-max' : ''}`}>
                <strong>{onFieldCount}</strong>/7 on field
              </span>
              {onFieldCount > 0 && hasGoalie && (
                <span className="gk-confirmed">✓ GK set</span>
              )}
              {onFieldCount > 0 && !hasGoalie && (
                <span className="gk-warning">⚠ No GK</span>
              )}
            </div>
          </div>

          {/* On field */}
          {onField.length > 0 && (
            <div className="roster-section">
              <div className="roster-section-label">Starting — on field</div>
              <div className="player-list">
                {onField.map((p) => (
                  <div
                    key={p.id}
                    className={`player-row starting ${p.isGoalie ? 'is-goalie' : ''}`}
                  >
                    <span className="jersey">#{p.number}</span>
                    <span className="player-name">{p.name}</span>
                    {/* Position pills */}
                    <div className="pos-pills">
                      {POSITIONS.map((pos) => (
                        <button
                          key={pos}
                          className={`pos-pill ${p.position === pos ? 'active' : ''}`}
                          style={p.position === pos ? { background: POS_COLOR[pos] } : {}}
                          onClick={() => onSetPosition(p.id, pos)}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                    <div className="player-actions">
                      <button
                        className={`btn btn-sm ${p.isGoalie ? 'btn-gk-active' : 'btn-gk'}`}
                        onClick={() => onSetGoalie(p.isGoalie ? null : p.id)}
                        title={p.isGoalie ? 'Remove as goalkeeper' : 'Set as goalkeeper'}
                      >
                        🥅
                      </button>
                      <button
                        className="btn btn-sm btn-warning"
                        onClick={() => onToggleStarting(p.id)}
                      >
                        Bench
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bench */}
          {bench.length > 0 && (
            <div className="roster-section">
              <div className="roster-section-label">Bench</div>
              <div className="player-list">
                {bench.map((p) => (
                  <div key={p.id} className="player-row">
                    <span className="jersey">#{p.number}</span>
                    <span className="player-name">{p.name}</span>
                    <span
                      className="pos-tag"
                      style={{ background: POS_COLOR[p.position] }}
                    >
                      {p.position}
                    </span>
                    <div className="player-actions">
                      <button
                        className={`btn btn-sm ${fieldFull ? 'btn-outline' : 'btn-success'}`}
                        onClick={() => onToggleStarting(p.id)}
                        disabled={fieldFull}
                        title={fieldFull ? 'Field is full (7 max)' : 'Move to starting lineup'}
                      >
                        Start
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {players.length === 0 && (
            <p className="empty-state">
              No players — go back to the roster and add players first.
            </p>
          )}
        </section>
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
