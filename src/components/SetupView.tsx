import { useState } from 'react';
import type { Player } from '../types';

interface Props {
  teamName: string;
  opponentName: string;
  quarterLengthMinutes: number;
  players: Player[];
  onSetTeamName: (n: string) => void;
  onSetOpponentName: (n: string) => void;
  onSetQuarterLength: (m: number) => void;
  onAddPlayer: (name: string, number: number) => void;
  onRemovePlayer: (id: string) => void;
  onToggleStarting: (id: string) => void;
  onSetGoalie: (id: string | null) => void;
  onStartGame: () => void;
}

export default function SetupView({
  teamName,
  opponentName,
  quarterLengthMinutes,
  players,
  onSetTeamName,
  onSetOpponentName,
  onSetQuarterLength,
  onAddPlayer,
  onRemovePlayer,
  onToggleStarting,
  onSetGoalie,
  onStartGame,
}: Props) {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');

  const onField = players.filter((p) => p.status === 'playing');
  const benchPlayers = players.filter((p) => p.status === 'bench');
  const onFieldCount = onField.length;
  const hasGoalie = onField.some((p) => p.isGoalie);
  const fieldFull = onFieldCount >= 7;

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const num = parseInt(number, 10);
    if (!name.trim() || isNaN(num) || num < 1 || num > 99) return;
    onAddPlayer(name.trim(), num);
    setName('');
    setNumber('');
  }

  const canStart =
    !!teamName.trim() && !!opponentName.trim() && onFieldCount >= 1 && hasGoalie;

  function startHint() {
    if (!teamName.trim() || !opponentName.trim())
      return 'Enter both team names to continue.';
    if (onFieldCount === 0) return 'Add players and select a starting lineup.';
    if (!hasGoalie) return 'Tap 🥅 on a starting player to set the goalkeeper.';
    return '';
  }

  const hint = startHint();

  return (
    <div className="setup-view">
      <header className="app-header">
        <div className="header-title">
          <span className="soccer-icon">⚽</span>
          <h1>8U AYSO Roster Manager</h1>
        </div>
        <span className="header-meta">7 v 7 · 4 quarters</span>
      </header>

      <div className="setup-grid">
        {/* Game info */}
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
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Add player */}
        <section className="card">
          <h2>Add Player</h2>
          <form onSubmit={handleAdd} className="add-player-form">
            <div className="form-group">
              <label>Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Player name"
                required
              />
            </div>
            <div className="form-group">
              <label>Jersey #</label>
              <input
                type="number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="1 – 99"
                min={1}
                max={99}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Add Player
            </button>
          </form>
        </section>

        {/* Roster */}
        <section className="card card-wide">
          <div className="roster-header">
            <h2>Roster</h2>
            <div className="roster-counts">
              <span className={`lineup-count ${fieldFull ? 'at-max' : ''}`}>
                Starting: <strong>{onFieldCount}</strong>/7
              </span>
              {onFieldCount > 0 && hasGoalie && (
                <span className="gk-confirmed">✓ GK set</span>
              )}
              {onFieldCount > 0 && !hasGoalie && (
                <span className="gk-warning">⚠ No GK</span>
              )}
            </div>
          </div>

          {players.length === 0 && (
            <p className="empty-state">No players added yet.</p>
          )}

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
                    {p.isGoalie && <span className="gk-badge">GK</span>}
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
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => onRemovePlayer(p.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {benchPlayers.length > 0 && (
            <div className="roster-section">
              <div className="roster-section-label">Bench</div>
              <div className="player-list">
                {benchPlayers.map((p) => (
                  <div key={p.id} className="player-row">
                    <span className="jersey">#{p.number}</span>
                    <span className="player-name">{p.name}</span>
                    <div className="player-actions">
                      <button
                        className={`btn btn-sm ${fieldFull ? 'btn-outline' : 'btn-success'}`}
                        onClick={() => onToggleStarting(p.id)}
                        disabled={fieldFull}
                        title={fieldFull ? 'Field is full (7 max)' : 'Add to starting lineup'}
                      >
                        Start
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => onRemovePlayer(p.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="start-bar">
        {hint && <p className="start-hint">{hint}</p>}
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
