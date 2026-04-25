import { useState } from 'react';
import type { GameState, Player, Position, Substitution } from '../types';
import SoccerField from './SoccerField';

interface Props {
  state: GameState;
  onToggleTimer: () => void;
  onAdjustScore: (team: 'home' | 'away', delta: number) => void;
  onMakeSubstitution: (outId: string, inId: string) => void;
  onSetGoalie: (id: string | null) => void;
  onMovePlayer: (id: string, x: number, y: number) => void;
  onEndQuarter: () => void;
  onStartNextQuarter: () => void;
  onReset: () => void;
}

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
  satOutLastQ,
}: {
  player: Player;
  currentQuarter: number;
  totalQuarters: number;
  isLive: boolean;
  onSetGoalie?: (id: string | null) => void;
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

      <div className="player-card-bottom">
        <QuarterDots
          player={player}
          currentQuarter={currentQuarter}
          totalQuarters={totalQuarters}
          isLive={isLive}
        />
        <span
          className="pc-pos-tag"
          style={{ background: POS_COLOR[player.position] }}
        >
          {player.position}
        </span>
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

/** Modal shown when subbing in a player who already sat out */
function SatOutWarningModal({
  playerName,
  onConfirm,
  onCancel,
}: {
  playerName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-icon">⚠️</div>
        <h2 className="modal-title">Player Already Sat Out</h2>
        <p className="modal-body">
          <strong>{playerName}</strong> has already sat out at least one quarter this game.
          Are you sure you want to sub them back in?
        </p>
        <div className="modal-actions">
          <button className="btn btn-danger" onClick={onConfirm}>
            Yes, Sub Them In
          </button>
          <button className="btn btn-outline" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/** Modal shown when starting a quarter if bench players will sit out again */
function SatOutAgainModal({
  players,
  onConfirm,
}: {
  players: Player[];
  onConfirm: () => void;
}) {
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-icon">⚠️</div>
        <h2 className="modal-title">Players Sitting Out Again</h2>
        <p className="modal-body">
          The following players sat out last quarter and will sit out again:
        </p>
        <ul className="modal-player-list">
          {players.map((p) => (
            <li key={p.id}>#{p.number} {p.name}</li>
          ))}
        </ul>
        <p className="modal-body">Make substitutions before starting, or acknowledge to continue.</p>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onConfirm}>
            Acknowledged, Start Quarter
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GameView({
  state,
  onToggleTimer,
  onAdjustScore,
  onMakeSubstitution,
  onSetGoalie,
  onMovePlayer,
  onEndQuarter,
  onStartNextQuarter,
  onReset,
}: Props) {
  const [subOutId, setSubOutId] = useState('');
  const [subInId, setSubInId] = useState('');
  const [showSubPanel, setShowSubPanel] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Sub warning modal state
  const [subWarning, setSubWarning] = useState<{ outId: string; inId: string } | null>(null);
  const [quarterWarningPlayers, setQuarterWarningPlayers] = useState<Player[] | null>(null);

  const onField = state.players.filter((p) => p.status === 'playing');
  const bench = state.players.filter((p) => p.status === 'bench');

  const isLive = state.phase === 'game';
  const isBreak = state.phase === 'break';
  const isFinal = state.phase === 'final';

  const completedQ = state.currentQuarter - 1;

  function playerSatOutLastQ(player: Player) {
    if (!isBreak) return false;
    const rec = player.quarterHistory.find((r) => r.quarter === completedQ);
    return !!rec && !rec.played;
  }

  function playerHasSatOut(player: Player) {
    return player.quarterHistory.some((r) => !r.played);
  }

  const quarterProgress = Math.min(
    state.quarterSeconds / (state.quarterLengthMinutes * 60),
    1
  );

  const noGoalie = onField.length > 0 && !onField.some((p) => p.isGoalie);

  function handleSubSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subOutId || !subInId) return;
    const playerIn = state.players.find((p) => p.id === subInId);
    if (playerIn && playerHasSatOut(playerIn)) {
      setSubWarning({ outId: subOutId, inId: subInId });
      return;
    }
    commitSub(subOutId, subInId);
  }

  function commitSub(outId: string, inId: string) {
    onMakeSubstitution(outId, inId);
    setSubOutId('');
    setSubInId('');
    setShowSubPanel(false);
    setSubWarning(null);
  }

  function handleStartNextQuarter() {
    if (!isBreak) { onStartNextQuarter(); return; }
    // Warn if any bench players will sit out a 2nd time
    const sittingOutAgain = bench.filter(
      (p) => playerSatOutLastQ(p) && p.quarterHistory.filter((r) => !r.played).length >= 1
    );
    if (sittingOutAgain.length > 0) {
      setQuarterWarningPlayers(sittingOutAgain);
    } else {
      onStartNextQuarter();
    }
  }

  return (
    <div className="game-view">
      {/* ── Modals ── */}
      {subWarning && (
        <SatOutWarningModal
          playerName={state.players.find((p) => p.id === subWarning.inId)?.name ?? ''}
          onConfirm={() => commitSub(subWarning.outId, subWarning.inId)}
          onCancel={() => setSubWarning(null)}
        />
      )}
      {quarterWarningPlayers && (
        <SatOutAgainModal
          players={quarterWarningPlayers}
          onConfirm={() => { setQuarterWarningPlayers(null); onStartNextQuarter(); }}
        />
      )}

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
              <button className="btn btn-success btn-sm" onClick={handleStartNextQuarter}>
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
              {bench.filter(playerSatOutLastQ).length > 0
                ? 'Red = sat out last quarter.'
                : 'Make any subs before the next quarter.'}
            </div>
          </div>
          <button className="btn btn-success" onClick={handleStartNextQuarter}>
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
              ⚠ No goalkeeper — drag a player to the GK zone or tap 🥅 on a player card.
            </div>
          </div>
        )}

        {/* ── Soccer Field (full width) ── */}
        <div className="game-content-wide">
          <div className="card field-card">
            <SoccerField
              players={state.players}
              onSetGoalie={isFinal ? () => {} : onSetGoalie}
              onMovePlayer={isFinal ? () => {} : onMovePlayer}
              readonly={isFinal}
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
                  satOutLastQ={playerSatOutLastQ(p)}
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
              <form onSubmit={handleSubSubmit} className="sub-form">
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
                        {playerHasSatOut(p) ? ' ⚠ sat out' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="sub-note">
                  Incoming player takes the outgoing player's field position.
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
