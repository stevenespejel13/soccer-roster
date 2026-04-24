import { useState } from 'react';
import type { GameState, Player, Position, Substitution } from '../types';

interface Props {
  state: GameState;
  onToggleTimer: () => void;
  onAdjustScore: (team: 'home' | 'away', delta: number) => void;
  onMakeSubstitution: (outId: string, inId: string) => void;
  onReset: () => void;
}

const POSITION_COLORS: Record<Position, string> = {
  GK: '#f59e0b',
  DEF: '#3b82f6',
  MID: '#10b981',
  FWD: '#ef4444',
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatPlayingTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function PlayerBadge({ player }: { player: Player }) {
  return (
    <div className="player-badge" title={`#${player.number} ${player.name}`}>
      <span
        className="badge-position"
        style={{ background: POSITION_COLORS[player.position] }}
      >
        {player.position}
      </span>
      <span className="badge-number">#{player.number}</span>
      <span className="badge-name">{player.name}</span>
      <span className="badge-time">{formatPlayingTime(player.playingSeconds)}</span>
    </div>
  );
}

function SubstitutionLog({ subs }: { subs: Substitution[] }) {
  if (subs.length === 0) return null;
  return (
    <div className="sub-log">
      <h3>Substitutions</h3>
      {subs.map((s, i) => (
        <div key={i} className="sub-entry">
          <span className="sub-time">{formatTime(s.gameSecond)}</span>
          <span className="sub-out">↓ {s.playerOutName}</span>
          <span className="sub-in">↑ {s.playerInName}</span>
        </div>
      ))}
    </div>
  );
}

export default function GameView({
  state,
  onToggleTimer,
  onAdjustScore,
  onMakeSubstitution,
  onReset,
}: Props) {
  const [subOutId, setSubOutId] = useState<string>('');
  const [subInId, setSubInId] = useState<string>('');
  const [showSubPanel, setShowSubPanel] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const onField = state.players.filter((p) => p.status === 'playing');
  const bench = state.players.filter((p) => p.status === 'bench');
  const subbedOut = state.players.filter((p) => p.status === 'subbed-out');

  const halfSeconds = state.halfLengthMinutes * 60;
  const currentHalf = state.gameSeconds < halfSeconds ? 1 : 2;
  const halfProgress = Math.min(
    (state.gameSeconds % halfSeconds) / halfSeconds,
    1
  );

  function handleSub(e: React.FormEvent) {
    e.preventDefault();
    if (!subOutId || !subInId) return;
    onMakeSubstitution(subOutId, subInId);
    setSubOutId('');
    setSubInId('');
    setShowSubPanel(false);
  }

  return (
    <div className="game-view">
      {/* Scoreboard */}
      <header className="scoreboard">
        <div className="score-team">
          <div className="team-name">{state.teamName}</div>
          <div className="score-controls">
            <button className="score-btn" onClick={() => onAdjustScore('home', -1)}>−</button>
            <span className="score-value">{state.homeScore}</span>
            <button className="score-btn" onClick={() => onAdjustScore('home', 1)}>+</button>
          </div>
        </div>

        <div className="score-center">
          <div className="game-clock">{formatTime(state.gameSeconds)}</div>
          <div className="half-label">Half {currentHalf}</div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${halfProgress * 100}%` }}
            />
          </div>
          <button
            className={`btn ${state.isRunning ? 'btn-warning' : 'btn-success'} btn-sm`}
            onClick={onToggleTimer}
          >
            {state.isRunning ? '⏸ Pause' : '▶ Resume'}
          </button>
        </div>

        <div className="score-team score-team-right">
          <div className="team-name">{state.opponentName}</div>
          <div className="score-controls">
            <button className="score-btn" onClick={() => onAdjustScore('away', -1)}>−</button>
            <span className="score-value">{state.awayScore}</span>
            <button className="score-btn" onClick={() => onAdjustScore('away', 1)}>+</button>
          </div>
        </div>
      </header>

      <div className="game-content">
        {/* On field */}
        <section className="card">
          <h2>On Field ({onField.length})</h2>
          {onField.length === 0 ? (
            <p className="empty-state">No players on field.</p>
          ) : (
            <div className="player-grid">
              {onField.map((p) => (
                <PlayerBadge key={p.id} player={p} />
              ))}
            </div>
          )}
        </section>

        {/* Bench */}
        <section className="card">
          <h2>Bench ({bench.length})</h2>
          {bench.length === 0 ? (
            <p className="empty-state">Bench is empty.</p>
          ) : (
            <div className="player-grid">
              {bench.map((p) => (
                <PlayerBadge key={p.id} player={p} />
              ))}
            </div>
          )}
          {subbedOut.length > 0 && (
            <>
              <h3 className="subbed-out-label">Subbed Out</h3>
              <div className="player-grid faded">
                {subbedOut.map((p) => (
                  <PlayerBadge key={p.id} player={p} />
                ))}
              </div>
            </>
          )}
        </section>

        {/* Substitution panel */}
        <section className="card">
          <div className="sub-panel-header">
            <h2>Substitution</h2>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowSubPanel((v) => !v)}
            >
              {showSubPanel ? 'Cancel' : 'Make Sub'}
            </button>
          </div>

          {showSubPanel && (
            <form onSubmit={handleSub} className="sub-form">
              <div className="form-group">
                <label>Player Coming Off</label>
                <select
                  value={subOutId}
                  onChange={(e) => setSubOutId(e.target.value)}
                  required
                >
                  <option value="">-- select --</option>
                  {onField.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.number} {p.name} ({p.position}) — {formatPlayingTime(p.playingSeconds)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Player Coming On</label>
                <select
                  value={subInId}
                  onChange={(e) => setSubInId(e.target.value)}
                  required
                >
                  <option value="">-- select --</option>
                  {bench.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.number} {p.name} ({p.position})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!subOutId || !subInId}
              >
                Confirm Sub
              </button>
            </form>
          )}

          <SubstitutionLog subs={state.substitutions} />
        </section>

        {/* Playing time summary */}
        <section className="card">
          <h2>Playing Time</h2>
          <table className="time-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Pos</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {[...state.players]
                .sort((a, b) => b.playingSeconds - a.playingSeconds)
                .map((p) => (
                  <tr key={p.id} className={p.status === 'playing' ? 'row-playing' : ''}>
                    <td>{p.number}</td>
                    <td>{p.name}</td>
                    <td>
                      <span
                        className="pos-chip"
                        style={{ background: POSITION_COLORS[p.position] }}
                      >
                        {p.position}
                      </span>
                    </td>
                    <td>
                      <span className={`status-chip status-${p.status}`}>
                        {p.status === 'playing'
                          ? 'On Field'
                          : p.status === 'bench'
                          ? 'Bench'
                          : 'Subbed Out'}
                      </span>
                    </td>
                    <td className="time-cell">{formatPlayingTime(p.playingSeconds)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      </div>

      {/* Reset */}
      <div className="reset-bar">
        {!confirmReset ? (
          <button className="btn btn-outline btn-sm" onClick={() => setConfirmReset(true)}>
            End Game / Reset
          </button>
        ) : (
          <div className="confirm-reset">
            <span>Are you sure? All game data will be lost.</span>
            <button className="btn btn-danger btn-sm" onClick={onReset}>
              Yes, Reset
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
