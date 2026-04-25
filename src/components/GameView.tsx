import { useState } from 'react';
import type { GameState, Player, Position, Substitution } from '../types';
import SoccerField from './SoccerField';

interface Props {
  state: GameState;
  onToggleTimer: () => void;
  onAdjustScore: (team: 'home' | 'away', delta: number) => void;
  onMakeSubstitution: (outId: string, inId: string) => void;
  onSetGoalie: (id: string | null) => void;
  onSetPosition: (id: string, pos: Position) => void;
  onEndQuarter: () => void;
  onStartNextQuarter: () => void;
  onReset: () => void;
}

const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'FWD'];

const POS_COLOR: Record<Position, string> = {
  GK: '#f59e0b',
  DEF: '#3b82f6',
  MID: '#10b981',
  FWD: '#ef4444',
};

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function QuarterDots({
  player,
  currentQuarter,
  totalQuarters,
  isLive,
}: {
  player: Player;
  currentQuarter: number;
  totalQuarters: number;
  isLive: boolean;
}) {
  return (
    <div className="quarter-dots">
      {Array.from({ length: totalQuarters }, (_, i) => i + 1).map((q) => {
        const rec = player.quarterHistory.find((r) => r.quarter === q);
        const isCurrent = q === currentQuarter;
        let cls = 'q-dot';
        if (rec) {
          cls += rec.wasGoalie ? ' q-gk' : rec.played ? ' q-played' : ' q-sat';
        } else if (isCurrent && isLive) {
          cls += player.isGoalie
            ? ' q-current-gk'
            : player.status === 'playing'
            ? ' q-current-on'
            : ' q-current-bench';
        } else {
          cls += ' q-future';
        }
        return <span key={q} className={cls}>Q{q}</span>;
      })}
    </div>
  );
}

function PlayerCard({
  player,
  currentQuarter,
  totalQuarters,
  isLive,
  onSetGoalie,
  onSetPosition,
  satOutLastQ,
}: {
  player: Player;
  currentQuarter: number;
  totalQuarters: number;
  isLive: boolean;
  onSetGoalie?: (id: string | null) => void;
  onSetPosition?: (id: string, pos: Position) => void;
  satOutLastQ?: boolean;
}) {
  const hasBeenGK =
    player.isGoalie || player.quarterHistory.some((r) => r.wasGoalie);

  return (
    <div
      className={[
        'player-card',
        player.isGoalie ? 'player-card-gk' : '',
        satOutLastQ ? 'player-card-sat' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="player-card-top">
        <span className="pc-jersey">#{player.number}</span>
        <span className="pc-name">{player.name}</span>
        {hasBeenGK && !player.isGoalie && player.status === 'bench' && (
          <span className="gk-history-badge" title="Has played GK this game">GK</span>
        )}
        {onSetGoalie && player.status === 'playing' && (
          <button
            className={`btn-gk-toggle ${player.isGoalie ? 'active' : ''}`}
            onClick={() => onSetGoalie(player.isGoalie ? null : player.id)}
            title={player.isGoalie ? 'Remove as goalkeeper' : 'Set as goalkeeper'}
          >
            {player.isGoalie ? '🥅 GK' : '🥅'}
          </button>
        )}
      </div>

      {/* Position pills — on-field players only */}
      {onSetPosition && player.status === 'playing' && (
        <div className="pc-pos-pills">
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              className={`pos-pill ${player.position === pos ? 'active' : ''}`}
              style={player.position === pos ? { background: POS_COLOR[pos] } : {}}
              onClick={() => onSetPosition(player.id, pos)}
            >
              {pos}
            </button>
          ))}
        </div>
      )}

      <div className="player-card-bottom">
        <QuarterDots
          player={player}
          currentQuarter={currentQuarter}
          totalQuarters={totalQuarters}
          isLive={isLive}
        />
        {player.status === 'bench' && (
          <span
            className="pc-pos-tag"
            style={{ background: POS_COLOR[player.position] }}
          >
            {player.position}
          </span>
        )}
        <span className="pc-time">{fmt(player.playingSeconds)}</span>
      </div>
    </div>
  );
}

function SubLog({ subs }: { subs: Substitution[] }) {
  if (subs.length === 0) return null;
  return (
    <div className="sub-log">
      <h3>Sub log</h3>
      {subs.map((s, i) => (
        <div key={i} className="sub-entry">
          <span className="sub-time">Q{s.quarter} {fmt(s.quarterSecond)}</span>
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
  onSetGoalie,
  onSetPosition,
  onEndQuarter,
  onStartNextQuarter,
  onReset,
}: Props) {
  const [subOutId, setSubOutId] = useState('');
  const [subInId, setSubInId] = useState('');
  const [showSubPanel, setShowSubPanel] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const onField = state.players.filter((p) => p.status === 'playing');
  const bench = state.players.filter((p) => p.status === 'bench');

  const isLive = state.phase === 'game';
  const isBreak = state.phase === 'break';
  const isFinal = state.phase === 'final';

  const completedQ = state.currentQuarter - 1;

  function satOutLastQ(player: Player) {
    if (!isBreak) return false;
    const rec = player.quarterHistory.find((r) => r.quarter === completedQ);
    return !!rec && !rec.played;
  }

  const quarterProgress = Math.min(
    state.quarterSeconds / (state.quarterLengthMinutes * 60),
    1
  );

  const noGoalie = onField.length > 0 && !onField.some((p) => p.isGoalie);

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
      {/* ── Scoreboard ── */}
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
          <div className="quarter-label">
            {isFinal ? 'Full Time' : `Q${state.currentQuarter} of ${state.totalQuarters}`}
          </div>
          <div className="game-clock">{fmt(state.quarterSeconds)}</div>
          <div className="clock-target">/ {state.quarterLengthMinutes}:00</div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${quarterProgress * 100}%` }} />
          </div>
          <div className="clock-controls">
            {isLive && (
              <button
                className={`btn btn-sm ${state.isRunning ? 'btn-outline' : 'btn-success'}`}
                onClick={onToggleTimer}
              >
                {state.isRunning ? '⏸' : '▶'}
              </button>
            )}
            {isLive && (
              <button className="btn btn-warning btn-sm" onClick={onEndQuarter}>
                End Q{state.currentQuarter}
              </button>
            )}
            {isBreak && (
              <button className="btn btn-success btn-sm" onClick={onStartNextQuarter}>
                ▶ Start Q{state.currentQuarter}
              </button>
            )}
          </div>
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

      {/* ── Quarter Break Banner ── */}
      {isBreak && (
        <div className="break-banner">
          <div>
            <div className="break-title">Q{completedQ} Complete</div>
            <div className="break-subtitle">
              {bench.filter(satOutLastQ).length > 0
                ? 'Orange = sat out last quarter.'
                : 'Make any subs before the next quarter.'}
            </div>
          </div>
          <button className="btn btn-success" onClick={onStartNextQuarter}>
            ▶ Start Q{state.currentQuarter}
          </button>
        </div>
      )}

      {/* ── Final Banner ── */}
      {isFinal && (
        <div className="final-banner">
          <div>
            <div className="final-title">Full Time</div>
            <div className="final-score">
              {state.teamName} {state.homeScore} – {state.awayScore} {state.opponentName}
            </div>
          </div>
          <button className="btn btn-primary" onClick={onReset}>
            Back to Roster
          </button>
        </div>
      )}

      <div className="game-content">
        {/* ── No-GK warning ── */}
        {noGoalie && !isFinal && (
          <div className="game-content-wide">
            <div className="no-gk-warning">
              ⚠ No goalkeeper — tap 🥅 on a player card or tap their circle on the field.
            </div>
          </div>
        )}

        {/* ── Soccer Field (full width) ── */}
        <div className="game-content-wide">
          <div className="card field-card">
            <SoccerField
              players={state.players}
              onSetGoalie={isFinal ? () => {} : onSetGoalie}
              onSetPosition={isFinal ? () => {} : onSetPosition}
            />
          </div>
        </div>

        {/* ── On Field list ── */}
        <section className="card">
          <h2>On Field ({onField.length}/7)</h2>
          {onField.length === 0 ? (
            <p className="empty-state">No players on field.</p>
          ) : (
            <div className="player-cards">
              {onField.map((p) => (
                <PlayerCard
                  key={p.id}
                  player={p}
                  currentQuarter={state.currentQuarter}
                  totalQuarters={state.totalQuarters}
                  isLive={isLive}
                  onSetGoalie={isFinal ? undefined : onSetGoalie}
                  onSetPosition={isFinal ? undefined : onSetPosition}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Bench list ── */}
        <section className="card">
          <h2>Bench ({bench.length})</h2>
          {bench.length === 0 ? (
            <p className="empty-state">Bench is empty.</p>
          ) : (
            <div className="player-cards">
              {bench.map((p) => (
                <PlayerCard
                  key={p.id}
                  player={p}
                  currentQuarter={state.currentQuarter}
                  totalQuarters={state.totalQuarters}
                  isLive={isLive}
                  satOutLastQ={satOutLastQ(p)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Substitution panel ── */}
        {!isFinal && (
          <section className="card">
            <div className="sub-panel-header">
              <h2>Substitutions</h2>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowSubPanel((v) => !v)}
                disabled={onField.length === 0 || bench.length === 0}
              >
                {showSubPanel ? 'Cancel' : 'Make Sub'}
              </button>
            </div>

            {showSubPanel && (
              <form onSubmit={handleSub} className="sub-form">
                <div className="form-group">
                  <label>Coming Off</label>
                  <select
                    value={subOutId}
                    onChange={(e) => setSubOutId(e.target.value)}
                    required
                  >
                    <option value="">— select —</option>
                    {onField.map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.number} {p.name} [{p.position}]{p.isGoalie ? ' GK' : ''} · {fmt(p.playingSeconds)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Coming On</label>
                  <select
                    value={subInId}
                    onChange={(e) => setSubInId(e.target.value)}
                    required
                  >
                    <option value="">— select —</option>
                    {bench.map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.number} {p.name} [{p.position}]
                        {p.quarterHistory.some((r) => r.wasGoalie) ? ' · has played GK' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="sub-note">
                  Incoming player will take the outgoing player's position on the field.
                </p>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!subOutId || !subInId}
                >
                  Confirm Sub
                </button>
              </form>
            )}

            <SubLog subs={state.substitutions} />
          </section>
        )}

        {/* ── Playing time summary ── */}
        <section className="card">
          <h2>Playing Time</h2>
          <table className="time-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Pos</th>
                <th>Q History</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {[...state.players]
                .sort((a, b) => b.playingSeconds - a.playingSeconds)
                .map((p) => (
                  <tr key={p.id} className={p.status === 'playing' ? 'row-playing' : ''}>
                    <td>{p.number}</td>
                    <td>
                      {p.name}
                      {p.isGoalie && (
                        <span className="gk-badge" style={{ marginLeft: 4 }}>GK</span>
                      )}
                    </td>
                    <td>
                      <span
                        className="pos-tag"
                        style={{ background: POS_COLOR[p.position] }}
                      >
                        {p.position}
                      </span>
                    </td>
                    <td>
                      <QuarterDots
                        player={p}
                        currentQuarter={state.currentQuarter}
                        totalQuarters={state.totalQuarters}
                        isLive={isLive}
                      />
                    </td>
                    <td className="time-cell">{fmt(p.playingSeconds)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      </div>

      {/* ── Reset bar ── */}
      <div className="reset-bar">
        {!confirmReset ? (
          <button className="btn btn-outline btn-sm" onClick={() => setConfirmReset(true)}>
            End Game / Reset
          </button>
        ) : (
          <div className="confirm-reset">
            <span>All game data will be lost.</span>
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
